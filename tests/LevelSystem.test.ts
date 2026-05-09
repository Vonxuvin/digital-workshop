import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LevelSystem, LevelConfig } from '../src/gameplay/LevelSystem';
import { eventBus } from '../src/utils/EventBus';

describe('LevelSystem', () => {
  let ls: LevelSystem;

  const scoreConfig: LevelConfig = {
    id: 1, name: '分数关卡', objective: { type: 'score', target: 100 },
    containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2, 4],
  };

  const mergeConfig: LevelConfig = {
    id: 2, name: '合成关卡', objective: { type: 'target_merge', target: 16 },
    containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2, 4, 8],
  };

  const obstacleConfig: LevelConfig = {
    id: 3, name: '障碍关卡', objective: { type: 'clear_obstacle', target: 3 },
    containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2, 4],
  };

  const survivalConfig: LevelConfig = {
    id: 4, name: '生存关卡', objective: { type: 'survival', target: 10, timeLimit: 10 },
    containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2, 4],
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize correctly', () => {
    ls = new LevelSystem(scoreConfig);
    expect(ls.getConfig()).toBe(scoreConfig);
    expect(ls.isLevelCompleted()).toBe(false);
    expect(ls.getProgress()).toBe(0);
  });

  it('should complete score objective', () => {
    ls = new LevelSystem(scoreConfig);
    ls.start();
    eventBus.emit('score:updated', { totalScore: 150 });
    expect(ls.isLevelCompleted()).toBe(true);
    expect(ls.getProgress()).toBe(1);
  });

  it('should not complete score objective if not enough', () => {
    ls = new LevelSystem(scoreConfig);
    ls.start();
    eventBus.emit('score:updated', { totalScore: 50 });
    expect(ls.isLevelCompleted()).toBe(false);
    expect(ls.getProgress()).toBe(0.5);
  });

  it('should complete target_merge objective', () => {
    ls = new LevelSystem(mergeConfig);
    ls.start();
    eventBus.emit('block:merged', { newValue: 16, chainCount: 1 });
    expect(ls.isLevelCompleted()).toBe(true);
  });

  it('should not complete target_merge with lower value', () => {
    ls = new LevelSystem(mergeConfig);
    ls.start();
    eventBus.emit('block:merged', { newValue: 8, chainCount: 1 });
    expect(ls.isLevelCompleted()).toBe(false);
  });

  it('should complete clear_obstacle objective', () => {
    ls = new LevelSystem(obstacleConfig);
    ls.start();
    eventBus.emit('obstacle:cleared', {});
    eventBus.emit('obstacle:cleared', {});
    eventBus.emit('obstacle:cleared', {});
    expect(ls.isLevelCompleted()).toBe(true);
    expect(ls.getProgress()).toBe(1);
  });

  it('should track obstacle progress', () => {
    ls = new LevelSystem(obstacleConfig);
    ls.start();
    eventBus.emit('obstacle:cleared', {});
    expect(ls.getProgress()).toBeCloseTo(1 / 3);
  });

  it('should complete survival objective after time', () => {
    ls = new LevelSystem(survivalConfig);
    ls.start();
    vi.advanceTimersByTime(10000);
    expect(ls.isLevelCompleted()).toBe(true);
  });

  it('should emit level:completed event', () => {
    ls = new LevelSystem(scoreConfig);
    ls.start();
    const handler = vi.fn();
    eventBus.on('level:completed', handler);
    eventBus.emit('score:updated', { totalScore: 150 });
    expect(handler).toHaveBeenCalled();
  });

  it('should emit game:timeout when time runs out for non-survival', () => {
    const timedConfig: LevelConfig = {
      id: 5, name: '限时关卡', objective: { type: 'score', target: 9999, timeLimit: 5 },
      containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2],
    };
    ls = new LevelSystem(timedConfig);
    ls.start();
    const handler = vi.fn();
    eventBus.on('game:timeout', handler);
    vi.advanceTimersByTime(5000);
    expect(handler).toHaveBeenCalled();
  });

  it('should emit level:timeUpdate on each second', () => {
    ls = new LevelSystem(survivalConfig);
    ls.start();
    const handler = vi.fn();
    eventBus.on('level:timeUpdate', handler);
    vi.advanceTimersByTime(3000);
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('should not double-complete level', () => {
    ls = new LevelSystem(scoreConfig);
    ls.start();
    eventBus.emit('score:updated', { totalScore: 150 });
    expect(ls.isLevelCompleted()).toBe(true);
    const handler = vi.fn();
    eventBus.on('level:completed', handler);
    eventBus.emit('score:updated', { totalScore: 200 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should reset correctly', () => {
    ls = new LevelSystem(scoreConfig);
    ls.start();
    eventBus.emit('score:updated', { totalScore: 150 });
    expect(ls.isLevelCompleted()).toBe(true);
    ls.reset();
    expect(ls.isLevelCompleted()).toBe(false);
    expect(ls.getProgress()).toBe(0);
  });

  it('should stop timer on reset', () => {
    ls = new LevelSystem(survivalConfig);
    ls.start();
    ls.reset();
    vi.advanceTimersByTime(20000);
  });

  it('should return 0 progress for target_merge', () => {
    ls = new LevelSystem(mergeConfig);
    expect(ls.getProgress()).toBe(0);
  });

  it('should return 0 progress for survival without timeLimit', () => {
    const noTimeConfig: LevelConfig = {
      id: 6, name: '无限制生存', objective: { type: 'survival', target: 10 },
      containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2],
    };
    ls = new LevelSystem(noTimeConfig);
    expect(ls.getProgress()).toBe(0);
  });
});
