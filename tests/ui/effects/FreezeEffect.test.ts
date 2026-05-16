import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
});