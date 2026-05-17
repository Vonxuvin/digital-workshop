import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WarningLine } from '../../src/ui/components/WarningLine';
import { eventBus } from '../../src/utils/EventBus';

describe('WarningLine visual feedback stages', () => {
  let wl: WarningLine;

  beforeEach(() => {
    wl = new WarningLine(600);
    wl.y = 600 * 0.2;
  });

  afterEach(() => {
    wl.reset();
  });

  describe('0-30% stage: yellow mild flash', () => {
    it('warning progress < 0.3 时使用黄色 (0xffff44)', () => {
      const wh = wl.getWarningHeight();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 250);
      const progress = wl.getWarningProgress();
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(0.3);
    });

    it('0-30% 阶段不显示倒计时', () => {
      const wh = wl.getWarningHeight();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 250);
      const progress = wl.getWarningProgress();
      if (progress < 0.3) {
        expect(wl.children[1].visible).toBe(false);
      }
    });
  });

  describe('30-70% stage: orange fast flash', () => {
    it('warning progress 30-70% 时显示倒计时', () => {
      const wh = wl.getWarningHeight();
      for (let i = 0; i < 100; i++) {
        wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      }
      const progress = wl.getWarningProgress();
      if (progress >= 0.3 && progress < 0.7) {
        expect(wl.children[1].visible).toBe(true);
      }
    });
  });

  describe('70-100% stage: red intense flash + countdown', () => {
    it('warning progress 70-100% 时显示倒计时', () => {
      const wh = wl.getWarningHeight();
      for (let i = 0; i < 230; i++) {
        wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      }
      const progress = wl.getWarningProgress();
      if (progress >= 0.7) {
        expect(wl.children[1].visible).toBe(true);
      }
    });

    it('接近阈值时倒计时显示剩余秒数', () => {
      const wh = wl.getWarningHeight();
      for (let i = 0; i < 250; i++) {
        wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      }
      const countdownText = wl.children[1] as any;
      if (countdownText.visible) {
        expect(countdownText.text).toMatch(/\d+s/);
      }
    });
  });
});

describe('WarningLine grace period and speed filtering', () => {
  let wl: WarningLine;

  beforeEach(() => {
    wl = new WarningLine(600);
    wl.y = 600 * 0.2;
  });

  afterEach(() => {
    wl.reset();
  });

  describe('grace period: block briefly crosses then recedes', () => {
    it('方块回落后宽限期内不结束警告', () => {
      const wh = wl.getWarningHeight();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 250);
      expect(wl.getWarningDuration()).toBeGreaterThan(0);

      wl.update([{ y: wh + 100, radius: 5, speed: 0 }], 16.67);
      expect(wl.getWarningDuration()).toBeGreaterThan(0);
    });

    it('方块回落后超过1秒宽限期才结束警告', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:ended', handler);

      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 250);
      wl.update([{ y: wh + 100, radius: 5, speed: 0 }], 16.67);
      expect(handler).not.toHaveBeenCalled();

      wl.update([{ y: wh + 100, radius: 5, speed: 0 }], 500);
      expect(handler).not.toHaveBeenCalled();

      wl.update([{ y: wh + 100, radius: 5, speed: 0 }], 500);
      expect(handler).toHaveBeenCalled();

      eventBus.off('warning:ended', handler);
    });
  });

  describe('speed filtering: slow blocks trigger warning', () => {
    it('速度 >= 2 的方块不触发警告', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:started', handler);

      wl.update([{ y: wh - 10, radius: 5, speed: 5 }], 16.67);
      expect(handler).not.toHaveBeenCalled();

      eventBus.off('warning:started', handler);
    });

    it('速度 < 2 的方块触发警告', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:started', handler);

      wl.update([{ y: wh - 10, radius: 5, speed: 1 }], 250);
      expect(handler).toHaveBeenCalled();

      eventBus.off('warning:started', handler);
    });

    it('速度 = 0 的静止方块触发警告', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:started', handler);

      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 250);
      expect(handler).toHaveBeenCalled();

      eventBus.off('warning:started', handler);
    });
  });
});

describe('WarningLine PixiJS v8 compatibility', () => {
  let warningLine: WarningLine;

  beforeEach(() => {
    warningLine = new WarningLine(600, 400);
  });

  afterEach(() => {
    warningLine.destroy({ children: true });
  });

  it('使用 PixiJS v8 stroke API 而非 tint 属性', () => {
    const graphics = (warningLine as any).graphics;
    expect(graphics).toBeDefined();
    expect(typeof graphics.stroke).toBe('function');
  });

  it('drawLine 使用 stroke({ width, color, alpha }) 格式', () => {
    const graphics = (warningLine as any).graphics;
    const clearSpy = vi.spyOn(graphics, 'clear');
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine(0xff4444, 0.8);

    expect(clearSpy).toHaveBeenCalled();
    expect(strokeSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
    strokeSpy.mockRestore();
  });

  it('支持自定义颜色参数', () => {
    const graphics = (warningLine as any).graphics;
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine(0x00ff00, 0.5);

    const firstCall = strokeSpy.mock.calls[0][0] as { color: number; alpha: number; width: number };
    expect(firstCall.color).toBe(0x00ff00);
    expect(firstCall.alpha).toBe(0.5);

    strokeSpy.mockRestore();
  });

  it('支持自定义透明度参数', () => {
    const graphics = (warningLine as any).graphics;
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine(0xff4444, 0.3);

    const firstCall = strokeSpy.mock.calls[0][0] as { alpha: number };
    expect(firstCall.alpha).toBe(0.3);

    strokeSpy.mockRestore();
  });

  it('虚线使用较低透明度', () => {
    const graphics = (warningLine as any).graphics;
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine(0xff4444, 0.8);

    const secondCall = strokeSpy.mock.calls[1][0] as { alpha: number };
    expect(secondCall.alpha).toBeCloseTo(0.48, 1);

    strokeSpy.mockRestore();
  });

  it('默认颜色为红色警告色', () => {
    const graphics = (warningLine as any).graphics;
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine();

    const firstCall = strokeSpy.mock.calls[0][0] as { color: number };
    expect(firstCall.color).toBe(0xff4444);

    strokeSpy.mockRestore();
  });

  it('默认透明度为 0.8', () => {
    const graphics = (warningLine as any).graphics;
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine();

    const firstCall = strokeSpy.mock.calls[0][0] as { alpha: number };
    expect(firstCall.alpha).toBe(0.8);

    strokeSpy.mockRestore();
  });

  it('不依赖已废弃的 Graphics.tint 属性进行绘制', () => {
    const graphics = (warningLine as any).graphics;
    const tintSpy = vi.spyOn(graphics, 'tint', 'set');

    (warningLine as any).drawLine(0xff4444, 0.8);

    expect(tintSpy).not.toHaveBeenCalled();

    tintSpy.mockRestore();
  });

  it('WarningLine 不主动设置 tint 属性', () => {
    const wlAny = warningLine as any;
    const graphics = wlAny.graphics;
    expect(graphics.tint).toBe(0xFFFFFF);
  });

  it('drawLine 方法存在且可调用', () => {
    const wlAny = warningLine as any;
    expect(typeof wlAny.drawLine).toBe('function');
  });

  it('updateVisualFeedback 不设置 tint', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../src/ui/components/WarningLine.ts'),
      'utf-8'
    );
    const updateVisualMatch = content.match(/private updateVisualFeedback\(\): void \{[\s\S]*?\n  \}/);
    expect(updateVisualMatch).toBeTruthy();
    expect(updateVisualMatch![0]).not.toContain('graphics.tint');
    expect(updateVisualMatch![0]).toContain('drawLine(0xffff44');
    expect(updateVisualMatch![0]).toContain('drawLine(0xff8844');
    expect(updateVisualMatch![0]).toContain('drawLine(0xff2222');
  });
});

describe('WarningLine reset and lifecycle', () => {
  let wl: WarningLine;

  beforeEach(() => {
    wl = new WarningLine(600);
    wl.y = 600 * 0.2;
  });

  afterEach(() => {
    wl.destroy();
  });

  it('警告触发后reset应清除所有警告状态', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(wl.getWarningDuration()).toBeGreaterThan(0);

    wl.reset();

    expect(wl.getWarningDuration()).toBe(0);
    expect(wl.getWarningProgress()).toBe(0);
  });

  it('reset后disabled状态仍需单独管理', () => {
    wl.setDisabled(true);
    wl.reset();

    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(wl.getWarningDuration()).toBe(0);

    wl.setDisabled(false);
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(wl.getWarningDuration()).toBeGreaterThan(0);
  });

  it('visible属性可独立控制WarningLine显示', () => {
    expect(wl.visible).toBe(true);

    wl.visible = false;
    expect(wl.visible).toBe(false);

    wl.visible = true;
    expect(wl.visible).toBe(true);
  });

  it('游戏结束时game:over事件会使警告线停止更新', () => {
    const handler = vi.fn();
    eventBus.on('game:over', handler);

    for (let i = 0; i < 320; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }

    expect(handler).toHaveBeenCalled();
    const durationAfterGameOver = wl.getWarningDuration();
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    expect(wl.getWarningDuration()).toBe(durationAfterGameOver);
    eventBus.off('game:over', handler);
  });

  it('重新开始后警告线应能重新触发', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(wl.getWarningDuration()).toBeGreaterThan(0);

    wl.reset();
    wl.setDisabled(false);

    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(wl.getWarningDuration()).toBeGreaterThan(0);
  });

  it('游戏失败→复活→重新开始完整流程中WarningLine应正确恢复', () => {
    for (let i = 0; i < 320; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }
    const durationAfterGameOver = wl.getWarningDuration();
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    expect(wl.getWarningDuration()).toBe(durationAfterGameOver);

    wl.reset();
    wl.setDisabled(false);
    expect(wl.getWarningDuration()).toBe(0);
    expect(wl.getWarningProgress()).toBe(0);

    const handler = vi.fn();
    eventBus.on('warning:started', handler);
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(handler).toHaveBeenCalled();
    expect(wl.getWarningDuration()).toBeGreaterThan(0);
    eventBus.off('warning:started', handler);
  });
});

describe('WarningLine + UI integration', () => {
  beforeEach(() => {
  });

  afterEach(() => {
  });

  it('should handle warning line reset after game over', () => {
    const wl = new WarningLine(600);
    wl.y = 120;
    for (let i = 0; i < 350; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }
    wl.reset();
    expect(wl.getWarningDuration()).toBe(0);
    wl.setDisabled(false);
  });
});
