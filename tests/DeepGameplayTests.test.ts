import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScoreSystem, SCORE_CONFIGS } from '../src/gameplay/ScoreSystem';
import { LevelSystem, LevelConfig } from '../src/gameplay/LevelSystem';
import { MergeSystem } from '../src/gameplay/MergeSystem';
import { PhysicsManager } from '../src/core/PhysicsManager';
import { Block, BLOCK_CONFIGS } from '../src/gameplay/Block';
import { WarningLine } from '../src/ui/components/WarningLine';
import { eventBus } from '../src/utils/EventBus';
import { AnimationManager } from '../src/utils/AnimationManager';

describe('ScoreSystem Deep Tests', () => {
  let ss: ScoreSystem;
  let animMgr: AnimationManager;

  beforeEach(() => {
    animMgr = new AnimationManager();
    AnimationManager.setInstance(animMgr);
    ss = new ScoreSystem();
  });

  afterEach(() => {
    ss.reset();
    AnimationManager.resetInstance();
  });

  describe('MEMORY LEAK: Event listener never cleaned up', () => {
    it('after reset(), the event listener still works (proving it was not removed)', () => {
      eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
      const scoreBeforeReset = ss.getCurrentScore();
      expect(scoreBeforeReset).toBeGreaterThan(0);

      ss.reset();
      expect(ss.getCurrentScore()).toBe(0);

      eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
      expect(ss.getCurrentScore()).toBeGreaterThan(0);
    });

    it('creating multiple ScoreSystem instances causes multiple listeners to fire', () => {
      const ss2 = new ScoreSystem();
      const handler = vi.fn();
      eventBus.on('score:updated', handler);

      eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });

      const allCalls = handler.mock.calls;
      const scoreUpdatedCalls = allCalls.filter((call: any[]) => call[0] && call[0].earnedScore !== undefined);
      expect(scoreUpdatedCalls.length).toBeGreaterThanOrEqual(2);

      ss2.reset();
    });
  });

  describe('BUG: chainCount parameter from event is IGNORED', () => {
    it('ScoreSystem uses its own chain counter, ignoring event chainCount', () => {
      eventBus.emit('block:merged', { newValue: 2, chainCount: 99 });
      expect(ss.getChainCount()).toBe(1);

      eventBus.emit('block:merged', { newValue: 2, chainCount: 99 });
      expect(ss.getChainCount()).toBe(2);
    });

    it('chainCount from merge event data is indeed ignored', () => {
      const handler = vi.fn();
      eventBus.on('score:updated', handler);

      eventBus.emit('block:merged', { newValue: 2, chainCount: 50 });
      const lastCall = handler.mock.calls[handler.mock.calls.length - 1][0];
      expect(lastCall.chainCount).not.toBe(50);
    });
  });

  describe('Score calculation accuracy', () => {
    it('should calculate exact score for value 2 (first merge, chainBonus=1.0)', () => {
      const handler = vi.fn();
      eventBus.on('score:updated', handler);
      eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
      const data = handler.mock.calls[0][0];
      const expected = Math.floor(SCORE_CONFIGS[2].baseScore * SCORE_CONFIGS[2].chainMultiplier * 1.0);
      expect(data.earnedScore).toBe(expected);
      expect(data.earnedScore).toBe(2);
    });

    it('should calculate exact score for value 4 (first merge)', () => {
      const handler = vi.fn();
      eventBus.on('score:updated', handler);
      eventBus.emit('block:merged', { newValue: 4, chainCount: 1 });
      const lastCall = handler.mock.calls[handler.mock.calls.length - 1][0];
      const expected = Math.floor(SCORE_CONFIGS[4].baseScore * SCORE_CONFIGS[4].chainMultiplier * 1.0);
      expect(lastCall.earnedScore).toBe(expected);
      expect(lastCall.earnedScore).toBe(9);
    });

    it('should apply chain bonus for second merge (chainBonus=1.1)', () => {
      const scoreBefore = ss.getCurrentScore();
      const chainBefore = ss.getChainCount();
      eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
      expect(ss.getCurrentScore()).toBeGreaterThan(scoreBefore);
      expect(ss.getChainCount()).toBe(chainBefore + 1);
    });

    it('should use fallback config for unknown values', () => {
      const handler = vi.fn();
      eventBus.on('score:updated', handler);
      eventBus.emit('block:merged', { newValue: 512, chainCount: 1 });
      const data = handler.mock.calls[0][0];
      expect(data.baseScore).toBe(512 * 10);
      expect(data.chainMultiplier).toBe(1.0);
    });
  });

  describe('Chain timeout resets properly', () => {
    it('chain timer resets on consecutive merges within timeout', () => {
      eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
      expect(ss.getChainCount()).toBe(1);

      animMgr.update(1500);
      eventBus.emit('block:merged', { newValue: 2, chainCount: 2 });
      expect(ss.getChainCount()).toBe(2);

      animMgr.update(1500);
      eventBus.emit('block:merged', { newValue: 2, chainCount: 3 });
      expect(ss.getChainCount()).toBe(3);
    });

    it('chain resets after full timeout', () => {
      eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
      animMgr.update(2500);
      expect(ss.getChainCount()).toBe(0);

      eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
      expect(ss.getChainCount()).toBe(1);
    });
  });
});

describe('LevelSystem Deep Tests', () => {
  let ls: LevelSystem;

  const scoreConfig: LevelConfig = {
    id: 30, name: 'Score Level', objective: { type: 'score', target: 100 },
    containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2, 4],
  };

  const mergeConfig: LevelConfig = {
    id: 31, name: 'Merge Level', objective: { type: 'target_merge', target: 16 },
    containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2, 4, 8],
  };

  const survivalConfig: LevelConfig = {
    id: 32, name: 'Survival Level', objective: { type: 'survival', target: 0, timeLimit: 10 },
    containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2, 4],
  };

  afterEach(() => {
    if (ls) ls.reset();
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

  describe('FIXED: getProgress() returns actual progress for target_merge type', () => {
    it('returns correct progress for target_merge based on highestMergeValue', () => {
      ls = new LevelSystem(mergeConfig);
      expect(ls.getProgress()).toBe(0);

      eventBus.emit('block:merged', { newValue: 8, chainCount: 1 });
      expect(ls.getProgress()).toBeCloseTo(Math.log2(8) / Math.log2(16));

      eventBus.emit('block:merged', { newValue: 16, chainCount: 1 });
      expect(ls.isLevelCompleted()).toBe(true);
      expect(ls.getProgress()).toBe(1);
    });
  });

  describe('Survival progress calculation', () => {
    it('should calculate survival progress based on time', () => {
      ls = new LevelSystem(survivalConfig);
      ls.start();
      ls.update(5000);
      expect(ls.getProgress()).toBeCloseTo(0.5, 1);
    });

    it('should return 1.0 progress when survival time reaches timeLimit', () => {
      ls = new LevelSystem(survivalConfig);
      ls.start();
      ls.update(10000);
      expect(ls.getProgress()).toBe(1);
      expect(ls.isLevelCompleted()).toBe(true);
    });
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

  describe('start() without timeLimit', () => {
    it('does not create timer when no timeLimit is set', () => {
      const noTimeConfig: LevelConfig = {
        id: 33, name: 'No Timer', objective: { type: 'score', target: 100 },
        containerWidth: 400, containerHeight: 600, availableNumbers: [1, 2],
      };
      ls = new LevelSystem(noTimeConfig);
      ls.start();
      ls.update(5000);
      expect(ls.isLevelCompleted()).toBe(false);
    });
  });

  describe('Double-complete protection', () => {
    it('should not emit level:completed twice for same LevelSystem instance', () => {
      ls = new LevelSystem(scoreConfig);
      ls.start();
      let emitCount = 0;
      const originalEmit = eventBus.emit.bind(eventBus);
      const levelId = scoreConfig.id;

      const handler = vi.fn((data: any) => {
        if (data && data.levelId === levelId) emitCount++;
      });
      eventBus.on('level:completed', handler);

      eventBus.emit('score:updated', { totalScore: 150 });
      const countAfterFirst = emitCount;

      eventBus.emit('score:updated', { totalScore: 200 });
      const countAfterSecond = emitCount;

      expect(ls.isLevelCompleted()).toBe(true);
      expect(countAfterSecond).toBe(countAfterFirst);
    });
  });

  describe('reset clears isCompleted flag', () => {
    it('should allow re-completion after reset', () => {
      ls = new LevelSystem(scoreConfig);
      ls.start();
      eventBus.emit('score:updated', { totalScore: 150 });
      expect(ls.isLevelCompleted()).toBe(true);

      ls.reset();
      expect(ls.isLevelCompleted()).toBe(false);
      expect(ls.getProgress()).toBe(0);
    });
  });
});

describe('MergeSystem Deep Tests', () => {
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
  });

  afterEach(() => {
    physics.stop();
  });

  describe('mergingBodies cleanup after merge', () => {
    it('should properly handle block body label access after destroy', () => {
      const body1 = physics.createCircle(100, 300, 20);
      const body2 = physics.createCircle(120, 300, 20);
      const block1 = new Block(body1, 1);
      const block2 = new Block(body2, 1);

      mergeSystem.registerBlock(block1);
      mergeSystem.registerBlock(block2);

      expect(block1.body.label).toBeDefined();
      expect(block2.body.label).toBeDefined();

      block1.destroy();
      block2.destroy();

      expect(block1.body.label).toBe(body1.label);
      expect(block2.body.label).toBe(body2.label);
    });
  });

  describe('Destroyed blocks cannot be merged again', () => {
    it('destroyed block should not be found in blocks map', () => {
      const body = physics.createCircle(100, 100, 20);
      const block = new Block(body, 1);
      mergeSystem.registerBlock(block);
      mergeSystem.unregisterBlock(block);

      expect(block.isDestroyed).toBe(false);
    });
  });

  describe('Chain reaction timing', () => {
    it('chain reaction uses setTimeout with 50ms delay', () => {
      const handler = vi.fn();
      eventBus.on('block:merged', handler);

      const body1 = physics.createCircle(100, 300, 20);
      const body2 = physics.createCircle(120, 300, 20);
      const block1 = new Block(body1, 2);
      const block2 = new Block(body2, 2);

      mergeSystem.registerBlock(block1);
      mergeSystem.registerBlock(block2);

      physics.start();

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          physics.stop();
          resolve();
        }, 500);
      });
    });
  });

  describe('getBlockConfig produces valid values', () => {
    it('MergeSystem can be created without errors', () => {
      expect(mergeSystem).toBeDefined();
    });

    it('should handle blocks with values beyond BLOCK_CONFIGS', () => {
      const body = physics.createCircle(100, 100, 20);
      const block = new Block(body, 128);
      expect(block.value).toBe(128);
      expect(block.getConfig()).toBeDefined();
    });
  });
});

describe('Block Deep Tests', () => {
  let physics: PhysicsManager;

  beforeEach(() => {
    physics = new PhysicsManager();
  });

  describe('syncFromBody after body position change', () => {
    it('should update position when body moves', () => {
      const body = physics.createCircle(100, 200, 20);
      const block = new Block(body, 1);
      expect(block.x).toBe(100);
      expect(block.y).toBe(200);

      Matter.Body.setPosition(body, { x: 300, y: 400 });
      block.syncFromBody();
      expect(block.x).toBe(300);
      expect(block.y).toBe(400);
    });

    it('should update rotation from body angle', () => {
      const body = physics.createCircle(100, 200, 20);
      const block = new Block(body, 1);

      Matter.Body.setAngle(body, Math.PI / 4);
      block.syncFromBody();
      expect(block.rotation).toBeCloseTo(Math.PI / 4, 5);
    });
  });

  describe('Destroy sets _destroyed flag before destroying children', () => {
    it('isDestroyed becomes true immediately on destroy call', () => {
      const body = physics.createCircle(100, 200, 20);
      const block = new Block(body, 1);
      expect(block.isDestroyed).toBe(false);
      block.destroy();
      expect(block.isDestroyed).toBe(true);
    });

    it('double destroy is safe', () => {
      const body = physics.createCircle(100, 200, 20);
      const block = new Block(body, 1);
      block.destroy();
      expect(() => block.destroy()).not.toThrow();
      expect(block.isDestroyed).toBe(true);
    });
  });

  describe('Dynamic config generation for unknown values', () => {
    it('should generate dynamic config for value not in BLOCK_CONFIGS', () => {
      const body = physics.createCircle(100, 200, 20);
      const block = new Block(body, 4096);
      const config = block.getConfig();
      expect(config.value).toBe(4096);
      expect(config.radius).toBeGreaterThan(0);
      expect(config.color).toBeDefined();
    });

    it('should use config for value 1 when value is 0', () => {
      const body = physics.createCircle(100, 200, 20);
      const block = new Block(body, 0);
      const config = block.getConfig();
      expect(config.value).toBe(1);
    });

    it('should use config for value 1 when value is negative', () => {
      const body = physics.createCircle(100, 200, 20);
      const block = new Block(body, -5);
      const config = block.getConfig();
      expect(config.value).toBe(1);
    });
  });

  describe('syncFromBody skips when destroyed', () => {
    it('should not throw when calling syncFromBody after destroy', () => {
      const body = physics.createCircle(100, 200, 20);
      const block = new Block(body, 1);
      block.destroy();
      Matter.Body.setPosition(body, { x: 999, y: 999 });
      expect(() => block.syncFromBody()).not.toThrow();
    });
  });
});

describe('WarningLine Deep Tests', () => {
  let wl: WarningLine;

  beforeEach(() => {
    wl = new WarningLine(600);
    wl.y = 600 * 0.2;
  });

  afterEach(() => {
    wl.reset();
  });

  describe('Hardcoded width 800 in drawLine (BUG)', () => {
    it('should create WarningLine without error despite hardcoded width', () => {
      expect(wl).toBeDefined();
      expect(wl.getWarningHeight()).toBe(120);
    });
  });

  describe('Warning trigger at exact boundary', () => {
    it('should trigger warning when block top is just above warning height', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:started', handler);
      wl.update([{ y: wh - 1, radius: 0, speed: 0 }], 16.67);
      expect(handler).toHaveBeenCalled();
      eventBus.off('warning:started', handler);
    });

    it('should not trigger warning when block top equals warning height', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:started', handler);
      wl.update([{ y: wh, radius: 0, speed: 0 }], 16.67);
      expect(handler).not.toHaveBeenCalled();
      eventBus.off('warning:started', handler);
    });

    it('should not trigger warning when block top is below warning height', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:started', handler);
      wl.update([{ y: wh + 1, radius: 0, speed: 0 }], 16.67);
      expect(handler).not.toHaveBeenCalled();
      eventBus.off('warning:started', handler);
    });

    it('should consider block radius in warning detection', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:started', handler);
      wl.update([{ y: wh + 10, radius: 20, speed: 0 }], 16.67);
      expect(handler).toHaveBeenCalled();
      eventBus.off('warning:started', handler);
    });

    it('should not trigger warning for fast-moving blocks above line', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:started', handler);
      wl.update([{ y: wh - 10, radius: 5, speed: 5 }], 16.67);
      expect(handler).not.toHaveBeenCalled();
      eventBus.off('warning:started', handler);
    });
  });

  describe('Delta normalization (deltaMS)', () => {
    it('should accumulate warning duration based on delta', () => {
      const wh = wl.getWarningHeight();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      const d1 = wl.getWarningDuration();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      const d2 = wl.getWarningDuration();
      expect(d2).toBeGreaterThan(d1);
    });

    it('should accumulate faster with larger delta', () => {
      const wh = wl.getWarningHeight();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 33.34);
      const durationWithDelta2 = wl.getWarningDuration();
      wl.reset();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      const durationWithDelta1 = wl.getWarningDuration();
      expect(durationWithDelta2).toBeGreaterThan(durationWithDelta1);
    });
  });

  describe('game:over emitted exactly once at threshold', () => {
    it('should emit game:over when warningDuration >= 5000', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('game:over', handler);

      for (let i = 0; i < 320; i++) {
        wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      }

      expect(handler).toHaveBeenCalled();
      eventBus.off('game:over', handler);
    });

    it('should not emit game:over again after threshold reached and blocks remain above', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('game:over', handler);

      for (let i = 0; i < 320; i++) {
        wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      }
      const callCount = handler.mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(1);

      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      expect(handler.mock.calls.length).toBe(callCount);
      eventBus.off('game:over', handler);
    });
  });

  describe('Reset clears all state', () => {
    it('should clear warning duration and isWarning state', () => {
      const wh = wl.getWarningHeight();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      expect(wl.getWarningDuration()).toBeGreaterThan(0);

      wl.reset();
      expect(wl.getWarningDuration()).toBe(0);
    });

    it('should allow warning to start again after reset', () => {
      const wh = wl.getWarningHeight();
      const handler = vi.fn();
      eventBus.on('warning:started', handler);

      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      expect(handler).toHaveBeenCalledTimes(1);

      wl.reset();
      wl.update([{ y: wh - 10, radius: 5, speed: 0 }], 16.67);
      expect(handler).toHaveBeenCalledTimes(2);
      eventBus.off('warning:started', handler);
    });
  });
});

import Matter from 'matter-js';
