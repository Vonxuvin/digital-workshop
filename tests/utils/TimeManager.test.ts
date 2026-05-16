import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimeManager } from '../../src/utils/TimeManager';
import { AnimationManager } from '../../src/utils/AnimationManager';

describe('TimeManager unified pause/resume', () => {
  let timeManager: TimeManager;
  let animManager: AnimationManager;

  beforeEach(() => {
    AnimationManager.resetInstance();
    TimeManager.resetInstance();
    animManager = AnimationManager.getInstance();
    timeManager = new TimeManager();
    TimeManager.setInstance(timeManager);
  });

  afterEach(() => {
    TimeManager.resetInstance();
    AnimationManager.resetInstance();
  });

  it('should pause both gameTimeline and AnimationManager', () => {
    const callback = () => {};
    const id = animManager.register(callback);
    expect(animManager.getActiveCount()).toBe(1);

    timeManager.pause();
    expect(timeManager.isCurrentlyPaused()).toBe(true);
    expect(animManager.getActiveCount()).toBe(0);
  });

  it('should resume both gameTimeline and AnimationManager', () => {
    const callback = () => {};
    const id = animManager.register(callback);

    timeManager.pause();
    expect(animManager.getActiveCount()).toBe(0);

    timeManager.resume();
    expect(timeManager.isCurrentlyPaused()).toBe(false);
    expect(animManager.getActiveCount()).toBe(1);
  });

  it('should be idempotent on pause', () => {
    timeManager.pause();
    timeManager.pause();
    expect(timeManager.isCurrentlyPaused()).toBe(true);
  });

  it('should be idempotent on resume', () => {
    timeManager.pause();
    timeManager.resume();
    timeManager.resume();
    expect(timeManager.isCurrentlyPaused()).toBe(false);
  });

  it('should pause AnimationManager timers', () => {
    let executed = false;
    animManager.setTimeout(() => { executed = true; }, 100, 'test_timer');

    timeManager.pause();
    animManager.update(150);
    expect(executed).toBe(false);

    timeManager.resume();
    animManager.update(150);
    expect(executed).toBe(true);
  });

  it('should pause AnimationManager frame callbacks', () => {
    let callCount = 0;
    animManager.register(() => { callCount++; }, 'test_frame');

    timeManager.pause();
    animManager.update(16);
    expect(callCount).toBe(0);

    timeManager.resume();
    animManager.update(16);
    expect(callCount).toBe(1);
  });

  it('should return gameTimeline', () => {
    const timeline = timeManager.getGameTimeline();
    expect(timeline).toBeDefined();
  });

  it('should destroy cleanly', () => {
    timeManager.pause();
    timeManager.destroy();
    expect(timeManager.isCurrentlyPaused()).toBe(false);
  });

  it('should work as singleton', () => {
    const instance1 = TimeManager.getInstance();
    const instance2 = TimeManager.getInstance();
    expect(instance1).toBe(instance2);
  });
});
