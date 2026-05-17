import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LuckyProp } from '../../../src/gameplay/props/LuckyProp';
import { PropType, PropConfig } from '../../../src/gameplay/props/Prop';
import { eventBus } from '../../../src/utils/EventBus';
import { GameEvents } from '../../../src/utils/GameEvents';

const luckyConfig: PropConfig = {
  id: 'prop_lucky',
  type: PropType.LUCKY,
  name: '幸运投放',
  description: '接下来3次投放必出高数字',
  icon: 'lucky',
  maxCount: 2,
  cooldown: 2000,
  price: 120,
};

describe('LuckyProp', () => {
  let luckyProp: LuckyProp;
  let originalDateNow: () => number;

  beforeEach(() => {
    luckyProp = new LuckyProp(luckyConfig);
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
    it('should return true and emit PROPS_LUCKY_ACTIVATE', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_LUCKY_ACTIVATE, handler);

      const result = luckyProp.use();

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith({
        multiplier: 2,
        remainingDrops: 3,
      });

      eventBus.off(GameEvents.PROPS_LUCKY_ACTIVATE, handler);
    });

    it('should increment usedCount on successful use', () => {
      luckyProp.use();
      expect(luckyProp.getRemainingCount()).toBe(1);
    });

    it('should return false when all uses are exhausted', () => {
      luckyProp.use();
      advanceTime(2500);
      luckyProp.use();

      const result = luckyProp.use();
      expect(result).toBe(false);
      expect(luckyProp.getRemainingCount()).toBe(0);
    });

    it('should return false when destroyed', () => {
      luckyProp.destroy();
      const result = luckyProp.use();
      expect(result).toBe(false);
    });

    it('should return false during cooldown', () => {
      luckyProp.use();
      const result = luckyProp.use();
      expect(result).toBe(false);
    });

    it('should succeed after cooldown expires', () => {
      luckyProp.use();
      advanceTime(2100);
      const result = luckyProp.use();
      expect(result).toBe(true);
    });

    it('should reset luckyRemainingDrops to 3 on each use', () => {
      luckyProp.use();
      luckyProp.consumeLuckyDrop();
      luckyProp.consumeLuckyDrop();
      expect(luckyProp.isLuckyActive()).toBe(true);

      advanceTime(2100);
      luckyProp.use();
      expect(luckyProp.isLuckyActive()).toBe(true);
      expect(luckyProp.getLuckyMultiplier()).toBe(2);
    });
  });

  describe('canUse', () => {
    it('should return true initially', () => {
      expect(luckyProp.canUse()).toBe(true);
    });

    it('should return false when all uses exhausted', () => {
      luckyProp.use();
      advanceTime(2500);
      luckyProp.use();
      expect(luckyProp.canUse()).toBe(false);
    });

    it('should return false when destroyed', () => {
      luckyProp.destroy();
      expect(luckyProp.canUse()).toBe(false);
    });

    it('should return false during cooldown', () => {
      luckyProp.use();
      expect(luckyProp.canUse()).toBe(false);
    });

    it('should return true after cooldown', () => {
      luckyProp.use();
      advanceTime(2100);
      expect(luckyProp.canUse()).toBe(true);
    });
  });

  describe('cooldownReady', () => {
    it('should return true on first use', () => {
      expect(luckyProp.cooldownReady()).toBe(true);
    });

    it('should return true after cooldown period from config', () => {
      luckyProp.use();
      expect(luckyProp.cooldownReady()).toBe(false);
      advanceTime(2100);
      expect(luckyProp.cooldownReady()).toBe(true);
    });

    it('should return false during cooldown', () => {
      luckyProp.use();
      expect(luckyProp.cooldownReady()).toBe(false);
    });

    it('should use config.cooldown value not hardcoded value', () => {
      const customConfig: PropConfig = {
        ...luckyConfig,
        cooldown: 5000,
      };
      const customLucky = new LuckyProp(customConfig);

      customLucky.use();
      advanceTime(3000);
      expect(customLucky.cooldownReady()).toBe(false);

      advanceTime(2100);
      expect(customLucky.cooldownReady()).toBe(true);

      customLucky.destroy();
    });

    it('should return false before config.cooldown elapses', () => {
      luckyProp.use();
      advanceTime(1999);
      expect(luckyProp.cooldownReady()).toBe(false);
    });

    it('should return true exactly at config.cooldown', () => {
      luckyProp.use();
      advanceTime(2000);
      expect(luckyProp.cooldownReady()).toBe(true);
    });
  });

  describe('consumeLuckyDrop', () => {
    it('should decrement remaining drops', () => {
      luckyProp.use();
      luckyProp.consumeLuckyDrop();
      expect(luckyProp.isLuckyActive()).toBe(true);
    });

    it('should emit PROPS_LUCKY_DROP_CONSUMED on each consume', () => {
      luckyProp.use();
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_LUCKY_DROP_CONSUMED, handler);

      luckyProp.consumeLuckyDrop();
      expect(handler).toHaveBeenCalledWith({ remainingDrops: 2 });

      eventBus.off(GameEvents.PROPS_LUCKY_DROP_CONSUMED, handler);
    });

    it('should emit PROPS_LUCKY_DEACTIVATE when all drops consumed', () => {
      luckyProp.use();
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_LUCKY_DEACTIVATE, handler);

      luckyProp.consumeLuckyDrop();
      luckyProp.consumeLuckyDrop();
      luckyProp.consumeLuckyDrop();

      expect(handler).toHaveBeenCalled();
      expect(luckyProp.isLuckyActive()).toBe(false);

      eventBus.off(GameEvents.PROPS_LUCKY_DEACTIVATE, handler);
    });

    it('should not emit PROPS_LUCKY_DEACTIVATE before all drops consumed', () => {
      luckyProp.use();
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_LUCKY_DEACTIVATE, handler);

      luckyProp.consumeLuckyDrop();
      luckyProp.consumeLuckyDrop();

      expect(handler).not.toHaveBeenCalled();
      expect(luckyProp.isLuckyActive()).toBe(true);

      eventBus.off(GameEvents.PROPS_LUCKY_DEACTIVATE, handler);
    });

    it('should do nothing when no drops remaining', () => {
      luckyProp.use();
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_LUCKY_DROP_CONSUMED, handler);

      luckyProp.consumeLuckyDrop();
      luckyProp.consumeLuckyDrop();
      luckyProp.consumeLuckyDrop();
      handler.mockClear();

      luckyProp.consumeLuckyDrop();
      expect(handler).not.toHaveBeenCalled();

      eventBus.off(GameEvents.PROPS_LUCKY_DROP_CONSUMED, handler);
    });

    it('should do nothing when prop has not been used', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_LUCKY_DROP_CONSUMED, handler);

      luckyProp.consumeLuckyDrop();
      expect(handler).not.toHaveBeenCalled();

      eventBus.off(GameEvents.PROPS_LUCKY_DROP_CONSUMED, handler);
    });
  });

  describe('isLuckyActive', () => {
    it('should return false before use', () => {
      expect(luckyProp.isLuckyActive()).toBe(false);
    });

    it('should return true after use', () => {
      luckyProp.use();
      expect(luckyProp.isLuckyActive()).toBe(true);
    });

    it('should return false after all drops consumed', () => {
      luckyProp.use();
      luckyProp.consumeLuckyDrop();
      luckyProp.consumeLuckyDrop();
      luckyProp.consumeLuckyDrop();
      expect(luckyProp.isLuckyActive()).toBe(false);
    });
  });

  describe('getLuckyMultiplier', () => {
    it('should return 1 when not active', () => {
      expect(luckyProp.getLuckyMultiplier()).toBe(1);
    });

    it('should return bonusMultiplier when active', () => {
      luckyProp.use();
      expect(luckyProp.getLuckyMultiplier()).toBe(2);
    });

    it('should return 1 after all drops consumed', () => {
      luckyProp.use();
      luckyProp.consumeLuckyDrop();
      luckyProp.consumeLuckyDrop();
      luckyProp.consumeLuckyDrop();
      expect(luckyProp.getLuckyMultiplier()).toBe(1);
    });

    it('should return multiplier while drops remain', () => {
      luckyProp.use();
      luckyProp.consumeLuckyDrop();
      expect(luckyProp.getLuckyMultiplier()).toBe(2);
      luckyProp.consumeLuckyDrop();
      expect(luckyProp.getLuckyMultiplier()).toBe(2);
    });
  });

  describe('getRemainingCount', () => {
    it('should return maxCount initially', () => {
      expect(luckyProp.getRemainingCount()).toBe(2);
    });

    it('should decrease after each use', () => {
      luckyProp.use();
      expect(luckyProp.getRemainingCount()).toBe(1);
      advanceTime(2100);
      luckyProp.use();
      expect(luckyProp.getRemainingCount()).toBe(0);
    });

    it('should return 0 when destroyed', () => {
      luckyProp.destroy();
      expect(luckyProp.getRemainingCount()).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset usedCount', () => {
      luckyProp.use();
      luckyProp.reset();
      expect(luckyProp.getRemainingCount()).toBe(2);
    });

    it('should not reset when destroyed', () => {
      luckyProp.destroy();
      luckyProp.reset();
      expect(luckyProp.getRemainingCount()).toBe(0);
    });
  });

  describe('destroy', () => {
    it('should mark prop as destroyed', () => {
      luckyProp.destroy();
      expect(luckyProp.isDestroyed).toBe(true);
    });

    it('should not destroy twice', () => {
      luckyProp.destroy();
      luckyProp.destroy();
      expect(luckyProp.isDestroyed).toBe(true);
    });
  });
});
