import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScoreSystem, SCORE_CONFIGS } from '../src/gameplay/ScoreSystem';
import { eventBus } from '../src/utils/EventBus';

describe('ScoreSystem', () => {
  let scoreSystem: ScoreSystem;

  beforeEach(() => {
    vi.useFakeTimers();
    scoreSystem = new ScoreSystem();
  });

  it('should initialize with zero score', () => {
    expect(scoreSystem.getCurrentScore()).toBe(0);
    expect(scoreSystem.getChainCount()).toBe(0);
  });

  it('should calculate score for merge', () => {
    eventBus.emit('block:merged', { newValue: 4, chainCount: 1 });
    expect(scoreSystem.getCurrentScore()).toBeGreaterThan(0);
  });

  it('should chain multiplier correctly', () => {
    eventBus.emit('block:merged', { newValue: 2, chainCount: 1 });
    const scoreAfterFirst = scoreSystem.getCurrentScore();

    eventBus.emit('block:merged', { newValue: 2, chainCount: 2 });
    const scoreAfterSecond = scoreSystem.getCurrentScore();

    expect(scoreSystem.getChainCount()).toBe(2);
    expect(scoreAfterSecond).toBeGreaterThan(scoreAfterFirst);
  });

  it('should reset correctly', () => {
    eventBus.emit('block:merged', { newValue: 4, chainCount: 1 });
    scoreSystem.reset();
    expect(scoreSystem.getCurrentScore()).toBe(0);
    expect(scoreSystem.getChainCount()).toBe(0);
  });
});

describe('SCORE_CONFIGS', () => {
  it('should have configs for standard values', () => {
    const values = [2, 4, 8, 16, 32, 64, 128, 256];
    values.forEach(v => {
      expect(SCORE_CONFIGS[v]).toBeDefined();
      expect(SCORE_CONFIGS[v].baseScore).toBeGreaterThan(0);
      expect(SCORE_CONFIGS[v].chainMultiplier).toBeGreaterThanOrEqual(1.0);
    });
  });
});
