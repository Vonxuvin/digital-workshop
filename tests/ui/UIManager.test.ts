import { describe, it, expect, beforeEach } from 'vitest';
import { UIManager, Screen } from '../../src/ui/UIManager';
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

  describe('Layer system', () => {
    it('should create all 5 layers', () => {
      const layers = ['background', 'main', 'popup', 'overlay', 'toast'];
      for (const name of layers) {
        const layer = uiManager.getLayer(name);
        expect(layer).toBeInstanceOf(Container);
        expect(layer.label).toBe(name);
      }
    });

    it('should add layers to stage in correct order', () => {
      const stageChildren = app.stage.children;
      expect(stageChildren.length).toBe(5);
      expect(stageChildren[0].label).toBe('background');
      expect(stageChildren[1].label).toBe('main');
      expect(stageChildren[2].label).toBe('popup');
      expect(stageChildren[3].label).toBe('overlay');
      expect(stageChildren[4].label).toBe('toast');
    });

    it('should throw when accessing non-existent layer', () => {
      expect(() => uiManager.getLayer('nonexistent')).toThrow();
    });

    it('should return Container for each layer', () => {
      const bg = uiManager.getLayer('background');
      const main = uiManager.getLayer('main');
      expect(bg).not.toBe(main);
    });
  });

  describe('Screen management', () => {
    it('should register screen', () => {
      const screen = new MockScreen();
      expect(() => uiManager.registerScreen('test', screen)).not.toThrow();
    });

    it('should add registered screen to main layer', () => {
      const screen = new MockScreen();
      uiManager.registerScreen('test', screen);
      const mainLayer = uiManager.getLayer('main');
      expect(mainLayer.children).toContain(screen);
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
      expect(screen.visible).toBe(false);
    });

    it('should not throw when showing non-existent screen', () => {
      expect(() => uiManager.showScreen('nonexistent')).not.toThrow();
    });
  });

  describe('Popup queue', () => {
    it('should show popup immediately when no current popup', () => {
      const popup = new MockScreen();
      uiManager.showPopup(popup);
      expect(popup.showCalled).toBe(true);
      expect(popup.visible).toBe(true);
    });

    it('should queue popups when one is already showing', () => {
      const popup1 = new MockScreen();
      const popup2 = new MockScreen();
      uiManager.showPopup(popup1);
      uiManager.showPopup(popup2);
      expect(popup1.showCalled).toBe(true);
      expect(popup2.showCalled).toBe(false);
      expect(uiManager.getPopupQueueLength()).toBe(1);
    });

    it('should show next popup after hiding current', () => {
      const popup1 = new MockScreen();
      const popup2 = new MockScreen();
      uiManager.showPopup(popup1);
      uiManager.showPopup(popup2);
      uiManager.hidePopup();
      expect(popup2.showCalled).toBe(true);
      expect(popup2.visible).toBe(true);
    });

    it('should add popup to popup layer', () => {
      const popup = new MockScreen();
      uiManager.showPopup(popup);
      const popupLayer = uiManager.getLayer('popup');
      expect(popupLayer.children).toContain(popup);
    });

    it('should remove popup from popup layer after hiding', () => {
      const popup = new MockScreen();
      uiManager.showPopup(popup);
      const popupLayer = uiManager.getLayer('popup');
      uiManager.hidePopup();
      expect(popupLayer.children).not.toContain(popup);
    });

    it('should clear queue when all popups are hidden', () => {
      const popup1 = new MockScreen();
      const popup2 = new MockScreen();
      uiManager.showPopup(popup1);
      uiManager.showPopup(popup2);
      uiManager.hidePopup();
      uiManager.hidePopup();
      expect(uiManager.getPopupQueueLength()).toBe(0);
    });
  });

  describe('Modal overlay', () => {
    it('should show modal overlay when popup is shown', () => {
      const popup = new MockScreen();
      uiManager.showPopup(popup);
      expect(uiManager.isModalOverlayVisible()).toBe(true);
    });

    it('should hide modal overlay when all popups are closed', () => {
      const popup = new MockScreen();
      uiManager.showPopup(popup);
      uiManager.hidePopup();
      expect(uiManager.isModalOverlayVisible()).toBe(false);
    });

    it('should keep modal overlay visible when popup is still queued', () => {
      const popup1 = new MockScreen();
      const popup2 = new MockScreen();
      uiManager.showPopup(popup1);
      uiManager.showPopup(popup2);
      uiManager.hidePopup();
      expect(uiManager.isModalOverlayVisible()).toBe(true);
    });

    it('should not show modal overlay without popups', () => {
      expect(uiManager.isModalOverlayVisible()).toBe(false);
    });
  });

  describe('getScreens', () => {
    it('should return screens map', () => {
      const screens = uiManager.getScreens();
      expect(screens).toBeInstanceOf(Map);
      expect(screens.size).toBe(0);
    });

    it('should include registered screens', () => {
      const screen = new MockScreen();
      uiManager.registerScreen('test', screen);
      const screens = uiManager.getScreens();
      expect(screens.has('test')).toBe(true);
      expect(screens.get('test')).toBe(screen);
    });
  });

  describe('handleResize', () => {
    it('should handle resize without error', () => {
      expect(() => uiManager.handleResize(1024, 768)).not.toThrow();
    });

    it('should handle resize with current screen', () => {
      const screen = new MockScreen();
      uiManager.registerScreen('test', screen);
      uiManager.showScreen('test');
      expect(() => uiManager.handleResize(400, 300)).not.toThrow();
    });

    it('should handle resize with popup visible', () => {
      const popup = new MockScreen();
      uiManager.showPopup(popup);
      expect(() => uiManager.handleResize(1024, 768)).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('should destroy without error', () => {
      const screen = new MockScreen();
      uiManager.registerScreen('test', screen);
      expect(() => uiManager.destroy()).not.toThrow();
    });

    it('should destroy with popup active', () => {
      const popup = new MockScreen();
      uiManager.showPopup(popup);
      expect(() => uiManager.destroy()).not.toThrow();
    });

    it('should destroy with queued popups', () => {
      const popup1 = new MockScreen();
      const popup2 = new MockScreen();
      uiManager.showPopup(popup1);
      uiManager.showPopup(popup2);
      expect(() => uiManager.destroy()).not.toThrow();
    });
  });
});
