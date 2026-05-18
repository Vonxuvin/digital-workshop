import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FreezeProp } from '../../../src/gameplay/props/FreezeProp';
import { PropType, PropConfig } from '../../../src/gameplay/props/Prop';
import { eventBus } from '../../../src/utils/EventBus';
import { GameEvents } from '../../../src/utils/GameEvents';
import { AnimationManager } from '../../../src/utils/AnimationManager';

const freezeConfig: PropConfig = {
  id: 'prop_freeze',
  type: PropType.FREEZE,
  name: '冻结',
  description: '暂停物理模拟5秒',
  icon: 'freeze',
  maxCount: 3,
  cooldown: 1000,
  price: 60,
};

describe('FreezeProp', () => {
  let freezeProp: FreezeProp;
  let originalDateNow: () => number;

  beforeEach(() => {
    AnimationManager.resetInstance();
    AnimationManager.getInstance();
    freezeProp = new FreezeProp(freezeConfig);
    originalDateNow = Date.now;
  });

  afterEach(() => {
    Date.now = originalDateNow;
    freezeProp.destroy();
    AnimationManager.resetInstance();
  });

  function advanceTime(ms: number) {
    const base = Date.now();
    Date.now = () => base + ms;
  }

  describe('use', () => {
    it('should return true and emit PROPS_FREEZE_ACTIVATED', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_FREEZE_ACTIVATED, handler);

      const result = freezeProp.use();

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith({ duration: 5000 });

      eventBus.off(GameEvents.PROPS_FREEZE_ACTIVATED, handler);
    });

    it('should return false when cannot use', () => {
      freezeProp.use();
      const result = freezeProp.use();
      expect(result).toBe(false);
    });

    it('should extend freeze when already frozen', () => {
      freezeProp.use();
      advanceTime(1100);

      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_FREEZE_EXTENDED, handler);

      const result = freezeProp.use();

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith({ additionalDuration: 5000 });

      eventBus.off(GameEvents.PROPS_FREEZE_EXTENDED, handler);
    });

    it('should increment usedCount on first use', () => {
      freezeProp.use();
      expect(freezeProp.getRemainingCount()).toBe(2);
    });

    it('should not increment usedCount when extending freeze', () => {
      freezeProp.use();
      advanceTime(1100);
      freezeProp.use();
      expect(freezeProp.getRemainingCount()).toBe(2);
    });

    it('should return false when destroyed', () => {
      freezeProp.destroy();
      const result = freezeProp.use();
      expect(result).toBe(false);
    });
  });

  describe('setPhysicsManager', () => {
    it('should stop physics when freeze activates', () => {
      const mockPhysics = { stop: vi.fn(), start: vi.fn() };
      freezeProp.setPhysicsManager(mockPhysics as any);
      freezeProp.use();
      expect(mockPhysics.stop).toHaveBeenCalled();
    });
  });

  describe('unfreeze', () => {
    it('should restart physics when unfreezing', () => {
      const mockPhysics = { stop: vi.fn(), start: vi.fn() };
      freezeProp.setPhysicsManager(mockPhysics as any);
      freezeProp.use();
      (freezeProp as any).unfreeze();
      expect(mockPhysics.start).toHaveBeenCalled();
    });

    it('should emit PROPS_FREEZE_DEACTIVATED on unfreeze', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_FREEZE_DEACTIVATED, handler);
      freezeProp.use();
      (freezeProp as any).unfreeze();
      expect(handler).toHaveBeenCalled();
      eventBus.off(GameEvents.PROPS_FREEZE_DEACTIVATED, handler);
    });

    it('should not do anything if not frozen', () => {
      const mockPhysics = { stop: vi.fn(), start: vi.fn() };
      freezeProp.setPhysicsManager(mockPhysics as any);
      (freezeProp as any).unfreeze();
      expect(mockPhysics.start).not.toHaveBeenCalled();
    });
  });

  describe('pause and resume', () => {
    it('should pause freeze timer when active', () => {
      freezeProp.use();
      const pauseSpy = vi.spyOn(AnimationManager.getInstance(), 'pause');
      freezeProp.pause();
      expect(pauseSpy).toHaveBeenCalled();
      pauseSpy.mockRestore();
    });

    it('should not throw when pausing with no timer', () => {
      expect(() => freezeProp.pause()).not.toThrow();
    });

    it('should resume freeze timer when active with remaining time', () => {
      freezeProp.use();
      const resumeSpy = vi.spyOn(AnimationManager.getInstance(), 'resume');
      freezeProp.resume();
      expect(resumeSpy).toHaveBeenCalled();
      resumeSpy.mockRestore();
    });

    it('should not resume when not frozen', () => {
      const resumeSpy = vi.spyOn(AnimationManager.getInstance(), 'resume');
      freezeProp.resume();
      expect(resumeSpy).not.toHaveBeenCalled();
      resumeSpy.mockRestore();
    });
  });

  describe('cooldownReady', () => {
    it('should return true when not used yet', () => {
      expect(freezeProp.cooldownReady()).toBe(true);
    });

    it('should return false during cooldown', () => {
      freezeProp.use();
      expect(freezeProp.cooldownReady()).toBe(false);
    });

    it('should return true after cooldown', () => {
      freezeProp.use();
      advanceTime(1100);
      expect(freezeProp.cooldownReady()).toBe(true);
    });
  });

  describe('isCurrentlyFrozen', () => {
    it('should return false before use', () => {
      expect(freezeProp.isCurrentlyFrozen()).toBe(false);
    });

    it('should return true after use', () => {
      freezeProp.use();
      expect(freezeProp.isCurrentlyFrozen()).toBe(true);
    });

    it('should return false after unfreeze', () => {
      freezeProp.use();
      (freezeProp as any).unfreeze();
      expect(freezeProp.isCurrentlyFrozen()).toBe(false);
    });
  });

  describe('getRemainingFreezeTime', () => {
    it('should return 0 when not frozen', () => {
      expect(freezeProp.getRemainingFreezeTime()).toBe(0);
    });

    it('should return remaining time when frozen', () => {
      freezeProp.use();
      expect(freezeProp.getRemainingFreezeTime()).toBeGreaterThan(0);
    });
  });

  describe('destroy', () => {
    it('should unfreeze when destroying while frozen', () => {
      const mockPhysics = { stop: vi.fn(), start: vi.fn() };
      freezeProp.setPhysicsManager(mockPhysics as any);
      freezeProp.use();
      freezeProp.destroy();
      expect(mockPhysics.start).toHaveBeenCalled();
    });

    it('should clear physics manager reference', () => {
      const mockPhysics = { stop: vi.fn(), start: vi.fn() };
      freezeProp.setPhysicsManager(mockPhysics as any);
      freezeProp.destroy();
      expect((freezeProp as any).physicsManager).toBeNull();
    });
  });

  describe('freeze timer', () => {
    it('should unfreeze when timer expires', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_FREEZE_DEACTIVATED, handler);
      freezeProp.use();
      const timerId = (freezeProp as any).freezeTimerId;
      expect(timerId).not.toBeNull();
      const animManager = AnimationManager.getInstance();
      const entries = (animManager as any).entries as Map<string, { callback: (deltaMS: number) => void; active: boolean }>;
      const entry = entries.get(timerId);
      expect(entry).toBeDefined();
      entry!.callback(6000);
      expect(freezeProp.isCurrentlyFrozen()).toBe(false);
      expect(handler).toHaveBeenCalled();
      eventBus.off(GameEvents.PROPS_FREEZE_DEACTIVATED, handler);
    });
  });
});
