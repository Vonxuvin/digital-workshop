import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { eventBus } from '../../src/utils/EventBus';
import { ScoreObjectiveChecker } from '../../src/gameplay/objectives/ScoreObjectiveChecker';
import { MergeObjectiveChecker } from '../../src/gameplay/objectives/MergeObjectiveChecker';
import { ClearObstacleChecker } from '../../src/gameplay/objectives/ClearObstacleChecker';
import { SurvivalObjectiveChecker } from '../../src/gameplay/objectives/SurvivalObjectiveChecker';
import { createObjectiveChecker } from '../../src/gameplay/objectives/index';
import { ObjectiveContext } from '../../src/gameplay/objectives/ObjectiveChecker';
import { SaveManager } from '../../src/core/SaveManager';
import { LevelLoader } from '../../src/core/LevelLoader';

describe('LevelSystem', () => {
  let ls: LevelSystem;

  const scoreConfig: LevelConfig = {
    id: 1, name: '分数关卡', objective: { type: 'score', target: 100 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2, 4] },
    rewards: { stars: [50, 80, 100] },
  };

  const mergeConfig: LevelConfig = {
    id: 2, name: '合成关卡', objective: { type: 'target_merge', target: 16 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2, 4, 8] },
    rewards: { stars: [50, 80, 100] },
  };

  const obstacleConfig: LevelConfig = {
    id: 3, name: '障碍关卡', objective: { type: 'clear_obstacle', target: 3 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2, 4] },
    rewards: { stars: [50, 80, 100] },
  };

  const survivalConfig: LevelConfig = {
    id: 4, name: '生存关卡', objective: { type: 'survival', target: 10, timeLimit: 10 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2, 4] },
    rewards: { stars: [50, 80, 100] },
  };

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
    ls.update(10000);
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

  it('should emit game:timeout for non-survival levels with timeLimit when time runs out', () => {
    const timedConfig: LevelConfig = {
      id: 5, name: '限时关卡', objective: { type: 'score', target: 9999, timeLimit: 5 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [50, 80, 100] },
    };
    ls = new LevelSystem(timedConfig);
    ls.start();
    const handler = vi.fn();
    eventBus.on('game:timeout', handler);
    ls.update(5000);
    expect(handler).toHaveBeenCalled();
    eventBus.off('game:timeout', handler);
  });

  it('should still emit level:timeUpdate for non-survival levels with timeLimit', () => {
    const timedConfig: LevelConfig = {
      id: 5, name: '限时关卡', objective: { type: 'score', target: 9999, timeLimit: 5 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [50, 80, 100] },
    };
    ls = new LevelSystem(timedConfig);
    ls.start();
    const handler = vi.fn();
    eventBus.on('level:timeUpdate', handler);
    ls.update(1000);
    ls.update(1000);
    expect(handler).toHaveBeenCalledTimes(2);
    eventBus.off('level:timeUpdate', handler);
  });

  it('should complete survival level when timeLimit reached', () => {
    ls = new LevelSystem(survivalConfig);
    ls.start();
    ls.update(10000);
    expect(ls.isLevelCompleted()).toBe(true);
  });

  it('should emit level:timeUpdate on each second', () => {
    ls = new LevelSystem(survivalConfig);
    ls.start();
    const handler = vi.fn();
    eventBus.on('level:timeUpdate', handler);
    ls.update(1000);
    ls.update(1000);
    ls.update(1000);
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
    ls.update(20000);
  });

  it('should return 0 progress for target_merge', () => {
    ls = new LevelSystem(mergeConfig);
    expect(ls.getProgress()).toBe(0);
  });

  it('should return 0 progress for survival without timeLimit', () => {
    const noTimeConfig: LevelConfig = {
      id: 6, name: '无限制生存', objective: { type: 'survival', target: 10 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [50, 80, 100] },
    };
    ls = new LevelSystem(noTimeConfig);
    expect(ls.getProgress()).toBe(0);
  });

  it('暂停时应停止计时器', () => {
    const pauseConfig: LevelConfig = {
      id: 7, name: '暂停测试', objective: { type: 'survival', target: 60, timeLimit: 60 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [30, 40, 60] },
    };
    ls = new LevelSystem(pauseConfig);
    ls.start();
    ls.pause();
    ls.update(30000);
    expect(ls.getProgress()).toBe(0);
  });

  it('恢复时应继续计时', () => {
    const resumeConfig: LevelConfig = {
      id: 8, name: '恢复测试', objective: { type: 'survival', target: 120, timeLimit: 120 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [60, 80, 120] },
    };
    ls = new LevelSystem(resumeConfig);
    ls.start();
    ls.pause();
    ls.update(30000);
    ls.resume();
    ls.update(30000);
    expect(ls.getProgress()).toBe(0.25);
  });

  it('destroy应清理事件监听', () => {
    const removeSpy = vi.spyOn(eventBus, 'off');
    ls = new LevelSystem(scoreConfig);
    ls.destroy();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('forceComplete应强制完成关卡', () => {
    ls = new LevelSystem(scoreConfig);
    const spy = vi.spyOn(eventBus, 'emit');
    ls.forceComplete();
    expect(ls.isLevelCompleted()).toBe(true);
  });

  it('应正确返回配置属性', () => {
    const testConfig: LevelConfig = {
      id: 9, name: '属性测试', objective: { type: 'score', target: 100 },
      container: { width: 500, height: 700, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 8] },
      rewards: { stars: [50, 80, 100] },
    };
    ls = new LevelSystem(testConfig);
    expect(ls.containerWidth).toBe(500);
    expect(ls.containerHeight).toBe(700);
    expect(ls.availableNumbers).toEqual([1, 2, 8]);
  });

  it('getConfig应返回完整配置', () => {
    const testConfig: LevelConfig = {
      id: 10, name: '配置测试', objective: { type: 'score', target: 200 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [100, 150, 200] },
    };
    ls = new LevelSystem(testConfig);
    expect(ls.getConfig()).toEqual(testConfig);
  });

  describe('stopTimer() is idempotent', () => {
    it('calling stopTimer() multiple times does not throw', () => {
      ls = new LevelSystem(survivalConfig);
      ls.start();
      expect(() => {
        ls.stopTimer();
        ls.stopTimer();
        ls.stopTimer();
      }).not.toThrow();
    });
  });

  describe('MEMORY LEAK: Event listeners never cleaned up', () => {
    it('creating multiple LevelSystem instances causes duplicate event handling', () => {
      const ls1 = new LevelSystem(scoreConfig);
      const ls2 = new LevelSystem(scoreConfig);
      const handler = vi.fn();
      eventBus.on('level:completed', handler);

      eventBus.emit('score:updated', { totalScore: 150 });

      const levelCompletedCalls = handler.mock.calls.filter((call: any[]) =>
        call[0] && call[0].levelId !== undefined
      );
      expect(levelCompletedCalls.length).toBeGreaterThanOrEqual(2);

      ls1.reset();
      ls2.reset();
    });
  });

  it('should complete immediately with target score of 0', () => {
    const config: LevelConfig = {
      id: 20, name: 'Zero Target', objective: { type: 'score', target: 0 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [50, 80, 100] },
    };
    ls = new LevelSystem(config);
    ls.start();
    eventBus.emit('score:updated', { totalScore: 0 });
    expect(ls.isLevelCompleted()).toBe(true);
  });

  it('FIXED: survival with timeLimit of 0 now starts timer', () => {
    const config: LevelConfig = {
      id: 23, name: 'Zero Time Limit', objective: { type: 'survival', target: 0, timeLimit: 0 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [50, 80, 100] },
    };
    ls = new LevelSystem(config);
    ls.start();
    ls.update(1000);
    expect(ls.isLevelCompleted()).toBe(true);
  });

  it('should handle very large timeLimit values', () => {
    const config: LevelConfig = {
      id: 24, name: 'Large Time Limit', objective: { type: 'survival', target: 0, timeLimit: 999999 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [50, 80, 100] },
    };
    ls = new LevelSystem(config);
    ls.start();
    ls.update(5000);
    expect(ls.isLevelCompleted()).toBe(false);
    expect(ls.getProgress()).toBeGreaterThan(0);
    expect(ls.getProgress()).toBeLessThan(1);
  });

  it('should handle score objective with extremely large target', () => {
    const config: LevelConfig = {
      id: 26, name: 'Huge Score Target', objective: { type: 'score', target: Number.MAX_SAFE_INTEGER },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [50, 80, 100] },
    };
    ls = new LevelSystem(config);
    ls.start();
    eventBus.emit('score:updated', { totalScore: 1000000 });
    expect(ls.isLevelCompleted()).toBe(false);
    expect(ls.getProgress()).toBeLessThan(0.001);
  });
});

describe('ScoreObjectiveChecker', () => {
  let checker: ScoreObjectiveChecker;

  beforeEach(() => {
    checker = new ScoreObjectiveChecker();
  });

  it('should return true when currentScore >= targetValue', () => {
    const ctx: ObjectiveContext = {
      currentScore: 100, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 100,
    };
    expect(checker.check(ctx)).toBe(true);
  });

  it('should return true when currentScore > targetValue', () => {
    const ctx: ObjectiveContext = {
      currentScore: 150, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 100,
    };
    expect(checker.check(ctx)).toBe(true);
  });

  it('should return false when currentScore < targetValue', () => {
    const ctx: ObjectiveContext = {
      currentScore: 50, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 100,
    };
    expect(checker.check(ctx)).toBe(false);
  });

  it('should return progress as ratio', () => {
    const ctx: ObjectiveContext = {
      currentScore: 50, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 100,
    };
    expect(checker.getProgress(ctx)).toBe(0.5);
  });

  it('should cap progress at 1', () => {
    const ctx: ObjectiveContext = {
      currentScore: 200, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 100,
    };
    expect(checker.getProgress(ctx)).toBe(1);
  });

  it('should return 0 progress when score is 0', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 100,
    };
    expect(checker.getProgress(ctx)).toBe(0);
  });
});

describe('MergeObjectiveChecker', () => {
  let checker: MergeObjectiveChecker;

  beforeEach(() => {
    checker = new MergeObjectiveChecker();
  });

  it('should return true when highestMergeValue >= targetValue', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 16, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 16,
    };
    expect(checker.check(ctx)).toBe(true);
  });

  it('should return false when highestMergeValue < targetValue', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 8, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 16,
    };
    expect(checker.check(ctx)).toBe(false);
  });

  it('should return progress as logarithmic ratio', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 8, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 16,
    };
    expect(checker.getProgress(ctx)).toBeCloseTo(Math.log2(8) / Math.log2(16));
  });

  it('should cap progress at 1', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 32, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 16,
    };
    expect(checker.getProgress(ctx)).toBe(1);
  });

  it('should return 1 when targetValue is 0', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 0,
    };
    expect(checker.getProgress(ctx)).toBe(1);
  });

  it('should return 1 when targetValue is negative', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 0, targetValue: -5,
    };
    expect(checker.getProgress(ctx)).toBe(1);
  });
});

describe('ClearObstacleChecker', () => {
  let checker: ClearObstacleChecker;

  beforeEach(() => {
    checker = new ClearObstacleChecker();
  });

  it('should return true when obstaclesCleared >= targetValue', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 5,
      survivalTime: 0, targetValue: 5,
    };
    expect(checker.check(ctx)).toBe(true);
  });

  it('should return false when obstaclesCleared < targetValue', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 2,
      survivalTime: 0, targetValue: 5,
    };
    expect(checker.check(ctx)).toBe(false);
  });

  it('should return progress as ratio', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 2,
      survivalTime: 0, targetValue: 5,
    };
    expect(checker.getProgress(ctx)).toBeCloseTo(0.4);
  });

  it('should cap progress at 1', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 10,
      survivalTime: 0, targetValue: 5,
    };
    expect(checker.getProgress(ctx)).toBe(1);
  });

  it('should return 1 when targetValue is 0', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 0, targetValue: 0,
    };
    expect(checker.getProgress(ctx)).toBe(1);
  });

  it('should return 1 when targetValue is negative', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 0, targetValue: -1,
    };
    expect(checker.getProgress(ctx)).toBe(1);
  });
});

describe('SurvivalObjectiveChecker', () => {
  let checker: SurvivalObjectiveChecker;

  beforeEach(() => {
    checker = new SurvivalObjectiveChecker();
  });

  it('should return true when survivalTime >= targetValue', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 30, targetValue: 30,
    };
    expect(checker.check(ctx)).toBe(true);
  });

  it('should return false when survivalTime < targetValue', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 10, targetValue: 30,
    };
    expect(checker.check(ctx)).toBe(false);
  });

  it('should return progress as ratio', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 15, targetValue: 30,
    };
    expect(checker.getProgress(ctx)).toBe(0.5);
  });

  it('should cap progress at 1', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 60, targetValue: 30,
    };
    expect(checker.getProgress(ctx)).toBe(1);
  });

  it('should return 0 when targetValue is 0', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 10, targetValue: 0,
    };
    expect(checker.getProgress(ctx)).toBe(0);
  });

  it('should return 0 when targetValue is negative', () => {
    const ctx: ObjectiveContext = {
      currentScore: 0, highestMergeValue: 0, obstaclesCleared: 0,
      survivalTime: 10, targetValue: -5,
    };
    expect(checker.getProgress(ctx)).toBe(0);
  });
});

describe('createObjectiveChecker', () => {
  it('should create ScoreObjectiveChecker for score type', () => {
    const checker = createObjectiveChecker('score');
    expect(checker).toBeInstanceOf(ScoreObjectiveChecker);
  });

  it('should create MergeObjectiveChecker for target_merge type', () => {
    const checker = createObjectiveChecker('target_merge');
    expect(checker).toBeInstanceOf(MergeObjectiveChecker);
  });

  it('should create ClearObstacleChecker for clear_obstacle type', () => {
    const checker = createObjectiveChecker('clear_obstacle');
    expect(checker).toBeInstanceOf(ClearObstacleChecker);
  });

  it('should create SurvivalObjectiveChecker for survival type', () => {
    const checker = createObjectiveChecker('survival');
    expect(checker).toBeInstanceOf(SurvivalObjectiveChecker);
  });
});

describe('SaveManager', () => {
  let sm: SaveManager;

  beforeEach(async () => {
    (SaveManager as any).instance = undefined;
    sm = SaveManager.getInstance();
    await sm.init();
    await sm.reset();
  });

  it('should be singleton', () => {
    const a = SaveManager.getInstance();
    const b = SaveManager.getInstance();
    expect(a).toBe(b);
  });

  it('should return default progress for unknown level', () => {
    const progress = sm.getLevelProgress(99);
    expect(progress.unlocked).toBe(false);
    expect(progress.stars).toBe(0);
    expect(progress.highScore).toBe(0);
  });

  it('should return unlocked for level 1 by default', () => {
    const progress = sm.getLevelProgress(1);
    expect(progress.unlocked).toBe(true);
  });

  it('should update level progress', () => {
    sm.updateLevelProgress(1, 500, 30, 2, true);
    const progress = sm.getLevelProgress(1);
    expect(progress.stars).toBe(2);
    expect(progress.highScore).toBe(500);
  });

  it('should only update if new stars or score is better', () => {
    sm.updateLevelProgress(1, 500, 30, 2, true);
    sm.updateLevelProgress(1, 300, 20, 1, true);
    const progress = sm.getLevelProgress(1);
    expect(progress.stars).toBe(2);
    expect(progress.highScore).toBe(500);
  });

  it('should update score independently if better', () => {
    sm.updateLevelProgress(1, 500, 30, 1, true);
    sm.updateLevelProgress(1, 800, 25, 1, true);
    const progress = sm.getLevelProgress(1);
    expect(progress.highScore).toBe(800);
  });

  it('should unlock level 1 always', () => {
    expect(sm.getLevelProgress(1).unlocked).toBe(true);
  });

  it('should not unlock level 2 if level 1 has no stars', () => {
    expect(sm.getLevelProgress(2).unlocked).toBe(false);
  });

  it('should unlock level 2 if level 1 has stars', () => {
    sm.updateLevelProgress(1, 100, 30, 1, true);
    expect(sm.getLevelProgress(2).unlocked).toBe(true);
  });

  it('should persist and load data', async () => {
    sm.updateLevelProgress(1, 1000, 60, 3, true);
    await sm.save();

    const sharedPlatform = (sm as any).platform;
    (SaveManager as any).instance = undefined;
    const sm2 = SaveManager.getInstance();
    (sm2 as any).platform = sharedPlatform;
    await sm2.load();

    expect(sm2.getLevelProgress(1).stars).toBe(3);
    expect(sm2.getLevelProgress(1).highScore).toBe(1000);
  });

  it('should reset all progress', async () => {
    sm.updateLevelProgress(1, 1000, 60, 3, true);
    await sm.reset();
    const progress = sm.getLevelProgress(1);
    expect(progress.unlocked).toBe(true);
    expect(progress.stars).toBe(0);
    expect(progress.highScore).toBe(0);
  });

  it('should handle corrupted storage data', async () => {
    const platform = (sm as any).platform;
    await platform.setStorage('digital_workshop_save', 'not valid json');
    (SaveManager as any).instance = undefined;
    const sm2 = SaveManager.getInstance();
    await sm2.load();
    const progress = sm2.getLevelProgress(1);
    expect(progress.unlocked).toBe(true);
    expect(progress.stars).toBe(0);
    expect(progress.highScore).toBe(0);
  });

  it('should handle version mismatch', async () => {
    const platform = (sm as any).platform;
    await platform.setStorage('digital_workshop_save', JSON.stringify({
      version: 999,
      levels: { 1: { unlocked: true, stars: 3, highScore: 1000 } },
    }));
    (SaveManager as any).instance = undefined;
    const sm2 = SaveManager.getInstance();
    await sm2.load();
    const progress = sm2.getLevelProgress(1);
    expect(progress.unlocked).toBe(true);
    expect(progress.stars).toBe(0);
    expect(progress.highScore).toBe(0);
  });
});

describe('LevelLoader validateConfig', () => {
  let loader: LevelLoader;

  beforeEach(() => {
    loader = LevelLoader.getInstance();
    loader.clearCache();
  });

  it('should validate a correct config', () => {
    const data = {
      id: 1,
      name: '新手入门',
      objective: { type: 'score', target: 500 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1, 2, 4] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject null data', () => {
    const result = loader.validateConfig(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject missing required fields', () => {
    const result = loader.validateConfig({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('缺少必填字段: id');
    expect(result.errors).toContain('缺少必填字段: name');
    expect(result.errors).toContain('缺少必填字段: objective');
    expect(result.errors).toContain('缺少必填字段: container');
    expect(result.errors).toContain('缺少必填字段: spawn');
  });

  it('should reject invalid id', () => {
    const data = {
      id: 0,
      name: 'test',
      objective: { type: 'score', target: 100 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('id 必须 >= 1');
  });

  it('should reject non-number id', () => {
    const data = {
      id: 'one',
      name: 'test',
      objective: { type: 'score', target: 100 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('id 必须是数字');
  });

  it('should reject empty name', () => {
    const data = {
      id: 1,
      name: '',
      objective: { type: 'score', target: 100 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('name 不能为空');
  });

  it('should reject invalid objective type', () => {
    const data = {
      id: 1,
      name: 'test',
      objective: { type: 'invalid', target: 100 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('objective.type'))).toBe(true);
  });

  it('should reject negative target', () => {
    const data = {
      id: 1,
      name: 'test',
      objective: { type: 'score', target: -10 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('objective.target 必须 >= 0');
  });

  it('should reject container width < 100', () => {
    const data = {
      id: 1,
      name: 'test',
      objective: { type: 'score', target: 100 },
      container: { width: 50, height: 600 },
      spawn: { availableNumbers: [1] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('container.width 必须 >= 100');
  });

  it('should reject container height < 100', () => {
    const data = {
      id: 1,
      name: 'test',
      objective: { type: 'score', target: 100 },
      container: { width: 400, height: 50 },
      spawn: { availableNumbers: [1] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('container.height 必须 >= 100');
  });

  it('should reject empty availableNumbers', () => {
    const data = {
      id: 1,
      name: 'test',
      objective: { type: 'score', target: 100 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('spawn.availableNumbers 至少需要 1 个元素');
  });

  it('should reject invalid obstacle value', () => {
    const data = {
      id: 1,
      name: 'test',
      objective: { type: 'score', target: 100 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1] },
      obstacles: [{ x: 100, y: 200, value: 0 }],
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('obstacles[0].value 必须 >= 1');
  });

  it('should reject rewards.stars with wrong length', () => {
    const data = {
      id: 1,
      name: 'test',
      objective: { type: 'score', target: 100 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1] },
      rewards: { stars: [100, 200] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('rewards.stars 必须包含 3 个元素');
  });

  it('should validate a full config with all optional fields', () => {
    const data = {
      id: 1,
      name: '完整关卡',
      objective: { type: 'survival', target: 100, timeLimit: 120 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4], spawnInterval: 2 },
      obstacles: [{ x: 100, y: 200, value: 5 }],
      rewards: { stars: [300, 400, 500], blueprintFragments: 2 },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid container shape', () => {
    const data = {
      id: 1,
      name: 'test',
      objective: { type: 'score', target: 100 },
      container: { width: 400, height: 600, shape: 'triangle' },
      spawn: { availableNumbers: [1] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('container.shape'))).toBe(true);
  });

  it('should reject negative blueprintFragments', () => {
    const data = {
      id: 1,
      name: 'test',
      objective: { type: 'score', target: 100 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1] },
      rewards: { blueprintFragments: -1 },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('rewards.blueprintFragments 必须 >= 0');
  });

  it('should reject negative timeLimit', () => {
    const data = {
      id: 1,
      name: 'test',
      objective: { type: 'score', target: 100, timeLimit: -5 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1] },
    };
    const result = loader.validateConfig(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('objective.timeLimit 必须 >= 0');
  });
});

describe('LevelSystem - 计时器功能（复活/暂停/恢复）', () => {
  const timedConfig: LevelConfig = {
    id: 10, name: '计时测试', objective: { type: 'survival', target: 30, timeLimit: 30 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2] },
    rewards: { stars: [15, 20, 30] },
  };

  const nonSurvivalTimedConfig: LevelConfig = {
    id: 11, name: '限时非生存', objective: { type: 'score', target: 100, timeLimit: 20 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2] },
    rewards: { stars: [50, 80, 100] },
  };

  const noTimeLimitConfig: LevelConfig = {
    id: 12, name: '无限时', objective: { type: 'score', target: 100 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2] },
    rewards: { stars: [50, 80, 100] },
  };

  describe('stopTimer / resumeTimer', () => {
    it('stopTimer后update不应推进计时', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.stopTimer();
      ls.update(5000);
      expect(ls.getProgress()).toBe(0);
    });

    it('resumeTimer应恢复计时器运行', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.stopTimer();
      ls.update(5000);
      ls.resumeTimer();
      ls.update(5000);
      expect(ls.getProgress()).toBeGreaterThan(0);
    });

    it('resumeTimer应重置timerStopped和isPaused', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.pause();
      ls.stopTimer();
      ls.resumeTimer();
      ls.update(1000);
      expect(ls.getProgress()).toBeGreaterThan(0);
    });

    it('stopTimer后resume不能恢复计时（resume只重置isPaused）', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.stopTimer();
      ls.resume();
      ls.update(5000);
      expect(ls.getProgress()).toBe(0);
    });

    it('stopTimer后resumeTimer才能恢复计时', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.stopTimer();
      ls.resume();
      ls.update(3000);
      const progressAfterResume = ls.getProgress();
      ls.resumeTimer();
      ls.update(3000);
      expect(ls.getProgress()).toBeGreaterThan(progressAfterResume);
    });
  });

  describe('applyTimerPenalty', () => {
    it('应减少剩余时间', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.applyTimerPenalty(10);
      const remaining = ls.getRemainingTime();
      expect(remaining).toBe(20);
    });

    it('不应将timerElapsed推到超过timeLimit', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.applyTimerPenalty(40);
      const remaining = ls.getRemainingTime();
      expect(remaining).toBe(0);
    });

    it('无timeLimit时不应用惩罚', () => {
      const ls = new LevelSystem(noTimeLimitConfig);
      ls.start();
      ls.applyTimerPenalty(10);
      expect(ls.getRemainingTime()).toBe(-1);
    });

    it('应更新survivalTime', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.applyTimerPenalty(5);
      expect(ls.getProgress()).toBeGreaterThan(0);
    });
  });

  describe('getRemainingTime', () => {
    it('无timeLimit时返回-1', () => {
      const ls = new LevelSystem(noTimeLimitConfig);
      expect(ls.getRemainingTime()).toBe(-1);
    });

    it('初始返回timeLimit', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      expect(ls.getRemainingTime()).toBe(30);
    });

    it('经过时间后应返回正确剩余', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.update(15000);
      expect(ls.getRemainingTime()).toBe(15);
    });

    it('不应返回负数', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.update(35000);
      expect(ls.getRemainingTime()).toBe(0);
    });
  });

  describe('模拟复活流程（stopTimer → resumeTimer + applyTimerPenalty）', () => {
    it('复活后计时器应恢复运行并应用惩罚', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.update(10000);
      expect(ls.getRemainingTime()).toBe(20);

      ls.stopTimer();
      ls.update(5000);
      expect(ls.getRemainingTime()).toBe(20);

      ls.resumeTimer();
      ls.applyTimerPenalty(10);
      expect(ls.getRemainingTime()).toBe(10);

      ls.update(5000);
      expect(ls.getRemainingTime()).toBe(5);
    });

    it('复活后计时器应继续触发timeUpdate事件', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.update(1000);
      ls.stopTimer();

      const handler = vi.fn();
      eventBus.on('level:timeUpdate', handler);
      ls.resumeTimer();
      ls.applyTimerPenalty(5);
      ls.update(1000);
      ls.update(1000);
      expect(handler).toHaveBeenCalled();
      eventBus.off('level:timeUpdate', handler);
    });

    it('非生存关卡复活后计时器也应恢复', () => {
      const ls = new LevelSystem(nonSurvivalTimedConfig);
      ls.start();
      ls.update(5000);
      ls.stopTimer();

      const handler = vi.fn();
      eventBus.on('level:timeUpdate', handler);

      ls.resumeTimer();
      ls.applyTimerPenalty(10);
      ls.update(1000);
      ls.update(1000);

      expect(handler).toHaveBeenCalled();
      eventBus.off('level:timeUpdate', handler);
    });
  });
});
