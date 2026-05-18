import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FreezeEffect } from '../../../src/ui/effects/FreezeEffect';
import { AnimationManager } from '../../../src/utils/AnimationManager';
import { TimeManager } from '../../../src/utils/TimeManager';

describe('FreezeEffect', () => {
  beforeEach(() => {
    AnimationManager.resetInstance();
    TimeManager.resetInstance();
    new TimeManager();
    AnimationManager.getInstance();
  });

  afterEach(() => {
    AnimationManager.resetInstance();
    TimeManager.resetInstance();
  });

  it('should use unique timer IDs', () => {
    const effect1 = new FreezeEffect(800, 600);
    const effect2 = new FreezeEffect(800, 600);
    expect((effect1 as any).exitTimerId).not.toBe((effect2 as any).exitTimerId);
    effect1.destroy();
    effect2.destroy();
  });

  it('should generate incrementing unique IDs', () => {
    const effect1 = new FreezeEffect(800, 600);
    const effect2 = new FreezeEffect(800, 600);
    const effect3 = new FreezeEffect(800, 600);
    const ids = [
      (effect1 as any).exitTimerId,
      (effect2 as any).exitTimerId,
      (effect3 as any).exitTimerId,
    ];
    expect(new Set(ids).size).toBe(3);
    effect1.destroy();
    effect2.destroy();
    effect3.destroy();
  });

  it('should create snowflakes', () => {
    const effect = new FreezeEffect(800, 600);
    expect((effect as any).snowflakes.length).toBeGreaterThan(0);
    effect.destroy();
  });

  it('should destroy without error', () => {
    const effect = new FreezeEffect(800, 600);
    expect(() => effect.destroy()).not.toThrow();
  });

  it('should set isExiting to true on playExit', () => {
    const effect = new FreezeEffect(800, 600);
    effect.playExit();
    expect((effect as any).isExiting).toBe(true);
    effect.destroy();
  });

  it('should clear snowflake tweens on playExit', () => {
    const effect = new FreezeEffect(800, 600);
    (effect as any).snowflakeTweens = [{ kill: vi.fn() }, { kill: vi.fn() }];
    effect.playExit();
    expect((effect as any).snowflakeTweens).toEqual([]);
    effect.destroy();
  });

  it('should kill entrance tween on playExit if it exists', () => {
    const effect = new FreezeEffect(800, 600);
    effect.playExit();
    expect((effect as any).entranceTween).toBeNull();
    effect.destroy();
  });

  it('should update overlay alpha via updateRemainingTime', () => {
    const effect = new FreezeEffect(800, 600);
    effect.updateRemainingTime(2500, 5000);
    expect((effect as any).overlay.alpha).toBeCloseTo(0.15, 5);
    effect.updateRemainingTime(5000, 5000);
    expect((effect as any).overlay.alpha).toBeCloseTo(0.3, 5);
    effect.updateRemainingTime(0, 5000);
    expect((effect as any).overlay.alpha).toBeCloseTo(0, 5);
    effect.destroy();
  });

  it('should not animate snowflakes when isExiting is true', () => {
    const effect = new FreezeEffect(800, 600);
    (effect as any).isExiting = true;
    const snowflakeBefore = (effect as any).snowflakes[0];
    const initialTweenCount = (effect as any).snowflakeTweens.length;
    (effect as any).animateSnowflake(snowflakeBefore);
    expect((effect as any).snowflakeTweens.length).toBe(initialTweenCount);
    effect.destroy();
  });

  it('should kill entrance tween in destroy if it exists', () => {
    const effect = new FreezeEffect(800, 600);
    expect((effect as any).entranceTween).not.toBeNull();
    effect.destroy();
    expect((effect as any).entranceTween).toBeNull();
  });

  it('should create overlay with correct dimensions', () => {
    const effect = new FreezeEffect(1024, 768);
    const overlay = (effect as any).overlay;
    expect(overlay).toBeDefined();
    effect.destroy();
  });

  it('should create 30 snowflakes', () => {
    const effect = new FreezeEffect(800, 600);
    expect((effect as any).snowflakes.length).toBe(30);
    effect.destroy();
  });

  it('should call AnimationManager.setTimeout in playExit', () => {
    const effect = new FreezeEffect(800, 600);
    const setTimeoutSpy = vi.spyOn(AnimationManager.getInstance(), 'setTimeout');
    effect.playExit();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500, (effect as any).exitTimerId);
    setTimeoutSpy.mockRestore();
    effect.destroy();
  });

  it('should set allComplete to true when exit timer fires', () => {
    const effect = new FreezeEffect(800, 600);
    let exitCallback: (() => void) | null = null;
    const setTimeoutSpy = vi.spyOn(AnimationManager.getInstance(), 'setTimeout').mockImplementation((cb: any) => {
      exitCallback = cb;
      return 'mock_timer';
    });
    effect.playExit();
    expect(effect.allComplete).toBe(false);
    expect(exitCallback).not.toBeNull();
    exitCallback!();
    expect(effect.allComplete).toBe(true);
    setTimeoutSpy.mockRestore();
    effect.destroy();
  });

  it('should handle playExit when entranceTween is null', () => {
    const effect = new FreezeEffect(800, 600);
    (effect as any).entranceTween = null;
    const setTimeoutSpy = vi.spyOn(AnimationManager.getInstance(), 'setTimeout');
    effect.playExit();
    expect(setTimeoutSpy).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
    effect.destroy();
  });

  it('should start snowflakes after entrance animation completes', () => {
    const effect = new FreezeEffect(800, 600);
    const entranceTween = (effect as any).entranceTween;
    expect(entranceTween).not.toBeNull();
    const startSnowflakesSpy = vi.spyOn(effect as any, 'startSnowflakes');
    if (entranceTween && entranceTween._callbacks && entranceTween._callbacks.onComplete) {
      const callbacks = entranceTween._callbacks;
      if (callbacks.onComplete && callbacks.onComplete.length > 0) {
        callbacks.onComplete[0](entranceTween);
      }
    }
    effect.destroy();
  });

  it('should kill snowflake tweens in destroy', () => {
    const effect = new FreezeEffect(800, 600);
    const mockTween = { kill: vi.fn() };
    (effect as any).snowflakeTweens = [mockTween];
    effect.destroy();
    expect(mockTween.kill).toHaveBeenCalled();
    expect((effect as any).snowflakeTweens).toEqual([]);
  });
});
