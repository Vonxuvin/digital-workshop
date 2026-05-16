import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameEffectManager } from '../../src/core/GameEffectManager';
import { Container } from 'pixi.js';

describe('GameEffectManager effect limit (FIX-14)', () => {
  let manager: GameEffectManager;
  let stage: Container;

  beforeEach(() => {
    stage = new Container();
    manager = new GameEffectManager(stage);
  });

  afterEach(() => {
    manager.destroy();
    stage.destroy();
  });

  it('should add merge effect', () => {
    manager.addMergeEffect(100, 200, 4, 8);
    expect(manager.getEffects().length).toBe(1);
  });

  it('should add explosion effect', () => {
    manager.addExplosionEffect(100, 200, 50);
    expect(manager.getEffects().length).toBe(1);
  });

  it('should add freeze effect', () => {
    manager.addFreezeEffect(400, 600);
    expect(manager.getEffects().length).toBe(1);
  });

  it('should not exceed MAX_ACTIVE_EFFECTS (20) for merge effects', () => {
    for (let i = 0; i < 25; i++) {
      manager.addMergeEffect(100 + i * 10, 200, 4, 8);
    }
    expect(manager.getEffects().length).toBeLessThanOrEqual(20);
  });

  it('should not exceed MAX_ACTIVE_EFFECTS for explosion effects', () => {
    for (let i = 0; i < 25; i++) {
      manager.addExplosionEffect(100 + i * 10, 200, 50);
    }
    expect(manager.getEffects().length).toBeLessThanOrEqual(20);
  });

  it('should cleanup destroyed effects', () => {
    manager.addMergeEffect(100, 200, 4, 8);
    manager.addMergeEffect(200, 300, 8, 16);
    expect(manager.getEffects().length).toBe(2);

    const effects = manager.getEffects();
    effects[0].destroy();
    manager.cleanup();
    expect(manager.getEffects().length).toBe(1);
  });

  it('should clear all effects', () => {
    manager.addMergeEffect(100, 200, 4, 8);
    manager.addExplosionEffect(200, 300, 50);
    manager.clearAll();
    expect(manager.getEffects().length).toBe(0);
  });

  it('should remove freeze effect on addFreezeEffect call', () => {
    manager.addFreezeEffect(400, 600);
    manager.addFreezeEffect(400, 600);
    const freezeCount = manager.getEffects().filter((e: any) => e.constructor.name === 'FreezeEffect').length;
    expect(freezeCount).toBeLessThanOrEqual(1);
  });

  it('should provide graphicsPool', () => {
    expect(manager.graphicsPool).toBeDefined();
  });

  it('should destroy cleanly', () => {
    manager.addMergeEffect(100, 200, 4, 8);
    expect(() => manager.destroy()).not.toThrow();
  });
});
