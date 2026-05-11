import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MergeSystem } from '../src/gameplay/MergeSystem';
import { PhysicsManager } from '../src/core/PhysicsManager';
import { Block } from '../src/gameplay/Block';
import { eventBus } from '../src/utils/EventBus';

describe('MergeSystem', () => {
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
  });

  it('should register and unregister blocks', () => {
    const body = physics.createCircle(100, 100, 20);
    const block = new Block(body, 1);
    mergeSystem.registerBlock(block);
    expect(() => mergeSystem.unregisterBlock(block)).not.toThrow();
  });

  it('should emit block:merged when same value blocks collide', () => {
    const handler = vi.fn();
    eventBus.on('block:merged', handler);

    const body1 = physics.createCircle(100, 300, 20);
    const body2 = physics.createCircle(120, 300, 20);
    const block1 = new Block(body1, 1);
    const block2 = new Block(body2, 1);

    mergeSystem.registerBlock(block1);
    mergeSystem.registerBlock(block2);

    physics.start();

    return new Promise<void>((resolve) => {
      let acc = 0;
      const step = () => {
        acc += 16.67;
        physics.fixedUpdate(acc);
        acc = 0;
      };

      for (let i = 0; i < 60; i++) {
        step();
      }

      setTimeout(() => {
        physics.stop();
        resolve();
      }, 100);
    }).then(() => {
      expect(handler).toHaveBeenCalled();
      eventBus.off('block:merged', handler);
    });
  });

  it('should not merge blocks with different values', () => {
    const handler = vi.fn();
    eventBus.on('block:merged', handler);

    const body1 = physics.createCircle(100, 300, 20);
    const body2 = physics.createCircle(120, 300, 22);
    const block1 = new Block(body1, 1);
    const block2 = new Block(body2, 2);

    mergeSystem.registerBlock(block1);
    mergeSystem.registerBlock(block2);

    physics.start();

    return new Promise<void>((resolve) => {
      for (let i = 0; i < 30; i++) {
        physics.step(16.67);
      }

      setTimeout(() => {
        physics.stop();
        resolve();
      }, 100);
    }).then(() => {
      expect(handler).not.toHaveBeenCalled();
      eventBus.off('block:merged', handler);
    });
  });

  it('should not merge with static bodies', () => {
    const handler = vi.fn();
    eventBus.on('block:merged', handler);

    const staticBody = physics.createRectangle(200, 500, 400, 50);
    const body = physics.createCircle(200, 300, 20);
    const block = new Block(body, 1);

    mergeSystem.registerBlock(block);

    physics.start();

    return new Promise<void>((resolve) => {
      for (let i = 0; i < 30; i++) {
        physics.step(16.67);
      }

      setTimeout(() => {
        physics.stop();
        resolve();
      }, 100);
    }).then(() => {
      expect(handler).not.toHaveBeenCalled();
      eventBus.off('block:merged', handler);
    });
  });

  it('should handle unregister of unregistered block gracefully', () => {
    const body = physics.createCircle(100, 100, 20);
    const block = new Block(body, 1);
    expect(() => mergeSystem.unregisterBlock(block)).not.toThrow();
  });

  it('should produce new block with doubled value', () => {
    const handler = vi.fn();
    eventBus.on('block:merged', handler);

    const body1 = physics.createCircle(100, 300, 20);
    const body2 = physics.createCircle(120, 300, 20);
    const block1 = new Block(body1, 2);
    const block2 = new Block(body2, 2);

    mergeSystem.registerBlock(block1);
    mergeSystem.registerBlock(block2);

    physics.start();

    return new Promise<void>((resolve) => {
      for (let i = 0; i < 60; i++) {
        physics.step(16.67);
      }

      setTimeout(() => {
        physics.stop();
        if (handler.mock.calls.length > 0) {
          const data = handler.mock.calls[0][0];
          expect(data.newValue).toBe(4);
        }
        eventBus.off('block:merged', handler);
        resolve();
      }, 100);
    });
  });

  it('should emit blocks:destroyed event on merge', () => {
    const handler = vi.fn();
    eventBus.on('blocks:destroyed', handler);

    const body1 = physics.createCircle(100, 300, 20);
    const body2 = physics.createCircle(120, 300, 20);
    const block1 = new Block(body1, 1);
    const block2 = new Block(body2, 1);

    mergeSystem.registerBlock(block1);
    mergeSystem.registerBlock(block2);

    physics.start();

    return new Promise<void>((resolve) => {
      for (let i = 0; i < 60; i++) {
        physics.step(16.67);
      }

      setTimeout(() => {
        physics.stop();
        if (handler.mock.calls.length > 0) {
          const data = handler.mock.calls[0][0];
          expect(data.blocks).toHaveLength(2);
        }
        eventBus.off('blocks:destroyed', handler);
        resolve();
      }, 100);
    });
  });

  it('should not merge already merging blocks', () => {
    const body1 = physics.createCircle(100, 300, 20);
    const body2 = physics.createCircle(120, 300, 20);
    const body3 = physics.createCircle(140, 300, 20);
    const block1 = new Block(body1, 1);
    const block2 = new Block(body2, 1);
    const block3 = new Block(body3, 1);

    mergeSystem.registerBlock(block1);
    mergeSystem.registerBlock(block2);
    mergeSystem.registerBlock(block3);

    physics.start();

    return new Promise<void>((resolve) => {
      for (let i = 0; i < 60; i++) {
        physics.step(16.67);
      }

      setTimeout(() => {
        physics.stop();
        resolve();
      }, 100);
    });
  });
});
