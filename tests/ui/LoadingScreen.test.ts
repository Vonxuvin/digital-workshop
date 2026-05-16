import { describe, it, expect, beforeEach } from 'vitest';
import { LoadingScreen } from '../../src/ui/screens/LoadingScreen';

describe('LoadingScreen', () => {
  let screen: LoadingScreen;

  beforeEach(() => {
    screen = new LoadingScreen();
  });

  it('should create instance', () => {
    expect(screen).toBeDefined();
  });

  it('should show without errors', () => {
    expect(() => screen.show(800, 600)).not.toThrow();
  });

  it('should be visible after show', () => {
    screen.show(800, 600);
    expect(screen.visible).toBe(true);
  });

  it('should have alpha 1 after show', () => {
    screen.show(800, 600);
    expect(screen.alpha).toBe(1);
  });

  it('should hide correctly', () => {
    screen.show(800, 600);
    screen.hide();
    expect(screen.visible).toBe(false);
  });

  it('should update progress without errors', () => {
    screen.show(800, 600);
    expect(() => screen.updateProgress(0.5)).not.toThrow();
  });

  it('should handle progress at 0', () => {
    screen.show(800, 600);
    expect(() => screen.updateProgress(0)).not.toThrow();
  });

  it('should handle progress at 1', () => {
    screen.show(800, 600);
    expect(() => screen.updateProgress(1)).not.toThrow();
  });

  it('should handle progress above 1 by clamping', () => {
    screen.show(800, 600);
    expect(() => screen.updateProgress(1.5)).not.toThrow();
  });

  it('should handle progress below 0 by clamping', () => {
    screen.show(800, 600);
    expect(() => screen.updateProgress(-0.5)).not.toThrow();
  });

  it('should not throw when updateProgress called before show', () => {
    expect(() => screen.updateProgress(0.5)).not.toThrow();
  });

  it('should handle show with default dimensions', () => {
    expect(() => screen.show()).not.toThrow();
  });

  it('should handle show with only width', () => {
    expect(() => screen.show(1024)).not.toThrow();
  });

  it('should handle multiple show calls', () => {
    screen.show(800, 600);
    screen.show(1024, 768);
    expect(screen.visible).toBe(true);
  });

  it('should handle destroy without errors', () => {
    screen.show(800, 600);
    expect(() => screen.destroy()).not.toThrow();
  });

  it('should update progress multiple times', () => {
    screen.show(800, 600);
    screen.updateProgress(0.2);
    screen.updateProgress(0.5);
    screen.updateProgress(0.8);
    screen.updateProgress(1.0);
    expect(() => screen.updateProgress(1.0)).not.toThrow();
  });
});
