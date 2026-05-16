import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../../src/utils/EventBus';
import { eventBus } from '../../src/utils/EventBus';
import { ScoreSystem, SCORE_CONFIGS } from '../../src/gameplay/ScoreSystem';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { LevelLoader } from '../../src/core/LevelLoader';
import { GameStateMachine, GameState } from '../../src/core/GameStateMachine';
import { InputManager } from '../../src/core/InputManager';
import { WarningLine } from '../../src/ui/components/WarningLine';

describe('Deep Integration Tests', () => {

  describe('1. Game Event Flow Integration', () => {

    describe('1.1 Score → Level completion flow', () => {
      let scoreSystem: ScoreSystem;
      let levelSystem: LevelSystem;

      const scoreTargetConfig: LevelConfig = {
        id: 10,
        name: 'Integration Score Level',
        objective: { type: 'score', target: 1 },
        containerWidth: 400,
        containerHeight: 600,
        availableNumbers: [1, 2, 4],
      };

      beforeEach(() => {
        vi.useFakeTimers();
        scoreSystem = new ScoreSystem();
        levelSystem = new LevelSystem(scoreTargetConfig);
      });

      afterEach(() => {
        scoreSystem.reset();
        levelSystem.reset();
        vi.useRealTimers();
      });

      it('should emit score:updated when addMergeScore is called', () => {
        const scoreHandler = vi.fn();
        eventBus.on('score:updated', scoreHandler);
        scoreSystem.addMergeScore(2, false);
        expect(scoreHandler).toHaveBeenCalled();
        const data = scoreHandler.mock.calls[0][0];
        expect(data.totalScore).toBeGreaterThan(0);
        expect(data.earnedScore).toBeGreaterThan(0);
      });

      it('should emit level:completed when score reaches target', () => {
        const levelHandler = vi.fn();
        eventBus.on('level:completed', levelHandler);
        scoreSystem.addMergeScore(2, false);
        expect(levelSystem.isLevelCompleted()).toBe(true);
        expect(levelHandler).toHaveBeenCalled();
      });

      it('should complete the full chain: addMergeScore → score:updated → level:completed', () => {
        const scoreHandler = vi.fn();
        const levelHandler = vi.fn();
        eventBus.on('score:updated', scoreHandler);
        eventBus.on('level:completed', levelHandler);

        scoreSystem.addMergeScore(2, false);

        expect(scoreHandler).toHaveBeenCalled();
        expect(levelHandler).toHaveBeenCalled();
        expect(levelSystem.isLevelCompleted()).toBe(true);
        expect(scoreSystem.getCurrentScore()).toBeGreaterThan(0);
      });

      it('should not emit level:completed for high-target level before score reaches target', () => {
        const highTargetConfig: LevelConfig = {
          id: 11,
          name: 'High Target Level',
          objective: { type: 'score', target: 99999 },
          containerWidth: 400,
          containerHeight: 600,
          availableNumbers: [1, 2, 4],
        };
        const highLevelSystem = new LevelSystem(highTargetConfig);

        scoreSystem.addMergeScore(2, false);

        expect(highLevelSystem.isLevelCompleted()).toBe(false);
        highLevelSystem.reset();
      });

      it('should propagate score data through the full chain', () => {
        const scoreHandler = vi.fn();
        const levelHandler = vi.fn();
        eventBus.on('score:updated', scoreHandler);
        eventBus.on('level:completed', levelHandler);

        scoreSystem.addMergeScore(4, false);

        expect(scoreHandler).toHaveBeenCalled();
        const scoreCall = scoreHandler.mock.calls.find((call: any[]) => call[0].baseScore === SCORE_CONFIGS[4].baseScore);
        expect(scoreCall).toBeDefined();
        const scoreData = scoreCall![0];
        expect(scoreData).toHaveProperty('totalScore');
        expect(scoreData).toHaveProperty('earnedScore');
        expect(scoreData).toHaveProperty('chainCount');
        expect(scoreData).toHaveProperty('chainMultiplier');

        expect(levelHandler).toHaveBeenCalled();
        const levelCall = levelHandler.mock.calls.find((call: any[]) => call[0].levelId === scoreTargetConfig.id);
        expect(levelCall).toBeDefined();
        const levelData = levelCall![0];
        expect(levelData).toHaveProperty('levelId');
        expect(levelData).toHaveProperty('score');
      });
    });

    describe('1.2 Duplicate event listener BUG in Game.ts', () => {

      it('BUG: registering two listeners for the same event causes double execution', () => {
        const bus = new EventBus();
        let executionCount = 0;

        bus.on('game:over', () => { executionCount++; });
        bus.on('game:over', () => { executionCount++; });

        bus.emit('game:over');

        expect(executionCount).toBe(2);
      });

      it('BUG: Game.ts registers game:over twice (setupGameEvents + setupUIEvents)', () => {
        const bus = new EventBus();
        const setupGameEventsHandler = vi.fn();
        const setupUIEventsHandler = vi.fn();

        bus.on('game:over', setupGameEventsHandler);
        bus.on('game:over', setupUIEventsHandler);

        bus.emit('game:over');

        expect(setupGameEventsHandler).toHaveBeenCalledTimes(1);
        expect(setupUIEventsHandler).toHaveBeenCalledTimes(1);

        const totalCalls = setupGameEventsHandler.mock.calls.length + setupUIEventsHandler.mock.calls.length;
        expect(totalCalls).toBe(2);
      });

      it('BUG: Game.ts registers level:completed twice (setupGameEvents + setupUIEvents)', () => {
        const bus = new EventBus();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        bus.on('level:completed', handler1);
        bus.on('level:completed', handler2);

        bus.emit('level:completed', { levelId: 1, score: 100, time: 30 });

        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
        expect(handler1).toHaveBeenCalledWith({ levelId: 1, score: 100, time: 30 });
        expect(handler2).toHaveBeenCalledWith({ levelId: 1, score: 100, time: 30 });
      });

      it('BUG: duplicate game:over listeners cause both handlers to execute', () => {
        const sm = new GameStateMachine();
        const bus = new EventBus();
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        bus.on('game:over', () => { handler1(); sm.transition('gameover'); });
        bus.on('game:over', () => { handler2(); sm.transition('gameover'); });

        sm.transition('playing');
        bus.emit('game:over');

        expect(handler1).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledTimes(1);
        expect(sm.getCurrentState()).toBe('gameover');
      });
    });

    describe('1.3 Pause/Resume state flow', () => {
      let sm: GameStateMachine;

      beforeEach(() => {
        sm = new GameStateMachine();
      });

      it('should allow pausing during playing', () => {
        sm.transition('playing');
        expect(sm.canTransition('paused')).toBe(true);
        sm.transition('paused');
        expect(sm.getCurrentState()).toBe('paused');
      });

      it('should allow resuming from paused to playing', () => {
        sm.transition('playing');
        sm.transition('paused');
        expect(sm.canTransition('playing')).toBe(true);
        sm.transition('playing');
        expect(sm.getCurrentState()).toBe('playing');
      });

      it('should not allow game:over during paused state', () => {
        sm.transition('playing');
        sm.transition('paused');
        expect(sm.canTransition('gameover')).toBe(false);
      });

      it('should allow returning to menu from paused', () => {
        sm.transition('playing');
        sm.transition('paused');
        expect(sm.canTransition('menu')).toBe(true);
        sm.transition('menu');
        expect(sm.getCurrentState()).toBe('menu');
      });

      it('should not allow levelComplete from paused', () => {
        sm.transition('playing');
        sm.transition('paused');
        expect(sm.canTransition('levelComplete')).toBe(false);
      });

      it('should not allow pausing from menu', () => {
        expect(sm.getCurrentState()).toBe('menu');
        expect(sm.canTransition('paused')).toBe(false);
      });

      it('transition() now validates against canTransition rules', () => {
        sm.transition('playing');
        sm.transition('paused');
        expect(sm.canTransition('gameover')).toBe(false);
        const result = sm.transition('gameover');
        expect(result).toBe(false);
        expect(sm.getCurrentState()).toBe('paused');
      });
    });
  });

  describe('2. LevelLoader Integration', () => {

    describe('2.1 Malformed JSON handling', () => {
      let loader: LevelLoader;
      let originalFetch: typeof global.fetch;

      beforeEach(() => {
        loader = LevelLoader.getInstance();
        loader.clearCache();
        originalFetch = global.fetch;
      });

      afterEach(() => {
        global.fetch = originalFetch;
      });

      it('BUG: parseLevelConfig with missing objective field crashes (no validation)', async () => {
        const malformedData = {
          id: 90,
          name: 'Broken Level',
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(malformedData),
        });

        const config = await loader.loadLevel(90);
        expect(config).toBeNull();
      });

      it('BUG: parseLevelConfig with missing container field crashes (no validation)', async () => {
        const malformedData = {
          id: 91,
          name: 'No Container',
          objective: { type: 'score', target: 100 },
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(malformedData),
        });

        const config = await loader.loadLevel(91);
        expect(config).toBeNull();
      });

      it('BUG: parseLevelConfig with missing spawn field crashes (no validation)', async () => {
        const malformedData = {
          id: 92,
          name: 'No Spawn',
          objective: { type: 'score', target: 100 },
          container: { width: 400, height: 600 },
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(malformedData),
        });

        const config = await loader.loadLevel(92);
        expect(config).toBeNull();
      });

      it('should work with extra fields in JSON data', async () => {
        const dataWithExtras = {
          id: 93,
          name: 'Extra Fields Level',
          objective: { type: 'score', target: 500, timeLimit: 60 },
          container: { width: 400, height: 600 },
          spawn: { availableNumbers: [1, 2, 4], spawnInterval: 2000 },
          rewards: { stars: [300, 400, 500] },
          author: 'test',
          version: 2,
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(dataWithExtras),
        });

        const config = await loader.loadLevel(93);
        expect(config).not.toBeNull();
        expect(config!.id).toBe(93);
        expect(config!.name).toBe('Extra Fields Level');
        expect(config!.objective.type).toBe('score');
        expect(config!.objective.target).toBe(500);
        expect(config!.objective.timeLimit).toBe(60);
        expect(config!.containerWidth).toBe(400);
        expect(config!.containerHeight).toBe(600);
        expect(config!.availableNumbers).toEqual([1, 2, 4]);
        expect(config!.spawnInterval).toBe(2000);
      });

      it('should return null for non-existent level ID', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
        });

        const config = await loader.loadLevel(999);
        expect(config).toBeNull();
      });
    });

    describe('2.2 Caching behavior', () => {
      let loader: LevelLoader;
      let originalFetch: typeof global.fetch;

      beforeEach(() => {
        loader = LevelLoader.getInstance();
        loader.clearCache();
        originalFetch = global.fetch;
      });

      afterEach(() => {
        global.fetch = originalFetch;
      });

      it('should return cached result when loading same level twice', async () => {
        const mockConfig = {
          id: 94,
          name: 'Cached Level',
          objective: { type: 'score', target: 200 },
          container: { width: 400, height: 600 },
          spawn: { availableNumbers: [1, 2, 4] },
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockConfig),
        });

        const first = await loader.loadLevel(94);
        const second = await loader.loadLevel(94);

        expect(first).toBe(second);
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      it('should clear cache and allow re-fetching', async () => {
        const mockConfig = {
          id: 95,
          name: 'Cache Clear Level',
          objective: { type: 'score', target: 300 },
          container: { width: 400, height: 600 },
          spawn: { availableNumbers: [1, 2, 4] },
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockConfig),
        });

        await loader.loadLevel(95);
        expect(global.fetch).toHaveBeenCalledTimes(1);

        loader.clearCache();

        await loader.loadLevel(95);
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      it('should cache multiple different levels independently', async () => {
        const mockConfig96 = {
          id: 96,
          name: 'Level Ninety-Six',
          objective: { type: 'score', target: 700 },
          container: { width: 400, height: 600 },
          spawn: { availableNumbers: [1, 2, 4] },
        };
        const mockConfig97 = {
          id: 97,
          name: 'Level Ninety-Seven',
          objective: { type: 'target_merge', target: 32 },
          container: { width: 500, height: 700 },
          spawn: { availableNumbers: [1, 2, 4, 8] },
        };

        global.fetch = vi.fn().mockImplementation((url: string) => {
          if (url.includes('level_96')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConfig96) });
          }
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConfig97) });
        });

        const config96 = await loader.loadLevel(96);
        const config97 = await loader.loadLevel(97);

        expect(config96).not.toBeNull();
        expect(config97).not.toBeNull();
        expect(config96!.name).toBe('Level Ninety-Six');
        expect(config97!.name).toBe('Level Ninety-Seven');

        const cached96 = await loader.loadLevel(96);
        const cached97 = await loader.loadLevel(97);
        expect(cached96).toBe(config96);
        expect(cached97).toBe(config97);
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('3. Boundary Conditions', () => {

    describe('3.1 ScoreSystem boundary conditions', () => {
      let ss: ScoreSystem;

      beforeEach(() => {
        ss = new ScoreSystem();
      });

      afterEach(() => {
        ss.reset();
      });

      it('should handle merge with value 0 (edge case - rejected)', () => {
        const handler = vi.fn();
        eventBus.on('score:updated', handler);
        ss.addMergeScore(0, false);
        expect(handler).not.toHaveBeenCalled();
        expect(ss.getCurrentScore()).toBe(0);
      });

      it('should handle merge with very large value (2048)', () => {
        const handler = vi.fn();
        eventBus.on('score:updated', handler);
        ss.addMergeScore(2048, false);
        expect(handler).toHaveBeenCalled();
        const data = handler.mock.calls[0][0];
        expect(data.earnedScore).toBeGreaterThan(0);
        expect(ss.getCurrentScore()).toBeGreaterThan(0);
      });

      it('should handle merge with negative value (rejected)', () => {
        const handler = vi.fn();
        eventBus.on('score:updated', handler);
        ss.addMergeScore(-1, false);
        expect(handler).not.toHaveBeenCalled();
        expect(ss.getCurrentScore()).toBe(0);
      });

      it('should handle chain count with many consecutive merges (100+)', () => {
        for (let i = 0; i < 110; i++) {
          ss.addMergeScore(2, false);
        }
        expect(ss.getChainCount()).toBe(110);
        expect(ss.getCurrentScore()).toBeGreaterThan(0);
      });

      it('should handle score overflow potential with extremely large values', () => {
        ss.addMergeScore(2048, false);
        const score1 = ss.getCurrentScore();
        expect(score1).toBeGreaterThan(0);
        expect(isFinite(score1)).toBe(true);
        expect(isNaN(score1)).toBe(false);
      });

      it('should handle chain bonus calculation at high chain counts', () => {
        const scores: number[] = [];
        for (let i = 0; i < 10; i++) {
          ss.addMergeScore(2, false);
          scores.push(ss.getCurrentScore());
        }
        for (let i = 1; i < scores.length; i++) {
          expect(scores[i]).toBeGreaterThan(scores[i - 1]);
        }
      });

      it('should reset chain count after timeout even at high chain counts', () => {
        for (let i = 0; i < 50; i++) {
          ss.addMergeScore(2, false);
        }
        expect(ss.getChainCount()).toBe(50);
        ss.update(3100);
        expect(ss.getChainCount()).toBe(0);
      });
    });

    describe('3.2 LevelSystem boundary conditions', () => {
      let ls: LevelSystem;

      afterEach(() => {
        if (ls) ls.reset();
      });

      it('should complete immediately with target score of 0', () => {
        const config: LevelConfig = {
          id: 20,
          name: 'Zero Target',
          objective: { type: 'score', target: 0 },
          containerWidth: 400,
          containerHeight: 600,
          availableNumbers: [1, 2],
        };
        ls = new LevelSystem(config);
        ls.start();
        eventBus.emit('score:updated', { totalScore: 0 });
        expect(ls.isLevelCompleted()).toBe(true);
      });

      it('should complete target_merge when value equals target', () => {
        const config: LevelConfig = {
          id: 21,
          name: 'Exact Merge Target',
          objective: { type: 'target_merge', target: 16 },
          containerWidth: 400,
          containerHeight: 600,
          availableNumbers: [1, 2, 4, 8],
        };
        ls = new LevelSystem(config);
        ls.start();
        eventBus.emit('block:merged', { newValue: 16, chainCount: 1 });
        expect(ls.isLevelCompleted()).toBe(true);
      });

      it('should complete target_merge when value exceeds target', () => {
        const config: LevelConfig = {
          id: 22,
          name: 'Exceed Merge Target',
          objective: { type: 'target_merge', target: 8 },
          containerWidth: 400,
          containerHeight: 600,
          availableNumbers: [1, 2, 4],
        };
        ls = new LevelSystem(config);
        ls.start();
        eventBus.emit('block:merged', { newValue: 16, chainCount: 1 });
        expect(ls.isLevelCompleted()).toBe(true);
      });

      it('FIXED: survival with timeLimit of 0 now starts timer (0 is not undefined/null)', () => {
        const config: LevelConfig = {
          id: 23,
          name: 'Zero Time Limit',
          objective: { type: 'survival', target: 0, timeLimit: 0 },
          containerWidth: 400,
          containerHeight: 600,
          availableNumbers: [1, 2],
        };
        ls = new LevelSystem(config);
        ls.start();
        ls.update(1000);
        expect(ls.isLevelCompleted()).toBe(true);
      });

      it('should handle very large timeLimit values', () => {
        const config: LevelConfig = {
          id: 24,
          name: 'Large Time Limit',
          objective: { type: 'survival', target: 0, timeLimit: 999999 },
          containerWidth: 400,
          containerHeight: 600,
          availableNumbers: [1, 2],
        };
        ls = new LevelSystem(config);
        ls.start();
        ls.update(5000);
        expect(ls.isLevelCompleted()).toBe(false);
        expect(ls.getProgress()).toBeGreaterThan(0);
        expect(ls.getProgress()).toBeLessThan(1);
      });

      it('should return actual progress for target_merge type based on highestMergeValue', () => {
        const config: LevelConfig = {
          id: 25,
          name: 'Merge Progress',
          objective: { type: 'target_merge', target: 32 },
          containerWidth: 400,
          containerHeight: 600,
          availableNumbers: [1, 2, 4],
        };
        ls = new LevelSystem(config);
        expect(ls.getProgress()).toBe(0);
        eventBus.emit('block:merged', { newValue: 16, chainCount: 1 });
        expect(ls.getProgress()).toBeCloseTo(Math.log2(16) / Math.log2(32));
      });

      it('should handle score objective with extremely large target', () => {
        const config: LevelConfig = {
          id: 26,
          name: 'Huge Score Target',
          objective: { type: 'score', target: Number.MAX_SAFE_INTEGER },
          containerWidth: 400,
          containerHeight: 600,
          availableNumbers: [1, 2],
        };
        ls = new LevelSystem(config);
        ls.start();
        eventBus.emit('score:updated', { totalScore: 1000000 });
        expect(ls.isLevelCompleted()).toBe(false);
        expect(ls.getProgress()).toBeLessThan(0.001);
      });
    });

    describe('3.3 WarningLine boundary conditions', () => {
      let wl: WarningLine;

      beforeEach(() => {
        wl = new WarningLine(600);
        wl.y = 600 * 0.2;
      });

      afterEach(() => {
        wl.reset();
      });

      it('should handle empty blocks array', () => {
        const handler = vi.fn();
        eventBus.on('warning:started', handler);
        wl.update([], 16.67);
        expect(wl.getWarningDuration()).toBe(0);
        expect(handler).not.toHaveBeenCalled();
        eventBus.off('warning:started', handler);
      });

      it('should not detect blocks exactly at warning height (strict less-than)', () => {
        const warningHeight = wl.getWarningHeight();
        const handler = vi.fn();
        eventBus.on('warning:started', handler);
        wl.update([{ y: warningHeight, radius: 0, speed: 0 }], 16.67);
        expect(handler).not.toHaveBeenCalled();
        eventBus.off('warning:started', handler);
      });

      it('should detect blocks just above warning height', () => {
        const warningHeight = wl.getWarningHeight();
        const handler = vi.fn();
        eventBus.on('warning:started', handler);
        wl.update([{ y: warningHeight - 1, radius: 0, speed: 0 }], 16.67);
        expect(handler).toHaveBeenCalled();
        eventBus.off('warning:started', handler);
      });

      it('should not warn for blocks just below warning height', () => {
        const warningHeight = wl.getWarningHeight();
        const handler = vi.fn();
        eventBus.on('warning:started', handler);
        wl.update([{ y: warningHeight + 1, radius: 0, speed: 0 }], 16.67);
        expect(handler).not.toHaveBeenCalled();
        eventBus.off('warning:started', handler);
      });

      it('should handle blocks having radius 0', () => {
        const warningHeight = wl.getWarningHeight();
        const handler = vi.fn();
        eventBus.on('warning:started', handler);
        wl.update([{ y: warningHeight - 1, radius: 0, speed: 0 }], 16.67);
        expect(handler).toHaveBeenCalled();
        expect(wl.getWarningDuration()).toBeGreaterThan(0);
        eventBus.off('warning:started', handler);
      });

      it('should handle very large delta values', () => {
        const warningHeight = wl.getWarningHeight();
        const gameOverHandler = vi.fn();
        eventBus.on('game:over', gameOverHandler);
        wl.update([{ y: warningHeight - 10, radius: 5, speed: 0 }], 5100);
        expect(gameOverHandler).toHaveBeenCalled();
        eventBus.off('game:over', gameOverHandler);
      });

      it('should accumulate warning duration with precision', () => {
        const warningHeight = wl.getWarningHeight();
        wl.update([{ y: warningHeight - 10, radius: 5, speed: 0 }], 16.67);
        const duration1 = wl.getWarningDuration();
        wl.update([{ y: warningHeight - 10, radius: 5, speed: 0 }], 16.67);
        const duration2 = wl.getWarningDuration();
        expect(duration2).toBeGreaterThan(duration1);
        expect(duration2 - duration1).toBeCloseTo(16.67, 0);
      });

      it('should emit game:over when warning duration exceeds threshold', () => {
        const warningHeight = wl.getWarningHeight();
        const handler = vi.fn();
        eventBus.on('game:over', handler);
        for (let i = 0; i < 320; i++) {
          wl.update([{ y: warningHeight - 10, radius: 5, speed: 0 }], 16.67);
        }
        expect(handler).toHaveBeenCalled();
        eventBus.off('game:over', handler);
      });

      it('should reset warning duration when blocks move below line after grace period', () => {
        const warningHeight = wl.getWarningHeight();
        wl.update([{ y: warningHeight - 10, radius: 5, speed: 0 }], 16.67);
        expect(wl.getWarningDuration()).toBeGreaterThan(0);
        wl.update([{ y: warningHeight + 100, radius: 5, speed: 0 }], 16.67);
        expect(wl.getWarningDuration()).toBeGreaterThan(0);
        wl.update([{ y: warningHeight + 100, radius: 5, speed: 0 }], 500);
        expect(wl.getWarningDuration()).toBeGreaterThan(0);
        wl.update([{ y: warningHeight + 100, radius: 5, speed: 0 }], 500);
        expect(wl.getWarningDuration()).toBe(0);
      });
    });

    describe('3.4 EventBus boundary conditions', () => {
      let bus: EventBus;

      beforeEach(() => {
        bus = new EventBus();
      });

      it('should emit with many arguments', () => {
        const handler = vi.fn();
        bus.on('multi-args', handler);
        bus.emit('multi-args', 1, 'two', { three: 3 }, [4], true, null, undefined);
        expect(handler).toHaveBeenCalledWith(1, 'two', { three: 3 }, [4], true, null, undefined);
      });

      it('should call same callback multiple times when registered multiple times', () => {
        const callback = vi.fn();
        bus.on('dup', callback);
        bus.on('dup', callback);
        bus.emit('dup');
        expect(callback).toHaveBeenCalledTimes(2);
      });

      it('should only remove first occurrence of callback with off', () => {
        const callback = vi.fn();
        bus.on('dup', callback);
        bus.on('dup', callback);
        bus.off('dup', callback);
        bus.emit('dup');
        expect(callback).toHaveBeenCalledTimes(1);
      });

      it('should handle off with non-existent event gracefully', () => {
        const callback = vi.fn();
        expect(() => bus.off('nonexistent', callback)).not.toThrow();
      });

      it('should handle off with non-existent callback gracefully', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        bus.on('test', callback1);
        expect(() => bus.off('test', callback2)).not.toThrow();
      });

      it('should emit with undefined arguments', () => {
        const handler = vi.fn();
        bus.on('undef', handler);
        bus.emit('undef', undefined);
        expect(handler).toHaveBeenCalledWith(undefined);
      });

      it('should emit with null arguments', () => {
        const handler = vi.fn();
        bus.on('null', handler);
        bus.emit('null', null);
        expect(handler).toHaveBeenCalledWith(null);
      });

      it('should handle emit with no listeners', () => {
        expect(() => bus.emit('no-listeners')).not.toThrow();
      });

      it('should handle emit with no arguments beyond event name', () => {
        const handler = vi.fn();
        bus.on('no-args', handler);
        bus.emit('no-args');
        expect(handler).toHaveBeenCalledWith();
      });
    });

    describe('3.5 GameStateMachine boundary conditions', () => {
      let sm: GameStateMachine;

      beforeEach(() => {
        sm = new GameStateMachine();
      });

      it('should handle rapid state transitions', () => {
        sm.transition('playing');
        sm.transition('paused');
        sm.transition('playing');
        sm.transition('gameover');
        sm.transition('menu');
        sm.transition('playing');
        expect(sm.getCurrentState()).toBe('playing');
      });

      it('should track full state history through rapid transitions', () => {
        sm.transition('playing');
        sm.transition('paused');
        sm.transition('playing');
        expect(sm.getPreviousState()).toBe('paused');
      });

      it('should test transition to all 5 states from menu', () => {
        expect(sm.getCurrentState()).toBe('menu');
        expect(sm.canTransition('menu')).toBe(false);
        expect(sm.canTransition('playing')).toBe(true);
        expect(sm.canTransition('paused')).toBe(false);
        expect(sm.canTransition('gameover')).toBe(false);
        expect(sm.canTransition('levelComplete')).toBe(false);
      });

      it('should test transition to all 5 states from playing', () => {
        sm.transition('playing');
        expect(sm.canTransition('menu')).toBe(true);
        expect(sm.canTransition('playing')).toBe(false);
        expect(sm.canTransition('paused')).toBe(true);
        expect(sm.canTransition('gameover')).toBe(true);
        expect(sm.canTransition('levelComplete')).toBe(true);
      });

      it('should test transition to all 5 states from paused', () => {
        sm.transition('playing');
        sm.transition('paused');
        expect(sm.canTransition('menu')).toBe(true);
        expect(sm.canTransition('playing')).toBe(true);
        expect(sm.canTransition('paused')).toBe(false);
        expect(sm.canTransition('gameover')).toBe(false);
        expect(sm.canTransition('levelComplete')).toBe(false);
      });

      it('should test transition to all 5 states from gameover', () => {
        sm.transition('playing');
        sm.transition('gameover');
        expect(sm.canTransition('menu')).toBe(true);
        expect(sm.canTransition('playing')).toBe(true);
        expect(sm.canTransition('paused')).toBe(false);
        expect(sm.canTransition('gameover')).toBe(false);
        expect(sm.canTransition('levelComplete')).toBe(false);
      });

      it('should test transition to all 5 states from levelComplete', () => {
        sm.transition('playing');
        sm.transition('levelComplete');
        expect(sm.canTransition('menu')).toBe(true);
        expect(sm.canTransition('playing')).toBe(true);
        expect(sm.canTransition('paused')).toBe(false);
        expect(sm.canTransition('gameover')).toBe(false);
        expect(sm.canTransition('levelComplete')).toBe(false);
      });

      it('should handle reset during transition callbacks', () => {
        const states: GameState[] = [];
        sm.onAnyChange((from, to) => {
          states.push(to);
          if (to === 'gameover') {
            sm.reset();
          }
        });
        sm.transition('playing');
        sm.transition('gameover');
        expect(sm.getCurrentState()).toBe('menu');
        expect(states).toContain('playing');
        expect(states).toContain('gameover');
      });

      it('should ignore transition to same state', () => {
        const handler = vi.fn();
        sm.onAnyChange(handler);
        sm.transition('menu');
        expect(handler).not.toHaveBeenCalled();
        expect(sm.getCurrentState()).toBe('menu');
      });

      it('transition() now validates against canTransition rules and blocks invalid transitions', () => {
        expect(sm.canTransition('gameover')).toBe(false);
        const result = sm.transition('gameover');
        expect(result).toBe(false);
        expect(sm.getCurrentState()).toBe('menu');
      });
    });
  });

  describe('4. InputManager', () => {

    describe('4.1 Constructor requires canvas', () => {
      it('should create InputManager with a mock canvas element', () => {
        const canvas = document.createElement('canvas');
        const im = new InputManager(canvas);
        expect(im).toBeDefined();
        expect(im.getState()).toBeDefined();
      });

      it('should initialize with default state', () => {
        const canvas = document.createElement('canvas');
        const im = new InputManager(canvas);
        const state = im.getState();
        expect(state.isDown).toBe(false);
        expect(state.isMoving).toBe(false);
      });
    });

    describe('4.2 Callback registration', () => {
      let canvas: HTMLCanvasElement;
      let im: InputManager;

      beforeEach(() => {
        canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
        im = new InputManager(canvas);
      });

      afterEach(() => {
        document.body.removeChild(canvas);
      });

      it('should fire onDown callback on mousedown', () => {
        const downHandler = vi.fn();
        im.onDown(downHandler);
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 200 }));
        expect(downHandler).toHaveBeenCalled();
        const state = downHandler.mock.calls[0][0];
        expect(state.isDown).toBe(true);
        expect(state.isMoving).toBe(false);
      });

      it('should fire onMove callback on mousemove', () => {
        const moveHandler = vi.fn();
        im.onMove(moveHandler);
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 250 }));
        expect(moveHandler).toHaveBeenCalled();
      });

      it('should fire onUp callback on mouseup', () => {
        const upHandler = vi.fn();
        im.onUp(upHandler);
        canvas.dispatchEvent(new MouseEvent('mouseup'));
        expect(upHandler).toHaveBeenCalled();
        const state = upHandler.mock.calls[0][0];
        expect(state.isDown).toBe(false);
        expect(state.isMoving).toBe(false);
      });

      it('should update state position on mouse events', () => {
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 200 }));
        const state = im.getState();
        expect(state.position.x).toBe(100);
        expect(state.position.y).toBe(200);
      });

      it('should track isMoving when moving while down', () => {
        const moveHandler = vi.fn();
        im.onMove(moveHandler);
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 200 }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 250 }));
        expect(moveHandler).toHaveBeenCalled();
        const lastCall = moveHandler.mock.calls[moveHandler.mock.calls.length - 1][0];
        expect(lastCall.isMoving).toBe(true);
      });

      it('should return current state via getState', () => {
        const state = im.getState();
        expect(state).toHaveProperty('position');
        expect(state).toHaveProperty('isDown');
        expect(state).toHaveProperty('isMoving');
      });

      it('should support multiple callbacks for the same event', () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();
        im.onDown(handler1);
        im.onDown(handler2);
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50 }));
        expect(handler1).toHaveBeenCalled();
        expect(handler2).toHaveBeenCalled();
      });
    });
  });
});
