import { describe, it, expect, beforeEach, vi } from 'vitest';
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

class MockScreenWithResize extends MockScreen {
  public resizeCalled = false;
  public resizeWidth = 0;
  public resizeHeight = 0;

  resize(width: number, height: number): void {
    this.resizeCalled = true;
    this.resizeWidth = width;
    this.resizeHeight = height;
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

  describe('handleResize', () => {
    it('should call resize on currentScreen when it has a resize method', () => {
      const screen = new MockScreenWithResize();
      uiManager.registerScreen('test', screen);
      uiManager.showScreen('test');
      uiManager.handleResize(1024, 768);
      expect(screen.resizeCalled).toBe(true);
      expect(screen.resizeWidth).toBe(1024);
      expect(screen.resizeHeight).toBe(768);
    });

    it('should not throw when currentScreen does not have a resize method', () => {
      const screen = new MockScreen();
      uiManager.registerScreen('test', screen);
      uiManager.showScreen('test');
      expect(() => uiManager.handleResize(1024, 768)).not.toThrow();
    });

    it('should redraw modal overlay when it is visible', () => {
      const popup = new MockScreen();
      uiManager.showPopup(popup);
      const overlay = uiManager.getLayer('overlay');
      const modalOverlay = overlay.children[0] as any;
      expect(modalOverlay._drawn).toBe(true);
      uiManager.handleResize(1024, 768);
      expect(modalOverlay._drawn).toBe(true);
    });

    it('should not redraw modal overlay when it is not visible', () => {
      const overlay = uiManager.getLayer('overlay');
      const modalOverlay = overlay.children[0] as any;
      expect(modalOverlay._drawn).toBeFalsy();
      uiManager.handleResize(1024, 768);
      expect(modalOverlay._drawn).toBe(false);
    });
  });

  describe('ensureModalOverlayDrawn', () => {
    it('should only draw once (check _drawn flag)', () => {
      const popup1 = new MockScreen();
      uiManager.showPopup(popup1);
      const overlay = uiManager.getLayer('overlay');
      const modalOverlay = overlay.children[0] as any;
      expect(modalOverlay._drawn).toBe(true);
      const popup2 = new MockScreen();
      uiManager.showPopup(popup2);
      expect(modalOverlay._drawn).toBe(true);
    });

    it('should draw the overlay rect', () => {
      const popup = new MockScreen();
      uiManager.showPopup(popup);
      const overlay = uiManager.getLayer('overlay');
      const modalOverlay = overlay.children[0] as any;
      expect(modalOverlay._drawn).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should destroy currentPopup when set', () => {
      const popup = new MockScreen();
      const destroySpy = vi.spyOn(popup, 'destroy');
      uiManager.showPopup(popup);
      uiManager.destroy();
      expect(destroySpy).toHaveBeenCalled();
    });

    it('should destroy all registered screens', () => {
      const screen1 = new MockScreen();
      const screen2 = new MockScreen();
      const destroySpy1 = vi.spyOn(screen1, 'destroy');
      const destroySpy2 = vi.spyOn(screen2, 'destroy');
      uiManager.registerScreen('screen1', screen1);
      uiManager.registerScreen('screen2', screen2);
      uiManager.destroy();
      expect(destroySpy1).toHaveBeenCalled();
      expect(destroySpy2).toHaveBeenCalled();
    });
  });

  describe('getScreens', () => {
    it('should return the screens map', () => {
      const screen = new MockScreen();
      uiManager.registerScreen('test', screen);
      const screens = uiManager.getScreens();
      expect(screens).toBeInstanceOf(Map);
      expect(screens.get('test')).toBe(screen);
    });
  });

  describe('hidePopup', () => {
    it('should do nothing when no currentPopup', () => {
      expect(() => uiManager.hidePopup()).not.toThrow();
    });
  });

  describe('hideCurrentScreen', () => {
    it('should do nothing when no currentScreen', () => {
      expect(() => uiManager.hideCurrentScreen()).not.toThrow();
    });
  });

  describe('showScreen', () => {
    it('should properly set currentScreen', () => {
      const screen = new MockScreen();
      uiManager.registerScreen('test', screen);
      uiManager.showScreen('test');
      expect(screen.visible).toBe(true);
      expect(screen.showCalled).toBe(true);
      uiManager.hideCurrentScreen();
      expect(screen.hideCalled).toBe(true);
      expect(screen.visible).toBe(false);
    });
  });

  describe('showNextPopup', () => {
    it('should do nothing with empty queue', () => {
      expect(() => (uiManager as any).showNextPopup()).not.toThrow();
    });
  });
});
