import { describe, it, expect, beforeEach } from 'vitest';
import { PauseScreen } from '../../../src/ui/screens/PauseScreen';

describe('PauseScreen', () => {
  let screen: PauseScreen;

  beforeEach(() => {
    screen = new PauseScreen();
  });

  it('should redraw overlay on show with different dimensions', () => {
    screen.show(800, 600);
    expect(screen.visible).toBe(true);
    screen.hide();
    screen.show(1024, 768);
    expect(screen.visible).toBe(true);
  });

  it('should use nullish coalescing for zero values', () => {
    screen.show(0, 0);
    expect((screen as any).currentScreenWidth).toBe(0);
    expect((screen as any).currentScreenHeight).toBe(0);
  });

  it('should update content container position on show', () => {
    screen.show(1024, 768);
    const contentContainer = (screen as any).contentContainer;
    expect(contentContainer.x).toBe(512);
    expect(contentContainer.y).toBe(384);
  });

  it('should have all buttons accessible', () => {
    expect(screen.getContinueButton()).toBeDefined();
    expect(screen.getRestartButton()).toBeDefined();
    expect(screen.getMenuButton()).toBeDefined();
  });

  it('should initialize only once', () => {
    screen.show(800, 600);
    expect(screen.isInitialized()).toBe(true);
    screen.show(1024, 768);
    expect(screen.isInitialized()).toBe(true);
  });

  it('should show and hide correctly', () => {
    screen.show(800, 600);
    expect(screen.visible).toBe(true);
    screen.hide();
    expect(screen.visible).toBe(false);
  });
});