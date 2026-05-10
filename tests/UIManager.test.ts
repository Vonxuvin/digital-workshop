import { describe, it, expect, beforeEach } from 'vitest';
import { UIManager, Screen } from '../src/ui/UIManager';
import { Container } from 'pixi.js';

class MockApp {
  stage = {
    children: [] as Container[],
    addChild(child: Container) {
      this.children.push(child);
    },
  };
  screen = { width: 800, height: 600 };
}

class MockScreen extends Screen {
  public showCalled = false;
  public hideCalled = false;

  show(): void {
    this.showCalled = true;
  }

  hide(): void {
    this.hideCalled = true;
  }
}

describe('UIManager', () => {
  let uiManager: UIManager;
  let app: any;

  beforeEach(() => {
    app = new MockApp();
    uiManager = new UIManager(app as any);
  });

  it('should register screen', () => {
    const screen = new MockScreen();
    expect(() => uiManager.registerScreen('test', screen)).not.toThrow();
  });

  it('should show registered screen', () => {
    const screen = new MockScreen();
    uiManager.registerScreen('test', screen);
    uiManager.showScreen('test');
    expect(screen.showCalled).toBe(true);
    expect(screen.visible).toBe(true);
  });

  it('should hide current screen when showing new one', () => {
    const screen1 = new MockScreen();
    const screen2 = new MockScreen();
    uiManager.registerScreen('screen1', screen1);
    uiManager.registerScreen('screen2', screen2);
    uiManager.showScreen('screen1');
    uiManager.showScreen('screen2');
    expect(screen1.hideCalled).toBe(true);
    expect(screen2.showCalled).toBe(true);
  });

  it('should hide current screen', () => {
    const screen = new MockScreen();
    uiManager.registerScreen('test', screen);
    uiManager.showScreen('test');
    uiManager.hideCurrentScreen();
    expect(screen.hideCalled).toBe(true);
  });

  it('should not throw when showing non-existent screen', () => {
    expect(() => uiManager.showScreen('nonexistent')).not.toThrow();
  });
});
