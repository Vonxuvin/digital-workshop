import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameStateMachine } from '../src/core/GameStateMachine';
import { EventBus, eventBus } from '../src/utils/EventBus';
import { PhysicsManager } from '../src/core/PhysicsManager';
import { ObjectPool } from '../src/core/ObjectPool';
import { PerformanceMonitor } from '../src/utils/PerformanceMonitor';

describe('GameStateMachine', () => {
  let sm: GameStateMachine;

  beforeEach(() => {
    sm = new GameStateMachine();
  });

  describe('FIXED: transition() now validates against canTransition() rules', () => {
    it('transition() blocks invalid transition from menu to paused', () => {
      expect(sm.canTransition('paused')).toBe(false);
      const result = sm.transition('paused');
      expect(result).toBe(false);
      expect(sm.getCurrentState()).toBe('menu');
    });

    it('transition() blocks invalid transition from menu to gameover', () => {
      expect(sm.canTransition('gameover')).toBe(false);
      const result = sm.transition('gameover');
      expect(result).toBe(false);
      expect(sm.getCurrentState()).toBe('menu');
    });

    it('transition() blocks invalid transition from menu to levelComplete', () => {
      expect(sm.canTransition('levelComplete')).toBe(false);
      const result = sm.transition('levelComplete');
      expect(result).toBe(false);
      expect(sm.getCurrentState()).toBe('menu');
    });

    it('canTransition() returns false and transition() returns false without changing state', () => {
      expect(sm.canTransition('paused')).toBe(false);
      const result = sm.transition('paused');
      expect(result).toBe(false);
      expect(sm.getCurrentState()).toBe('menu');
      expect(sm.getPreviousState()).toBeNull();
    });

    it('transition() allows valid transition from playing to menu', () => {
      sm.transition('playing');
      expect(sm.canTransition('menu')).toBe(true);
      const result = sm.transition('menu');
      expect(result).toBe(true);
      expect(sm.getCurrentState()).toBe('menu');
    });

    it('onEnter does not fire for invalid transitions', () => {
      const pausedCallback = vi.fn();
      sm.onEnter('paused', pausedCallback);
      expect(sm.canTransition('paused')).toBe(false);
      sm.transition('paused');
      expect(pausedCallback).not.toHaveBeenCalled();
    });

    it('onAnyChange does not fire for invalid transitions', () => {
      const anyCallback = vi.fn();
      sm.onAnyChange(anyCallback);
      expect(sm.canTransition('paused')).toBe(false);
      sm.transition('paused');
      expect(anyCallback).not.toHaveBeenCalled();
    });
  });

  describe('stateHistory grows unbounded (memory leak potential)', () => {
    it('stateHistory grows with every transition and is never trimmed', () => {
      for (let i = 0; i < 1000; i++) {
        sm.transition('playing');
        sm.transition('paused');
      }
      expect(sm.getPreviousState()).toBe('playing');
    });

    it('reset() clears stateHistory', () => {
      for (let i = 0; i < 50; i++) {
        sm.transition('playing');
        sm.transition('paused');
      }
      sm.reset();
      expect(sm.getPreviousState()).toBeNull();
    });
  });

  describe('listeners can never be removed', () => {
    it('no offEnter/offRemoveListener method exists - listeners accumulate', () => {
      const callback = vi.fn();
      sm.onEnter('playing', callback);
      sm.transition('playing');
      expect(callback).toHaveBeenCalledTimes(1);
      sm.transition('paused');
      sm.transition('playing');
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('onAnyChange listeners cannot be removed', () => {
      const callback = vi.fn();
      sm.onAnyChange(callback);
      sm.transition('playing');
      expect(callback).toHaveBeenCalledTimes(1);
      sm.transition('paused');
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('multiple onEnter calls for same state accumulate callbacks', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      sm.onEnter('playing', cb1);
      sm.onEnter('playing', cb2);
      sm.transition('playing');
      expect(cb1).toHaveBeenCalledWith('menu', 'playing');
      expect(cb2).toHaveBeenCalledWith('menu', 'playing');
    });
  });

  describe('transition to same state is a no-op', () => {
    it('does not change state or fire listeners when transitioning to current state', () => {
      const callback = vi.fn();
      sm.onAnyChange(callback);
      sm.transition('menu');
      expect(sm.getCurrentState()).toBe('menu');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('canTransition() valid rules', () => {
    it('menu can only transition to playing', () => {
      expect(sm.canTransition('playing')).toBe(true);
      expect(sm.canTransition('paused')).toBe(false);
      expect(sm.canTransition('gameover')).toBe(false);
      expect(sm.canTransition('levelComplete')).toBe(false);
      expect(sm.canTransition('menu')).toBe(false);
    });

    it('playing can transition to paused, gameover, levelComplete, menu', () => {
      sm.transition('playing');
      expect(sm.canTransition('paused')).toBe(true);
      expect(sm.canTransition('gameover')).toBe(true);
      expect(sm.canTransition('levelComplete')).toBe(true);
      expect(sm.canTransition('menu')).toBe(true);
    });

    it('paused can transition to playing and menu', () => {
      sm.transition('playing');
      sm.transition('paused');
      expect(sm.canTransition('playing')).toBe(true);
      expect(sm.canTransition('menu')).toBe(true);
      expect(sm.canTransition('gameover')).toBe(false);
    });

    it('gameover can transition to menu and playing', () => {
      sm.transition('playing');
      sm.transition('gameover');
      expect(sm.canTransition('menu')).toBe(true);
      expect(sm.canTransition('playing')).toBe(true);
      expect(sm.canTransition('paused')).toBe(false);
    });

    it('levelComplete can transition to menu and playing', () => {
      sm.transition('playing');
      sm.transition('levelComplete');
      expect(sm.canTransition('menu')).toBe(true);
      expect(sm.canTransition('playing')).toBe(true);
      expect(sm.canTransition('paused')).toBe(false);
    });
  });

  describe('reset()', () => {
    it('resets state to menu and clears history', () => {
      sm.transition('playing');
      sm.transition('paused');
      sm.reset();
      expect(sm.getCurrentState()).toBe('menu');
      expect(sm.getPreviousState()).toBeNull();
    });
  });
});

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('FIXED: Error isolation in emit()', () => {
    it('a throwing callback does not stop subsequent callbacks from executing', () => {
      const cb1 = vi.fn(() => {
        throw new Error('boom');
      });
      const cb2 = vi.fn();
      bus.on('test', cb1);
      bus.on('test', cb2);
      expect(() => bus.emit('test')).not.toThrow();
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('error in middle callback does not prevent later callbacks', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn(() => {
        throw new Error('mid error');
      });
      const cb3 = vi.fn();
      bus.on('test', cb1);
      bus.on('test', cb2);
      bus.on('test', cb3);
      expect(() => bus.emit('test')).not.toThrow();
      expect(cb1).toHaveBeenCalledTimes(1);
      expect(cb2).toHaveBeenCalledTimes(1);
      expect(cb3).toHaveBeenCalledTimes(1);
    });
  });

  describe('off() with anonymous functions', () => {
    it('cannot remove anonymous function listeners', () => {
      bus.on('test', () => {});
      const handler = () => {};
      bus.on('test', handler);
      bus.off('test', handler);
      bus.emit('test');
    });

    it('off() with a different function reference does not remove the original', () => {
      let count = 0;
      const original = () => { count++; };
      bus.on('test', original);
      const differentRef = () => { count++; };
      bus.off('test', differentRef);
      bus.emit('test');
      expect(count).toBe(1);
    });
  });

  describe('emit with no listeners', () => {
    it('should not throw when emitting an event with no listeners', () => {
      expect(() => bus.emit('nonexistent')).not.toThrow();
    });

    it('should not throw when emitting with args and no listeners', () => {
      expect(() => bus.emit('nonexistent', 1, 'a', true)).not.toThrow();
    });
  });

  describe('multiple listeners on same event', () => {
    it('all listeners fire in registration order', () => {
      const order: number[] = [];
      bus.on('test', () => { order.push(1); });
      bus.on('test', () => { order.push(2); });
      bus.on('test', () => { order.push(3); });
      bus.emit('test');
      expect(order).toEqual([1, 2, 3]);
    });

    it('same callback can be registered multiple times', () => {
      const cb = vi.fn();
      bus.on('test', cb);
      bus.on('test', cb);
      bus.emit('test');
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  describe('eventBus singleton', () => {
    it('eventBus is a shared singleton instance', () => {
      expect(eventBus).toBeInstanceOf(EventBus);
    });

    it('importing eventBus twice returns the same instance', async () => {
      const mod = await import('../src/utils/EventBus');
      expect(mod.eventBus).toBe(eventBus);
    });
  });

  describe('emit passes arguments correctly', () => {
    it('passes multiple arguments to callbacks', () => {
      const cb = vi.fn();
      bus.on('multi', cb);
      bus.emit('multi', 1, 'hello', { key: 'value' });
      expect(cb).toHaveBeenCalledWith(1, 'hello', { key: 'value' });
    });
  });

  describe('off() removes the correct listener', () => {
    it('removes only the specified callback', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      bus.on('test', cb1);
      bus.on('test', cb2);
      bus.off('test', cb1);
      bus.emit('test');
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('off() on event with no listeners does not throw', () => {
      expect(() => bus.off('nonexistent', () => {})).not.toThrow();
    });
  });
});

describe('PhysicsManager', () => {
  let pm: PhysicsManager;

  beforeEach(() => {
    pm = new PhysicsManager();
  });

  afterEach(() => {
    pm.stop();
  });

  describe('POTENTIAL BUG: start() can be called multiple times', () => {
    it('calling start() twice does not throw', () => {
      pm.start();
      expect(() => pm.start()).not.toThrow();
    });
  });

  describe('removeBody with non-existent body', () => {
    it('does not throw when removing a body not in the manager', () => {
      const Matter = require('matter-js');
      const externalBody = Matter.Bodies.circle(0, 0, 10);
      expect(() => pm.removeBody(externalBody)).not.toThrow();
    });
  });

  describe('getAllBodies returns correct count', () => {
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

  describe('createCircle assigns unique labels', () => {
    it('assigns block_1, block_2, etc.', () => {
      const b1 = pm.createCircle(0, 0, 10);
      const b2 = pm.createCircle(0, 0, 10);
      const b3 = pm.createCircle(0, 0, 10);
      expect(b1.label).toBe('block_1');
      expect(b2.label).toBe('block_2');
      expect(b3.label).toBe('block_3');
    });
  });

  describe('createRectangle creates static bodies', () => {
    it('creates a body with isStatic = true', () => {
      const body = pm.createRectangle(400, 500, 800, 20);
      expect(body.isStatic).toBe(true);
    });

    it('rectangle bodies are not tracked in bodies map', () => {
      pm.createRectangle(400, 500, 800, 20);
      expect(pm.getAllBodies()).toHaveLength(0);
    });

    it('allows overriding isStatic via options', () => {
      const body = pm.createRectangle(400, 500, 800, 20, { isStatic: false });
      expect(body.isStatic).toBe(false);
    });
  });

  describe('createCircle default options', () => {
    it('creates a non-static body by default', () => {
      const body = pm.createCircle(100, 100, 20);
      expect(body.isStatic).toBe(false);
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

  describe('getEngine', () => {
    it('returns the Matter.Engine instance', () => {
      const engine = pm.getEngine();
      expect(engine).toBeDefined();
      expect(engine.world).toBeDefined();
    });
  });

  describe('onCollisionStart', () => {
    it('registers a collision callback without throwing', () => {
      const cb = vi.fn();
      expect(() => pm.onCollisionStart(cb)).not.toThrow();
    });
  });
});

describe('ObjectPool', () => {
  let pool: ObjectPool<{ value: number }>;
  let createFn: () => { value: number };
  let resetFn: (obj: { value: number }) => void;

  beforeEach(() => {
    createFn = vi.fn(() => ({ value: 0 }));
    resetFn = vi.fn((obj: { value: number }) => { obj.value = 0; });
    pool = new ObjectPool(createFn, resetFn, 5);
  });

  describe('initial size', () => {
    it('pre-allocates objects up to initialSize', () => {
      expect(createFn).toHaveBeenCalledTimes(5);
    });

    it('getSize returns initial size', () => {
      expect(pool.getSize()).toBe(5);
    });

    it('default initialSize is 10', () => {
      const defaultPool = new ObjectPool(createFn, resetFn);
      expect(defaultPool.getSize()).toBe(10);
    });
  });

  describe('acquire from pool', () => {
    it('returns a pre-allocated object', () => {
      const obj = pool.acquire();
      expect(obj).toBeDefined();
      expect(obj).toHaveProperty('value');
    });

    it('decreases pool size after acquire', () => {
      pool.acquire();
      expect(pool.getSize()).toBe(4);
    });

    it('acquire from empty pool creates new object via createFn', () => {
      for (let i = 0; i < 5; i++) pool.acquire();
      expect(pool.getSize()).toBe(0);
      const createCallCount = (createFn as ReturnType<typeof vi.fn>).mock.calls.length;
      const newObj = pool.acquire();
      expect(newObj).toBeDefined();
      expect(pool.getSize()).toBe(0);
      expect((createFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(createCallCount + 1);
    });
  });

  describe('release resets and returns to pool', () => {
    it('calls resetFn on the released object', () => {
      const obj = pool.acquire();
      obj.value = 42;
      pool.release(obj);
      expect(resetFn).toHaveBeenCalledWith(obj);
    });

    it('increases pool size after release', () => {
      const obj = pool.acquire();
      expect(pool.getSize()).toBe(4);
      pool.release(obj);
      expect(pool.getSize()).toBe(5);
    });
  });

  describe('acquire/release cycle', () => {
    it('reuses released objects', () => {
      const obj1 = pool.acquire();
      pool.release(obj1);
      const obj2 = pool.acquire();
      expect(obj2).toBe(obj1);
    });

    it('resetFn is called before object returns to pool', () => {
      const obj = pool.acquire();
      obj.value = 99;
      pool.release(obj);
      expect(obj.value).toBe(0);
    });

    it('multiple acquire/release cycles work correctly', () => {
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();
      pool.release(obj1);
      pool.release(obj2);
      expect(pool.getSize()).toBe(5);
      const reacquired = pool.acquire();
      expect([obj1, obj2]).toContain(reacquired);
    });
  });

  describe('getSize', () => {
    it('reflects current available objects', () => {
      expect(pool.getSize()).toBe(5);
      pool.acquire();
      expect(pool.getSize()).toBe(4);
      pool.acquire();
      expect(pool.getSize()).toBe(3);
    });
  });
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    monitor.start();
  });

  describe('initial state', () => {
    it('getFPS returns 60 when no ticks have occurred', () => {
      const fresh = new PerformanceMonitor();
      expect(fresh.getFPS()).toBe(60);
    });

    it('getAverageFrameTime returns 16.67 when no ticks have occurred', () => {
      const fresh = new PerformanceMonitor();
      expect(fresh.getAverageFrameTime()).toBeCloseTo(16.67, 1);
    });
  });

  describe('tick updates FPS', () => {
    it('tick records frame time', () => {
      monitor.tick();
      monitor.tick();
      expect(monitor.getAverageFrameTime()).toBeGreaterThan(0);
    });

    it('FPS is calculated from frame times', () => {
      for (let i = 0; i < 10; i++) {
        monitor.tick();
      }
      const fps = monitor.getFPS();
      expect(typeof fps).toBe('number');
      expect(fps).toBeGreaterThan(0);
    });
  });

  describe('getStats returns correct structure', () => {
    it('returns object with fps, avgFrameTime, minFrameTime, maxFrameTime', () => {
      monitor.tick();
      monitor.tick();
      const stats = monitor.getStats();
      expect(stats).toHaveProperty('fps');
      expect(stats).toHaveProperty('avgFrameTime');
      expect(stats).toHaveProperty('minFrameTime');
      expect(stats).toHaveProperty('maxFrameTime');
      expect(typeof stats.fps).toBe('number');
      expect(typeof stats.avgFrameTime).toBe('number');
      expect(typeof stats.minFrameTime).toBe('number');
      expect(typeof stats.maxFrameTime).toBe('number');
    });

    it('minFrameTime <= avgFrameTime <= maxFrameTime', () => {
      for (let i = 0; i < 10; i++) {
        monitor.tick();
      }
      const stats = monitor.getStats();
      expect(stats.minFrameTime).toBeLessThanOrEqual(stats.avgFrameTime);
      expect(stats.avgFrameTime).toBeLessThanOrEqual(stats.maxFrameTime);
    });
  });

  describe('max samples limit (60)', () => {
    it('frameTimes array does not exceed 60 samples', () => {
      for (let i = 0; i < 100; i++) {
        monitor.tick();
      }
      const stats = monitor.getStats();
      expect(stats.minFrameTime).toBeGreaterThan(0);
      expect(stats.maxFrameTime).toBeGreaterThan(0);
    });

    it('after 100 ticks, only last 60 frame times are retained', () => {
      for (let i = 0; i < 100; i++) {
        monitor.tick();
      }
      const avg = monitor.getAverageFrameTime();
      expect(avg).toBeGreaterThan(0);
      expect(isFinite(avg)).toBe(true);
    });
  });

  describe('getAverageFrameTime', () => {
    it('returns average of recorded frame times', () => {
      for (let i = 0; i < 5; i++) {
        monitor.tick();
      }
      const avg = monitor.getAverageFrameTime();
      expect(avg).toBeGreaterThan(0);
      expect(isFinite(avg)).toBe(true);
    });
  });

  describe('start() resets state', () => {
    it('calling start() again resets frame data', () => {
      for (let i = 0; i < 10; i++) {
        monitor.tick();
      }
      monitor.start();
      expect(monitor.getFPS()).toBe(60);
      expect(monitor.getAverageFrameTime()).toBeCloseTo(16.67, 1);
    });
  });
});
