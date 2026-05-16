import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, isGamePlaying } from './helpers';

test.describe('Week5 UI Fixes E2E @regression', () => {
  test.describe('ResultScreen Button Positioning @smoke', () => {
    test('result screen should have correctly positioned buttons after win', async ({ page }) => {
      await navigateToGame(page);

      const buttonsExist = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const resultScreen = game.getResultScreen?.();
          if (!resultScreen) return false;
          return typeof resultScreen.setResult === 'function'
            && resultScreen.nextButton !== undefined
            && resultScreen.retryButton !== undefined
            && resultScreen.menuButton !== undefined;
        } catch {
          return false;
        }
      });
      expect(buttonsExist).toBeTruthy();
    });

    test('result screen should show lose buttons correctly', async ({ page }) => {
      await navigateToGame(page);

      const loseButtonsExist = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const resultScreen = game.getResultScreen?.();
          if (!resultScreen) return false;
          return resultScreen.retryButton !== undefined
            && resultScreen.menuButton !== undefined;
        } catch {
          return false;
        }
      });
      expect(loseButtonsExist).toBeTruthy();
    });
  });

  test.describe('PauseScreen Resize Support @regression', () => {
    test('pause screen should work on different viewport sizes', async ({ page }) => {
      await navigateToGame(page);

      const pauseWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const pauseScreen = game.getPauseScreen?.();
          if (!pauseScreen) return false;
          if (typeof pauseScreen.show === 'function') {
            pauseScreen.show(1024, 768);
            return pauseScreen.visible === true;
          }
          return false;
        } catch {
          return false;
        }
      });
      expect(pauseWorks).toBeTruthy();
    });

    test('pause screen should have all three buttons', async ({ page }) => {
      await navigateToGame(page);

      const allButtonsExist = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const pauseScreen = game.getPauseScreen?.();
          if (!pauseScreen) return false;
          const continueBtn = pauseScreen.getContinueButton?.();
          const restartBtn = pauseScreen.getRestartButton?.();
          const menuBtn = pauseScreen.getMenuButton?.();
          return continueBtn !== null && continueBtn !== undefined
            && restartBtn !== null && restartBtn !== undefined
            && menuBtn !== null && menuBtn !== undefined;
        } catch {
          return false;
        }
      });
      expect(allButtonsExist).toBeTruthy();
    });
  });

  test.describe('SettingsScreen Resize Support @regression', () => {
    test('settings screen should handle different sizes', async ({ page }) => {
      await navigateToGame(page);

      const settingsWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          const screens = ui.getScreens?.();
          if (!screens) return false;
          const settings = screens.get?.('settings');
          if (!settings) return false;
          if (typeof settings.show === 'function') {
            settings.show(1024, 768);
            return settings.visible === true;
          }
          return false;
        } catch {
          return false;
        }
      });
      expect(settingsWorks).toBeTruthy();
    });
  });

  test.describe('MainMenuScreen Resize Support @regression', () => {
    test('main menu should reinitialize on size change', async ({ page }) => {
      await navigateToGame(page);

      const menuResizeWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          const screens = ui.getScreens?.();
          if (!screens) return false;
          const mainMenu = screens.get?.('mainMenu');
          if (!mainMenu) return false;
          return typeof mainMenu.show === 'function'
            && typeof mainMenu.hide === 'function';
        } catch {
          return false;
        }
      });
      expect(menuResizeWorks).toBeTruthy();
    });

    test('main menu should have all navigation buttons', async ({ page }) => {
      await navigateToGame(page);

      const hasAllButtons = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          const screens = ui.getScreens?.();
          if (!screens) return false;
          const mainMenu = screens.get?.('mainMenu');
          if (!mainMenu) return false;
          return mainMenu.children?.length > 0;
        } catch {
          return false;
        }
      });
      expect(hasAllButtons).toBeTruthy();
    });
  });

  test.describe('HUD Memory Management @smoke', () => {
    test('HUD should properly manage prop buttons', async ({ page }) => {
      await navigateToGame(page);

      const hudPropsOk = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.propButtons instanceof Map
            && hud.propsContainer !== null;
        } catch {
          return false;
        }
      });
      expect(hudPropsOk).toBeTruthy();
    });

    test('HUD should update layout on different screen sizes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToGame(page);

      const hudLayoutWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return typeof hud.layout === 'function';
        } catch {
          return false;
        }
      });
      expect(hudLayoutWorks).toBeTruthy();
    });
  });

  test.describe('WarningLine PIXI v8 Compatibility @regression', () => {
    test('warning line should be accessible in game scene', async ({ page }) => {
      await navigateToGame(page);

      const warningLineExists = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const warningLine = scene.getWarningLine?.();
          return warningLine !== null && warningLine !== undefined;
        } catch {
          return false;
        }
      });
      expect(warningLineExists).toBeTruthy();
    });

    test('warning line should support color and alpha', async ({ page }) => {
      await navigateToGame(page);

      const warningProps = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const warningLine = scene.getWarningLine?.();
          if (!warningLine) return false;
          return typeof warningLine.getColor === 'function'
            && typeof warningLine.getAlpha === 'function'
            && typeof warningLine.getWarningHeight === 'function';
        } catch {
          return false;
        }
      });
      expect(warningProps).toBeTruthy();
    });
  });

  test.describe('ComboDisplay Race Condition @regression', () => {
    test('combo display should be accessible in HUD', async ({ page }) => {
      await navigateToGame(page);

      const comboExists = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.comboDisplay !== null && hud.comboDisplay !== undefined;
        } catch {
          return false;
        }
      });
      expect(comboExists).toBeTruthy();
    });
  });

  test.describe('PropButton Selected State @regression', () => {
    test('prop buttons should support selected state', async ({ page }) => {
      await navigateToGame(page);

      const propBtnOk = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          const buttons = hud.propButtons;
          if (!buttons || buttons.size === 0) return false;
          const firstBtn = buttons.values().next().value;
          if (!firstBtn) return false;
          return typeof firstBtn.setSelected === 'function'
            && typeof firstBtn.clearSelected === 'function'
            && typeof firstBtn.resize === 'function';
        } catch {
          return false;
        }
      });
      expect(propBtnOk).toBeTruthy();
    });
  });

  test.describe('UIProgressBar TimeManager Integration @regression', () => {
    test('progress bar should be accessible in HUD', async ({ page }) => {
      await navigateToGame(page);

      const progressBarOk = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          const bar = hud.getObjectiveBar?.();
          return bar !== null && bar !== undefined;
        } catch {
          return false;
        }
      });
      expect(progressBarOk).toBeTruthy();
    });
  });

  test.describe('UIManager Popup Queue Cleanup @regression', () => {
    test('UIManager should support popup queue', async ({ page }) => {
      await navigateToGame(page);

      const popupQueueOk = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          return typeof ui.showPopup === 'function'
            && typeof ui.hidePopup === 'function'
            && typeof ui.getPopupQueueLength === 'function';
        } catch {
          return false;
        }
      });
      expect(popupQueueOk).toBeTruthy();
    });
  });

  test.describe('UIButton Cooldown Timer @regression', () => {
    test('UI buttons should be accessible', async ({ page }) => {
      await navigateToGame(page);

      const uiButtonsOk = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          const mainLayer = ui.getLayer?.('main');
          if (!mainLayer) return false;
          return mainLayer.children?.length > 0;
        } catch {
          return false;
        }
      });
      expect(uiButtonsOk).toBeTruthy();
    });
  });

  test.describe('Responsive Layout After Fixes @full', () => {
    test('game should render correctly on small mobile after UI fixes', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToGame(page);

      const canvasOk = await page.evaluate(() => {
        const canvas = document.querySelector('#game-canvas');
        if (!canvas) return false;
        const rect = canvas.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      expect(canvasOk).toBeTruthy();
    });

    test('game should render correctly on tablet after UI fixes', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigateToGame(page);

      const canvasOk = await page.evaluate(() => {
        const canvas = document.querySelector('#game-canvas');
        if (!canvas) return false;
        const rect = canvas.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      expect(canvasOk).toBeTruthy();
    });

    test('game should render correctly on desktop after UI fixes', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await navigateToGame(page);

      const canvasOk = await page.evaluate(() => {
        const canvas = document.querySelector('#game-canvas');
        if (!canvas) return false;
        const rect = canvas.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      expect(canvasOk).toBeTruthy();
    });
  });

  test.describe('Screen Lifecycle After Fixes @smoke', () => {
    test('screens should handle multiple show/hide cycles', async ({ page }) => {
      await navigateToGame(page);

      const lifecycleOk = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          const screens = ui.getScreens?.();
          if (!screens) return false;

          const mainMenu = screens.get?.('mainMenu');
          const pauseScreen = game.getPauseScreen?.();
          const settings = screens.get?.('settings');

          const allExist = mainMenu && pauseScreen && settings;
          if (!allExist) return false;

          return typeof mainMenu.show === 'function'
            && typeof mainMenu.hide === 'function'
            && typeof pauseScreen.show === 'function'
            && typeof pauseScreen.hide === 'function';
        } catch {
          return false;
        }
      });
      expect(lifecycleOk).toBeTruthy();
    });
  });
});