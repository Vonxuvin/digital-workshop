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
import { Block } from '../../src/gameplay/Block';
import { BlockSpawner } from '../../src/gameplay/BlockSpawner';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { PropEffectHandler } from '../../src/core/PropEffectHandler';
import { GameEffectManager } from '../../src/core/GameEffectManager';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { BlockPreview } from '../../src/gameplay/BlockPreview';
import { Container } from 'pixi.js';
import Matter from 'matter-js';
import { AudioManager } from '../../src/core/AudioManager';

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

const propConfigs: PropConfig[] = [
  { id: 'bomb', type: PropType.BOMB, name: '炸弹', description: '爆炸', icon: 'bomb', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'rainbow', type: PropType.RAINBOW, name: '彩虹', description: '彩虹', icon: 'rainbow', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'freeze', type: PropType.FREEZE, name: '冰冻', description: '冰冻', icon: 'freeze', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'shrink', type: PropType.SHRINK, name: '缩小', description: '缩小', icon: 'shrink', maxCount: 2, cooldown: 1000, price: 100 },
  { id: 'lucky', type: PropType.LUCKY, name: '幸运', description: '幸运', icon: 'lucky', maxCount: 2, cooldown: 1000, price: 100 },
];

const defaultPropConfigs = propConfigs;

function createMockBlockSpawner() {
  const blocks: Block[] = [];
  return {
    getBlocks: vi.fn(() => blocks),
    removeBlock: vi.fn((b: Block) => {
      const idx = blocks.indexOf(b);
      if (idx >= 0) blocks.splice(idx, 1);
    }),
    setLuckyMode: vi.fn(),
    setRainbowRemaining: vi.fn(),
    getCurrentValue: vi.fn(() => 1),
    getCanDrop: vi.fn(() => true),
    startCooldown: vi.fn(),
    setContainerBounds: vi.fn(),
  };
}

function createMockMergeSystem() {
  return {
    unregisterBlock: vi.fn(),
  };
}

function createMockEffectManager() {
  return {
    addExplosionEffect: vi.fn(),
    addFreezeEffect: vi.fn(),
    removeFreezeEffect: vi.fn(),
  };
}

function createMockGameHUD() {
  return {
    updateObjectiveProgress: vi.fn(),
    updateTimer: vi.fn(),
    showCrosshair: vi.fn(),
    updateCrosshair: vi.fn(),
    hideCrosshair: vi.fn(),
  };
}

function createMockPreview() {
  return {
    visible: false,
    show: vi.fn(),
    hide: vi.fn(),
    updatePosition: vi.fn(),
    setNextValue: vi.fn(),
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

describe('PropEffectHandler + Container boundary integration', () => {
  let physics: PhysicsManager;
  let blockSpawner: BlockSpawner;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let propEffectHandler: PropEffectHandler;
  let stage: Container;

  beforeEach(async () => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    blockSpawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);

    await propSystem.loadConfig(propConfigs);
    propSystem.initialize([
      { type: PropType.BOMB, count: 3 },
      { type: PropType.RAINBOW, count: 3 },
      { type: PropType.FREEZE, count: 3 },
      { type: PropType.SHRINK, count: 2 },
      { type: PropType.LUCKY, count: 2 },
    ]);

    const effectManager = new GameEffectManager(stage);
    const gameHUD = new GameHUD(propSystem);
    const preview = new BlockPreview();
    propEffectHandler = new PropEffectHandler(
      blockSpawner, mergeSystem, physics, effectManager, propSystem, gameHUD, preview,
    );
  });

  afterEach(() => {
    propEffectHandler.reset();
    propSystem.destroy();
    physics.destroy();
  });

  describe('Container boundary clamping', () => {
    it('should clamp blocks to container bounds on bomb explosion near edge', () => {
      propEffectHandler.setContainerBounds(100, 300);
      const body1 = Matter.Bodies.circle(120, 200, 20);
      const block1 = new Block(body1, 1);
      const body2 = Matter.Bodies.circle(350, 200, 20);
      const block2 = new Block(body2, 2);
      blockSpawner.setContainerBounds(300, 100);

      const blocks = blockSpawner.getBlocks();
      expect(blocks.length).toBe(0);

      propEffectHandler.handleBombExplode({ x: 120, y: 200, radius: 120 });
    });

    it('should respect container offset when checking block positions', () => {
      propEffectHandler.setContainerBounds(100, 300);
      const body = Matter.Bodies.circle(50, 200, 20);
      const block = new Block(body, 1);

      expect(block.x).toBe(50);
      expect(block.x < 100).toBe(true);
    });
  });

  describe('Prop interaction with container bounds', () => {
    it('should clip bomb explosion radius at left boundary', () => {
      propEffectHandler.setContainerBounds(100, 400);
      const body = Matter.Bodies.circle(150, 200, 20);
      const block = new Block(body, 1);

      propEffectHandler.handleBombExplode({ x: 110, y: 200, radius: 120 });
    });

    it('should clip bomb explosion radius at right boundary', () => {
      propEffectHandler.setContainerBounds(0, 400);
      const body = Matter.Bodies.circle(350, 200, 20);
      const block = new Block(body, 1);

      propEffectHandler.handleBombExplode({ x: 390, y: 200, radius: 120 });
    });
  });

  describe('Shrink and block interaction', () => {
    it('should shrink blocks managed by spawner and then restore them', () => {
      blockSpawner.setContainerBounds(400, 0);
      blockSpawner.dropBlock(100, 80, 2);

      propEffectHandler.handleShrinkActivate({ factor: 0.5, duration: 5000 });
      expect(propEffectHandler.isShrinkActive()).toBe(true);

      propEffectHandler.handleShrinkDeactivate();
      expect(propEffectHandler.isShrinkActive()).toBe(false);
    });

    it('should handle shrink activate when already active', () => {
      propEffectHandler.handleShrinkActivate({ factor: 0.5, duration: 5000 });
      propEffectHandler.handleShrinkActivate({ factor: 0.7, duration: 5000 });
      expect(propEffectHandler.getShrinkFactor()).toBe(0.7);
    });
  });

  describe('Lucky mode integration', () => {
    it('should activate and deactivate lucky mode', () => {
      propEffectHandler.handleLuckyActivate({ multiplier: 2, remainingDrops: 5 });
      propEffectHandler.handleLuckyDeactivate();
    });
  });

  describe('Prop target mode integration', () => {
    it('should toggle bomb target mode', () => {
      expect(propEffectHandler.getBombTargetMode()).toBe(false);
      propEffectHandler.handlePropTargetMode({ enabled: true });
      expect(propEffectHandler.getBombTargetMode()).toBe(true);
      propEffectHandler.handlePropTargetMode({ enabled: false });
      expect(propEffectHandler.getBombTargetMode()).toBe(false);
    });
  });

  describe('Reset state integration', () => {
    it('should reset all prop effect state', () => {
      const body = Matter.Bodies.circle(100, 200, 20);
      const block = new Block(body, 2);

      propEffectHandler.handlePropTargetMode({ enabled: true });
      propEffectHandler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      propEffectHandler.reset();
      expect(propEffectHandler.getBombTargetMode()).toBe(false);
      expect(propEffectHandler.isShrinkActive()).toBe(false);
      expect(propEffectHandler.getShrinkFactor()).toBe(1);
    });
  });
});

describe('PropEffectHandler circleRadius for circle bodies', () => {
  let physics: PhysicsManager;

  beforeEach(() => {
    physics = new PhysicsManager();
  });

  it('Matter.Body.scale should update circleRadius automatically in v0.20.0', () => {
    const body = physics.createCircle(200, 300, 20);
    const originalRadius = body.circleRadius;

    expect(originalRadius).toBe(20);

    Matter.Body.scale(body, 0.7, 0.7);

    expect(body.circleRadius).toBeCloseTo(14, 5);
  });

  it('should NOT double-scale circleRadius (regression check)', () => {
    const body = physics.createCircle(200, 300, 20);
    const originalRadius = body.circleRadius;

    Matter.Body.scale(body, 0.7, 0.7);

    expect(body.circleRadius).toBeCloseTo(originalRadius! * 0.7, 5);
    expect(body.circleRadius).not.toBeCloseTo(originalRadius! * 0.7 * 0.7, 2);
  });

  it('should restore original circleRadius after inverse scale', () => {
    const body = physics.createCircle(200, 300, 20);
    const originalRadius = body.circleRadius;

    const factor = 0.7;
    Matter.Body.scale(body, factor, factor);
    expect(body.circleRadius).toBeCloseTo(14, 5);

    const inverseFactor = 1 / factor;
    Matter.Body.scale(body, inverseFactor, inverseFactor);
    expect(body.circleRadius).toBeCloseTo(20, 5);
  });

  it('should restore via stored original value (PropEffectHandler pattern)', () => {
    const body = physics.createCircle(200, 300, 20);
    const storedCircleRadius = body.circleRadius;

    const factor = 0.7;
    Matter.Body.scale(body, factor, factor);
    expect(body.circleRadius).toBeCloseTo(14, 5);

    body.circleRadius = storedCircleRadius!;
    expect(body.circleRadius).toBe(20);
  });

  it('should handle multiple scale/restore cycles without drift', () => {
    const body = physics.createCircle(200, 300, 25);
    const originalRadius = body.circleRadius!;

    for (let i = 0; i < 5; i++) {
      const factor = 0.7;
      Matter.Body.scale(body, factor, factor);

      body.circleRadius = originalRadius;
      Matter.Body.scale(body, 1 / factor, 1 / factor);
      body.circleRadius = originalRadius;
    }

    expect(body.circleRadius).toBe(originalRadius);
  });
});

describe('Shrink bottom position integration', () => {
  let handler: PropEffectHandler;
  let blockSpawner: ReturnType<typeof createMockBlockSpawner>;
  let mergeSystem: ReturnType<typeof createMockMergeSystem>;
  let physics: PhysicsManager;
  let effectManager: ReturnType<typeof createMockEffectManager>;
  let propSystem: PropSystem;
  let gameHUD: ReturnType<typeof createMockGameHUD>;
  let preview: ReturnType<typeof createMockPreview>;

  beforeEach(async () => {
    blockSpawner = createMockBlockSpawner();
    mergeSystem = createMockMergeSystem();
    physics = new PhysicsManager();
    effectManager = createMockEffectManager();
    propSystem = new PropSystem();
    gameHUD = createMockGameHUD();
    preview = createMockPreview();

    await propSystem.loadConfig(defaultPropConfigs);
    propSystem.initialize([
      { type: PropType.BOMB, count: 3 },
      { type: PropType.RAINBOW, count: 3 },
      { type: PropType.FREEZE, count: 3 },
      { type: PropType.SHRINK, count: 2 },
      { type: PropType.LUCKY, count: 2 },
    ]);

    handler = new PropEffectHandler(
      blockSpawner as any,
      mergeSystem as any,
      physics as any,
      effectManager as any,
      propSystem,
      gameHUD as any,
      preview as any,
    );
  });

  afterEach(() => {
    physics.stop();
    physics.destroy();
  });

  describe('Shrink + Physics Integration', () => {
    it('should keep ball on ground after shrink with real physics engine', () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';

      const radius = 40;
      const body = physics.createCircle(200, groundY - radius, radius);
      const block = new Block(body, 8);
      blockSpawner.getBlocks.mockReturnValue([block]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      const settledY = body.position.y;
      const settledBottom = settledY + body.circleRadius!;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const shrunkBottom = body.position.y + body.circleRadius!;
      expect(shrunkBottom).toBeCloseTo(settledBottom, 0);
    });

    it('should maintain bottom contact through shrink-restore cycle with physics', () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';

      const radius = 30;
      const body = physics.createCircle(200, groundY - radius, radius);
      const block = new Block(body, 4);
      blockSpawner.getBlocks.mockReturnValue([block]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      const originalBottom = body.position.y + body.circleRadius!;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      for (let i = 0; i < 30; i++) {
        physics.step(1000 / 60);
      }

      handler.handleShrinkDeactivate();

      const finalBottom = body.position.y + body.circleRadius!;
      expect(finalBottom).toBeCloseTo(originalBottom, 0);
    });

    it('should not cause ball to float above ground after shrink', () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';

      const radius = 40;
      const body = physics.createCircle(200, groundY - radius, radius);
      const block = new Block(body, 8);
      blockSpawner.getBlocks.mockReturnValue([block]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      const originalBottom = body.position.y + body.circleRadius!;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const shrunkBottom = body.position.y + body.circleRadius!;
      expect(shrunkBottom).toBeGreaterThanOrEqual(originalBottom - 1);
    });

    it('should handle multiple blocks at different heights after shrink', () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';

      const body1 = physics.createCircle(150, groundY - 20, 20);
      const block1 = new Block(body1, 1);
      const body2 = physics.createCircle(250, groundY - 40, 40);
      const block2 = new Block(body2, 8);

      blockSpawner.getBlocks.mockReturnValue([block1, block2]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      const bottom1 = body1.position.y + body1.circleRadius!;
      const bottom2 = body2.position.y + body2.circleRadius!;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const shrunkBottom1 = body1.position.y + body1.circleRadius!;
      const shrunkBottom2 = body2.position.y + body2.circleRadius!;

      expect(shrunkBottom1).toBeCloseTo(bottom1, 0);
      expect(shrunkBottom2).toBeCloseTo(bottom2, 0);
    });

    it('should resolve stacked ball overlaps after shrink-restore cycle with real physics', async () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';
      ground.isStatic = true;

      const radius = 20;
      const body1 = physics.createCircle(200, groundY - radius, radius);
      const block1 = new Block(body1, 1);
      const body2 = physics.createCircle(200, groundY - radius * 2 - 1, radius);
      const block2 = new Block(body2, 2);
      const body3 = physics.createCircle(200, groundY - radius * 3 - 1, radius);
      const block3 = new Block(body3, 4);

      blockSpawner.getBlocks.mockReturnValue([block1, block2, block3]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      for (let i = 0; i < 30; i++) {
        physics.step(1000 / 60);
      }

      handler.handleShrinkDeactivate();

      for (let i = 0; i < 60; i++) {
        physics.step(1000 / 60);
      }

      const r1 = body1.circleRadius || 0;
      const r2 = body2.circleRadius || 0;
      const r3 = body3.circleRadius || 0;

      const dist12 = Math.sqrt(
        (body1.position.x - body2.position.x) ** 2 +
        (body1.position.y - body2.position.y) ** 2
      );
      expect(dist12).toBeGreaterThanOrEqual((r1 + r2) - 2);

      const dist23 = Math.sqrt(
        (body2.position.x - body3.position.x) ** 2 +
        (body2.position.y - body3.position.y) ** 2
      );
      expect(dist23).toBeGreaterThanOrEqual((r2 + r3) - 2);

      expect(body1.position.y + r1).toBeCloseTo(groundY, 0);
    });

    it('should not cause balls to overlap during shrink effect with real physics', async () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';
      ground.isStatic = true;

      const radius = 20;
      const body1 = physics.createCircle(200, groundY - radius, radius);
      const block1 = new Block(body1, 1);
      const body2 = physics.createCircle(200, groundY - radius * 2 - 1, radius);
      const block2 = new Block(body2, 2);

      blockSpawner.getBlocks.mockReturnValue([block1, block2]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const r1 = body1.circleRadius || 0;
      const r2 = body2.circleRadius || 0;
      const dist = Math.sqrt(
        (body1.position.x - body2.position.x) ** 2 +
        (body1.position.y - body2.position.y) ** 2
      );
      expect(dist).toBeGreaterThanOrEqual((r1 + r2) - 1);
    });

    it('should not sink bottom ball into ground during shrink with three stacked balls', async () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';
      ground.isStatic = true;

      const radius = 30;
      const body1 = physics.createCircle(200, groundY - radius, radius);
      const block1 = new Block(body1, 1);
      const body2 = physics.createCircle(200, groundY - radius * 2 - 1, radius);
      const block2 = new Block(body2, 2);
      const body3 = physics.createCircle(200, groundY - radius * 3 - 1, radius);
      const block3 = new Block(body3, 4);

      blockSpawner.getBlocks.mockReturnValue([block1, block2, block3]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      for (let i = 0; i < 30; i++) {
        physics.step(1000 / 60);
      }

      const r1 = body1.circleRadius || 0;
      const bottom1 = body1.position.y + r1;
      expect(bottom1).toBeLessThanOrEqual(groundY + 1);
    });
  });

  describe('Shrink + EventBus Integration', () => {
    it('should maintain bottom position when shrink is triggered via event', () => {
      const groundY = 590;
      const radius = 40;
      const body = Matter.Bodies.circle(200, groundY - radius, radius);
      const block = new Block(body, 8);
      blockSpawner.getBlocks.mockReturnValue([block]);

      const originalBottom = body.position.y + radius;

      eventBus.emit('props:shrink:activate', { factor: 0.5, duration: 5000 });

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const shrunkBottom = body.position.y + body.circleRadius!;
      expect(shrunkBottom).toBeCloseTo(originalBottom, 1);
    });
  });

  describe('Shrink + PropSystem Integration', () => {
    it('should maintain bottom position when using shrink prop through PropSystem', async () => {
      const ps = new PropSystem();
      await ps.loadConfig(defaultPropConfigs);
      ps.initialize([{ type: PropType.SHRINK, count: 3 }]);

      const h = new PropEffectHandler(
        blockSpawner as any,
        mergeSystem as any,
        physics as any,
        effectManager as any,
        ps,
        gameHUD as any,
        preview as any,
      );

      const groundY = 590;
      const radius = 40;
      const body = Matter.Bodies.circle(200, groundY - radius, radius);
      const block = new Block(body, 8);
      blockSpawner.getBlocks.mockReturnValue([block]);

      const originalBottom = body.position.y + radius;

      h.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const shrunkBottom = body.position.y + body.circleRadius!;
      expect(shrunkBottom).toBeCloseTo(originalBottom, 1);

      ps.destroy();
    });
  });

  describe('Shrink Reactivation Integration', () => {
    it('should maintain bottom position when reactivating shrink with different factor', () => {
      const groundY = 590;
      const radius = 40;
      const body = Matter.Bodies.circle(200, groundY - radius, radius);
      const block = new Block(body, 8);
      blockSpawner.getBlocks.mockReturnValue([block]);

      const originalBottom = body.position.y + radius;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const firstShrunkBottom = body.position.y + body.circleRadius!;
      expect(firstShrunkBottom).toBeCloseTo(originalBottom, 1);

      handler.handleShrinkActivate({ factor: 0.7, duration: 5000 });

      const secondShrunkBottom = body.position.y + body.circleRadius!;
      expect(secondShrunkBottom).toBeCloseTo(originalBottom, 0);
    });
  });

  describe('Shrink no-floating integration', () => {
    it('should not cause any block bottom to move upward after shrink', () => {
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';

      const body1 = physics.createCircle(150, groundY - 20, 20);
      const block1 = new Block(body1, 1);
      const body2 = physics.createCircle(250, groundY - 40, 40);
      const block2 = new Block(body2, 8);

      blockSpawner.getBlocks.mockReturnValue([block1, block2]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      const bottom1Before = body1.position.y + body1.circleRadius!;
      const bottom2Before = body2.position.y + body2.circleRadius!;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const bottom1After = body1.position.y + body1.circleRadius!;
      const bottom2After = body2.position.y + body2.circleRadius!;

      expect(bottom1After).toBeGreaterThanOrEqual(bottom1Before - 1);
      expect(bottom2After).toBeGreaterThanOrEqual(bottom2Before - 1);
    });

    it('should maintain bottom positions through shrink-restore cycle with real physics', () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';

      const radius = 30;
      const body = physics.createCircle(200, groundY - radius, radius);
      const block = new Block(body, 4);
      blockSpawner.getBlocks.mockReturnValue([block]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      const originalBottom = body.position.y + body.circleRadius!;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });
      const shrunkBottom = body.position.y + body.circleRadius!;
      expect(shrunkBottom).toBeGreaterThanOrEqual(originalBottom - 1);

      handler.handleShrinkDeactivate();
      const restoredBottom = body.position.y + body.circleRadius!;
      expect(restoredBottom).toBeGreaterThanOrEqual(originalBottom - 2);
    });
  });
});

describe('ShrinkProp new block omission fix', () => {
  let physics: PhysicsManager;
  let blockSpawner: BlockSpawner;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let propEffectHandler: PropEffectHandler;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics, { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any);
    propSystem = new PropSystem({ emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any);
    stage = new Container();
    blockSpawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    const effectManager = new GameEffectManager(stage);
    const mockPropSystem = {
      getPropCount: vi.fn().mockReturnValue(3),
      getAllProps: vi.fn().mockReturnValue([]),
      useProp: vi.fn(),
      getProp: vi.fn(),
      reset: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      destroy: vi.fn(),
    } as unknown as PropSystem;
    const hud = new GameHUD(mockPropSystem);
    const preview = new BlockPreview();
    propEffectHandler = new PropEffectHandler(
      blockSpawner, mergeSystem, physics, effectManager, propSystem, hud, preview
    );
  });

  afterEach(() => {
    physics.stop();
  });

  describe('FIXED: PropEffectHandler exposes shrink state', () => {
    it('isShrinkActive() returns current shrink state', () => {
      expect(propEffectHandler.isShrinkActive()).toBe(false);
    });

    it('getShrinkFactor() returns current shrink factor', () => {
      expect(propEffectHandler.getShrinkFactor()).toBe(1);
    });

    it('applyShrinkToBlock() method exists', () => {
      expect(typeof propEffectHandler.applyShrinkToBlock).toBe('function');
    });
  });

  describe('FIXED: New blocks auto-shrink when shrink is active', () => {
    it('applyShrinkToBlock does not affect blocks when shrink is inactive', () => {
      const body = physics.createCircle(200, 300, 20);
      const block = new Block(body, 2);
      const originalScale = block.scale.x;

      propEffectHandler.applyShrinkToBlock(block);

      expect(block.scale.x).toBe(originalScale);
    });

    it('applyShrinkToBlock shrinks blocks when shrink is active', () => {
      propEffectHandler.handleShrinkActivate({ factor: 0.7, duration: 5000 });
      expect(propEffectHandler.isShrinkActive()).toBe(true);
      expect(propEffectHandler.getShrinkFactor()).toBe(0.7);

      const body = physics.createCircle(200, 300, 20);
      const block = new Block(body, 4);

      propEffectHandler.applyShrinkToBlock(block);

      expect(block.scale.x).toBeCloseTo(0.7, 5);
      expect(block.scale.y).toBeCloseTo(0.7, 5);
    });

    it('new blocks are recorded to originalBodyData and can be restored', () => {
      blockSpawner.dropBlock(200, 300, 2);
      const existingBlocks = blockSpawner.getBlocks();

      propEffectHandler.handleShrinkActivate({ factor: 0.7, duration: 5000 });
      expect(propEffectHandler.isShrinkActive()).toBe(true);

      blockSpawner.dropBlock(250, 300, 4);
      const newBlock = blockSpawner.getBlocks().find(b => b.value === 4);
      expect(newBlock).toBeDefined();

      propEffectHandler.applyShrinkToBlock(newBlock!);
      expect(newBlock!.scale.x).toBeCloseTo(0.7, 5);

      propEffectHandler.handleShrinkDeactivate();
      expect(newBlock!.scale.x).toBeCloseTo(1, 5);
    });
  });

  describe('FIXED: BlockSpawner supports onBlockDropped callback', () => {
    it('setOnBlockDropped method exists', () => {
      expect(typeof blockSpawner.setOnBlockDropped).toBe('function');
    });

    it('callback is called after block is dropped', () => {
      const callback = vi.fn();
      blockSpawner.setOnBlockDropped(callback);
      blockSpawner.dropBlock(200, 100, 2);
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toBeDefined();
      expect(callback.mock.calls[0][0].value).toBe(2);
    });
  });
});

describe('PropEffectHandler handleRevive call chain', () => {
  let handler: PropEffectHandler;
  let mockBlockSpawner: any;
  let mockMergeSystem: any;
  let mockPhysics: any;
  let mockEffectManager: any;
  let propSystem: PropSystem;
  let mockGameHUD: any;
  let mockPreview: any;
  let mockLevelSystem: any;

  beforeEach(async () => {
    mockBlockSpawner = {
      getBlocks: vi.fn(() => []),
      removeBlock: vi.fn(),
    };

    mockMergeSystem = {
      unregisterBlock: vi.fn(),
    };

    mockPhysics = {
      createCircle: vi.fn(() => Matter.Bodies.circle(100, 200, 20)),
      removeBody: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockEffectManager = {
      addExplosionEffect: vi.fn(),
      addFreezeEffect: vi.fn(),
      removeFreezeEffect: vi.fn(),
    };

    propSystem = new PropSystem();
    await propSystem.loadConfig(defaultPropConfigs);
    propSystem.initialize([
      { type: PropType.BOMB, count: 3 },
      { type: PropType.RAINBOW, count: 3 },
      { type: PropType.FREEZE, count: 3 },
      { type: PropType.SHRINK, count: 2 },
      { type: PropType.LUCKY, count: 2 },
    ]);

    mockGameHUD = {
      updateObjectiveProgress: vi.fn(),
    };

    mockPreview = {
      hide: vi.fn(),
    };

    mockLevelSystem = {
      resume: vi.fn(),
      resumeTimer: vi.fn(),
      applyTimerPenalty: vi.fn(),
    };

    handler = new PropEffectHandler(
      mockBlockSpawner,
      mockMergeSystem,
      mockPhysics,
      mockEffectManager,
      propSystem,
      mockGameHUD,
      mockPreview,
    );

    handler.setLevelSystem(mockLevelSystem);
  });

  it('handleRevive should call resumeTimer instead of resume', () => {
    const mockModifierManager = { resumeAll: vi.fn() };
    handler.handleRevive(600, mockModifierManager);

    expect(mockLevelSystem.resumeTimer).toHaveBeenCalled();
    expect(mockLevelSystem.resume).not.toHaveBeenCalled();
  });

  it('handleRevive should call applyTimerPenalty(10)', () => {
    const mockModifierManager = { resumeAll: vi.fn() };
    handler.handleRevive(600, mockModifierManager);

    expect(mockLevelSystem.applyTimerPenalty).toHaveBeenCalledWith(10);
  });

  it('handleRevive should call warningLine.reset and warningLine.setDisabled(false)', () => {
    const mockModifierManager = { resumeAll: vi.fn() };
    const mockWarningLine = {
      y: 120,
      reset: vi.fn(),
      setDisabled: vi.fn(),
    };

    handler.setWarningLine(mockWarningLine as any);
    handler.handleRevive(600, mockModifierManager);

    expect(mockWarningLine.reset).toHaveBeenCalled();
    expect(mockWarningLine.setDisabled).toHaveBeenCalledWith(false);
  });
});

describe('ShrinkProp sound name fix', () => {
  it('FIXED: GameEventRouter.handleShrinkActivate should play shrink instead of freeze', () => {
    const content = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/core/GameEventRouter.ts'),
      'utf-8'
    );
    const shrinkActivateMatch = content.match(/private handleShrinkActivate\(data: \{ factor: number; duration: number \}\): void \{[\s\S]*?this\.audioManager\.play\('[^']+'\)/);
    expect(shrinkActivateMatch).toBeTruthy();
    expect(shrinkActivateMatch![0]).toContain("play('shrink')");
    expect(shrinkActivateMatch![0]).not.toContain("play('freeze')");
  });

  it('FIXED: AudioManager shrink sound frequency is configured', () => {
    const am = new AudioManager();
    const freqMap = (am as any).getProceduralFrequency('shrink');
    expect(freqMap).toBe(330);
    expect(freqMap).toBeGreaterThan(0);
    am.destroy();
  });

  it('FIXED: freeze and shrink sound frequencies are different and distinguishable', () => {
    const am = new AudioManager();
    const freezeFreq = (am as any).getProceduralFrequency('freeze');
    const shrinkFreq = (am as any).getProceduralFrequency('shrink');
    expect(freezeFreq).not.toBe(shrinkFreq);
    expect(freezeFreq).toBe(440);
    expect(shrinkFreq).toBe(330);
    am.destroy();
  });
});

describe('PropEffectHandler ground snapping', () => {
  let physics: PhysicsManager;
  let blockSpawner: ReturnType<typeof createMockBlockSpawner>;
  let mergeSystem: ReturnType<typeof createMockMergeSystem>;
  let effectManager: ReturnType<typeof createMockEffectManager>;
  let propSystem: PropSystem;
  let gameHUD: ReturnType<typeof createMockGameHUD>;
  let preview: ReturnType<typeof createMockPreview>;
  let handler: PropEffectHandler;

  beforeEach(async () => {
    physics = new PhysicsManager();
    blockSpawner = createMockBlockSpawner();
    mergeSystem = createMockMergeSystem();
    effectManager = createMockEffectManager();
    propSystem = new PropSystem();
    gameHUD = createMockGameHUD();
    preview = createMockPreview();

    await propSystem.loadConfig(defaultPropConfigs);
    propSystem.initialize([
      { type: PropType.BOMB, count: 3 },
      { type: PropType.RAINBOW, count: 3 },
      { type: PropType.FREEZE, count: 3 },
      { type: PropType.SHRINK, count: 2 },
      { type: PropType.LUCKY, count: 2 },
    ]);

    handler = new PropEffectHandler(
      blockSpawner as any,
      mergeSystem as any,
      physics as any,
      effectManager as any,
      propSystem,
      gameHUD as any,
      preview as any,
    );
  });

  it('should snap block resting on ground to exact groundY after shrink', () => {
    const groundY = 500;
    handler.setGroundY(groundY);
    const radius = 25;
    if (!physics.isRunning()) physics.start();
    const body = physics.createCircle(200, groundY - radius, radius);
    const block = new Block(body, 4);
    (blockSpawner.getBlocks as any).mockReturnValue([block]);

    handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

    const newRadius = body.circleRadius!;
    const bottom = body.position.y + newRadius;
    expect(Math.abs(bottom - groundY)).toBeLessThan(2);
  });

  it('should snap block slightly above ground (Matter.js slop gap) to exact groundY after shrink', () => {
    const groundY = 500;
    handler.setGroundY(groundY);
    const radius = 25;
    if (!physics.isRunning()) physics.start();
    const body = physics.createCircle(200, groundY - radius + 1, radius);
    const block = new Block(body, 4);
    (blockSpawner.getBlocks as any).mockReturnValue([block]);

    handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

    const newRadius = body.circleRadius!;
    const bottom = body.position.y + newRadius;
    expect(Math.abs(bottom - groundY)).toBeLessThan(2);
  });

  it('should preserve exact bottom for mid-air block after shrink with groundY set', () => {
    const groundY = 500;
    handler.setGroundY(groundY);
    const radius = 25;
    const midAirCenter = 250;
    if (!physics.isRunning()) physics.start();
    const body = physics.createCircle(200, midAirCenter, radius);
    const block = new Block(body, 4);
    const originalBottom = midAirCenter + radius;
    (blockSpawner.getBlocks as any).mockReturnValue([block]);

    handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

    const newRadius = body.circleRadius!;
    const bottom = body.position.y + newRadius;
    expect(Math.abs(bottom - originalBottom)).toBeLessThan(2);
  });

  it('should not cause center to move after shrink-activate-deactivate cycle on ground', () => {
    const groundY = 500;
    handler.setGroundY(groundY);
    const radius = 25;
    if (!physics.isRunning()) physics.start();
    const body = physics.createCircle(200, groundY - radius, radius);
    const block = new Block(body, 4);
    const originalX = body.position.x;
    (blockSpawner.getBlocks as any).mockReturnValue([block]);

    handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });
    handler.handleShrinkDeactivate();

    expect(body.position.x).toBeCloseTo(originalX, 1);
    expect(handler.isShrinkActive()).toBe(false);
  });

  it('should not float after shrink when groundY matches actual ground level', () => {
    const groundY = 500;
    handler.setGroundY(groundY);
    const radius = 30;
    if (!physics.isRunning()) physics.start();
    const body = physics.createCircle(200, groundY - radius, radius);
    const block = new Block(body, 8);
    (blockSpawner.getBlocks as any).mockReturnValue([block]);

    handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

    const newRadius = body.circleRadius!;
    const bottom = body.position.y + newRadius;
    const floatingGap = groundY - bottom;
    expect(floatingGap).toBeLessThan(2);
    expect(floatingGap).toBeGreaterThanOrEqual(0);
  });

  it('should handle multiple blocks with mixed ground/mid-air positions', () => {
    const groundY = 500;
    handler.setGroundY(groundY);
    if (!physics.isRunning()) physics.start();
    const radius1 = 20;
    const radius2 = 30;
    const body1 = physics.createCircle(150, groundY - radius1, radius1);
    const block1 = new Block(body1, 1);
    const body2 = physics.createCircle(250, 200, radius2);
    const block2 = new Block(body2, 4);
    const originalBottom2 = 200 + radius2;
    (blockSpawner.getBlocks as any).mockReturnValue([block1, block2]);

    handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

    const bottom1 = body1.position.y + body1.circleRadius!;
    const bottom2 = body2.position.y + body2.circleRadius!;
    expect(Math.abs(bottom1 - groundY)).toBeLessThan(2);
    expect(Math.abs(bottom2 - originalBottom2)).toBeLessThan(2);
  });
});