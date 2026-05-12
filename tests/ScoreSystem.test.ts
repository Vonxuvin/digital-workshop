import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScoreSystem, SCORE_CONFIGS } from '../src/gameplay/ScoreSystem';
import { eventBus } from '../src/utils/EventBus';
import { AnimationManager } from '../src/utils/AnimationManager';

describe('ScoreSystem', () => {
  let ss: ScoreSystem;
  let animMgr: AnimationManager;

  beforeEach(() => {
    animMgr = new AnimationManager();
    AnimationManager.setInstance(animMgr);
    ss = new ScoreSystem();
  });

  afterEach(() => {
    ss.reset();
    AnimationManager.resetInstance();
  });

  it('should initialize with zero score', () => {
    expect(ss.getCurrentScore()).toBe(0);
    expect(ss.getChainCount()).toBe(0);
  });

  it('should calculate score for merge value 2', () => {
    eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
    expect(ss.getCurrentScore()).toBeGreaterThan(0);
  });

  it('should calculate score for merge value 4', () => {
    eventBus.emit('block:merged', { newValue: 4, chainCount: 1 });
    expect(ss.getCurrentScore()).toBeGreaterThan(0);
  });

  it('should calculate score for unknown value', () => {
    eventBus.emit('block:merged', { newValue: 512, chainCount: 1 });
    expect(ss.getCurrentScore()).toBeGreaterThan(0);
  });

  it('should increase chain count on consecutive merges', () => {
    eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
    expect(ss.getChainCount()).toBe(1);
    eventBus.emit('block:merged', { newValue: 2, chainCount: 2 });
    expect(ss.getChainCount()).toBe(2);
  });

  it('should reset chain after timeout', () => {
    eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
    expect(ss.getChainCount()).toBe(1);
    animMgr.update(2500);
    expect(ss.getChainCount()).toBe(0);
  });

  it('should emit score:updated event', () => {
    const handler = vi.fn();
    eventBus.on('score:updated', handler);
    eventBus.emit('block:merged', { newValue: 4, chainCount: 1 });
    expect(handler).toHaveBeenCalled();
    const data = handler.mock.calls[0][0];
    expect(data.totalScore).toBeGreaterThan(0);
    expect(data.earnedScore).toBeGreaterThan(0);
    eventBus.off('score:updated', handler);
  });

  it('should chain bonus increase score', () => {
    eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
    const score1 = ss.getCurrentScore();
    eventBus.emit('block:merged', { newValue: 4, chainCount: 2 });
    const score2 = ss.getCurrentScore();
    expect(score2).toBeGreaterThan(score1);
  });

  it('should reset correctly', () => {
    eventBus.emit('block:merged', { newValue: 4, chainCount: 1 });
    ss.reset();
    expect(ss.getCurrentScore()).toBe(0);
    expect(ss.getChainCount()).toBe(0);
  });

  it('should accumulate scores across multiple merges', () => {
    eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
    const score1 = ss.getCurrentScore();
    animMgr.update(2500);
    eventBus.emit('block:merged', { newValue: 4, chainCount: 1 });
    const score2 = ss.getCurrentScore();
    expect(score2).toBeGreaterThan(score1);
  });
});

describe('SCORE_CONFIGS', () => {
  it('should have configs for standard values', () => {
    [2, 4, 8, 16, 32, 64, 128, 256].forEach(v => {
      expect(SCORE_CONFIGS[v]).toBeDefined();
      expect(SCORE_CONFIGS[v].baseScore).toBeGreaterThan(0);
      expect(SCORE_CONFIGS[v].chainMultiplier).toBeGreaterThanOrEqual(1.0);
    });
  });

  it('should have increasing base scores', () => {
    const values = [2, 4, 8, 16, 32, 64, 128, 256];
    for (let i = 1; i < values.length; i++) {
      expect(SCORE_CONFIGS[values[i]].baseScore).toBeGreaterThan(
        SCORE_CONFIGS[values[i - 1]].baseScore
      );
    }
  });

  it('should have increasing chain multipliers', () => {
    const values = [2, 4, 8, 16, 32, 64, 128, 256];
    for (let i = 1; i < values.length; i++) {
      expect(SCORE_CONFIGS[values[i]].chainMultiplier).toBeGreaterThanOrEqual(
        SCORE_CONFIGS[values[i - 1]].chainMultiplier
      );
    }
  });
});
