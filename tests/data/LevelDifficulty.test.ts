import { describe, it, expect } from 'vitest';
import level06 from '../../src/data/levels/level_06.json';
import level07 from '../../src/data/levels/level_07.json';
import level08 from '../../src/data/levels/level_08.json';
import level05 from '../../src/data/levels/level_05.json';

describe('FIX-11: Level 6-8 difficulty curve', () => {
  it('Level 6 target should be greater than Level 5 target', () => {
    expect(level06.objective.target).toBeGreaterThan(level05.objective.target);
  });

  it('Level 6 should include 16 in available numbers', () => {
    expect(level06.spawn.availableNumbers).toContain(16);
  });

  it('Level 6 stars should follow 60%/80%/100% rule', () => {
    const target = level06.objective.target;
    expect(level06.rewards.stars[0]).toBe(Math.floor(target * 0.6));
    expect(level06.rewards.stars[1]).toBe(Math.floor(target * 0.8));
    expect(level06.rewards.stars[2]).toBe(target);
  });

  it('Level 7 target should be achievable with available numbers', () => {
    expect(level07.spawn.availableNumbers).toContain(16);
    expect(level07.objective.target).toBe(32);
  });

  it('Level 7 rotation speed should be moderate (<=10)', () => {
    const rotateModifier = level07.modifiers.find(m => m.type === 'rotate');
    expect(rotateModifier.rotationSpeed).toBeLessThanOrEqual(10);
  });

  it('Level 7 max angle should be moderate (<=8)', () => {
    const rotateModifier = level07.modifiers.find(m => m.type === 'rotate');
    expect(rotateModifier.maxAngle).toBeLessThanOrEqual(8);
  });

  it('Level 8 should include 16 in available numbers', () => {
    expect(level08.spawn.availableNumbers).toContain(16);
  });

  it('Level 8 stars should follow 60%/80%/100% rule', () => {
    const target = level08.objective.target;
    expect(level08.rewards.stars[0]).toBe(Math.floor(target * 0.6));
    expect(level08.rewards.stars[1]).toBe(Math.floor(target * 0.8));
    expect(level08.rewards.stars[2]).toBe(target);
  });

  it('Level 8 shrink speed should be moderate (<=8)', () => {
    const shrinkModifier = level08.modifiers.find(m => m.type === 'shrink');
    expect(shrinkModifier.shrinkSpeed).toBeLessThanOrEqual(8);
  });

  it('Level 8 trigger interval should be >= 40s', () => {
    const shrinkModifier = level08.modifiers.find(m => m.type === 'shrink');
    expect(shrinkModifier.triggerInterval).toBeGreaterThanOrEqual(40);
  });

  it('Level 6 paddle should have gentle parameters', () => {
    const paddleModifier = level06.modifiers.find(m => m.type === 'paddle');
    expect(paddleModifier.extendDuration).toBeLessThanOrEqual(3);
    expect(paddleModifier.retractDuration).toBeGreaterThanOrEqual(2);
    expect(paddleModifier.extendLength).toBeLessThanOrEqual(80);
    expect(paddleModifier.triggerInterval).toBeGreaterThanOrEqual(10);
  });

  it('difficulty should increase progressively from Level 5 to Level 8', () => {
    expect(level06.objective.target).toBeGreaterThan(level05.objective.target);
    expect(level08.objective.target).toBeGreaterThan(level06.objective.target);
  });
});
