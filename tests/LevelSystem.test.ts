import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LevelSystem, LevelConfig } from '../src/gameplay/LevelSystem';
import { eventBus } from '../src/utils/EventBus';

describe('LevelSystem', () => {
  let levelSystem: LevelSystem;

  const createConfig = (type: string, target: number, timeLimit?: number): LevelConfig => ({
    id: 1,
    name: '测试关卡',
    objective: {
      type: type as any,
      target,
      timeLimit,
    },
    containerWidth: 400,
    containerHeight: 600,
    availableNumbers: [1, 2, 4],
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should complete score objective', () => {
    levelSystem = new LevelSystem(createConfig('score', 100));
    levelSystem.start();

    eventBus.emit('score:updated', { totalScore: 150 });
    expect(levelSystem.isLevelCompleted()).toBe(true);
  });

  it('should complete target_merge objective', () => {
    levelSystem = new LevelSystem(createConfig('target_merge', 16));
    levelSystem.start();

    eventBus.emit('block:merged', { newValue: 16, chainCount: 1 });
    expect(levelSystem.isLevelCompleted()).toBe(true);
  });

  it('should complete clear_obstacle objective', () => {
    levelSystem = new LevelSystem(createConfig('clear_obstacle', 3));
    levelSystem.start();

    eventBus.emit('obstacle:cleared', {});
    eventBus.emit('obstacle:cleared', {});
    eventBus.emit('obstacle:cleared', {});

    expect(levelSystem.isLevelCompleted()).toBe(true);
  });

  it('should track progress correctly', () => {
    levelSystem = new LevelSystem(createConfig('score', 1000));
    levelSystem.start();

    eventBus.emit('score:updated', { totalScore: 500 });
    expect(levelSystem.getProgress()).toBe(0.5);
  });
});
