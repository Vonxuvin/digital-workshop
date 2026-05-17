import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScoreSystem } from '../../src/gameplay/ScoreSystem';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { Block } from '../../src/gameplay/Block';
import { eventBus, GameEvents } from '../../src/utils/EventBus';
import { AnimationManager } from '../../src/utils/AnimationManager';

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