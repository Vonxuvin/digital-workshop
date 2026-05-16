import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BlockPool } from '../../src/core/BlockPool';
import { Block } from '../../src/gameplay/Block';
import { PhysicsManager } from '../../src/core/PhysicsManager';

describe('BlockPool', () => {
  let pool: BlockPool;
  let physics: PhysicsManager;

  beforeEach(() => {
    physics = new PhysicsManager();
    pool = new BlockPool(10);
  });

  afterEach(() => {
    pool.clear();
    pool.destroy();
  });

  it('should create pool with specified max size', () => {
    expect(pool.getSize()).toBe(0);
  });

  it('should acquire a new Block when pool is empty', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = pool.acquire(body, 1);
    expect(block).toBeDefined();
    expect(block).toBeInstanceOf(Block);
    expect(block.value).toBe(1);
    expect(block.isDestroyed).toBe(false);
  });

  it('should release block back to pool', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = pool.acquire(body, 1);
    pool.release(block);
    expect(pool.getSize()).toBe(1);
  });

  it('should reuse released block on next acquire', () => {
    const body1 = physics.createCircle(100, 200, 20);
    const block1 = pool.acquire(body1, 1);
    pool.release(block1);

    const body2 = physics.createCircle(150, 250, 25);
    const block2 = pool.acquire(body2, 4);
    expect(block2).toBe(block1);
    expect(block2.value).toBe(4);
    expect(block2.isDestroyed).toBe(false);
  });

  it('should destroy block when pool is at max capacity', () => {
    const smallPool = new BlockPool(2);
    const body1 = physics.createCircle(100, 200, 20);
    const body2 = physics.createCircle(100, 200, 20);
    const body3 = physics.createCircle(100, 200, 20);
    const b1 = smallPool.acquire(body1, 1);
    const b2 = smallPool.acquire(body2, 2);
    smallPool.release(b1);
    smallPool.release(b2);
    expect(smallPool.getSize()).toBe(2);

    const b3 = smallPool.acquire(body3, 4);
    smallPool.release(b3);
    expect(smallPool.getSize()).toBe(2);

    smallPool.destroy();
  });

  it('should clear all blocks from pool', () => {
    const body1 = physics.createCircle(100, 200, 20);
    const body2 = physics.createCircle(100, 200, 20);
    const b1 = pool.acquire(body1, 1);
    const b2 = pool.acquire(body2, 2);
    pool.release(b1);
    pool.release(b2);
    expect(pool.getSize()).toBe(2);

    pool.clear();
    expect(pool.getSize()).toBe(0);
  });

  it('should acquire block with rainbow flag', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = pool.acquire(body, 8, true);
    expect(block.isRainbow).toBe(true);
  });

  it('should acquire block with obstacle flag', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = pool.acquire(body, 4, false, true);
    expect(block.isObstacle).toBe(true);
  });

  it('should reinit block with new value on reuse', () => {
    const body1 = physics.createCircle(100, 200, 20);
    const block1 = pool.acquire(body1, 1);
    pool.release(block1);

    const body2 = physics.createCircle(150, 250, 25);
    const block2 = pool.acquire(body2, 32);
    expect(block2.value).toBe(32);
    const config = block2.getConfig();
    expect(config.value).toBe(32);
  });

  it('should handle destroy correctly', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = pool.acquire(body, 1);
    pool.release(block);
    pool.destroy();
    expect(pool.getSize()).toBe(0);
  });
});

describe('Block recycle and reinit', () => {
  let physics: PhysicsManager;

  beforeEach(() => {
    physics = new PhysicsManager();
  });

  it('should recycle block and mark as destroyed', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    expect(block.isDestroyed).toBe(false);
    block.recycle();
    expect(block.isDestroyed).toBe(true);
    expect(block.visible).toBe(false);
  });

  it('should not double recycle', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    block.recycle();
    block.recycle();
    expect(block.isDestroyed).toBe(true);
  });

  it('should reinit recycled block with new value', () => {
    const body1 = physics.createCircle(100, 200, 20);
    const block = new Block(body1, 1);
    block.recycle();

    const body2 = physics.createCircle(150, 250, 25);
    block.reinit(body2, 8);
    expect(block.value).toBe(8);
    expect(block.isDestroyed).toBe(false);
    expect(block.visible).toBe(true);
    expect(block.body).toBe(body2);
  });

  it('should reinit block with rainbow flag', () => {
    const body1 = physics.createCircle(100, 200, 20);
    const block = new Block(body1, 1);
    block.recycle();

    const body2 = physics.createCircle(150, 250, 25);
    block.reinit(body2, 16, true);
    expect(block.isRainbow).toBe(true);
    expect(block.alpha).toBe(1);
  });

  it('should reinit block with obstacle flag', () => {
    const body1 = physics.createCircle(100, 200, 20);
    const block = new Block(body1, 1);
    block.recycle();

    const body2 = physics.createCircle(150, 250, 25);
    block.reinit(body2, 4, false, true);
    expect(block.isObstacle).toBe(true);
    expect(block.alpha).toBe(0.7);
  });

  it('should reinit block from obstacle to normal', () => {
    const body1 = physics.createCircle(100, 200, 20);
    const block = new Block(body1, 4, false, true);
    expect(block.isObstacle).toBe(true);
    block.recycle();

    const body2 = physics.createCircle(150, 250, 25);
    block.reinit(body2, 8, false, false);
    expect(block.isObstacle).toBe(false);
    expect(block.alpha).toBe(1);
  });

  it('should update position after reinit', () => {
    const body1 = physics.createCircle(100, 200, 20);
    const block = new Block(body1, 1);
    block.recycle();

    const body2 = physics.createCircle(300, 400, 25);
    block.reinit(body2, 8);
    expect(block.x).toBe(300);
    expect(block.y).toBe(400);
  });
});
