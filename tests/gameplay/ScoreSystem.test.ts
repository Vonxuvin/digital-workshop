import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScoreSystem, SCORE_CONFIGS } from '../../src/gameplay/ScoreSystem';
import { eventBus } from '../../src/utils/EventBus';

describe('ScoreSystem', () => {
  let ss: ScoreSystem;

  beforeEach(() => {
    ss = new ScoreSystem();
  });

  afterEach(() => {
    ss.reset();
  });

  it('should initialize with zero score', () => {
    expect(ss.getCurrentScore()).toBe(0);
    expect(ss.getChainCount()).toBe(0);
  });

  it('should calculate score for merge value 2', () => {
    ss.addMergeScore(2);
    expect(ss.getCurrentScore()).toBeGreaterThan(0);
  });

  it('should calculate score for merge value 4', () => {
    ss.addMergeScore(4);
    expect(ss.getCurrentScore()).toBeGreaterThan(0);
  });

  it('should calculate score for unknown value', () => {
    ss.addMergeScore(512);
    expect(ss.getCurrentScore()).toBeGreaterThan(0);
  });

  it('should increase chain count on consecutive merges', () => {
    ss.addMergeScore(2);
    expect(ss.getChainCount()).toBe(1);
    ss.addMergeScore(2, true);
    expect(ss.getChainCount()).toBe(2);
  });

  it('should reset chain after timeout', () => {
    ss.addMergeScore(2);
    expect(ss.getChainCount()).toBe(1);
    ss.update(2500);
    expect(ss.getChainCount()).toBe(1);
    ss.update(600);
    expect(ss.getChainCount()).toBe(0);
  });

  it('should emit score:updated event', () => {
    const handler = vi.fn();
    eventBus.on('score:updated', handler);
    ss.addMergeScore(4, false);
    expect(handler).toHaveBeenCalled();
    const data = handler.mock.calls[0][0];
    expect(data.totalScore).toBeGreaterThan(0);
    expect(data.earnedScore).toBeGreaterThan(0);
    eventBus.off('score:updated', handler);
  });

  it('should chain bonus increase score', () => {
    ss.addMergeScore(2);
    const score1 = ss.getCurrentScore();
    ss.addMergeScore(4, true);
    const score2 = ss.getCurrentScore();
    expect(score2).toBeGreaterThan(score1);
  });

  it('should reset correctly', () => {
    ss.addMergeScore(4, false);
    ss.reset();
    expect(ss.getCurrentScore()).toBe(0);
    expect(ss.getChainCount()).toBe(0);
  });

  it('should accumulate scores across multiple merges', () => {
    ss.addMergeScore(2);
    const score1 = ss.getCurrentScore();
    ss.update(2500);
    ss.addMergeScore(4);
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