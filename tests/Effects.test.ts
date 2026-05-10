import { describe, it, expect } from 'vitest';
import { ParticleEffect, ParticleConfig, ParticleType } from '../src/ui/effects/ParticleEffect';
import { MergeEffect, MergeEffectOptions } from '../src/ui/effects/MergeEffect';

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

describe('MergeEffect', () => {
  it('should create merge effect', () => {
    const options: MergeEffectOptions = {
      x: 200,
      y: 300,
      oldNumber: 4,
      newNumber: 8,
    };
    const effect = new MergeEffect(options);
    expect(effect).toBeDefined();
    effect.destroy();
  });

  it('should create with onComplete callback', () => {
    const options: MergeEffectOptions = {
      x: 200,
      y: 300,
      oldNumber: 2,
      newNumber: 4,
    };
    let completed = false;
    const effect = new MergeEffect(options, () => {
      completed = true;
    });
    expect(effect).toBeDefined();
    effect.destroy();
  });

  it('should destroy without error', () => {
    const options: MergeEffectOptions = {
      x: 200,
      y: 300,
      oldNumber: 8,
      newNumber: 16,
    };
    const effect = new MergeEffect(options);
    expect(() => effect.destroy()).not.toThrow();
  });
});
