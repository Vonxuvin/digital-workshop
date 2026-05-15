import { describe, it, expect } from 'vitest';
import { MergeEffect, MergeEffectOptions } from '../../../src/ui/effects/MergeEffect';

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