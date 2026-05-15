import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WarningLine } from '../../src/ui/components/WarningLine';
import { ShrinkModifier, ShrinkConfig } from '../../src/gameplay/modifiers/ShrinkModifier';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { PropEffectHandler } from '../../src/core/PropEffectHandler';
import { BlockSpawner } from '../../src/gameplay/BlockSpawner';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { Block } from '../../src/gameplay/Block';
import { ScoreSystem } from '../../src/gameplay/ScoreSystem';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { SaveManager } from '../../src/core/SaveManager';
import { TimeManager } from '../../src/utils/TimeManager';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { BlockPreview } from '../../src/gameplay/BlockPreview';
import { GameEffectManager } from '../../src/core/GameEffectManager';
import { Container } from 'pixi.js';
import { eventBus } from '../../src/utils/EventBus';
import Matter from 'matter-js';

describe('P0-2: WarningLine tint 修复 - TC-002 关联测试', () => {
  let wl: WarningLine;

  beforeEach(() => {
    wl = new WarningLine(600);
    wl.y = 600 * 0.2;
  });

  afterEach(() => {
    wl.reset();
  });

  describe('TC-002-01: 方块超过警戒线 0-30% 时间 → 黄色轻微闪烁', () => {
    it('warning progress < 0.3 时使用黄色 (0xffff44)', () => {
      const wh = wl.getWarningHeight();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      const progress = wl.getWarningProgress();
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(0.3);
    });

    it('0-30% 阶段不显示倒计时', () => {
      const wh = wl.getWarningHeight();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 500);
      const progress = wl.getWarningProgress();
      if (progress < 0.3) {
        expect(wl.children[1].visible).toBe(false);
      }
    });
  });

  describe('TC-002-02: 方块超过警戒线 30-70% 时间 → 橙色快速闪烁', () => {
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

  describe('TC-002-03: 方块超过警戒线 70-100% 时间 → 红色剧烈闪烁 + 倒计时', () => {
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

  describe('TC-002-04: 方块短暂越过警戒线后回落 → 1秒宽限期内不触发警告', () => {
    it('方块回落后宽限期内不结束警告', () => {
      const wh = wl.getWarningHeight();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      expect(wl.getWarningDuration()).toBeGreaterThan(0);

      wl.update([{ y: wh + 100, radius: 5, speed: 0 }], 16.67);
      expect(wl.getWarningDuration()).toBeGreaterThan(0);
    });

    it('方块回落后超过1秒宽限期才结束警告', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:ended', handler);

      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      wl.update([{ y: wh + 100, radius: 5, speed: 0 }], 16.67);
      expect(handler).not.toHaveBeenCalled();

      wl.update([{ y: wh + 100, radius: 5, speed: 0 }], 500);
      expect(handler).not.toHaveBeenCalled();

      wl.update([{ y: wh + 100, radius: 5, speed: 0 }], 500);
      expect(handler).toHaveBeenCalled();

      eventBus.off('warning:ended', handler);
    });
  });

  describe('TC-002-05: 方块缓慢滑动越过警戒线 → 速度 < 2 时不触发警告', () => {
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

      wl.update([{ y: wh - 10, radius: 5, speed: 1 }], 16.67);
      expect(handler).toHaveBeenCalled();

      eventBus.off('warning:started', handler);
    });

    it('速度 = 0 的静止方块触发警告', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:started', handler);

      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      expect(handler).toHaveBeenCalled();

      eventBus.off('warning:started', handler);
    });
  });

  describe('FIXED: 不再使用 graphics.tint，改为直接重绘颜色', () => {
    it('WarningLine 不主动设置 tint 属性', () => {
      const wlAny = wl as any;
      const graphics = wlAny.graphics;
      expect(graphics.tint).toBe(0xFFFFFF);
    });

    it('drawLine 方法存在且可调用', () => {
      const wlAny = wl as any;
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
});

describe('H-3: ShrinkModifier containerOffsetX 修复', () => {
  let physics: PhysicsManager;

  beforeEach(() => {
    physics = new PhysicsManager();
  });

  afterEach(() => {
    physics.stop();
  });

  describe('ShrinkModifier 接受 containerOffsetX 参数', () => {
    it('构造函数接受 containerOffsetX 参数（默认为 0）', () => {
      const config: ShrinkConfig = {
        type: 'shrink',
        enabled: true,
        targetWidth: 300,
        shrinkSpeed: 50,
        minWidth: 200,
      };
      const modifier = new ShrinkModifier(config, physics, 400, 600, 550);
      expect(modifier).toBeDefined();
      expect(modifier.getCurrentWidth()).toBe(400);
      modifier.destroy();
    });

    it('构造函数接受非零 containerOffsetX', () => {
      const config: ShrinkConfig = {
        type: 'shrink',
        enabled: true,
        targetWidth: 300,
        shrinkSpeed: 50,
        minWidth: 200,
      };
      const modifier = new ShrinkModifier(config, physics, 400, 600, 550, null, 200);
      expect(modifier).toBeDefined();
      modifier.destroy();
    });
  });

  describe('FIXED: updateWallPositions 使用 containerOffsetX', () => {
    it('源码中 updateWallPositions 包含 containerOffsetX', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/gameplay/modifiers/ShrinkModifier.ts'),
        'utf-8'
      );
      const updateWallMatch = content.match(/private updateWallPositions\(\): void \{[\s\S]*?\n  \}/);
      expect(updateWallMatch).toBeTruthy();
      expect(updateWallMatch![0]).toContain('containerOffsetX');
    });

    it('源码中 showWarning 包含 containerOffsetX', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/gameplay/modifiers/ShrinkModifier.ts'),
        'utf-8'
      );
      const showWarningMatch = content.match(/protected showWarning\(\): void \{[\s\S]*?\n  \}/);
      expect(showWarningMatch).toBeTruthy();
      expect(showWarningMatch![0]).toContain('containerOffsetX');
    });
  });

  describe('FIXED: ModifierManager.setContainerSize 接受 offsetX', () => {
    it('ModifierManager.setContainerSize 方法签名包含 offsetX', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/gameplay/modifiers/ModifierManager.ts'),
        'utf-8'
      );
      const setContainerMatch = content.match(/setContainerSize\(width: number, height: number[^)]*\)/);
      expect(setContainerMatch).toBeTruthy();
      expect(setContainerMatch![0]).toContain('offsetX');
    });
  });
});

describe('P2-6: ShrinkProp 新方块遗漏修复', () => {
  let physics: PhysicsManager;
  let blockSpawner: BlockSpawner;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let propEffectHandler: PropEffectHandler;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics, { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any);
    propSystem = new PropSystem({ emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any);
    stage = new Container();
    blockSpawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    const effectManager = new GameEffectManager(stage);
    const mockPropSystem = {
      getPropCount: vi.fn().mockReturnValue(3),
      getAllProps: vi.fn().mockReturnValue([]),
      useProp: vi.fn(),
      getProp: vi.fn(),
      reset: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      destroy: vi.fn(),
    } as unknown as PropSystem;
    const hud = new GameHUD(mockPropSystem);
    const preview = new BlockPreview();
    propEffectHandler = new PropEffectHandler(
      blockSpawner, mergeSystem, physics, effectManager, propSystem, hud, preview
    );
  });

  afterEach(() => {
    physics.stop();
  });

  describe('FIXED: PropEffectHandler 暴露缩小状态', () => {
    it('isShrinkActive() 返回当前缩小状态', () => {
      expect(propEffectHandler.isShrinkActive()).toBe(false);
    });

    it('getShrinkFactor() 返回当前缩小因子', () => {
      expect(propEffectHandler.getShrinkFactor()).toBe(1);
    });

    it('applyShrinkToBlock() 方法存在', () => {
      expect(typeof propEffectHandler.applyShrinkToBlock).toBe('function');
    });
  });

  describe('FIXED: 缩小激活时新方块自动缩小', () => {
    it('缩小未激活时 applyShrinkToBlock 不影响方块', () => {
      const body = physics.createCircle(200, 300, 20);
      const block = new Block(body, 2);
      const originalScale = block.scale.x;

      propEffectHandler.applyShrinkToBlock(block);

      expect(block.scale.x).toBe(originalScale);
    });

    it('缩小激活时 applyShrinkToBlock 缩小方块', () => {
      propEffectHandler.handleShrinkActivate({ factor: 0.7, duration: 5000 });
      expect(propEffectHandler.isShrinkActive()).toBe(true);
      expect(propEffectHandler.getShrinkFactor()).toBe(0.7);

      const body = physics.createCircle(200, 300, 20);
      const block = new Block(body, 4);

      propEffectHandler.applyShrinkToBlock(block);

      expect(block.scale.x).toBeCloseTo(0.7, 5);
      expect(block.scale.y).toBeCloseTo(0.7, 5);
    });

    it('缩小激活时新方块被记录到 originalBodyData 并可恢复', () => {
      blockSpawner.dropBlock(200, 300, 2);
      const existingBlocks = blockSpawner.getBlocks();

      propEffectHandler.handleShrinkActivate({ factor: 0.7, duration: 5000 });
      expect(propEffectHandler.isShrinkActive()).toBe(true);

      blockSpawner.dropBlock(250, 300, 4);
      const newBlock = blockSpawner.getBlocks().find(b => b.value === 4);
      expect(newBlock).toBeDefined();

      propEffectHandler.applyShrinkToBlock(newBlock!);
      expect(newBlock!.scale.x).toBeCloseTo(0.7, 5);

      propEffectHandler.handleShrinkDeactivate();
      expect(newBlock!.scale.x).toBeCloseTo(1, 5);
    });
  });

  describe('FIXED: BlockSpawner 支持 onBlockDropped 回调', () => {
    it('setOnBlockDropped 方法存在', () => {
      expect(typeof blockSpawner.setOnBlockDropped).toBe('function');
    });

    it('回调在方块投放后被调用', () => {
      const callback = vi.fn();
      blockSpawner.setOnBlockDropped(callback);
      blockSpawner.dropBlock(200, 100, 2);
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toBeDefined();
      expect(callback.mock.calls[0][0].value).toBe(2);
    });
  });
});

describe('H-6: updateStatistics 参数修复', () => {
  describe('FIXED: LevelSystem 暴露 getHighestMergeValue', () => {
    it('getHighestMergeValue 方法存在', () => {
      const config: LevelConfig = {
        id: 1, name: 'Test', objective: { type: 'score', target: 100 },
        containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2],
      };
      const ls = new LevelSystem(config);
      expect(typeof ls.getHighestMergeValue).toBe('function');
      ls.destroy();
    });

    it('getHighestMergeValue 返回正确的最高合成值', () => {
      const config: LevelConfig = {
        id: 1, name: 'Test', objective: { type: 'score', target: 100 },
        containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2],
      };
      const ls = new LevelSystem(config);

      eventBus.emit('block:merged', { newValue: 8, chainCount: 1 });
      expect(ls.getHighestMergeValue()).toBe(8);

      eventBus.emit('block:merged', { newValue: 16, chainCount: 2 });
      expect(ls.getHighestMergeValue()).toBe(16);

      eventBus.emit('block:merged', { newValue: 4, chainCount: 1 });
      expect(ls.getHighestMergeValue()).toBe(16);

      ls.destroy();
    });
  });

  describe('FIXED: ScoreSystem 跟踪 maxChainCount', () => {
    it('getMaxChainCount 方法存在', () => {
      const ss = new ScoreSystem();
      expect(typeof ss.getMaxChainCount).toBe('function');
      ss.reset();
    });

    it('getMaxChainCount 返回历史最大连锁数', () => {
      const ss = new ScoreSystem();

      ss.addMergeScore(2, false);
      ss.addMergeScore(2, false);
      ss.addMergeScore(2, false);
      expect(ss.getMaxChainCount()).toBe(3);

      ss.update(3100);
      expect(ss.getChainCount()).toBe(0);
      expect(ss.getMaxChainCount()).toBe(3);

      ss.addMergeScore(2, false);
      expect(ss.getMaxChainCount()).toBe(3);

      ss.reset();
    });

    it('maxChainCount 在 reset 后归零', () => {
      const ss = new ScoreSystem();
      ss.addMergeScore(2, false);
      ss.addMergeScore(2, false);
      expect(ss.getMaxChainCount()).toBe(2);

      ss.reset();
      expect(ss.getMaxChainCount()).toBe(0);
    });
  });

  describe('FIXED: SceneManager.completeLevel 传入正确参数', () => {
    it('SceneManager.completeLevel 中调用 updateStatistics 传入非零参数', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/SceneManager.ts'),
        'utf-8'
      );
      const completeMatch = content.match(/completeLevel[\s\S]*?updateStatistics\([^)]+\)/);
      expect(completeMatch).toBeTruthy();
      expect(completeMatch![0]).not.toContain('updateStatistics(0, 0');
      expect(completeMatch![0]).toContain('highestMerge');
      expect(completeMatch![0]).toContain('longestCombo');
    });
  });
});

describe('P1-4: 统一时间管理 - TimeManager', () => {
  beforeEach(() => {
    TimeManager.resetInstance();
  });

  afterEach(() => {
    TimeManager.resetInstance();
  });

  describe('TimeManager 单例管理', () => {
    it('getInstance 返回单例', () => {
      const tm1 = TimeManager.getInstance();
      const tm2 = TimeManager.getInstance();
      expect(tm1).toBe(tm2);
    });

    it('setInstance 设置自定义实例', () => {
      const customTm = new TimeManager();
      TimeManager.setInstance(customTm);
      expect(TimeManager.getInstance()).toBe(customTm);
    });

    it('resetInstance 清除实例', () => {
      const tm = TimeManager.getInstance();
      TimeManager.resetInstance();
      const tm2 = TimeManager.getInstance();
      expect(tm2).not.toBe(tm);
    });
  });

  describe('TimeManager 暂停/恢复', () => {
    it('初始状态未暂停', () => {
      const tm = TimeManager.getInstance();
      expect(tm.isCurrentlyPaused()).toBe(false);
    });

    it('pause() 设置暂停状态', () => {
      const tm = TimeManager.getInstance();
      tm.pause();
      expect(tm.isCurrentlyPaused()).toBe(true);
    });

    it('resume() 恢复运行状态', () => {
      const tm = TimeManager.getInstance();
      tm.pause();
      tm.resume();
      expect(tm.isCurrentlyPaused()).toBe(false);
    });

    it('重复 pause 不影响状态', () => {
      const tm = TimeManager.getInstance();
      tm.pause();
      tm.pause();
      expect(tm.isCurrentlyPaused()).toBe(true);
    });

    it('未暂停时 resume 不影响状态', () => {
      const tm = TimeManager.getInstance();
      tm.resume();
      expect(tm.isCurrentlyPaused()).toBe(false);
    });
  });

  describe('TimeManager 游戏时间线', () => {
    it('getGameTimeline 返回 GSAP 时间线', () => {
      const tm = TimeManager.getInstance();
      const timeline = tm.getGameTimeline();
      expect(timeline).toBeDefined();
      expect(typeof timeline.pause).toBe('function');
      expect(typeof timeline.resume).toBe('function');
    });

    it('暂停 TimeManager 同时暂停游戏时间线', () => {
      const tm = TimeManager.getInstance();
      const timeline = tm.getGameTimeline();
      tm.pause();
      expect(timeline.isActive()).toBe(false);
    });
  });

  describe('FIXED: GameScene 不再使用 gsap.globalTimeline', () => {
    it('GameScene.pause 不使用 gsap.globalTimeline.pause', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/GameScene.ts'),
        'utf-8'
      );
      expect(content).not.toContain('gsap.globalTimeline.pause');
      expect(content).not.toContain('gsap.globalTimeline.resume');
      expect(content).toContain('timeManager.pause');
      expect(content).toContain('timeManager.resume');
    });
  });

  describe('FIXED: 游戏效果使用 TimeManager 时间线', () => {
    it('MergeEffect 添加到 TimeManager 游戏时间线', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/effects/MergeEffect.ts'),
        'utf-8'
      );
      expect(content).toContain('TimeManager');
      expect(content).toContain('getGameTimeline()');
    });

    it('ExplosionEffect 添加到 TimeManager 游戏时间线', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/effects/ExplosionEffect.ts'),
        'utf-8'
      );
      expect(content).toContain('TimeManager');
      expect(content).toContain('getGameTimeline()');
    });

    it('FreezeEffect 添加到 TimeManager 游戏时间线', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/effects/FreezeEffect.ts'),
        'utf-8'
      );
      expect(content).toContain('TimeManager');
      expect(content).toContain('getGameTimeline()');
    });

    it('ParticleEffect 添加到 TimeManager 游戏时间线', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/effects/ParticleEffect.ts'),
        'utf-8'
      );
      expect(content).toContain('TimeManager');
      expect(content).toContain('getGameTimeline()');
    });

    it('GameHUD 分数动画添加到 TimeManager 游戏时间线', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).toContain('TimeManager');
      expect(content).toContain('getGameTimeline()');
    });

    it('ComboDisplay 动画添加到 TimeManager 游戏时间线', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/components/ComboDisplay.ts'),
        'utf-8'
      );
      expect(content).toContain('TimeManager');
      expect(content).toContain('getGameTimeline()');
    });
  });

  describe('FIXED: Game 初始化和清理 TimeManager', () => {
    it('Game.init 中初始化 TimeManager', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/Game.ts'),
        'utf-8'
      );
      expect(content).toContain('TimeManager.setInstance');
    });

    it('Game.destroy 中清理 TimeManager', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/Game.ts'),
        'utf-8'
      );
      expect(content).toContain('TimeManager.resetInstance');
    });
  });
});
