import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhysicsManager } from '../src/core/PhysicsManager';
import Matter from 'matter-js';

describe('PhysicsManager', () => {
  let pm: PhysicsManager;

  beforeEach(() => {
    pm = new PhysicsManager();
  });

  afterEach(() => {
    pm.stop();
  });

  describe('createCircle', () => {
    it('creates a circle body with correct position', () => {
      const body = pm.createCircle(100, 200, 20);
      expect(body).toBeDefined();
      expect(body.position.x).toBe(100);
      expect(body.position.y).toBe(200);
    });

    it('creates a non-static body by default', () => {
      const body = pm.createCircle(100, 100, 20);
      expect(body.isStatic).toBe(false);
    });

    it('assigns unique labels block_1, block_2, etc.', () => {
      const b1 = pm.createCircle(0, 0, 10);
      const b2 = pm.createCircle(0, 0, 10);
      const b3 = pm.createCircle(0, 0, 10);
      expect(b1.label).toBe('block_1');
      expect(b2.label).toBe('block_2');
      expect(b3.label).toBe('block_3');
    });

    it('allows overriding options', () => {
      const body = pm.createCircle(100, 100, 20, { isStatic: true });
      expect(body.isStatic).toBe(true);
    });

    it('adds circle to bodies map', () => {
      pm.createCircle(100, 100, 20);
      pm.createCircle(200, 200, 30);
      expect(pm.getAllBodies()).toHaveLength(2);
    });
  });

  describe('createRectangle', () => {
    it('creates a rectangle body with correct position', () => {
      const body = pm.createRectangle(400, 500, 800, 20);
      expect(body).toBeDefined();
      expect(body.position.x).toBe(400);
      expect(body.position.y).toBe(500);
    });

    it('creates a static body by default', () => {
      const body = pm.createRectangle(400, 500, 800, 20);
      expect(body.isStatic).toBe(true);
    });

    it('allows overriding isStatic via options', () => {
      const body = pm.createRectangle(400, 500, 800, 20, { isStatic: false });
      expect(body.isStatic).toBe(false);
    });

    it('does not add rectangle to bodies map', () => {
      pm.createRectangle(400, 500, 800, 20);
      expect(pm.getAllBodies()).toHaveLength(0);
    });
  });

  describe('removeBody', () => {
    it('removes a circle from bodies map', () => {
      const body = pm.createCircle(100, 100, 20);
      pm.createCircle(200, 200, 30);
      expect(pm.getAllBodies()).toHaveLength(2);
      pm.removeBody(body);
      expect(pm.getAllBodies()).toHaveLength(1);
    });

    it('does not throw when removing a body not in the manager', () => {
      const externalBody = Matter.Bodies.circle(0, 0, 10);
      expect(() => pm.removeBody(externalBody)).not.toThrow();
    });
  });

  describe('start/stop', () => {
    it('starts the engine', () => {
      pm.start();
      expect(pm.isRunning()).toBe(true);
    });

    it('stops the engine', () => {
      pm.start();
      pm.stop();
      expect(pm.isRunning()).toBe(false);
    });

    it('calling start() twice does not throw', () => {
      pm.start();
      expect(() => pm.start()).not.toThrow();
    });

    it('calling stop() when not running does not throw', () => {
      expect(() => pm.stop()).not.toThrow();
    });
  });

  describe('onCollisionStart', () => {
    it('registers a collision callback without throwing', () => {
      const cb = vi.fn();
      expect(() => pm.onCollisionStart(cb)).not.toThrow();
    });
  });

  describe('getBodyPosition', () => {
    it('returns position and angle', () => {
      const body = pm.createCircle(100, 200, 20);
      const pos = pm.getBodyPosition(body);
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
      expect(typeof pos.angle).toBe('number');
    });
  });

  describe('getAllBodies', () => {
    it('returns empty array initially', () => {
      expect(pm.getAllBodies()).toEqual([]);
    });

    it('returns correct count after creating bodies', () => {
      pm.createCircle(100, 100, 20);
      pm.createCircle(200, 200, 30);
      expect(pm.getAllBodies()).toHaveLength(2);
    });

    it('count decreases after removeBody', () => {
      const body = pm.createCircle(100, 100, 20);
      pm.createCircle(200, 200, 30);
      pm.removeBody(body);
      expect(pm.getAllBodies()).toHaveLength(1);
    });
  });

  describe('getEngine', () => {
    it('returns the Matter.Engine instance', () => {
      const engine = pm.getEngine();
      expect(engine).toBeDefined();
      expect(engine.world).toBeDefined();
    });
  });
});
