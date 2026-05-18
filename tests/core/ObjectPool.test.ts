import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectPool } from '../../src/core/ObjectPool';

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
