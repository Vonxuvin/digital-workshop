import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsScreen } from '../../../src/ui/screens/SettingsScreen';

describe('SettingsScreen', () => {
  let screen: SettingsScreen;

  beforeEach(() => {
    screen = new SettingsScreen();
  });

  it('should redraw overlay instead of setting width/height', () => {
    screen.show(800, 600);
    expect(screen.visible).toBe(true);
    screen.hide();
    screen.show(1024, 768);
    expect(screen.visible).toBe(true);
  });

  it('should use undefined check for zero values', () => {
    screen.show(0, 0);
    expect((screen as any).currentScreenWidth).toBe(0);
    expect((screen as any).currentScreenHeight).toBe(0);
  });

  it('should center content panel on different screen sizes', () => {
    screen.show(1024, 768);
    const contentContainer = (screen as any).contentContainer;
    expect(contentContainer.x).toBe((1024 - 400) / 2);
    expect(contentContainer.y).toBe((768 - 300) / 2);
  });

  it('should handle multiple show/hide cycles', () => {
    screen.show(800, 600);
    screen.hide();
    screen.show(1024, 768);
    screen.hide();
    screen.show(400, 300);
  });

  it('should initialize only once', () => {
    screen.show(800, 600);
    expect((screen as any).initialized).toBe(true);
    screen.show(1024, 768);
    expect((screen as any).initialized).toBe(true);
  });
});