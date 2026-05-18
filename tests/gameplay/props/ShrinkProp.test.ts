import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShrinkProp } from '../../../src/gameplay/props/ShrinkProp';
import { PropType, PropConfig } from '../../../src/gameplay/props/Prop';
import { eventBus } from '../../../src/utils/EventBus';
import { GameEvents } from '../../../src/utils/GameEvents';
import { AnimationManager } from '../../../src/utils/AnimationManager';

const shrinkConfig: PropConfig = {
  id: 'prop_shrink',
  type: PropType.SHRINK,
  name: '缩小射线',
  description: '将所有方块缩小30%',
  icon: 'shrink',
  maxCount: 2,
  cooldown: 2000,
  price: 100,
};

describe('ShrinkProp', () => {
  let shrinkProp: ShrinkProp;
  let originalDateNow: () => number;

  beforeEach(() => {
    AnimationManager.resetInstance();
    AnimationManager.getInstance();
    shrinkProp = new ShrinkProp(shrinkConfig);
    originalDateNow = Date.now;
  });

  afterEach(() => {
    Date.now = originalDateNow;
    shrinkProp.destroy();
    AnimationManager.resetInstance();
  });

  function advanceTime(ms: number) {
    const base = Date.now();
    Date.now = () => base + ms;
  }

  describe('use', () => {
    it('should return true and emit PROPS_SHRINK_ACTIVATE', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_SHRINK_ACTIVATE, handler);

      const result = shrinkProp.use();

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith({
        factor: 0.5,
        duration: 8000,
      });

      eventBus.off(GameEvents.PROPS_SHRINK_ACTIVATE, handler);
    });

    it('should return false when cannot use', () => {
      shrinkProp.use();
      const result = shrinkProp.use();
      expect(result).toBe(false);
    });

    it('should extend duration when already active', () => {
      shrinkProp.use();
      advanceTime(2100);

      const result = shrinkProp.use();

      expect(result).toBe(true);
      expect(shrinkProp.isShrinkActive()).toBe(true);
    });

    it('should reset remainingMs when already active', () => {
      shrinkProp.use();
      advanceTime(2100);
      shrinkProp.use();
      expect((shrinkProp as any).remainingMs).toBe(8000);
    });

    it('should return false when destroyed', () => {
      shrinkProp.destroy();
      const result = shrinkProp.use();
      expect(result).toBe(false);
    });

    it('should increment usedCount on successful use', () => {
      shrinkProp.use();
      expect(shrinkProp.getRemainingCount()).toBe(1);
    });
  });

  describe('deactivate', () => {
    it('should emit PROPS_SHRINK_DEACTIVATE', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_SHRINK_DEACTIVATE, handler);
      shrinkProp.use();
      (shrinkProp as any).deactivate();
      expect(handler).toHaveBeenCalled();
      eventBus.off(GameEvents.PROPS_SHRINK_DEACTIVATE, handler);
    });

    it('should set isActive to false', () => {
      shrinkProp.use();
      (shrinkProp as any).deactivate();
      expect(shrinkProp.isShrinkActive()).toBe(false);
    });

    it('should not do anything if not active', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_SHRINK_DEACTIVATE, handler);
      (shrinkProp as any).deactivate();
      expect(handler).not.toHaveBeenCalled();
      eventBus.off(GameEvents.PROPS_SHRINK_DEACTIVATE, handler);
    });

    it('should stop shrink timer on deactivate', () => {
      shrinkProp.use();
      (shrinkProp as any).deactivate();
      expect((shrinkProp as any).shrinkTimerId).toBeNull();
    });
  });

  describe('pause and resume', () => {
    it('should pause shrink timer when active', () => {
      shrinkProp.use();
      const pauseSpy = vi.spyOn(AnimationManager.getInstance(), 'pause');
      shrinkProp.pause();
      expect(pauseSpy).toHaveBeenCalled();
      pauseSpy.mockRestore();
    });

    it('should not throw when pausing with no timer', () => {
      expect(() => shrinkProp.pause()).not.toThrow();
    });

    it('should resume shrink timer when active with remaining time', () => {
      shrinkProp.use();
      const resumeSpy = vi.spyOn(AnimationManager.getInstance(), 'resume');
      shrinkProp.resume();
      expect(resumeSpy).toHaveBeenCalled();
      resumeSpy.mockRestore();
    });

    it('should not resume when not active', () => {
      const resumeSpy = vi.spyOn(AnimationManager.getInstance(), 'resume');
      shrinkProp.resume();
      expect(resumeSpy).not.toHaveBeenCalled();
      resumeSpy.mockRestore();
    });

    it('should not resume when no remaining time', () => {
      shrinkProp.use();
      (shrinkProp as any).remainingMs = 0;
      const resumeSpy = vi.spyOn(AnimationManager.getInstance(), 'resume');
      shrinkProp.resume();
      expect(resumeSpy).not.toHaveBeenCalled();
      resumeSpy.mockRestore();
    });
  });

  describe('isShrinkActive', () => {
    it('should return false before use', () => {
      expect(shrinkProp.isShrinkActive()).toBe(false);
    });

    it('should return true after use', () => {
      shrinkProp.use();
      expect(shrinkProp.isShrinkActive()).toBe(true);
    });

    it('should return false after deactivate', () => {
      shrinkProp.use();
      (shrinkProp as any).deactivate();
      expect(shrinkProp.isShrinkActive()).toBe(false);
    });
  });

  describe('cooldownReady', () => {
    it('should return true when not used yet', () => {
      expect(shrinkProp.cooldownReady()).toBe(true);
    });

    it('should return false during cooldown', () => {
      shrinkProp.use();
      expect(shrinkProp.cooldownReady()).toBe(false);
    });

    it('should return true after cooldown', () => {
      shrinkProp.use();
      advanceTime(2100);
      expect(shrinkProp.cooldownReady()).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should stop shrink timer on destroy', () => {
      shrinkProp.use();
      const timerId = (shrinkProp as any).shrinkTimerId;
      expect(timerId).not.toBeNull();
      shrinkProp.destroy();
      expect((shrinkProp as any).shrinkTimerId).toBeNull();
    });
  });

  describe('shrink timer', () => {
    it('should deactivate when timer expires', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.PROPS_SHRINK_DEACTIVATE, handler);
      shrinkProp.use();
      const timerId = (shrinkProp as any).shrinkTimerId;
      const animManager = AnimationManager.getInstance();
      const entries = (animManager as any).entries as Map<string, { callback: (deltaMS: number) => void; active: boolean }>;
      const entry = entries.get(timerId);
      expect(entry).toBeDefined();
      entry!.callback(9000);
      expect(shrinkProp.isShrinkActive()).toBe(false);
      expect(handler).toHaveBeenCalled();
      eventBus.off(GameEvents.PROPS_SHRINK_DEACTIVATE, handler);
    });
  });
});
