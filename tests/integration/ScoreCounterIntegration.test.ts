import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScoreSystem, SCORE_CONFIGS } from '../../src/gameplay/ScoreSystem';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { Block } from '../../src/gameplay/Block';
import { eventBus, GameEvents } from '../../src/utils/EventBus';
import { AnimationManager } from '../../src/utils/AnimationManager';
import fs from 'fs';
import path from 'path';

describe('Score Counter Integration Tests', () => {
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let scoreSystem: ScoreSystem;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    scoreSystem = new ScoreSystem();
    mergeSystem.setScoreSystem(scoreSystem);

    vi.spyOn(physics, 'onCollisionStart').mockImplementation((callback) => {
      return () => {};
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createBlock(value: number, x: number, y: number, label: string): Block {
    const body = physics.createCircle(x, y, 20, { density: 0.001 });
    body.label = label;
    const block = new Block(body, value);
    mergeSystem.registerBlock(block);
    return block;
  }

  function findBodyByLabel(label: string): Matter.Body | undefined {
    return physics.getAllBodies().find((b) => b.label === label);
  }

  function simulatePostStep(): void {
    (mergeSystem as any).sameFramePairs.clear();
    (mergeSystem as any).runSpatialMergeCheck();
  }

  describe('Collision → Merge → Score Flow', () => {
    it('should increment score when two same-value blocks merge', () => {
      createBlock(2, 200, 300, 'block_a');
      createBlock(2, 220, 300, 'block_b');

      const scoreBefore = scoreSystem.getCurrentScore();

      const collisionA = findBodyByLabel('block_a');
      const collisionB = findBodyByLabel('block_b');
      if (collisionA && collisionB) {
        (mergeSystem as any).handleCollision(collisionA, collisionB);
        simulatePostStep();
      }

      const scoreAfter = scoreSystem.getCurrentScore();
      expect(scoreAfter).toBeGreaterThan(scoreBefore);
    });

    it('should not increment score when two different-value blocks collide', () => {
      createBlock(2, 200, 300, 'block_c');
      createBlock(4, 220, 300, 'block_d');

      const scoreBefore = scoreSystem.getCurrentScore();

      const collisionA = findBodyByLabel('block_c');
      const collisionB = findBodyByLabel('block_d');
      if (collisionA && collisionB) {
        (mergeSystem as any).handleCollision(collisionA, collisionB);
        simulatePostStep();
      }

      const scoreAfter = scoreSystem.getCurrentScore();
      expect(scoreAfter).toBe(scoreBefore);
    });

    it('should emit SCORE_UPDATED event when merge occurs', () => {
      const scoreHandler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, scoreHandler);

      createBlock(2, 200, 300, 'block_e');
      createBlock(2, 220, 300, 'block_f');

      const collisionA = findBodyByLabel('block_e');
      const collisionB = findBodyByLabel('block_f');
      if (collisionA && collisionB) {
        (mergeSystem as any).handleCollision(collisionA, collisionB);
        simulatePostStep();
      }

      expect(scoreHandler).toHaveBeenCalled();
      const eventData = scoreHandler.mock.calls[0][0];
      expect(eventData.totalScore).toBeGreaterThan(0);
      expect(eventData.earnedScore).toBeGreaterThan(0);

      eventBus.off(GameEvents.SCORE_UPDATED, scoreHandler);
    });

    it('should emit BLOCK_MERGED event when merge occurs', () => {
      const mergeHandler = vi.fn();
      eventBus.on(GameEvents.BLOCK_MERGED, mergeHandler);

      createBlock(2, 200, 300, 'block_g');
      createBlock(2, 220, 300, 'block_h');

      const collisionA = findBodyByLabel('block_g');
      const collisionB = findBodyByLabel('block_h');
      if (collisionA && collisionB) {
        (mergeSystem as any).handleCollision(collisionA, collisionB);
        simulatePostStep();
      }

      expect(mergeHandler).toHaveBeenCalled();

      eventBus.off(GameEvents.BLOCK_MERGED, mergeHandler);
    });

    it('should accumulate score across multiple merges', () => {
      createBlock(2, 200, 300, 'block_i');
      createBlock(2, 220, 300, 'block_j');

      const ca = findBodyByLabel('block_i');
      const cb = findBodyByLabel('block_j');
      if (ca && cb) {
        (mergeSystem as any).handleCollision(ca, cb);
        simulatePostStep();
      }

      const scoreAfterFirst = scoreSystem.getCurrentScore();
      expect(scoreAfterFirst).toBeGreaterThan(0);

      createBlock(4, 200, 300, 'block_k');
      createBlock(4, 220, 300, 'block_l');

      const cc = findBodyByLabel('block_k');
      const cd = findBodyByLabel('block_l');
      if (cc && cd) {
        (mergeSystem as any).handleCollision(cc, cd);
        simulatePostStep();
      }

      const scoreAfterSecond = scoreSystem.getCurrentScore();
      expect(scoreAfterSecond).toBeGreaterThan(scoreAfterFirst);
    });
  });

  describe('Level 2 Specific Scenarios', () => {
    it('should correctly score merge of two "2" blocks (level 2 initial merge)', () => {
      const blockA = createBlock(2, 100, 100, 'l2_block_a');
      const blockB = createBlock(2, 120, 100, 'l2_block_b');

      const collisionA = findBodyByLabel('l2_block_a');
      const collisionB = findBodyByLabel('l2_block_b');
      if (collisionA && collisionB) {
        (mergeSystem as any).handleCollision(collisionA, collisionB);
        simulatePostStep();
      }

      expect(scoreSystem.getCurrentScore()).toBeGreaterThanOrEqual(1);
    });

    it('should correctly score merge of two "4" blocks', () => {
      createBlock(4, 100, 100, 'l2_block_c');
      createBlock(4, 120, 100, 'l2_block_d');

      const ca = findBodyByLabel('l2_block_c');
      const cb = findBodyByLabel('l2_block_d');
      if (ca && cb) {
        (mergeSystem as any).handleCollision(ca, cb);
        simulatePostStep();
      }

      expect(scoreSystem.getCurrentScore()).toBeGreaterThanOrEqual(1);
    });

    it('should track chain count correctly for consecutive merges', () => {
      createBlock(2, 100, 100, 'chain_a1');
      createBlock(2, 120, 100, 'chain_a2');

      const ca1 = findBodyByLabel('chain_a1');
      const ca2 = findBodyByLabel('chain_a2');
      if (ca1 && ca2) {
        (mergeSystem as any).handleCollision(ca1, ca2);
        simulatePostStep();
      }

      const chainAfterFirst = scoreSystem.getChainCount();
      expect(chainAfterFirst).toBe(1);

      createBlock(4, 100, 100, 'chain_b1');
      createBlock(4, 120, 100, 'chain_b2');

      const cb1 = findBodyByLabel('chain_b1');
      const cb2 = findBodyByLabel('chain_b2');
      if (cb1 && cb2) {
        (mergeSystem as any).handleCollision(cb1, cb2);
        simulatePostStep();
      }

      const chainAfterSecond = scoreSystem.getChainCount();
      expect(chainAfterSecond).toBeGreaterThanOrEqual(1);
    });

    it('should emit SCORE_UPDATED with correct earnedScore for small merges', () => {
      const scores: number[] = [];
      eventBus.on(GameEvents.SCORE_UPDATED, (data: { totalScore: number; earnedScore: number }) => {
        scores.push(data.earnedScore);
      });

      createBlock(2, 100, 100, 'small_a');
      createBlock(2, 120, 100, 'small_b');

      const ca = findBodyByLabel('small_a');
      const cb = findBodyByLabel('small_b');
      if (ca && cb) {
        (mergeSystem as any).handleCollision(ca, cb);
        simulatePostStep();
      }

      expect(scores.length).toBeGreaterThan(0);
      expect(scores[0]).toBeGreaterThan(0);
    });
  });

  describe('Spatial Merge Check', () => {
    it('should detect nearby same-value blocks after physics step', () => {
      const blockA = createBlock(2, 200, 200, 'spatial_a');
      const blockB = createBlock(2, 205, 200, 'spatial_b');

      blockA.body.position.x = 200;
      blockA.body.position.y = 200;
      blockB.body.position.x = 205;
      blockB.body.position.y = 200;

      (mergeSystem as any).runSpatialMergeCheck();
      simulatePostStep();

      expect(scoreSystem.getCurrentScore()).toBeGreaterThan(0);
    });
  });
});

const levelsDir = path.resolve(__dirname, '../../src/data/levels');

function loadLevelJson(id: number): any {
  return JSON.parse(fs.readFileSync(path.join(levelsDir, `level_${String(id).padStart(2, '0')}.json`), 'utf-8'));
}

function validateStars60_80_100(stars: number[]): boolean {
  const threeStar = stars[2];
  return stars[0] === Math.round(threeStar * 0.6) && stars[1] === Math.round(threeStar * 0.8);
}

function validateStarsMonotonic(stars: number[]): boolean {
  return stars[0] < stars[1] && stars[1] < stars[2] && stars[2] > 0;
}

describe('Score system numerical balance', () => {
  let ss: ScoreSystem;

  beforeEach(() => {
    ss = new ScoreSystem();
  });

  afterEach(() => {
    ss.reset();
  });

  describe('SCORE_CONFIGS table completeness', () => {
    it('SCORE_CONFIGS contains all powers of 2 from 2 to 4096', () => {
      const powers = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
      for (const p of powers) {
        expect(SCORE_CONFIGS[p]).toBeDefined();
        expect(SCORE_CONFIGS[p].baseScore).toBeGreaterThan(0);
        expect(SCORE_CONFIGS[p].chainMultiplier).toBeGreaterThanOrEqual(1.0);
      }
    });

    it('baseScore increases with merge value', () => {
      const powers = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
      for (let i = 1; i < powers.length; i++) {
        expect(SCORE_CONFIGS[powers[i]].baseScore).toBeGreaterThan(SCORE_CONFIGS[powers[i - 1]].baseScore);
      }
    });

    it('chainMultiplier increases with merge value', () => {
      const powers = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
      for (let i = 1; i < powers.length; i++) {
        expect(SCORE_CONFIGS[powers[i]].chainMultiplier).toBeGreaterThanOrEqual(SCORE_CONFIGS[powers[i - 1]].chainMultiplier);
      }
    });
  });

  describe('addMergeScore uses SCORE_CONFIGS table uniformly', () => {
    it('merge value in SCORE_CONFIGS uses baseScore from table', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.addMergeScore(16, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.baseScore).toBe(SCORE_CONFIGS[16].baseScore);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });

    it('merge value in SCORE_CONFIGS uses chainMultiplier from table', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.addMergeScore(32, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.chainMultiplier).toBeCloseTo(SCORE_CONFIGS[32].chainMultiplier, 5);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });

    it('merge value not in SCORE_CONFIGS uses calculateScore fallback', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.addMergeScore(3, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.baseScore).toBeGreaterThan(0);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });

    it('high value merge chainMultiplier > 1.0', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.addMergeScore(128, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.chainMultiplier).toBeGreaterThan(1.0);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });
  });

  describe('Star lines follow 60%/80%/100% rule', () => {
    it('Level 1 star line [300, 400, 500] follows the rule', () => {
      const level1 = loadLevelJson(1);
      expect(validateStars60_80_100(level1.rewards.stars)).toBe(true);
    });

    it('all score type level star lines follow 60%/80%/100% rule', () => {
      for (let i = 1; i <= 15; i++) {
        const level = loadLevelJson(i);
        if (level.objective.type === 'score') {
          expect(validateStars60_80_100(level.rewards.stars)).toBe(true);
        }
      }
    });

    it('all non-score type level star lines are monotonically increasing and 3-star equals target', () => {
      for (let i = 1; i <= 15; i++) {
        const level = loadLevelJson(i);
        if (level.objective.type !== 'score') {
          expect(validateStarsMonotonic(level.rewards.stars)).toBe(true);
          expect(level.rewards.stars[2]).toBe(level.objective.target);
        }
      }
    });
  });

  describe('Score system numerical soundness', () => {
    it('chain bonus applies correctly', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.addMergeScore(4, false);
      ss.addMergeScore(4, true);
      ss.addMergeScore(4, true);

      expect(handler).toHaveBeenCalledTimes(3);
      const firstCall = handler.mock.calls[0][0];
      const thirdCall = handler.mock.calls[2][0];
      expect(thirdCall.earnedScore).toBeGreaterThan(firstCall.earnedScore);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });

    it('lucky multiplier applies correctly', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.setLuckyMultiplier(2);
      ss.addMergeScore(4, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.earnedScore).toBe(SCORE_CONFIGS[4].baseScore * 2);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });
  });

  describe('Source verification: addMergeScore uses SCORE_CONFIGS', () => {
    it('addMergeScore method references SCORE_CONFIGS', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/gameplay/ScoreSystem.ts'),
        'utf-8'
      );
      const match = content.match(/addMergeScore\(value: number, isCombo: boolean = false\): void \{[\s\S]*?\n  \}/);
      expect(match).toBeTruthy();
      expect(match![0]).toContain('SCORE_CONFIGS');
      expect(match![0]).toContain('configEntry');
      expect(match![0]).toContain('chainMultiplierFromTable');
    });
  });
});