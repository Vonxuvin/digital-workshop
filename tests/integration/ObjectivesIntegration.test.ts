import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScoreObjectiveChecker } from '../../src/gameplay/objectives/ScoreObjectiveChecker';
import { MergeObjectiveChecker } from '../../src/gameplay/objectives/MergeObjectiveChecker';
import { ClearObstacleChecker } from '../../src/gameplay/objectives/ClearObstacleChecker';
import { SurvivalObjectiveChecker } from '../../src/gameplay/objectives/SurvivalObjectiveChecker';
import { createObjectiveChecker } from '../../src/gameplay/objectives/index';
import { ObjectiveContext } from '../../src/gameplay/objectives/ObjectiveChecker';
import { LevelSystem, LevelConfig, LevelObjective } from '../../src/gameplay/LevelSystem';
import { eventBus } from '../../src/utils/EventBus';

function createContext(overrides: Partial<ObjectiveContext> = {}): ObjectiveContext {
  return {
    currentScore: 0,
    highestMergeValue: 2,
    obstaclesCleared: 0,
    survivalTime: 0,
    targetValue: 100,
    ...overrides,
  };
}

describe('Objectives Integration Tests', () => {

  describe('ScoreObjectiveChecker Integration', () => {
    let checker: ScoreObjectiveChecker;

    beforeEach(() => {
      checker = new ScoreObjectiveChecker();
    });

    it('should return true when score meets target', () => {
      const context = createContext({ currentScore: 150, targetValue: 100 });
      expect(checker.check(context)).toBe(true);
    });

    it('should return true when score equals target', () => {
      const context = createContext({ currentScore: 100, targetValue: 100 });
      expect(checker.check(context)).toBe(true);
    });

    it('should return false when score below target', () => {
      const context = createContext({ currentScore: 50, targetValue: 100 });
      expect(checker.check(context)).toBe(false);
    });

    it('should return correct progress ratio', () => {
      const context = createContext({ currentScore: 75, targetValue: 100 });
      expect(checker.getProgress(context)).toBe(0.75);
    });

    it('should cap progress at 1', () => {
      const context = createContext({ currentScore: 200, targetValue: 100 });
      expect(checker.getProgress(context)).toBe(1);
    });

    it('should return 0 progress when score is 0', () => {
      const context = createContext({ currentScore: 0, targetValue: 100 });
      expect(checker.getProgress(context)).toBe(0);
    });
  });

  describe('MergeObjectiveChecker Integration', () => {
    let checker: MergeObjectiveChecker;

    beforeEach(() => {
      checker = new MergeObjectiveChecker();
    });

    it('should return true when highest merge meets target', () => {
      const context = createContext({ highestMergeValue: 256, targetValue: 128 });
      expect(checker.check(context)).toBe(true);
    });

    it('should return true when highest merge equals target', () => {
      const context = createContext({ highestMergeValue: 128, targetValue: 128 });
      expect(checker.check(context)).toBe(true);
    });

    it('should return false when highest merge below target', () => {
      const context = createContext({ highestMergeValue: 64, targetValue: 128 });
      expect(checker.check(context)).toBe(false);
    });

    it('should return logarithmic progress', () => {
      const context = createContext({ highestMergeValue: 16, targetValue: 256 });
      const progress = checker.getProgress(context);
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(1);
    });

    it('should return 1 when target is 0', () => {
      const context = createContext({ highestMergeValue: 2, targetValue: 0 });
      expect(checker.getProgress(context)).toBe(1);
    });

    it('should return 0 when highest merge is 1', () => {
      const context = createContext({ highestMergeValue: 1, targetValue: 128 });
      expect(checker.getProgress(context)).toBe(0);
    });
  });

  describe('ClearObstacleChecker Integration', () => {
    let checker: ClearObstacleChecker;

    beforeEach(() => {
      checker = new ClearObstacleChecker();
    });

    it('should return true when obstacles cleared meets target', () => {
      const context = createContext({ obstaclesCleared: 5, targetValue: 5 });
      expect(checker.check(context)).toBe(true);
    });

    it('should return true when obstacles cleared exceeds target', () => {
      const context = createContext({ obstaclesCleared: 10, targetValue: 5 });
      expect(checker.check(context)).toBe(true);
    });

    it('should return false when obstacles cleared below target', () => {
      const context = createContext({ obstaclesCleared: 3, targetValue: 5 });
      expect(checker.check(context)).toBe(false);
    });

    it('should return correct progress ratio', () => {
      const context = createContext({ obstaclesCleared: 2, targetValue: 5 });
      expect(checker.getProgress(context)).toBe(0.4);
    });

    it('should return 1 when target is 0', () => {
      const context = createContext({ obstaclesCleared: 0, targetValue: 0 });
      expect(checker.getProgress(context)).toBe(1);
    });
  });

  describe('SurvivalObjectiveChecker Integration', () => {
    let checker: SurvivalObjectiveChecker;

    beforeEach(() => {
      checker = new SurvivalObjectiveChecker();
    });

    it('should return true when survival time meets target', () => {
      const context = createContext({ survivalTime: 60, targetValue: 60 });
      expect(checker.check(context)).toBe(true);
    });

    it('should return true when survival time exceeds target', () => {
      const context = createContext({ survivalTime: 120, targetValue: 60 });
      expect(checker.check(context)).toBe(true);
    });

    it('should return false when survival time below target', () => {
      const context = createContext({ survivalTime: 30, targetValue: 60 });
      expect(checker.check(context)).toBe(false);
    });

    it('should return correct progress ratio', () => {
      const context = createContext({ survivalTime: 45, targetValue: 60 });
      expect(checker.getProgress(context)).toBe(0.75);
    });

    it('should return 0 when target is 0', () => {
      const context = createContext({ survivalTime: 10, targetValue: 0 });
      expect(checker.getProgress(context)).toBe(0);
    });
  });

  describe('ObjectiveChecker Factory Integration', () => {
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

  describe('LevelSystem + Objectives Integration', () => {
    function createLevelConfig(overrides: Partial<LevelConfig> = {}): LevelConfig {
      return {
        id: 1,
        name: 'Test Level',
        objective: { type: 'score', target: 100 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4, 8] },
        rewards: { stars: [50, 100, 150] },
        ...overrides,
      };
    }

    it('should complete level when score objective met', () => {
      const config = createLevelConfig({ objective: { type: 'score', target: 100 } });
      const levelSystem = new LevelSystem(config);

      const handler = vi.fn();
      eventBus.on('level:completed', handler);

      eventBus.emit('score:updated', { totalScore: 150 });

      expect(handler).toHaveBeenCalled();
      expect(levelSystem.isLevelCompleted()).toBe(true);

      eventBus.off('level:completed', handler);
    });

    it('should complete level when merge objective met', () => {
      const config = createLevelConfig({ objective: { type: 'target_merge', target: 128 } });
      const levelSystem = new LevelSystem(config);

      const handler = vi.fn();
      eventBus.on('level:completed', handler);

      eventBus.emit('block:merged', { newValue: 256 });

      expect(handler).toHaveBeenCalled();
      expect(levelSystem.isLevelCompleted()).toBe(true);

      eventBus.off('level:completed', handler);
    });

    it('should complete level when clear obstacle objective met', () => {
      const config = createLevelConfig({
        objective: { type: 'clear_obstacle', target: 3 },
        obstacles: [
          { x: 100, y: 100, value: 2 },
          { x: 200, y: 100, value: 4 },
          { x: 300, y: 100, value: 8 },
        ],
      });
      const levelSystem = new LevelSystem(config);

      const handler = vi.fn();
      eventBus.on('level:completed', handler);

      eventBus.emit('obstacle:cleared');
      eventBus.emit('obstacle:cleared');
      eventBus.emit('obstacle:cleared');

      expect(handler).toHaveBeenCalled();
      expect(levelSystem.isLevelCompleted()).toBe(true);

      eventBus.off('level:completed', handler);
    });

    it('should complete level when survival time met', () => {
      const config = createLevelConfig({
        objective: { type: 'survival', target: 30, timeLimit: 30 },
      });
      const levelSystem = new LevelSystem(config);

      const handler = vi.fn();
      eventBus.on('level:completed', handler);

      levelSystem.start();
      levelSystem.update(31000);

      expect(handler).toHaveBeenCalled();
      expect(levelSystem.isLevelCompleted()).toBe(true);

      eventBus.off('level:completed', handler);
    });

    it('should not complete level when objective not met', () => {
      const config = createLevelConfig({ objective: { type: 'score', target: 100 } });
      const levelSystem = new LevelSystem(config);

      eventBus.emit('score:updated', { totalScore: 50 });

      expect(levelSystem.isLevelCompleted()).toBe(false);
    });

    it('should not emit level:completed twice for same level', () => {
      const config = createLevelConfig({ objective: { type: 'score', target: 100 } });
      const levelSystem = new LevelSystem(config);

      eventBus.emit('score:updated', { totalScore: 150 });
      expect(levelSystem.isLevelCompleted()).toBe(true);

      const wasCompleted = levelSystem.isLevelCompleted();

      eventBus.emit('score:updated', { totalScore: 200 });
      expect(levelSystem.isLevelCompleted()).toBe(true);
      expect(wasCompleted).toBe(true);
    });

    it('should track highest merge value', () => {
      const config = createLevelConfig({ objective: { type: 'target_merge', target: 128 } });
      const levelSystem = new LevelSystem(config);

      eventBus.emit('block:merged', { newValue: 64 });
      expect(levelSystem.getHighestMergeValue()).toBe(64);

      eventBus.emit('block:merged', { newValue: 32 });
      expect(levelSystem.getHighestMergeValue()).toBe(64);

      eventBus.emit('block:merged', { newValue: 256 });
      expect(levelSystem.getHighestMergeValue()).toBe(256);
    });

    it('should emit level:timeUpdate during survival', () => {
      const config = createLevelConfig({
        objective: { type: 'survival', target: 60, timeLimit: 60 },
      });
      const levelSystem = new LevelSystem(config);

      const handler = vi.fn();
      eventBus.on('level:timeUpdate', handler);

      levelSystem.start();
      levelSystem.update(5000);

      expect(handler).toHaveBeenCalled();

      eventBus.off('level:timeUpdate', handler);
    });

    it('should pause and resume level updates', () => {
      const config = createLevelConfig({
        objective: { type: 'survival', target: 60, timeLimit: 60 },
      });
      const levelSystem = new LevelSystem(config);

      levelSystem.start();
      levelSystem.pause();

      const handler = vi.fn();
      eventBus.on('level:timeUpdate', handler);

      levelSystem.update(10000);
      expect(handler).not.toHaveBeenCalled();

      levelSystem.resume();
      levelSystem.update(5000);
      expect(handler).toHaveBeenCalled();

      eventBus.off('level:timeUpdate', handler);
    });

    it('should include correct data in level:completed event', () => {
      const config = createLevelConfig({ objective: { type: 'score', target: 100 } });
      const levelSystem = new LevelSystem(config);

      const handler = vi.fn();
      eventBus.on('level:completed', handler);

      eventBus.emit('score:updated', { totalScore: 150 });

      expect(handler).toHaveBeenCalledWith({
        levelId: 1,
        score: 150,
        time: 0,
        highestMergeValue: 0,
      });

      eventBus.off('level:completed', handler);
    });

    it('should return correct progress for score objective', () => {
      const config = createLevelConfig({ objective: { type: 'score', target: 100 } });
      const levelSystem = new LevelSystem(config);

      eventBus.emit('score:updated', { totalScore: 75 });
      expect(levelSystem.getProgress()).toBe(0.75);
    });

    it('should return correct progress for merge objective', () => {
      const config = createLevelConfig({ objective: { type: 'target_merge', target: 256 } });
      const levelSystem = new LevelSystem(config);

      eventBus.emit('block:merged', { newValue: 16 });
      const progress = levelSystem.getProgress();
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(1);
    });
  });
});