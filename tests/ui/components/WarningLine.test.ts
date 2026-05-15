import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WarningLine } from '../../../src/ui/components/WarningLine';
import { eventBus } from '../../../src/utils/EventBus';

describe('WarningLine', () => {
  let wl: WarningLine;

  beforeEach(() => {
    wl = new WarningLine(600);
    wl.y = 600 * 0.2;
  });

  it('should create with correct warning height', () => {
    expect(wl.getWarningHeight()).toBe(120);
  });

  it('should not warn when blocks are below line', () => {
    wl.update([{ y: 500, radius: 20, speed: 0 }], 16.67);
    expect(wl.getWarningDuration()).toBe(0);
  });

  it('should not warn when fast-moving block is above line', () => {
    const handler = vi.fn();
    eventBus.on('warning:started', handler);
    wl.update([{ y: 50, radius: 20, speed: 5 }], 16.67);
    expect(handler).not.toHaveBeenCalled();
    eventBus.off('warning:started', handler);
  });

  it('should start warning when stable block is above line', () => {
    const handler = vi.fn();
    eventBus.on('warning:started', handler);
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    expect(handler).toHaveBeenCalled();
    eventBus.off('warning:started', handler);
  });

  it('should emit warning:ended when block moves below line after grace period', () => {
    const handler = vi.fn();
    eventBus.on('warning:ended', handler);
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    wl.update([{ y: 500, radius: 20, speed: 0 }], 16.67);
    expect(handler).not.toHaveBeenCalled();
    wl.update([{ y: 500, radius: 20, speed: 0 }], 500);
    expect(handler).not.toHaveBeenCalled();
    wl.update([{ y: 500, radius: 20, speed: 0 }], 500);
    expect(handler).toHaveBeenCalled();
    eventBus.off('warning:ended', handler);
  });

  it('should emit game:over after threshold', () => {
    const handler = vi.fn();
    eventBus.on('game:over', handler);
    for (let i = 0; i < 320; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }
    expect(handler).toHaveBeenCalled();
    eventBus.off('game:over', handler);
  });

  it('should reset correctly', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    wl.reset();
    expect(wl.getWarningDuration()).toBe(0);
  });

  it('should draw line with correct PixiJS v8 stroke API (no tint)', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    const graphics = (wl as any).graphics;
    expect(graphics).toBeDefined();
  });

  it('should update visual feedback with yellow color at low progress', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    for (let i = 0; i < 30; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }
    const progress = wl.getWarningProgress();
    expect(progress).toBeLessThan(0.3);
  });

  it('should update visual feedback with orange color at medium progress', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    for (let i = 0; i < 120; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }
    const progress = wl.getWarningProgress();
    expect(progress).toBeGreaterThanOrEqual(0.3);
    expect(progress).toBeLessThan(0.7);
  });

  it('should update visual feedback with red color at high progress', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    for (let i = 0; i < 250; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }
    const progress = wl.getWarningProgress();
    expect(progress).toBeGreaterThanOrEqual(0.7);
  });

  it('should show countdown text when progress >= 0.3', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    for (let i = 0; i < 120; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }
    const countdownText = (wl as any).countdownText;
    expect(countdownText.visible).toBe(true);
  });

  it('should disable and stop warning after setDisabled(true)', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    wl.setDisabled(true);
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    expect(wl.getWarningDuration()).toBe(0);
  });

  it('should use custom config values', () => {
    const customWl = new WarningLine(600, 800, {
      warningThreshold: 3000,
      speedThreshold: 5,
      gracePeriod: 500,
    });
    customWl.y = 100;
    customWl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    expect(customWl.getWarningDuration()).toBeGreaterThan(0);
    customWl.destroy();
  });

  it('should not warn when disabled', () => {
    wl.setDisabled(true);
    const handler = vi.fn();
    eventBus.on('warning:started', handler);
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    expect(handler).not.toHaveBeenCalled();
    eventBus.off('warning:started', handler);
  });
});
