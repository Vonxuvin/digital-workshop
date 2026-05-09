import { describe, it, expect } from 'vitest';
import { ParticleEffect, ParticleConfig } from '../src/ui/effects/ParticleEffect';
import { MergeEffect } from '../src/ui/effects/MergeEffect';

describe('ParticleEffect', () => {
  it('should create particles from config', () => {
    const config: ParticleConfig = {
      x: 100, y: 200, color: 0xff0000, count: 8, speed: 3, life: 30,
    };
    const effect = new ParticleEffect(config);
    expect(effect).toBeDefined();
  });

  it('should return alive while particles live', () => {
    const config: ParticleConfig = {
      x: 100, y: 200, color: 0xff0000, count: 4, speed: 2, life: 10,
    };
    const effect = new ParticleEffect(config);
    const alive = effect.update(1);
    expect(alive).toBe(true);
  });

  it('should return dead after life expires', () => {
    const config: ParticleConfig = {
      x: 100, y: 200, color: 0xff0000, count: 4, speed: 2, life: 5,
    };
    const effect = new ParticleEffect(config);
    for (let i = 0; i < 10; i++) {
      effect.update(1);
    }
    const alive = effect.update(1);
    expect(alive).toBe(false);
  });

  it('should destroy without error', () => {
    const config: ParticleConfig = {
      x: 100, y: 200, color: 0x00ff00, count: 6, speed: 5, life: 20,
    };
    const effect = new ParticleEffect(config);
    expect(() => effect.destroy()).not.toThrow();
  });
});

describe('MergeEffect', () => {
  it('should create merge effect', () => {
    const effect = new MergeEffect(200, 300, 0x4ECDC4);
    expect(effect).toBeDefined();
  });

  it('should return alive initially', () => {
    const effect = new MergeEffect(200, 300, 0xFF6B6B);
    const alive = effect.update(1);
    expect(alive).toBe(true);
  });

  it('should fade out over time', () => {
    const effect = new MergeEffect(200, 300, 0xFFEAA7);
    for (let i = 0; i < 60; i++) {
      effect.update(1);
    }
  });

  it('should destroy without error', () => {
    const effect = new MergeEffect(200, 300, 0xDDA0DD);
    expect(() => effect.destroy()).not.toThrow();
  });
});
