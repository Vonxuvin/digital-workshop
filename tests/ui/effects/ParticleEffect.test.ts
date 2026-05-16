import { describe, it, expect } from 'vitest';
import { ParticleEffect, ParticleConfig, ParticleType, MAX_PARTICLE_COUNT } from '../../../src/ui/effects/ParticleEffect';

describe('ParticleEffect', () => {
  it('should create sparkle particles from config', () => {
    const config: ParticleConfig = {
      type: 'sparkle' as ParticleType,
      x: 100,
      y: 200,
      count: 8,
      color: 0xff0000,
    };
    const effect = new ParticleEffect(config);
    expect(effect).toBeDefined();
    effect.destroy();
  });

  it('should create confetti particles', () => {
    const config: ParticleConfig = {
      type: 'confetti' as ParticleType,
      x: 100,
      y: 200,
      count: 4,
    };
    const effect = new ParticleEffect(config);
    expect(effect).toBeDefined();
    effect.destroy();
  });

  it('should create smoke particles', () => {
    const config: ParticleConfig = {
      type: 'smoke' as ParticleType,
      x: 100,
      y: 200,
      count: 4,
    };
    const effect = new ParticleEffect(config);
    expect(effect).toBeDefined();
    effect.destroy();
  });

  it('should create bubble particles', () => {
    const config: ParticleConfig = {
      type: 'bubble' as ParticleType,
      x: 100,
      y: 200,
      count: 4,
    };
    const effect = new ParticleEffect(config);
    expect(effect).toBeDefined();
    effect.destroy();
  });

  it('should destroy without error', () => {
    const config: ParticleConfig = {
      type: 'sparkle' as ParticleType,
      x: 100,
      y: 200,
      count: 6,
      color: 0x00ff00,
    };
    const effect = new ParticleEffect(config);
    expect(() => effect.destroy()).not.toThrow();
  });

  it('should not throw on double destroy', () => {
    const effect = new ParticleEffect({
      type: 'sparkle',
      x: 100,
      y: 200,
      count: 10,
    });
    expect(() => effect.destroy()).not.toThrow();
    expect(() => effect.destroy()).not.toThrow();
  });

  it('should destroy all particle types without error', () => {
    const types = ['sparkle', 'confetti', 'smoke', 'bubble'] as const;
    for (const type of types) {
      const effect = new ParticleEffect({ type, x: 0, y: 0, count: 5 });
      expect(() => effect.destroy()).not.toThrow();
    }
  });
});

describe('ParticleEffect count limit', () => {
  it('should define MAX_PARTICLE_COUNT as 30', () => {
    expect(MAX_PARTICLE_COUNT).toBe(30);
  });

  it('should clamp particle count to MAX_PARTICLE_COUNT', () => {
    const config: ParticleConfig = {
      type: 'sparkle' as ParticleType,
      x: 100,
      y: 200,
      count: 100,
    };
    const effect = new ParticleEffect(config);
    expect(effect.children.length).toBe(MAX_PARTICLE_COUNT);
    effect.destroy();
  });

  it('should create particles normally when count <= MAX_PARTICLE_COUNT', () => {
    const config: ParticleConfig = {
      type: 'confetti' as ParticleType,
      x: 100,
      y: 200,
      count: 30,
    };
    const effect = new ParticleEffect(config);
    expect(effect.children.length).toBe(30);
    effect.destroy();
  });

  it('should handle count = 0 gracefully', () => {
    const config: ParticleConfig = {
      type: 'sparkle' as ParticleType,
      x: 100,
      y: 200,
      count: 0,
    };
    const effect = new ParticleEffect(config);
    expect(effect.children.length).toBe(0);
    effect.destroy();
  });

  it('should handle negative count gracefully', () => {
    const config: ParticleConfig = {
      type: 'smoke' as ParticleType,
      x: 100,
      y: 200,
      count: -5,
    };
    const effect = new ParticleEffect(config);
    expect(effect.children.length).toBe(0);
    effect.destroy();
  });

  it('should handle count exactly at MAX_PARTICLE_COUNT', () => {
    const config: ParticleConfig = {
      type: 'bubble' as ParticleType,
      x: 100,
      y: 200,
      count: MAX_PARTICLE_COUNT,
    };
    const effect = new ParticleEffect(config);
    expect(effect.children.length).toBe(MAX_PARTICLE_COUNT);
    effect.destroy();
  });

  it('should handle count = MAX_PARTICLE_COUNT + 1', () => {
    const config: ParticleConfig = {
      type: 'sparkle' as ParticleType,
      x: 100,
      y: 200,
      count: MAX_PARTICLE_COUNT + 1,
    };
    const effect = new ParticleEffect(config);
    expect(effect.children.length).toBe(MAX_PARTICLE_COUNT);
    effect.destroy();
  });
});