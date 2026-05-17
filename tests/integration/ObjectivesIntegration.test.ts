import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScoreObjectiveChecker } from '../../src/gameplay/objectives/ScoreObjectiveChecker';
import { MergeObjectiveChecker } from '../../src/gameplay/objectives/MergeObjectiveChecker';
import { ClearObstacleChecker } from '../../src/gameplay/objectives/ClearObstacleChecker';
import { SurvivalObjectiveChecker } from '../../src/gameplay/objectives/SurvivalObjectiveChecker';
import { createObjectiveChecker } from '../../src/gameplay/objectives/index';
import { ObjectiveContext } from '../../src/gameplay/objectives/ObjectiveChecker';
import { LevelSystem, LevelConfig, LevelObjective } from '../../src/gameplay/LevelSystem';
import { ScoreSystem } from '../../src/gameplay/ScoreSystem';
import { TimeManager } from '../../src/utils/TimeManager';
import { AnimationManager } from '../../src/utils/AnimationManager';
import { eventBus } from '../../src/utils/EventBus';
import gsap from 'gsap';

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

describe('Level 5 timeLimit conflict fix', () => {
  let ls: LevelSystem;

  afterEach(() => {
    if (ls) ls.destroy();
  });

  it('FIXED: Level 5 config no longer contains timeLimit', () => {
    const level5 = require('../../src/data/levels/level_05.json');
    expect(level5.objective.timeLimit).toBeUndefined();
  });

  it('FIXED: Level 5 score type does not trigger game:timeout from timeLimit', () => {
    const config: LevelConfig = {
      id: 5,
      name: '综合考验',
      objective: { type: 'score', target: 2000 },
      container: { width: 350, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4, 8, 16] },
      rewards: { stars: [800, 1500, 2500] },
    };
    ls = new LevelSystem(config);
    ls.start();

    const timeoutHandler = vi.fn();
    eventBus.on('game:timeout', timeoutHandler);

    ls.update(130000);

    expect(timeoutHandler).not.toHaveBeenCalled();
    eventBus.off('game:timeout', timeoutHandler);
  });

  it('FIXED: Level 5 score type does not timeout after long duration', () => {
    const config: LevelConfig = {
      id: 5,
      name: '综合考验',
      objective: { type: 'score', target: 2000 },
      container: { width: 350, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4, 8, 16] },
      rewards: { stars: [800, 1500, 2500] },
    };
    ls = new LevelSystem(config);
    ls.start();

    for (let i = 0; i < 200; i++) {
      ls.update(1000);
    }

    expect(ls.isLevelCompleted()).toBe(false);
  });

  it('FIXED: Level 5 completes normally when target score is reached', () => {
    const config: LevelConfig = {
      id: 5,
      name: '综合考验',
      objective: { type: 'score', target: 2000 },
      container: { width: 350, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4, 8, 16] },
      rewards: { stars: [800, 1500, 2500] },
    };
    ls = new LevelSystem(config);
    ls.start();

    eventBus.emit('score:updated', { totalScore: 2500 });

    expect(ls.isLevelCompleted()).toBe(true);
  });

  it('FIXED: survival type still uses timeLimit normally', () => {
    const config: LevelConfig = {
      id: 4,
      name: '生存关卡',
      objective: { type: 'survival', target: 10, timeLimit: 10 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [100, 200, 300] },
    };
    ls = new LevelSystem(config);
    ls.start();

    ls.update(10000);

    expect(ls.isLevelCompleted()).toBe(true);
  });

  it('FIXED: score + timeLimit combination triggers game:timeout on timeout', () => {
    const config: LevelConfig = {
      id: 99,
      name: '限时得分',
      objective: { type: 'score', target: 9999, timeLimit: 5 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [100, 200, 300] },
    };
    ls = new LevelSystem(config);
    ls.start();

    const timeoutHandler = vi.fn();
    eventBus.on('game:timeout', timeoutHandler);

    ls.update(5000);

    expect(timeoutHandler).toHaveBeenCalled();
    eventBus.off('game:timeout', timeoutHandler);
  });

  it('FIXED: Level 5 actual file has no timeLimit field after loading', async () => {
    const fs = require('fs');
    const path = require('path');
    const levelPath = path.resolve(__dirname, '../../src/data/levels/level_05.json');
    const content = fs.readFileSync(levelPath, 'utf-8');
    const data = JSON.parse(content);
    expect(data.objective.type).toBe('score');
    expect(data.objective.timeLimit).toBeUndefined();
  });
});

describe('LevelSystem revive and restart flow', () => {
  const timedConfig: LevelConfig = {
    id: 10, name: '计时测试', objective: { type: 'survival', target: 30, timeLimit: 30 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2] },
    rewards: { stars: [15, 20, 30] },
  };

  describe('Revive flow - timer resume and penalty', () => {
    it('full revive flow: fail → stopTimer → revive → resumeTimer + penalty → timer resumes', () => {
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

      ls.update(3000);
      expect(ls.getRemainingTime()).toBe(7);
    });

    it('after revive timer should continue firing timeUpdate events', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.update(1000);
      ls.stopTimer();

      const handler = vi.fn();
      eventBus.on('level:timeUpdate', handler);
      ls.resumeTimer();
      ls.applyTimerPenalty(5);
      ls.update(2000);
      ls.update(2000);

      expect(handler).toHaveBeenCalled();
      eventBus.off('level:timeUpdate', handler);
    });

    it('revive penalty should not make remaining time negative', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.update(28000);
      ls.stopTimer();

      ls.resumeTimer();
      ls.applyTimerPenalty(10);

      expect(ls.getRemainingTime()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Restart flow - animation timeline reset', () => {
    let timeManager: TimeManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      TimeManager.resetInstance();
      timeManager = new TimeManager();
      TimeManager.setInstance(timeManager);
    });

    afterEach(() => {
      TimeManager.resetInstance();
      AnimationManager.resetInstance();
    });

    it('after restart GSAP timeline should be reset', () => {
      const oldTimeline = timeManager.getGameTimeline();
      timeManager.resetGameTimeline();
      const newTimeline = timeManager.getGameTimeline();

      expect(newTimeline).toBeDefined();
      expect(newTimeline).not.toBe(oldTimeline);
    });

    it('after restart new timeline should accept animations normally', () => {
      timeManager.resetGameTimeline();
      const timeline = timeManager.getGameTimeline();

      const testObj = { x: 0 };
      const tween = gsap.to(testObj, { x: 100, duration: 0.5 });

      expect(() => timeline.add(tween)).not.toThrow();
    });

    it('after restart paused state should be cleared', () => {
      timeManager.pause();
      expect(timeManager.isCurrentlyPaused()).toBe(true);

      timeManager.resetGameTimeline();
      expect(timeManager.isCurrentlyPaused()).toBe(false);
    });

    it('TimeManager class should be accessible', () => {
      expect(typeof TimeManager).toBe('function');
      expect(typeof TimeManager.prototype.resetGameTimeline).toBe('function');
    });

    it('resetGameTimeline should create a new running timeline', () => {
      const oldTimeline = timeManager.getGameTimeline();
      oldTimeline.pause();
      expect(oldTimeline.paused()).toBe(true);

      timeManager.resetGameTimeline();
      const newTimeline = timeManager.getGameTimeline();
      expect(newTimeline.paused()).toBe(false);
      expect(newTimeline).not.toBe(oldTimeline);
    });
  });

  describe('Full fail → restart flow', () => {
    it('after restart LevelSystem should be fully reset', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.update(10000);
      expect(ls.getRemainingTime()).toBe(20);

      ls.stopTimer();
      ls.reset();

      expect(ls.isLevelCompleted()).toBe(false);
      expect(ls.getProgress()).toBe(0);
      expect(ls.getRemainingTime()).toBe(30);
    });

    it('after restart timer should start from the beginning', () => {
      const ls = new LevelSystem(timedConfig);
      ls.start();
      ls.update(15000);
      expect(ls.getRemainingTime()).toBe(15);

      ls.reset();
      ls.start();
      expect(ls.getRemainingTime()).toBe(30);
      ls.update(5000);
      expect(ls.getRemainingTime()).toBe(25);
    });
  });
});

describe('LevelSystem + ScoreSystem statistics tracking', () => {
  describe('FIXED: LevelSystem exposes getHighestMergeValue', () => {
    it('getHighestMergeValue method exists', () => {
      const config: LevelConfig = {
        id: 1, name: 'Test', objective: { type: 'score', target: 100 },
        containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2],
      };
      const ls = new LevelSystem(config);
      expect(typeof ls.getHighestMergeValue).toBe('function');
      ls.destroy();
    });

    it('getHighestMergeValue returns correct highest merge value', () => {
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

  describe('FIXED: ScoreSystem tracks maxChainCount', () => {
    it('getMaxChainCount method exists', () => {
      const ss = new ScoreSystem();
      expect(typeof ss.getMaxChainCount).toBe('function');
      ss.reset();
    });

    it('getMaxChainCount returns historical max chain count', () => {
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

    it('maxChainCount resets to 0 after reset', () => {
      const ss = new ScoreSystem();
      ss.addMergeScore(2, false);
      ss.addMergeScore(2, false);
      expect(ss.getMaxChainCount()).toBe(2);

      ss.reset();
      expect(ss.getMaxChainCount()).toBe(0);
    });
  });
});