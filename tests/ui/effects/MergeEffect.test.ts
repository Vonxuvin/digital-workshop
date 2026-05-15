import { describe, it, expect, vi } from 'vitest';
import { MergeEffect, MergeEffectOptions } from '../../../src/ui/effects/MergeEffect';
import { GraphicsPool } from '../../../src/utils/GraphicsPool';

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

  it('should create with GraphicsPool', () => {
    const pool = new GraphicsPool();
    const options: MergeEffectOptions = {
      x: 200,
      y: 300,
      oldNumber: 2,
      newNumber: 4,
    };
    const effect = new MergeEffect(options, undefined, pool);
    expect(effect).toBeDefined();
    effect.destroy();
  });

  it('should create with both onComplete and GraphicsPool', () => {
    const pool = new GraphicsPool();
    const options: MergeEffectOptions = {
      x: 200,
      y: 300,
      oldNumber: 4,
      newNumber: 8,
    };
    let completed = false;
    const effect = new MergeEffect(options, () => { completed = true; }, pool);
    expect(effect).toBeDefined();
    effect.destroy();
  });

  it('should handle destroy with GraphicsPool', () => {
    const pool = new GraphicsPool();
    const options: MergeEffectOptions = {
      x: 200,
      y: 300,
      oldNumber: 2,
      newNumber: 4,
    };
    const effect = new MergeEffect(options, undefined, pool);
    effect.destroy();
    expect(effect.allComplete).toBe(false);
  });

  it('should handle double destroy', () => {
    const options: MergeEffectOptions = {
      x: 200,
      y: 300,
      oldNumber: 2,
      newNumber: 4,
    };
    const effect = new MergeEffect(options);
    effect.destroy();
    expect(() => effect.destroy()).not.toThrow();
  });

  it('should create effect with different number combinations', () => {
    const combinations = [
      { old: 2, new: 4 },
      { old: 4, new: 8 },
      { old: 8, new: 16 },
      { old: 16, new: 32 },
      { old: 32, new: 64 },
      { old: 64, new: 128 },
      { old: 128, new: 256 },
      { old: 256, new: 512 },
      { old: 512, new: 1024 },
      { old: 1024, new: 2048 },
    ];
    for (const combo of combinations) {
      const effect = new MergeEffect({
        x: 200,
        y: 300,
        oldNumber: combo.old,
        newNumber: combo.new,
      });
      expect(effect).toBeDefined();
      effect.destroy();
    }
  });
});