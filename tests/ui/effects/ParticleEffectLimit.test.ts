import { describe, it, expect } from 'vitest';
import { ParticleEffect, ParticleConfig, ParticleType, MAX_PARTICLE_COUNT } from '../../../src/ui/effects/ParticleEffect';

describe('ParticleEffect count limit (FIX-14)', () => {
  it('should define MAX_PARTICLE_COUNT as 50', () => {
    expect(MAX_PARTICLE_COUNT).toBe(50);
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
