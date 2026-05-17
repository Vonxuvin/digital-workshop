import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { Block } from '../../src/gameplay/Block';
import gsap from 'gsap';

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
