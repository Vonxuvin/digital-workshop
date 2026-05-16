import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModifierManager } from '../../src/gameplay/modifiers/ModifierManager';
import { ModifierConfig, ModifierType } from '../../src/gameplay/modifiers/ContainerModifier';
import { ForkModifier, ForkConfig } from '../../src/gameplay/modifiers/ForkModifier';
import { PaddleModifier, PaddleConfig } from '../../src/gameplay/modifiers/PaddleModifier';
import { RotateModifier, RotateConfig } from '../../src/gameplay/modifiers/RotateModifier';
import { ShrinkModifier, ShrinkConfig } from '../../src/gameplay/modifiers/ShrinkModifier';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { AnimationManager } from '../../src/utils/AnimationManager';
import { eventBus } from '../../src/utils/EventBus';

describe('Modifiers Integration Tests', () => {

  describe('ModifierManager Lifecycle Integration', () => {
    let manager: ModifierManager;
    let physics: PhysicsManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      physics = new PhysicsManager();
      manager = new ModifierManager(physics);
      manager.setContainerSize(400, 600, 0);
    });

    afterEach(() => {
      manager.destroy();
      physics.stop();
      AnimationManager.resetInstance();
    });

    it('should create paddle modifier from config', () => {
      const config: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      const modifier = manager.createModifier(config);
      expect(modifier).toBeDefined();
      expect(modifier!.getType()).toBe('paddle');
    });

    it('should create rotate modifier from config', () => {
      const config: RotateConfig = {
        type: 'rotate',
        enabled: true,
        rotationSpeed: 30,
        maxAngle: 15,
        oscillate: true,
      };

      const modifier = manager.createModifier(config);
      expect(modifier).toBeDefined();
      expect(modifier!.getType()).toBe('rotate');
    });

    it('should create shrink modifier from config', () => {
      const config: ShrinkConfig = {
        type: 'shrink',
        enabled: true,
        targetWidth: 200,
        shrinkSpeed: 10,
        minWidth: 150,
      };

      const modifier = manager.createModifier(config);
      expect(modifier).toBeDefined();
      expect(modifier!.getType()).toBe('shrink');
    });

    it('should create fork modifier from config', () => {
      const config: ForkConfig = {
        type: 'fork',
        enabled: true,
        forkY: 300,
        leftAngle: 30,
        rightAngle: 30,
        channelWidth: 60,
      };

      const modifier = manager.createModifier(config);
      expect(modifier).toBeDefined();
      expect(modifier!.getType()).toBe('fork');
    });

    it('should replace existing modifier of same type', () => {
      const config1: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      const config2: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'right',
        mode: 'slide',
        extendDuration: 3,
        retractDuration: 2,
        extendLength: 120,
        triggerInterval: 4,
      };

      const mod1 = manager.createModifier(config1);
      const mod2 = manager.createModifier(config2);

      expect(mod2).toBeDefined();
      expect(mod1!.isActive()).toBe(false);
    });

    it('should load modifiers from level config array', () => {
      const configs: ModifierConfig[] = [
        { type: 'paddle', enabled: true, side: 'left', mode: 'extend', extendDuration: 2, retractDuration: 1, extendLength: 100, triggerInterval: 5 } as PaddleConfig,
        { type: 'rotate', enabled: true, rotationSpeed: 30, maxAngle: 15, oscillate: true } as RotateConfig,
        { type: 'shrink', enabled: false, targetWidth: 200, shrinkSpeed: 10, minWidth: 150 } as ShrinkConfig,
      ];

      manager.loadFromLevelConfig(configs);

      expect(manager.getModifier('paddle')).toBeDefined();
      expect(manager.getModifier('rotate')).toBeDefined();
      expect(manager.getModifier('shrink')).toBeUndefined();
    });

    it('should start all modifiers', () => {
      const config: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      const modifier = manager.createModifier(config)!;
      manager.startAll();

      expect(modifier.isActive()).toBe(true);
    });

    it('should stop all modifiers', () => {
      const config: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      const modifier = manager.createModifier(config)!;
      manager.startAll();
      manager.stopAll();

      expect(modifier.isActive()).toBe(false);
    });

    it('should pause and resume all modifiers', () => {
      const config: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      manager.createModifier(config);
      manager.startAll();

      manager.pauseAll();

      manager.resumeAll();
    });

    it('should clear all modifiers', () => {
      const config: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      manager.createModifier(config);
      manager.clearAll();

      expect(manager.getModifier('paddle')).toBeUndefined();
    });

    it('should return null for unsupported modifier type', () => {
      const config: ModifierConfig = {
        type: 'unknown' as ModifierType,
        enabled: true,
      };

      const modifier = manager.createModifier(config);
      expect(modifier).toBeNull();
    });

    it('should return null when container size not set', () => {
      const emptyManager = new ModifierManager(physics);
      const config: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      const modifier = emptyManager.createModifier(config);
      expect(modifier).toBeNull();
      emptyManager.destroy();
    });
  });

  describe('ForkModifier Integration', () => {
    let physics: PhysicsManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      physics = new PhysicsManager();
    });

    afterEach(() => {
      physics.stop();
      AnimationManager.resetInstance();
    });

    it('should create fork structure with divider and walls', () => {
      const config: ForkConfig = {
        type: 'fork',
        enabled: true,
        forkY: 300,
        leftAngle: 30,
        rightAngle: 30,
        channelWidth: 60,
      };

      const fork = new ForkModifier(config, physics, 400, 600);
      fork.start();

      expect(fork.isActive()).toBe(true);
      expect(fork.getType()).toBe('fork');

      fork.destroy();
    });

    it('should handle zero angles gracefully', () => {
      const config: ForkConfig = {
        type: 'fork',
        enabled: true,
        forkY: 300,
        leftAngle: 0,
        rightAngle: 0,
        channelWidth: 60,
      };

      const fork = new ForkModifier(config, physics, 400, 600);
      fork.start();

      expect(fork.isActive()).toBe(true);

      fork.destroy();
    });

    it('should handle fork at top of container', () => {
      const config: ForkConfig = {
        type: 'fork',
        enabled: true,
        forkY: 0,
        leftAngle: 30,
        rightAngle: 30,
        channelWidth: 60,
      };

      const fork = new ForkModifier(config, physics, 400, 600);
      fork.start();

      expect(fork.isActive()).toBe(true);

      fork.destroy();
    });
  });

  describe('PaddleModifier Integration', () => {
    let physics: PhysicsManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      physics = new PhysicsManager();
    });

    afterEach(() => {
      physics.stop();
      AnimationManager.resetInstance();
    });

    it('should create extend mode paddle on left side', () => {
      const config: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      const paddle = new PaddleModifier(config, physics, 400, 600);
      paddle.start();

      expect(paddle.isActive()).toBe(true);
      expect(paddle.getType()).toBe('paddle');

      paddle.destroy();
    });

    it('should create slide mode paddle on right side', () => {
      const config: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'right',
        mode: 'slide',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
        xRange: 80,
        slideSpeed: 15,
      };

      const paddle = new PaddleModifier(config, physics, 400, 600);
      paddle.start();

      expect(paddle.isActive()).toBe(true);

      paddle.destroy();
    });

    it('should create paddle on both sides', () => {
      const config: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'both',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      const paddle = new PaddleModifier(config, physics, 400, 600);
      paddle.start();

      expect(paddle.isActive()).toBe(true);

      paddle.destroy();
    });
  });

  describe('RotateModifier Integration', () => {
    let physics: PhysicsManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      physics = new PhysicsManager();
    });

    afterEach(() => {
      physics.stop();
      AnimationManager.resetInstance();
    });

    it('should create rotating modifier with oscillation', () => {
      const config: RotateConfig = {
        type: 'rotate',
        enabled: true,
        rotationSpeed: 30,
        maxAngle: 15,
        oscillate: true,
      };

      const rotate = new RotateModifier(config, physics, 400, 600);
      rotate.start();

      expect(rotate.isActive()).toBe(true);
      expect(rotate.getType()).toBe('rotate');

      rotate.destroy();
    });

    it('should create rotating modifier without oscillation', () => {
      const config: RotateConfig = {
        type: 'rotate',
        enabled: true,
        rotationSpeed: 30,
        maxAngle: 15,
        oscillate: false,
      };

      const rotate = new RotateModifier(config, physics, 400, 600);
      rotate.start();

      expect(rotate.isActive()).toBe(true);

      rotate.destroy();
    });
  });

  describe('ShrinkModifier Integration', () => {
    let physics: PhysicsManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      physics = new PhysicsManager();
    });

    afterEach(() => {
      physics.stop();
      AnimationManager.resetInstance();
    });

    it('should create shrink modifier', () => {
      const config: ShrinkConfig = {
        type: 'shrink',
        enabled: true,
        targetWidth: 200,
        shrinkSpeed: 10,
        minWidth: 150,
      };

      const shrink = new ShrinkModifier(config, physics, 400, 600, 550);
      shrink.start();

      expect(shrink.isActive()).toBe(true);
      expect(shrink.getType()).toBe('shrink');

      shrink.destroy();
    });

    it('should not shrink below minWidth', () => {
      const config: ShrinkConfig = {
        type: 'shrink',
        enabled: true,
        targetWidth: 100,
        shrinkSpeed: 10,
        minWidth: 150,
      };

      const shrink = new ShrinkModifier(config, physics, 400, 600, 550);
      shrink.start();

      expect(shrink.isActive()).toBe(true);

      shrink.destroy();
    });
  });

  describe('Multiple Modifiers Active Simultaneously', () => {
    let manager: ModifierManager;
    let physics: PhysicsManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      physics = new PhysicsManager();
      manager = new ModifierManager(physics);
      manager.setContainerSize(400, 600, 0);
    });

    afterEach(() => {
      manager.destroy();
      physics.stop();
      AnimationManager.resetInstance();
    });

    it('should support paddle and rotate active together', () => {
      const paddleConfig: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      const rotateConfig: RotateConfig = {
        type: 'rotate',
        enabled: true,
        rotationSpeed: 30,
        maxAngle: 15,
        oscillate: true,
      };

      const paddle = manager.createModifier(paddleConfig)!;
      const rotate = manager.createModifier(rotateConfig)!;

      manager.startAll();

      expect(paddle.isActive()).toBe(true);
      expect(rotate.isActive()).toBe(true);

      manager.stopAll();

      expect(paddle.isActive()).toBe(false);
      expect(rotate.isActive()).toBe(false);
    });

    it('should support shrink and fork active together', () => {
      const shrinkConfig: ShrinkConfig = {
        type: 'shrink',
        enabled: true,
        targetWidth: 200,
        shrinkSpeed: 10,
        minWidth: 150,
      };

      const forkConfig: ForkConfig = {
        type: 'fork',
        enabled: true,
        forkY: 300,
        leftAngle: 30,
        rightAngle: 30,
        channelWidth: 60,
      };

      const shrink = manager.createModifier(shrinkConfig)!;
      const fork = manager.createModifier(forkConfig)!;

      manager.startAll();

      expect(shrink.isActive()).toBe(true);
      expect(fork.isActive()).toBe(true);

      manager.stopAll();

      expect(shrink.isActive()).toBe(false);
      expect(fork.isActive()).toBe(false);
    });

    it('should pause and resume all modifiers together', () => {
      const paddleConfig: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      const rotateConfig: RotateConfig = {
        type: 'rotate',
        enabled: true,
        rotationSpeed: 30,
        maxAngle: 15,
        oscillate: true,
      };

      manager.createModifier(paddleConfig);
      manager.createModifier(rotateConfig);
      manager.startAll();

      manager.pauseAll();

      manager.resumeAll();
    });
  });

  describe('Modifier + EventBus Integration', () => {
    let physics: PhysicsManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      physics = new PhysicsManager();
    });

    afterEach(() => {
      physics.stop();
      AnimationManager.resetInstance();
    });

    it('should emit modifier events through event bus', () => {
      const handler = vi.fn();
      eventBus.on('modifier:activated', handler);

      const config: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      const paddle = new PaddleModifier(config, physics, 400, 600);
      paddle.start();

      eventBus.emit('modifier:activated', { type: 'paddle' });
      expect(handler).toHaveBeenCalledWith({ type: 'paddle' });

      eventBus.off('modifier:activated', handler);
      paddle.destroy();
    });

    it('should emit modifier deactivated events', () => {
      const handler = vi.fn();
      eventBus.on('modifier:deactivated', handler);

      const config: PaddleConfig = {
        type: 'paddle',
        enabled: true,
        side: 'left',
        mode: 'extend',
        extendDuration: 2,
        retractDuration: 1,
        extendLength: 100,
        triggerInterval: 5,
      };

      const paddle = new PaddleModifier(config, physics, 400, 600);
      paddle.start();
      paddle.deactivate();

      eventBus.emit('modifier:deactivated', { type: 'paddle' });
      expect(handler).toHaveBeenCalledWith({ type: 'paddle' });

      eventBus.off('modifier:deactivated', handler);
      paddle.destroy();
    });
  });
});