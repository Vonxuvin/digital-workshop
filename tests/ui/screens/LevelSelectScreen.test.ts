import { describe, it, expect, beforeEach } from 'vitest';
import { LevelSelectScreen } from '../../../src/ui/screens/LevelSelectScreen';
import { SaveManager } from '../../../src/core/SaveManager';
import { LevelLoader } from '../../../src/core/LevelLoader';

describe('LevelSelectScreen', () => {
  let screen: LevelSelectScreen;

  beforeEach(() => {
    const saveManager = new SaveManager();
    const levelLoader = new LevelLoader();
    screen = new LevelSelectScreen(
      () => {},
      () => {},
      saveManager,
      levelLoader,
    );
  });

  it('should create without error', () => {
    expect(screen).toBeDefined();
  });

  it('should show and hide without error', () => {
    screen.onShow();
    screen.onHide();
  });

  it('should have container defined', () => {
    screen.onShow();
    expect(screen.container).toBeDefined();
  });

  it('should have scrollContainer defined', () => {
    screen.onShow();
    expect(screen.scrollContainer).toBeDefined();
  });

  it('should handle layout', () => {
    expect(() => screen.layout(800, 600)).not.toThrow();
  });

  it('should handle show with dimensions', () => {
    expect(() => screen.show(800, 600)).not.toThrow();
  });

  it('should handle update without error', () => {
    expect(() => screen.update()).not.toThrow();
  });

  it('should handle updateLevelProgress', () => {
    screen.onShow();
    expect(() => screen.updateLevelProgress(1, 3)).not.toThrow();
  });

  it('should handle updateLevelProgress for non-existent level', () => {
    screen.onShow();
    expect(() => screen.updateLevelProgress(999, 5)).not.toThrow();
  });

  it('should handle destroy', () => {
    screen.onShow();
    expect(() => screen.destroy()).not.toThrow();
  });

  it('should handle hide correctly', () => {
    screen.onShow();
    expect(() => screen.hide()).not.toThrow();
  });

  it('should handle layout with different dimensions', () => {
    screen.onShow();
    expect(() => screen.layout(400, 300)).not.toThrow();
    expect(() => screen.layout(1024, 768)).not.toThrow();
  });

  it('should handle multiple show/hide cycles', () => {
    screen.show(800, 600);
    screen.hide();
    screen.show(800, 600);
    screen.hide();
  });

  it('should handle onShow reloads level data', () => {
    screen.show(800, 600);
    screen.hide();
    expect(() => screen.onShow()).not.toThrow();
  });
});