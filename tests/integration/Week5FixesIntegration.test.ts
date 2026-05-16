import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeManager } from '../../src/utils/TimeManager';
import { AnimationManager } from '../../src/utils/AnimationManager';
import { BlockPool } from '../../src/core/BlockPool';
import { Block } from '../../src/gameplay/Block';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { ParticleEffect, MAX_PARTICLE_COUNT } from '../../src/ui/effects/ParticleEffect';
import { GameEffectManager } from '../../src/core/GameEffectManager';
import { Container } from 'pixi.js';

describe('FIX-8 Integration: TimeManager unified pause/resume', () => {
  let timeManager: TimeManager;
  let animManager: AnimationManager;

  beforeEach(() => {
    AnimationManager.resetInstance();
    TimeManager.resetInstance();
    animManager = AnimationManager.getInstance();
    timeManager = new TimeManager();
    TimeManager.setInstance(timeManager);
  });

  afterEach(() => {
    TimeManager.resetInstance();
    AnimationManager.resetInstance();
  });

  it('pause/resume should synchronize GSAP timeline and AnimationManager', () => {
    const timeline = timeManager.getGameTimeline();

    timeManager.pause();
    expect(timeManager.isCurrentlyPaused()).toBe(true);

    timeManager.resume();
    expect(timeManager.isCurrentlyPaused()).toBe(false);
  });

  it('should not execute AnimationManager callbacks while paused', () => {
    let callCount = 0;
    animManager.register(() => { callCount++; }, 'test_cb');

    timeManager.pause();
    animManager.update(16);
    expect(callCount).toBe(0);

    timeManager.resume();
    animManager.update(16);
    expect(callCount).toBe(1);
  });

  it('should not execute AnimationManager timers while paused', () => {
    let executed = false;
    animManager.setTimeout(() => { executed = true; }, 100, 'test_timer');

    timeManager.pause();
    animManager.update(200);
    expect(executed).toBe(false);

    timeManager.resume();
    animManager.update(200);
    expect(executed).toBe(true);
  });

  it('should handle multiple pause/resume cycles', () => {
    let callCount = 0;
    animManager.register(() => { callCount++; }, 'test_cb');

    timeManager.pause();
    timeManager.resume();
    animManager.update(16);
    expect(callCount).toBe(1);

    timeManager.pause();
    animManager.update(16);
    expect(callCount).toBe(1);

    timeManager.resume();
    animManager.update(16);
    expect(callCount).toBe(2);
  });
});

describe('FIX-9 Integration: BlockPool with Block lifecycle', () => {
  let pool: BlockPool;
  let physics: PhysicsManager;

  beforeEach(() => {
    physics = new PhysicsManager();
    pool = new BlockPool(20);
  });

  afterEach(() => {
    pool.destroy();
  });

  it('should support full Block lifecycle: acquire -> use -> release -> re-acquire', () => {
    const body1 = physics.createCircle(100, 200, 20);
    const block = pool.acquire(body1, 1);
    expect(block.value).toBe(1);
    expect(block.isDestroyed).toBe(false);

    pool.release(block);
    expect(pool.getSize()).toBe(1);
    expect(block.isDestroyed).toBe(true);
    expect(block.visible).toBe(false);

    const body2 = physics.createCircle(300, 400, 25);
    const reused = pool.acquire(body2, 16);
    expect(reused).toBe(block);
    expect(reused.value).toBe(16);
    expect(reused.isDestroyed).toBe(false);
    expect(reused.visible).toBe(true);
  });

  it('should handle rapid acquire/release cycles', () => {
    const blocks: Block[] = [];
    for (let i = 0; i < 10; i++) {
      const body = physics.createCircle(100 + i * 50, 200, 20);
      blocks.push(pool.acquire(body, 1 << i));
    }
    expect(blocks.length).toBe(10);

    blocks.forEach(b => pool.release(b));
    expect(pool.getSize()).toBe(10);

    const reused: Block[] = [];
    for (let i = 0; i < 5; i++) {
      const body = physics.createCircle(100 + i * 50, 200, 20);
      reused.push(pool.acquire(body, 1 << (i + 4)));
    }
    expect(reused.length).toBe(5);
    expect(pool.getSize()).toBe(5);

    reused.forEach(b => {
      expect(b.isDestroyed).toBe(false);
      expect(b.visible).toBe(true);
    });
  });

  it('should handle obstacle blocks in pool', () => {
    const body1 = physics.createCircle(100, 200, 20);
    const block = pool.acquire(body1, 4, false, true);
    expect(block.isObstacle).toBe(true);
    pool.release(block);

    const body2 = physics.createCircle(300, 400, 25);
    const reused = pool.acquire(body2, 8, false, false);
    expect(reused.isObstacle).toBe(false);
    expect(reused.value).toBe(8);
  });

  it('should handle rainbow blocks in pool', () => {
    const body1 = physics.createCircle(100, 200, 20);
    const block = pool.acquire(body1, 8, true);
    expect(block.isRainbow).toBe(true);
    pool.release(block);

    const body2 = physics.createCircle(300, 400, 25);
    const reused = pool.acquire(body2, 16, false);
    expect(reused.isRainbow).toBe(false);
    expect(reused.value).toBe(16);
  });

  it('should not leak when pool overflows', () => {
    const smallPool = new BlockPool(3);
    const blocks: Block[] = [];
    for (let i = 0; i < 5; i++) {
      const body = physics.createCircle(100 + i * 50, 200, 20);
      blocks.push(smallPool.acquire(body, 1));
    }

    blocks.forEach(b => smallPool.release(b));
    expect(smallPool.getSize()).toBe(3);
    smallPool.destroy();
  });
});

describe('FIX-14 Integration: Particle count and effect limits', () => {
  it('should enforce particle count limit across multiple effects', () => {
    const effects: ParticleEffect[] = [];
    for (let i = 0; i < 3; i++) {
      const effect = new ParticleEffect({
        type: 'sparkle',
        x: 100 + i * 50,
        y: 200,
        count: 60,
      });
      expect(effect.children.length).toBe(MAX_PARTICLE_COUNT);
      effects.push(effect);
    }
    effects.forEach(e => e.destroy());
  });

  it('should enforce active effect limit in GameEffectManager', () => {
    const stage = new Container();
    const manager = new GameEffectManager(stage);

    for (let i = 0; i < 30; i++) {
      manager.addMergeEffect(100 + i * 10, 200, 4, 8);
    }
    expect(manager.getEffects().length).toBeLessThanOrEqual(20);

    manager.destroy();
    stage.destroy();
  });

  it('should allow new effects after cleanup', () => {
    const stage = new Container();
    const manager = new GameEffectManager(stage);

    for (let i = 0; i < 20; i++) {
      manager.addMergeEffect(100 + i * 10, 200, 4, 8);
    }
    expect(manager.getEffects().length).toBe(20);

    manager.getEffects().forEach(e => e.destroy());
    manager.cleanup();
    expect(manager.getEffects().length).toBe(0);

    manager.addMergeEffect(100, 200, 4, 8);
    expect(manager.getEffects().length).toBe(1);

    manager.destroy();
    stage.destroy();
  });
});
