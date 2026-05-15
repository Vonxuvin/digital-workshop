import { describe, it, expect } from 'vitest';
import { ParticleEffect, ParticleConfig, ParticleType } from '../../../src/ui/effects/ParticleEffect';

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
});