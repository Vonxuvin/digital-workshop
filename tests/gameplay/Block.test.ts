import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { Block, BLOCK_CONFIGS } from '../../src/gameplay/Block';
import gsap from 'gsap';
import Matter from 'matter-js';

describe('Block', () => {
  let physics: PhysicsManager;

  beforeEach(() => {
    physics = new PhysicsManager();
  });

  it('should create block with correct value', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    expect(block.value).toBe(1);
  });

  it('should sync position from body', () => {
    const body = physics.createCircle(150, 250, 20);
    const block = new Block(body, 2);
    expect(block.x).toBe(150);
    expect(block.y).toBe(250);
  });

  it('should return correct config', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 4);
    const config = block.getConfig();
    expect(config.value).toBe(4);
    expect(config.color).toBe(BLOCK_CONFIGS[4].color);
    expect(config.radius).toBe(BLOCK_CONFIGS[4].radius);
  });

  it('should generate dynamic config for unknown power-of-2 value', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 4096);
    const config = block.getConfig();
    expect(config.value).toBe(4096);
    expect(config.radius).toBeGreaterThan(0);
  });

  it('should fallback to config 1 for invalid value 0', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 0);
    const config = block.getConfig();
    expect(config.value).toBe(1);
  });

  it('should fallback to config 1 for negative value', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, -5);
    const config = block.getConfig();
    expect(config.value).toBe(1);
  });

  it('should mark as destroyed on destroy', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    expect(block.isDestroyed).toBe(false);
    block.destroy();
    expect(block.isDestroyed).toBe(true);
  });

  it('should not throw on double destroy', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    block.destroy();
    expect(() => block.destroy()).not.toThrow();
  });

  it('should skip syncFromBody when destroyed', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    block.destroy();
    expect(() => block.syncFromBody()).not.toThrow();
  });

  it('should have body reference', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    expect(block.body).toBe(body);
  });

  describe('syncFromBody after body position change', () => {
    it('should update position when body moves', () => {
      const body = physics.createCircle(100, 200, 20);
      const block = new Block(body, 1);
      expect(block.x).toBe(100);
      expect(block.y).toBe(200);

      Matter.Body.setPosition(body, { x: 300, y: 400 });
      block.syncFromBody();
      expect(block.x).toBe(300);
      expect(block.y).toBe(400);
    });

    it('should update rotation from body angle', () => {
      const body = physics.createCircle(100, 200, 20);
      const block = new Block(body, 1);

      Matter.Body.setAngle(body, Math.PI / 4);
      block.syncFromBody();
      expect(block.rotation).toBeCloseTo(Math.PI / 4, 5);
    });
  });
});

describe('BLOCK_CONFIGS', () => {
  it('should have configs for values 1, 2, 4, 8, 16, 32, 64', () => {
    [1, 2, 4, 8, 16, 32, 64].forEach(v => {
      expect(BLOCK_CONFIGS[v]).toBeDefined();
      expect(BLOCK_CONFIGS[v].value).toBe(v);
      expect(BLOCK_CONFIGS[v].color).toBeGreaterThan(0);
      expect(BLOCK_CONFIGS[v].radius).toBeGreaterThan(0);
      expect(BLOCK_CONFIGS[v].mass).toBeGreaterThan(0);
    });
  });

  it('should have increasing radius for higher values', () => {
    const values = [1, 2, 4, 8, 16, 32, 64];
    for (let i = 1; i < values.length; i++) {
      expect(BLOCK_CONFIGS[values[i]].radius).toBeGreaterThan(
        BLOCK_CONFIGS[values[i - 1]].radius
      );
    }
  });
});

describe('Block - gsap tween cleanup on destroy/recycle', () => {
  let physics: PhysicsManager;

  beforeEach(() => {
    physics = new PhysicsManager();
  });

  it('should kill gsap tweens on destroy', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);

    gsap.to(block, { alpha: 0, duration: 1 });
    gsap.to(block.scale, { x: 2, y: 2, duration: 1 });

    block.destroy();

    expect(block.isDestroyed).toBe(true);
  });

  it('should kill gsap tweens on recycle', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);

    gsap.to(block, { alpha: 0, duration: 1 });
    gsap.to(block.scale, { x: 2, y: 2, duration: 1 });

    block.recycle();

    expect(block.isDestroyed).toBe(true);
  });

  it('should not leave active tweens after destroy', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);

    gsap.to(block, { alpha: 0, duration: 2 });
    gsap.to(block.scale, { x: 0.5, y: 0.5, duration: 2 });

    const tweensBefore = gsap.getTweensOf(block);
    const scaleTweensBefore = gsap.getTweensOf(block.scale);
    expect(tweensBefore.length).toBeGreaterThan(0);
    expect(scaleTweensBefore.length).toBeGreaterThan(0);

    block.destroy();

    const tweensAfter = gsap.getTweensOf(block);
    expect(tweensAfter.length).toBe(0);
  });

  it('should not leave active scale tweens after recycle', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);

    gsap.to(block.scale, { x: 0.5, y: 0.5, duration: 2 });

    const scaleTweensBefore = gsap.getTweensOf(block.scale);
    expect(scaleTweensBefore.length).toBeGreaterThan(0);

    block.recycle();

    const scaleTweensAfter = gsap.getTweensOf(block.scale);
    expect(scaleTweensAfter.length).toBe(0);
  });

  it('should handle destroy without active tweens', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);

    expect(() => block.destroy()).not.toThrow();
    expect(block.isDestroyed).toBe(true);
  });

  it('should handle recycle without active tweens', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);

    expect(() => block.recycle()).not.toThrow();
    expect(block.isDestroyed).toBe(true);
  });

  it('should handle double destroy with tweens gracefully', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);

    gsap.to(block, { alpha: 0, duration: 1 });
    block.destroy();
    expect(() => block.destroy()).not.toThrow();
  });

  it('should reset visual state on recycle', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);

    block.alpha = 0.3;
    block.scale.set(2);
    block.rotation = 1.5;
    block.x = 500;
    block.y = 600;

    block.recycle();

    expect(block.alpha).toBe(1);
    expect(block.scale.x).toBe(1);
    expect(block.scale.y).toBe(1);
    expect(block.rotation).toBe(0);
    expect(block.x).toBe(0);
    expect(block.y).toBe(0);
  });

  it('should set visible to false on recycle', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);

    block.recycle();

    expect(block.visible).toBe(false);
  });
});
