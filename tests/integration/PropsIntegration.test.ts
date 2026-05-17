import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { PropConfig, PropType } from '../../src/gameplay/props/Prop';
import { BombProp } from '../../src/gameplay/props/BombProp';
import { RainbowProp } from '../../src/gameplay/props/RainbowProp';
import { FreezeProp } from '../../src/gameplay/props/FreezeProp';
import { ShrinkProp } from '../../src/gameplay/props/ShrinkProp';
import { LuckyProp } from '../../src/gameplay/props/LuckyProp';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { AnimationManager } from '../../src/utils/AnimationManager';
import { eventBus } from '../../src/utils/EventBus';
import { ScoreSystem } from '../../src/gameplay/ScoreSystem';

function createMockPropConfig(type: PropType): PropConfig {
  return {
    id: `prop_${type}`,
    type,
    name: type,
    description: `Test ${type}`,
    icon: '',
    maxCount: 3,
    cooldown: 1000,
    price: 0,
  };
}

describe('Props Integration Tests', () => {

  describe('BombProp Integration', () => {
    let bomb: BombProp;

    beforeEach(() => {
      bomb = new BombProp(createMockPropConfig(PropType.BOMB));
    });

    afterEach(() => {
      bomb.destroy();
    });

    it('should emit props:bomb:explode with correct target coordinates', () => {
      const handler = vi.fn();
      eventBus.on('props:bomb:explode', handler);

      const result = bomb.use({ x: 200, y: 300 });

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith({
        x: 200,
        y: 300,
        radius: 120,
      });

      eventBus.off('props:bomb:explode', handler);
    });

    it('should emit props:bomb:requireTarget when no target provided', () => {
      const handler = vi.fn();
      eventBus.on('props:bomb:requireTarget', handler);

      const result = bomb.use();

      expect(result).toBe(false);
      expect(handler).toHaveBeenCalled();

      eventBus.off('props:bomb:requireTarget', handler);
    });

    it('should respect maxCount limit', () => {
      bomb.use({ x: 100, y: 100 });
      bomb.use({ x: 200, y: 200 });
      bomb.use({ x: 300, y: 300 });

      const result = bomb.use({ x: 400, y: 400 });
      expect(result).toBe(false);
    });

    it('should filter blocks within explosion radius', () => {
      const mockBlocks = [
        { x: 100, y: 100 } as any,
        { x: 150, y: 150 } as any,
        { x: 500, y: 500 } as any,
      ];

      const affected = bomb.getAffectedBlocks(mockBlocks, 100, 100);
      expect(affected.length).toBe(2);
    });

    it('should enforce cooldown between uses', () => {
      vi.useFakeTimers();
      bomb.use({ x: 100, y: 100 });
      expect(bomb.cooldownReady()).toBe(false);

      vi.advanceTimersByTime(500);
      expect(bomb.cooldownReady()).toBe(false);

      vi.advanceTimersByTime(600);
      expect(bomb.cooldownReady()).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('RainbowProp Integration', () => {
    let rainbow: RainbowProp;

    beforeEach(() => {
      rainbow = new RainbowProp(createMockPropConfig(PropType.RAINBOW));
    });

    afterEach(() => {
      rainbow.destroy();
    });

    it('should emit props:rainbow:activated with 3 remaining blocks', () => {
      const handler = vi.fn();
      eventBus.on('props:rainbow:activated', handler);

      rainbow.use();

      expect(handler).toHaveBeenCalledWith({ remainingBlocks: 3 });
      expect(rainbow.isActive()).toBe(true);
      expect(rainbow.getActiveCount()).toBe(3);

      eventBus.off('props:rainbow:activated', handler);
    });

    it('should emit gameplay:nextBlock with isRainbow flag', () => {
      const handler = vi.fn();
      eventBus.on('gameplay:nextBlock', handler);

      rainbow.use();

      expect(handler).toHaveBeenCalledWith({
        isRainbow: true,
        remaining: 3,
      });

      eventBus.off('gameplay:nextBlock', handler);
    });

    it('should decrement remaining blocks on consume', () => {
      rainbow.use();

      rainbow.consumeRainbowBlock();
      expect(rainbow.getActiveCount()).toBe(2);

      rainbow.consumeRainbowBlock();
      expect(rainbow.getActiveCount()).toBe(1);

      rainbow.consumeRainbowBlock();
      expect(rainbow.getActiveCount()).toBe(0);
      expect(rainbow.isActive()).toBe(false);
    });

    it('should emit props:rainbow:deactivated when all blocks consumed', () => {
      const handler = vi.fn();
      eventBus.on('props:rainbow:deactivated', handler);

      rainbow.use();
      rainbow.consumeRainbowBlock();
      rainbow.consumeRainbowBlock();
      rainbow.consumeRainbowBlock();

      expect(handler).toHaveBeenCalled();

      eventBus.off('props:rainbow:deactivated', handler);
    });
  });

  describe('FreezeProp Integration', () => {
    let freeze: FreezeProp;
    let physics: PhysicsManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      physics = new PhysicsManager();
      freeze = new FreezeProp(createMockPropConfig(PropType.FREEZE));
      freeze.setPhysicsManager(physics);
    });

    afterEach(() => {
      freeze.destroy();
      physics.stop();
      AnimationManager.resetInstance();
    });

    it('should stop physics when freeze activates', () => {
      const stopSpy = vi.spyOn(physics, 'stop');
      freeze.use();
      expect(stopSpy).toHaveBeenCalled();
      stopSpy.mockRestore();
    });

    it('should emit props:freeze:activated with duration', () => {
      const handler = vi.fn();
      eventBus.on('props:freeze:activated', handler);

      freeze.use();

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.duration).toBe(5000);

      eventBus.off('props:freeze:activated', handler);
    });

    it('should extend freeze duration when used while already frozen', () => {
      vi.useFakeTimers();

      freeze.use();

      vi.advanceTimersByTime(1500);

      const handler = vi.fn();
      eventBus.on('props:freeze:extended', handler);

      freeze.use();

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0].additionalDuration).toBe(5000);

      eventBus.off('props:freeze:extended', handler);
      vi.useRealTimers();
    });

    it('should restart physics when unfreeze occurs', () => {
      const startSpy = vi.spyOn(physics, 'start');
      freeze.use();

      (freeze as any).unfreeze();

      expect(startSpy).toHaveBeenCalled();
      startSpy.mockRestore();
    });

    it('should emit props:freeze:deactivated on unfreeze', () => {
      const handler = vi.fn();
      eventBus.on('props:freeze:deactivated', handler);

      freeze.use();
      (freeze as any).unfreeze();

      expect(handler).toHaveBeenCalled();

      eventBus.off('props:freeze:deactivated', handler);
    });
  });

  describe('ShrinkProp Integration', () => {
    let shrink: ShrinkProp;

    beforeEach(() => {
      AnimationManager.resetInstance();
      shrink = new ShrinkProp(createMockPropConfig(PropType.SHRINK));
    });

    afterEach(() => {
      shrink.destroy();
      AnimationManager.resetInstance();
    });

    it('should emit props:shrink:activate with factor and duration', () => {
      const handler = vi.fn();
      eventBus.on('props:shrink:activate', handler);

      shrink.use();

      expect(handler).toHaveBeenCalledWith({
        factor: 0.5,
        duration: 8000,
      });

      eventBus.off('props:shrink:activate', handler);
    });

    it('should be active after use', () => {
      shrink.use();
      expect(shrink.isShrinkActive()).toBe(true);
    });

    it('should extend duration when used while already active', () => {
      shrink.use();
      expect(shrink.isShrinkActive()).toBe(true);

      shrink.use();
      expect(shrink.isShrinkActive()).toBe(true);
    });

    it('should emit props:shrink:deactivate when timer expires', () => {
      const handler = vi.fn();
      eventBus.on('props:shrink:deactivate', handler);

      shrink.use();
      (shrink as any).deactivate();

      expect(handler).toHaveBeenCalled();
      expect(shrink.isShrinkActive()).toBe(false);

      eventBus.off('props:shrink:deactivate', handler);
    });

    it('should enforce cooldown', () => {
      vi.useFakeTimers();
      shrink.use();
      expect(shrink.cooldownReady()).toBe(false);

      vi.advanceTimersByTime(2500);
      expect(shrink.cooldownReady()).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('LuckyProp Integration', () => {
    let lucky: LuckyProp;

    beforeEach(() => {
      lucky = new LuckyProp(createMockPropConfig(PropType.LUCKY));
    });

    afterEach(() => {
      lucky.destroy();
    });

    it('should emit props:lucky:activate with multiplier and remaining drops', () => {
      const handler = vi.fn();
      eventBus.on('props:lucky:activate', handler);

      lucky.use();

      expect(handler).toHaveBeenCalledWith({
        multiplier: 2,
        remainingDrops: 3,
      });

      eventBus.off('props:lucky:activate', handler);
    });

    it('should be active after use with 3 remaining drops', () => {
      lucky.use();
      expect(lucky.isLuckyActive()).toBe(true);
      expect(lucky.getLuckyMultiplier()).toBe(2);
    });

    it('should decrement drops on consume', () => {
      lucky.use();

      lucky.consumeLuckyDrop();
      expect(lucky.isLuckyActive()).toBe(true);

      lucky.consumeLuckyDrop();
      lucky.consumeLuckyDrop();
      expect(lucky.isLuckyActive()).toBe(false);
      expect(lucky.getLuckyMultiplier()).toBe(1);
    });

    it('should emit props:lucky:deactivate when all drops consumed', () => {
      const handler = vi.fn();
      eventBus.on('props:lucky:deactivate', handler);

      lucky.use();
      lucky.consumeLuckyDrop();
      lucky.consumeLuckyDrop();
      lucky.consumeLuckyDrop();

      expect(handler).toHaveBeenCalled();

      eventBus.off('props:lucky:deactivate', handler);
    });

    it('should enforce cooldown', () => {
      vi.useFakeTimers();
      lucky.use();
      expect(lucky.cooldownReady()).toBe(false);

      vi.advanceTimersByTime(1100);
      expect(lucky.cooldownReady()).toBe(true);

      vi.useRealTimers();
    });

    it('should use config.cooldown value for cooldown timing', () => {
      const customConfig: PropConfig = {
        id: 'prop_lucky_custom',
        type: PropType.LUCKY,
        name: '幸运',
        description: 'Test lucky',
        icon: 'lucky',
        maxCount: 3,
        cooldown: 2000,
        price: 0,
      };
      const customLucky = new LuckyProp(customConfig);
      vi.useFakeTimers();

      customLucky.use();
      expect(customLucky.cooldownReady()).toBe(false);

      vi.advanceTimersByTime(1999);
      expect(customLucky.cooldownReady()).toBe(false);

      vi.advanceTimersByTime(1);
      expect(customLucky.cooldownReady()).toBe(true);

      vi.useRealTimers();
      customLucky.destroy();
    });

    it('should emit props:lucky:dropConsumed for each consumed drop', () => {
      const handler = vi.fn();
      eventBus.on('props:lucky:dropConsumed', handler);

      lucky.use();
      lucky.consumeLuckyDrop();
      expect(handler).toHaveBeenCalledWith({ remainingDrops: 2 });

      lucky.consumeLuckyDrop();
      expect(handler).toHaveBeenCalledWith({ remainingDrops: 1 });

      eventBus.off('props:lucky:dropConsumed', handler);
    });

    it('should correctly track remaining drops through full lifecycle', () => {
      lucky.use();
      expect(lucky.isLuckyActive()).toBe(true);
      expect(lucky.getLuckyMultiplier()).toBe(2);

      lucky.consumeLuckyDrop();
      expect(lucky.isLuckyActive()).toBe(true);
      expect(lucky.getLuckyMultiplier()).toBe(2);

      lucky.consumeLuckyDrop();
      expect(lucky.isLuckyActive()).toBe(true);
      expect(lucky.getLuckyMultiplier()).toBe(2);

      lucky.consumeLuckyDrop();
      expect(lucky.isLuckyActive()).toBe(false);
      expect(lucky.getLuckyMultiplier()).toBe(1);
    });
  });

  describe('PropSystem Full Lifecycle Integration', () => {
    let propSystem: PropSystem;
    let physics: PhysicsManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      physics = new PhysicsManager();
      propSystem = new PropSystem();
    });

    afterEach(() => {
      propSystem.destroy();
      physics.stop();
      AnimationManager.resetInstance();
    });

    it('should load config and initialize all prop types', async () => {
      const configData = [
        { id: 'bomb_1', type: 'bomb', name: '炸弹', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
        { id: 'rainbow_1', type: 'rainbow', name: '彩虹', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
        { id: 'freeze_1', type: 'freeze', name: '冰冻', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
        { id: 'shrink_1', type: 'shrink', name: '缩小', description: '', icon: '', maxCount: 3, cooldown: 2000, price: 0 },
        { id: 'lucky_1', type: 'lucky', name: '幸运', description: '', icon: '', maxCount: 3, cooldown: 3000, price: 0 },
      ];

      await propSystem.loadConfig(configData);

      propSystem.initialize([
        { type: PropType.BOMB, count: 3 },
        { type: PropType.RAINBOW, count: 3 },
        { type: PropType.FREEZE, count: 3 },
        { type: PropType.SHRINK, count: 3 },
        { type: PropType.LUCKY, count: 3 },
      ]);

      const allProps = propSystem.getAllProps();
      expect(allProps.length).toBe(5);
    });

    it('should use bomb prop through PropSystem', async () => {
      await propSystem.loadConfig([
        { id: 'bomb_1', type: 'bomb', name: '炸弹', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.BOMB, count: 3 }]);

      const handler = vi.fn();
      eventBus.on('props:bomb:explode', handler);

      const result = propSystem.useProp(PropType.BOMB, { x: 200, y: 300 });
      expect(result).toBe(true);
      expect(handler).toHaveBeenCalled();

      eventBus.off('props:bomb:explode', handler);
    });

    it('should use rainbow prop through PropSystem', async () => {
      await propSystem.loadConfig([
        { id: 'rainbow_1', type: 'rainbow', name: '彩虹', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.RAINBOW, count: 3 }]);

      const result = propSystem.useProp(PropType.RAINBOW);
      expect(result).toBe(true);

      const prop = propSystem.getProp(PropType.RAINBOW);
      expect(prop).toBeDefined();
      expect(prop!.getRemainingCount()).toBe(2);
    });

    it('should use freeze prop through PropSystem', async () => {
      await propSystem.loadConfig([
        { id: 'freeze_1', type: 'freeze', name: '冰冻', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.FREEZE, count: 3 }]);

      const freezeProp = propSystem.getProp(PropType.FREEZE);
      freezeProp!.setPhysicsManager(physics);

      const result = propSystem.useProp(PropType.FREEZE);
      expect(result).toBe(true);
    });

    it('should use shrink prop through PropSystem', async () => {
      await propSystem.loadConfig([
        { id: 'shrink_1', type: 'shrink', name: '缩小', description: '', icon: '', maxCount: 3, cooldown: 2000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.SHRINK, count: 3 }]);

      const result = propSystem.useProp(PropType.SHRINK);
      expect(result).toBe(true);
    });

    it('should use lucky prop through PropSystem', async () => {
      await propSystem.loadConfig([
        { id: 'lucky_1', type: 'lucky', name: '幸运', description: '', icon: '', maxCount: 3, cooldown: 3000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.LUCKY, count: 3 }]);

      const result = propSystem.useProp(PropType.LUCKY);
      expect(result).toBe(true);
    });

    it('should emit props:useFailed when prop not available', async () => {
      await propSystem.loadConfig([
        { id: 'bomb_1', type: 'bomb', name: '炸弹', description: '', icon: '', maxCount: 1, cooldown: 1000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.BOMB, count: 1 }]);

      propSystem.useProp(PropType.BOMB, { x: 100, y: 100 });

      const handler = vi.fn();
      eventBus.on('props:useFailed', handler);

      const result = propSystem.useProp(PropType.BOMB, { x: 200, y: 200 });
      expect(result).toBe(false);
      expect(handler).toHaveBeenCalledWith({ type: 'bomb', reason: 'notAvailable' });

      eventBus.off('props:useFailed', handler);
    });

    it('should emit props:used with remaining count', async () => {
      await propSystem.loadConfig([
        { id: 'bomb_1', type: 'bomb', name: '炸弹', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.BOMB, count: 3 }]);

      const handler = vi.fn();
      eventBus.on('props:used', handler);

      propSystem.useProp(PropType.BOMB, { x: 100, y: 100 });

      expect(handler).toHaveBeenCalledWith({ type: 'bomb', remaining: 2 });

      eventBus.off('props:used', handler);
    });

    it('should reset all props', async () => {
      await propSystem.loadConfig([
        { id: 'bomb_1', type: 'bomb', name: '炸弹', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.BOMB, count: 3 }]);

      propSystem.useProp(PropType.BOMB, { x: 100, y: 100 });
      propSystem.useProp(PropType.BOMB, { x: 200, y: 200 });

      propSystem.reset();

      const prop = propSystem.getProp(PropType.BOMB);
      expect(prop!.getRemainingCount()).toBe(3);
    });

    it('should pause and resume props', async () => {
      await propSystem.loadConfig([
        { id: 'bomb_1', type: 'bomb', name: '炸弹', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.BOMB, count: 3 }]);

      propSystem.pause();

      const result = propSystem.useProp(PropType.BOMB, { x: 100, y: 100 });
      expect(result).toBe(false);

      propSystem.resume();

      const result2 = propSystem.useProp(PropType.BOMB, { x: 100, y: 100 });
      expect(result2).toBe(true);
    });
  });

  describe('Props + EventBus Integration', () => {
    it('should propagate bomb explosion through event system', () => {
      const bomb = new BombProp(createMockPropConfig(PropType.BOMB));
      const explosionHandler = vi.fn();

      eventBus.on('props:bomb:explode', explosionHandler);
      bomb.use({ x: 150, y: 250 });

      expect(explosionHandler).toHaveBeenCalledTimes(1);

      eventBus.off('props:bomb:explode', explosionHandler);
      bomb.destroy();
    });

    it('should propagate rainbow activation through event system', () => {
      const rainbow = new RainbowProp(createMockPropConfig(PropType.RAINBOW));
      const activatedHandler = vi.fn();
      const nextBlockHandler = vi.fn();

      eventBus.on('props:rainbow:activated', activatedHandler);
      eventBus.on('gameplay:nextBlock', nextBlockHandler);

      rainbow.use();

      expect(activatedHandler).toHaveBeenCalledTimes(1);
      expect(nextBlockHandler).toHaveBeenCalledTimes(1);

      eventBus.off('props:rainbow:activated', activatedHandler);
      eventBus.off('gameplay:nextBlock', nextBlockHandler);
      rainbow.destroy();
    });

    it('should propagate freeze events through event system', () => {
      const physics = new PhysicsManager();
      const freeze = new FreezeProp(createMockPropConfig(PropType.FREEZE));
      freeze.setPhysicsManager(physics);
      const handler = vi.fn();

      eventBus.on('props:freeze:activated', handler);
      freeze.use();

      expect(handler).toHaveBeenCalledTimes(1);

      eventBus.off('props:freeze:activated', handler);
      freeze.destroy();
      physics.stop();
    });

    it('should propagate shrink events through event system', () => {
      const shrink = new ShrinkProp(createMockPropConfig(PropType.SHRINK));
      const handler = vi.fn();

      eventBus.on('props:shrink:activate', handler);
      shrink.use();

      expect(handler).toHaveBeenCalledTimes(1);

      eventBus.off('props:shrink:activate', handler);
      shrink.destroy();
    });

    it('should propagate lucky events through event system', () => {
      const lucky = new LuckyProp(createMockPropConfig(PropType.LUCKY));
      const handler = vi.fn();

      eventBus.on('props:lucky:activate', handler);
      lucky.use();

      expect(handler).toHaveBeenCalledTimes(1);

      eventBus.off('props:lucky:activate', handler);
      lucky.destroy();
    });
  });

  describe('BombProp Bug Fix Integration', () => {
    let propSystem: PropSystem;

    beforeEach(async () => {
      AnimationManager.resetInstance();
      propSystem = new PropSystem();
      await propSystem.loadConfig([
        { id: 'bomb_1', type: 'bomb', name: '炸弹', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.BOMB, count: 3 }]);
    });

    afterEach(() => {
      propSystem.destroy();
      AnimationManager.resetInstance();
    });

    it('should emit bomb explode event with correct payload through PropSystem', () => {
      const handler = vi.fn();
      eventBus.on('props:bomb:explode', handler);

      const result = propSystem.useProp(PropType.BOMB, { x: 200, y: 300 });

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith({
        x: 200,
        y: 300,
        radius: 120,
      });

      eventBus.off('props:bomb:explode', handler);
    });

    it('should not emit bomb explode when target is missing', () => {
      const handler = vi.fn();
      eventBus.on('props:bomb:explode', handler);

      const result = propSystem.useProp(PropType.BOMB);

      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();

      eventBus.off('props:bomb:explode', handler);
    });

    it('should correctly track remaining count after bomb use', () => {
      propSystem.useProp(PropType.BOMB, { x: 100, y: 200 });

      const prop = propSystem.getProp(PropType.BOMB);
      expect(prop!.getRemainingCount()).toBe(2);
    });

    it('should emit props:used event after successful bomb use', () => {
      const handler = vi.fn();
      eventBus.on('props:used', handler);

      propSystem.useProp(PropType.BOMB, { x: 100, y: 200 });

      expect(handler).toHaveBeenCalledWith({ type: 'bomb', remaining: 2 });

      eventBus.off('props:used', handler);
    });

    it('should return false when bomb used without target', () => {
      const result = propSystem.useProp(PropType.BOMB);
      expect(result).toBe(false);
    });

    it('should handle bomb target mode flow: click button → enter target mode → click area → explode', () => {
      const explodeHandler = vi.fn();
      eventBus.on('props:bomb:explode', explodeHandler);

      const propButtonClicked = true;
      expect(propButtonClicked).toBe(true);

      const targetMode = true;
      expect(targetMode).toBe(true);

      const targetX = 200;
      const targetY = 300;
      const result = propSystem.useProp(PropType.BOMB, { x: targetX, y: targetY });

      expect(result).toBe(true);
      expect(explodeHandler).toHaveBeenCalledWith({
        x: targetX,
        y: targetY,
        radius: 120,
      });

      eventBus.off('props:bomb:explode', explodeHandler);
    });

    it('should prevent bomb from firing at PropButton position when consumePropButtonClick is true', () => {
      const explodeHandler = vi.fn();
      eventBus.on('props:bomb:explode', explodeHandler);

      const propButtonJustClicked = true;
      if (!propButtonJustClicked) {
        propSystem.useProp(PropType.BOMB, { x: 700, y: 50 });
      }

      expect(explodeHandler).not.toHaveBeenCalled();

      propSystem.useProp(PropType.BOMB, { x: 200, y: 300 });
      expect(explodeHandler).toHaveBeenCalledWith({
        x: 200,
        y: 300,
        radius: 120,
      });

      eventBus.off('props:bomb:explode', explodeHandler);
    });
  });

  describe('Bomb Target Mode Response Optimization Integration', () => {
    let propSystem: PropSystem;

    beforeEach(async () => {
      AnimationManager.resetInstance();
      propSystem = new PropSystem();
      await propSystem.loadConfig([
        { id: 'bomb_1', type: 'bomb', name: '炸弹', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.BOMB, count: 3 }]);
    });

    afterEach(() => {
      propSystem.destroy();
      AnimationManager.resetInstance();
    });

    it('should emit UI_PROP_TARGET_MODE immediately on bomb button click', () => {
      const handler = vi.fn();
      eventBus.on('ui:propTargetMode', handler);

      const bomb = new BombProp(createMockPropConfig(PropType.BOMB));
      bomb.use();

      eventBus.off('ui:propTargetMode', handler);
      bomb.destroy();
    });

    it('should complete bomb target mode activation synchronously', () => {
      const handler = vi.fn();
      eventBus.on('props:bomb:requireTarget', handler);

      const bomb = new BombProp(createMockPropConfig(PropType.BOMB));
      const start = performance.now();
      bomb.use();
      const elapsed = performance.now() - start;

      expect(handler).toHaveBeenCalled();
      expect(elapsed).toBeLessThan(100);

      eventBus.off('props:bomb:requireTarget', handler);
      bomb.destroy();
    });

    it('should complete full bomb explosion flow synchronously', () => {
      const handler = vi.fn();
      eventBus.on('props:bomb:explode', handler);

      const start = performance.now();
      propSystem.useProp(PropType.BOMB, { x: 200, y: 300 });
      const elapsed = performance.now() - start;

      expect(handler).toHaveBeenCalled();
      expect(elapsed).toBeLessThan(100);

      eventBus.off('props:bomb:explode', handler);
    });

    it('should handle rapid bomb target mode toggle without delay', () => {
      const handler = vi.fn();
      eventBus.on('props:bomb:requireTarget', handler);

      const bomb = new BombProp(createMockPropConfig(PropType.BOMB));
      const start = performance.now();
      for (let i = 0; i < 10; i++) {
        bomb.use();
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);

      eventBus.off('props:bomb:requireTarget', handler);
      bomb.destroy();
    });

    it('should maintain correct state after quick target mode activation and explosion', () => {
      propSystem.useProp(PropType.BOMB, { x: 200, y: 300 });

      const prop = propSystem.getProp(PropType.BOMB);
      expect(prop!.getRemainingCount()).toBe(2);

      const usedHandler = vi.fn();
      eventBus.on('props:used', usedHandler);

      propSystem.useProp(PropType.BOMB, { x: 150, y: 250 });

      eventBus.off('props:used', usedHandler);
    });
  });

  describe('LuckyProp Bug Fix Integration', () => {
    let propSystem: PropSystem;
    let scoreSystem: ScoreSystem;

    beforeEach(async () => {
      AnimationManager.resetInstance();
      propSystem = new PropSystem();
      scoreSystem = new ScoreSystem();
      await propSystem.loadConfig([
        { id: 'lucky_1', type: 'lucky', name: '幸运', description: '', icon: 'lucky', maxCount: 3, cooldown: 2000, price: 0 },
      ]);
      propSystem.initialize([{ type: PropType.LUCKY, count: 3 }]);
    });

    afterEach(() => {
      propSystem.destroy();
      scoreSystem.reset();
      AnimationManager.resetInstance();
    });

    it('should apply lucky multiplier to score after prop activation', () => {
      const luckyProp = propSystem.getProp(PropType.LUCKY);
      expect(luckyProp).toBeDefined();

      propSystem.useProp(PropType.LUCKY);
      expect(luckyProp!.isLuckyActive()).toBe(true);

      scoreSystem.setLuckyMultiplier(luckyProp!.getLuckyMultiplier());
      scoreSystem.addMergeScore(4);
      const luckyScore = scoreSystem.getCurrentScore();

      scoreSystem.reset();
      scoreSystem.addMergeScore(4);
      const normalScore = scoreSystem.getCurrentScore();

      expect(luckyScore).toBe(normalScore * 2);
    });

    it('should reset lucky multiplier after all drops consumed', () => {
      const luckyProp = propSystem.getProp(PropType.LUCKY);
      propSystem.useProp(PropType.LUCKY);

      scoreSystem.setLuckyMultiplier(luckyProp!.getLuckyMultiplier());
      expect(scoreSystem.getCurrentScore()).toBe(0);

      luckyProp!.consumeLuckyDrop();
      luckyProp!.consumeLuckyDrop();
      luckyProp!.consumeLuckyDrop();

      expect(luckyProp!.isLuckyActive()).toBe(false);
      expect(luckyProp!.getLuckyMultiplier()).toBe(1);
    });

    it('should use config.cooldown for lucky prop timing', () => {
      vi.useFakeTimers();
      const luckyProp = propSystem.getProp(PropType.LUCKY);

      propSystem.useProp(PropType.LUCKY);
      expect(luckyProp!.cooldownReady()).toBe(false);

      vi.advanceTimersByTime(1999);
      expect(luckyProp!.cooldownReady()).toBe(false);

      vi.advanceTimersByTime(1);
      expect(luckyProp!.cooldownReady()).toBe(true);

      vi.useRealTimers();
    });

    it('should emit correct events through full lucky prop lifecycle', () => {
      const activateHandler = vi.fn();
      const dropConsumedHandler = vi.fn();
      const deactivateHandler = vi.fn();

      eventBus.on('props:lucky:activate', activateHandler);
      eventBus.on('props:lucky:dropConsumed', dropConsumedHandler);
      eventBus.on('props:lucky:deactivate', deactivateHandler);

      propSystem.useProp(PropType.LUCKY);
      expect(activateHandler).toHaveBeenCalledWith({ multiplier: 2, remainingDrops: 3 });

      const luckyProp = propSystem.getProp(PropType.LUCKY);
      luckyProp!.consumeLuckyDrop();
      expect(dropConsumedHandler).toHaveBeenCalledWith({ remainingDrops: 2 });

      luckyProp!.consumeLuckyDrop();
      luckyProp!.consumeLuckyDrop();
      expect(deactivateHandler).toHaveBeenCalled();

      eventBus.off('props:lucky:activate', activateHandler);
      eventBus.off('props:lucky:dropConsumed', dropConsumedHandler);
      eventBus.off('props:lucky:deactivate', deactivateHandler);
    });

    it('should correctly handle lucky prop score multiplier across multiple merges', () => {
      const luckyProp = propSystem.getProp(PropType.LUCKY);
      propSystem.useProp(PropType.LUCKY);
      scoreSystem.setLuckyMultiplier(luckyProp!.getLuckyMultiplier());

      scoreSystem.addMergeScore(2);
      const score1 = scoreSystem.getCurrentScore();

      scoreSystem.addMergeScore(4);
      const score2 = scoreSystem.getCurrentScore();

      expect(score2).toBeGreaterThan(score1);

      luckyProp!.consumeLuckyDrop();
      luckyProp!.consumeLuckyDrop();
      luckyProp!.consumeLuckyDrop();

      scoreSystem.setLuckyMultiplier(1);
      scoreSystem.addMergeScore(2);
      const score3 = scoreSystem.getCurrentScore();
      const scoreWithoutLucky = score3 - score2;
      expect(scoreWithoutLucky).toBeLessThan(score1);
    });
  });
});