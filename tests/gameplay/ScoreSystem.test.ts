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

it('should apply lucky multiplier to score calculation', () => {
    ss.addMergeScore(2);
    const scoreWithoutLucky = ss.getCurrentScore();
    ss.reset();
    ss.setLuckyMultiplier(2);
    ss.addMergeScore(2);
    const scoreWithLucky = ss.getCurrentScore();
    expect(scoreWithLucky).toBe(scoreWithoutLucky * 2);
  });

  it('should set and apply lucky multiplier', () => {
    ss.setLuckyMultiplier(2);
    ss.addMergeScore(2);
    const score = ss.getCurrentScore();
    ss.setLuckyMultiplier(1);
    ss.addMergeScore(2);
    expect(ss.getCurrentScore()).toBeGreaterThan(score);
  });

  it('should return baseScore of 1 for unknown value <= 2 via calculateScore fallback', () => {
    ss.addMergeScore(1);
    expect(ss.getCurrentScore()).toBe(1);
  });

  it('should return baseScore of 1 for value with non-finite log2 tier', () => {
    ss.addMergeScore(0);
    expect(ss.getCurrentScore()).toBe(1);
  });

  it('should return baseScore of 1 for negative value via calculateScore fallback', () => {
    ss.addMergeScore(-1);
    expect(ss.getCurrentScore()).toBe(1);
  });

  it('should calculate score for unknown value using log2 fallback', () => {
    ss.addMergeScore(6);
    expect(ss.getCurrentScore()).toBe(3);
  });

  it('should use calculateScore fallback for value 3 not in SCORE_CONFIGS', () => {
    ss.addMergeScore(3);
    expect(ss.getCurrentScore()).toBe(2);
  });

  it('should return same value from getScore, getTotalScore, and getCurrentScore', () => {
    ss.addMergeScore(4);
    const score = ss.getCurrentScore();
    expect(ss.getScore()).toBe(score);
    expect(ss.getTotalScore()).toBe(score);
  });

  it('should return chainCount from getCombo', () => {
    ss.addMergeScore(2);
    ss.addMergeScore(4, true);
    expect(ss.getCombo()).toBe(2);
    expect(ss.getCombo()).toBe(ss.getChainCount());
  });

  it('should calculate combo multiplier correctly', () => {
    expect(ss.getComboMultiplier()).toBe(1);
    ss.addMergeScore(2);
    expect(ss.getComboMultiplier()).toBe(1.5);
    ss.addMergeScore(4, true);
    expect(ss.getComboMultiplier()).toBe(2);
  });

  it('should reset combo and emit score:chainEnded', () => {
    const handler = vi.fn();
    eventBus.on('score:chainEnded', handler);
    ss.addMergeScore(2);
    ss.addMergeScore(4, true);
    expect(ss.getChainCount()).toBe(2);
    ss.resetCombo();
    expect(ss.getChainCount()).toBe(0);
    expect(handler).toHaveBeenCalled();
    eventBus.off('score:chainEnded', handler);
  });

  it('should track max chain count across merges', () => {
    ss.addMergeScore(2);
    ss.addMergeScore(4, true);
    ss.addMergeScore(8, true);
    expect(ss.getMaxChainCount()).toBe(3);
    ss.update(4000);
    expect(ss.getChainCount()).toBe(0);
    expect(ss.getMaxChainCount()).toBe(3);
    ss.addMergeScore(2);
    expect(ss.getMaxChainCount()).toBe(3);
  });

  it('should calculate stars for level correctly', () => {
    expect(ss.getStarsForLevel(500, [100, 300, 500])).toBe(3);
    expect(ss.getStarsForLevel(200, [100, 300, 500])).toBe(1);
    expect(ss.getStarsForLevel(50, [100, 300, 500])).toBe(0);
  });

  it('should return 0 stars for empty threshold array', () => {
    expect(ss.getStarsForLevel(500, [])).toBe(0);
  });

  it('should award star when score equals threshold exactly', () => {
    expect(ss.getStarsForLevel(100, [100, 300, 500])).toBe(1);
    expect(ss.getStarsForLevel(300, [100, 300, 500])).toBe(2);
  });

  it('should reset chainTimer on destroy', () => {
    ss.addMergeScore(2);
    expect(ss.getChainCount()).toBe(1);
    ss.destroy();
    const handler = vi.fn();
    eventBus.on('score:chainEnded', handler);
    ss.update(5000);
    expect(handler).not.toHaveBeenCalled();
    eventBus.off('score:chainEnded', handler);
  });

  it('should emit score:chainEnded when chainTimer reaches exactly 0', () => {
    const handler = vi.fn();
    eventBus.on('score:chainEnded', handler);
    ss.addMergeScore(2);
    ss.update(3000);
    expect(handler).toHaveBeenCalled();
    expect(ss.getChainCount()).toBe(0);
    eventBus.off('score:chainEnded', handler);
  });

  it('should cap chain bonus at maxChainBonus', () => {
    for (let i = 0; i < 12; i++) {
      ss.addMergeScore(2, true);
    }
    expect(ss.getComboMultiplier()).toBe(6);
  });

  it('should destroy without error', () => {
    ss.addMergeScore(2);
    expect(() => ss.destroy()).not.toThrow();
  });

  it('should handle custom ScoreConfig', () => {
    const customSS = new (ScoreSystem as any)({ baseMultiplier: 2.0 });
    customSS.addMergeScore(2);
    expect(customSS.getCurrentScore()).toBeGreaterThan(0);
    customSS.reset();
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