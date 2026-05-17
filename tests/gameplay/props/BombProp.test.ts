import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BombProp } from '../../../src/gameplay/props/BombProp';
import { PropType, PropConfig } from '../../../src/gameplay/props/Prop';
import { eventBus } from '../../../src/utils/EventBus';
import { GameEvents } from '../../../src/utils/GameEvents';
import Matter from 'matter-js';
import { Block } from '../../../src/gameplay/Block';

const bombConfig: PropConfig = {
  id: 'prop_bomb',
  type: PropType.BOMB,
  name: '炸弹',
  description: '销毁指定区域内所有方块',
  icon: 'bomb',
  maxCount: 3,
  cooldown: 1000,
  price: 50,
};

describe('BombProp', () => {
  let bombProp: BombProp;
  let originalDateNow: () => number;

  beforeEach(() => {
    bombProp = new BombProp(bombConfig);
    originalDateNow = Date.now;
  });

  afterEach(() => {
    Date.now = originalDateNow;
  });

  function advanceTime(ms: number) {
    const base = Date.now();
    Date.now = () => base + ms;
  }

  describe('use', () => {
    it('should return true and emit PROPS_BOMB_EXPLODE when target is provided', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_BOMB_EXPLODE, handler);

      const result = bombProp.use({ x: 100, y: 200 });

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith({
        x: 100,
        y: 200,
        radius: 120,
      });

      eventBus.off(GameEvents.PROPS_BOMB_EXPLODE, handler);
    });

    it('should return false and emit PROPS_BOMB_REQUIRE_TARGET when no target', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_BOMB_REQUIRE_TARGET, handler);

      const result = bombProp.use();

      expect(result).toBe(false);
      expect(handler).toHaveBeenCalled();

      eventBus.off(GameEvents.PROPS_BOMB_REQUIRE_TARGET, handler);
    });

    it('should increment usedCount on successful use', () => {
      bombProp.use({ x: 100, y: 200 });
      expect(bombProp.getRemainingCount()).toBe(2);
    });

    it('should return false when all uses are exhausted', () => {
      bombProp.use({ x: 100, y: 200 });
      advanceTime(1100);
      bombProp.use({ x: 100, y: 200 });
      advanceTime(2200);
      bombProp.use({ x: 100, y: 200 });

      const result = bombProp.use({ x: 100, y: 200 });
      expect(result).toBe(false);
      expect(bombProp.getRemainingCount()).toBe(0);
    });

    it('should return false when destroyed', () => {
      bombProp.destroy();
      const result = bombProp.use({ x: 100, y: 200 });
      expect(result).toBe(false);
    });

    it('should return false during cooldown', () => {
      bombProp.use({ x: 100, y: 200 });
      const result = bombProp.use({ x: 100, y: 200 });
      expect(result).toBe(false);
    });

    it('should succeed after cooldown expires', () => {
      bombProp.use({ x: 100, y: 200 });
      advanceTime(1100);
      const result = bombProp.use({ x: 100, y: 200 });
      expect(result).toBe(true);
    });
  });

  describe('canUse', () => {
    it('should return true initially', () => {
      expect(bombProp.canUse()).toBe(true);
    });

    it('should return false when all uses exhausted', () => {
      bombProp.use({ x: 100, y: 200 });
      advanceTime(1100);
      bombProp.use({ x: 100, y: 200 });
      advanceTime(2200);
      bombProp.use({ x: 100, y: 200 });
      expect(bombProp.canUse()).toBe(false);
    });

    it('should return false when destroyed', () => {
      bombProp.destroy();
      expect(bombProp.canUse()).toBe(false);
    });

    it('should return false during cooldown', () => {
      bombProp.use({ x: 100, y: 200 });
      expect(bombProp.canUse()).toBe(false);
    });

    it('should return true after cooldown', () => {
      bombProp.use({ x: 100, y: 200 });
      advanceTime(1100);
      expect(bombProp.canUse()).toBe(true);
    });
  });

  describe('cooldownReady', () => {
    it('should return true on first use', () => {
      expect(bombProp.cooldownReady()).toBe(true);
    });

    it('should return true after cooldown period', () => {
      bombProp.use({ x: 100, y: 200 });
      expect(bombProp.cooldownReady()).toBe(false);
      advanceTime(1100);
      expect(bombProp.cooldownReady()).toBe(true);
    });

    it('should return false during cooldown', () => {
      bombProp.use({ x: 100, y: 200 });
      expect(bombProp.cooldownReady()).toBe(false);
    });
  });

  describe('getAffectedBlocks', () => {
    function createBlockAt(x: number, y: number, value: number = 1): Block {
      const body = Matter.Bodies.circle(x, y, 20);
      return new Block(body, value);
    }

    it('should return blocks within radius', () => {
      const block1 = createBlockAt(100, 200);
      const block2 = createBlockAt(150, 250);
      const allBlocks = [block1, block2];

      const affected = bombProp.getAffectedBlocks(allBlocks, 100, 200);
      expect(affected).toContain(block1);
      expect(affected).toContain(block2);
    });

    it('should not return blocks outside radius', () => {
      const block1 = createBlockAt(100, 200);
      const block2 = createBlockAt(500, 500);
      const allBlocks = [block1, block2];

      const affected = bombProp.getAffectedBlocks(allBlocks, 100, 200);
      expect(affected).toContain(block1);
      expect(affected).not.toContain(block2);
    });

    it('should return empty array when no blocks are in range', () => {
      const block1 = createBlockAt(500, 500);
      const allBlocks = [block1];

      const affected = bombProp.getAffectedBlocks(allBlocks, 100, 200);
      expect(affected).toHaveLength(0);
    });

    it('should return empty array for empty input', () => {
      const affected = bombProp.getAffectedBlocks([], 100, 200);
      expect(affected).toHaveLength(0);
    });

    it('should include blocks exactly at radius boundary', () => {
      const blockAtEdge = createBlockAt(220, 200);
      const allBlocks = [blockAtEdge];

      const affected = bombProp.getAffectedBlocks(allBlocks, 100, 200);
      expect(affected).toContain(blockAtEdge);
    });

    it('should use default radius of 120', () => {
      const blockInside = createBlockAt(219, 200);
      const blockOutside = createBlockAt(221, 200);
      const allBlocks = [blockInside, blockOutside];

      const affected = bombProp.getAffectedBlocks(allBlocks, 100, 200);
      expect(affected).toContain(blockInside);
      expect(affected).not.toContain(blockOutside);
    });
  });

  describe('getRemainingCount', () => {
    it('should return maxCount initially', () => {
      expect(bombProp.getRemainingCount()).toBe(3);
    });

    it('should decrease after each use', () => {
      bombProp.use({ x: 100, y: 200 });
      expect(bombProp.getRemainingCount()).toBe(2);
      advanceTime(1100);
      bombProp.use({ x: 100, y: 200 });
      expect(bombProp.getRemainingCount()).toBe(1);
    });

    it('should return 0 when destroyed', () => {
      bombProp.destroy();
      expect(bombProp.getRemainingCount()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset usedCount', () => {
      bombProp.use({ x: 100, y: 200 });
      advanceTime(1100);
      bombProp.use({ x: 100, y: 200 });
      bombProp.reset();
      expect(bombProp.getRemainingCount()).toBe(3);
    });

    it('should not reset when destroyed', () => {
      bombProp.destroy();
      bombProp.reset();
      expect(bombProp.getRemainingCount()).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should mark prop as destroyed', () => {
      bombProp.destroy();
      expect(bombProp.isDestroyed).toBe(true);
    });

    it('should not destroy twice', () => {
      bombProp.destroy();
      bombProp.destroy();
      expect(bombProp.isDestroyed).toBe(true);
    });
  });
});
