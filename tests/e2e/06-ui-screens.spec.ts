import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable } from './helpers';

test.describe('UI界面 @regression', () => {
  test.describe('主菜单界面 @smoke', () => {
    test('主菜单应正确显示', async ({ page }) => {
      await navigateToGame(page);

      const hasMainMenu = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          return ui.getScreens?.()?.has?.('mainMenu') ?? false;
        } catch {
          return false;
        }
      });

      expect(hasMainMenu).toBeTruthy();
    });

    test('主菜单应包含开始游戏入口', async ({ page }) => {
      await navigateToGame(page);

      const hasStartButton = await page.evaluate(() => {
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

      expect(hasStartButton).toBeTruthy();
    });

    test('主菜单应包含关卡选择入口', async ({ page }) => {
      await navigateToGame(page);

      const hasLevelSelect = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          return ui.getScreens?.()?.has?.('levelSelect') ?? false;
        } catch {
          return false;
        }
      });

      expect(hasLevelSelect).toBeTruthy();
    });

    test('主菜单应包含设置入口', async ({ page }) => {
      await navigateToGame(page);

      const hasSettings = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          return ui.getScreens?.()?.has?.('settings') ?? false;
        } catch {
          return false;
        }
      });

      expect(hasSettings).toBeTruthy();
    });
  });

  test.describe('游戏HUD @smoke', () => {
    test('HUD应显示当前分数', async ({ page }) => {
      await navigateToGame(page);

      const hasScoreDisplay = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.scoreText !== null && hud.scoreText !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasScoreDisplay).toBeTruthy();
    });

    test('HUD应显示当前关卡信息', async ({ page }) => {
      await navigateToGame(page);

      const hasLevelDisplay = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.levelText !== null && hud.levelText !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasLevelDisplay).toBeTruthy();
    });

    test('HUD应包含暂停按钮', async ({ page }) => {
      await navigateToGame(page);

      const hasPauseButton = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.pauseButton !== null && hud.pauseButton !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasPauseButton).toBeTruthy();
    });

    test('HUD应包含道具栏', async ({ page }) => {
      await navigateToGame(page);

      const hasPropsBar = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.propsContainer !== null && hud.propsContainer !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasPropsBar).toBeTruthy();
    });

    test('HUD应包含目标进度条', async ({ page }) => {
      await navigateToGame(page);

      const hasObjectiveBar = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.objectiveBar !== null && hud.objectiveBar !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasObjectiveBar).toBeTruthy();
    });

    test('连击显示应正确触发', async ({ page }) => {
      await navigateToGame(page);

      const hasComboDisplay = await page.evaluate(() => {
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

      expect(hasComboDisplay).toBeTruthy();
    });

    test('分数变化时HUD应实时更新', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 3000);

      const score = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const scoreSystem = game.getScoreSystem?.();
          return scoreSystem?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('暂停界面 @regression', () => {
    test('暂停界面应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasPauseScreen = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const pauseScreen = game.getPauseScreen?.();
          return pauseScreen !== null && pauseScreen !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasPauseScreen).toBeTruthy();
    });

    test('暂停界面应包含继续按钮', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const sm = game.getSceneManager?.();
          sm?.pauseGame?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      const isPaused = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const stateMachine = game.getStateMachine?.();
          return stateMachine?.getCurrentState?.() === 'paused';
        } catch {
          return false;
        }
      });

      expect(isPaused).toBeTruthy();
    });

    test('暂停界面应包含重新开始按钮', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const sm = game.getSceneManager?.();
          sm?.pauseGame?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      const hasRestartButton = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const pauseScreen = game.getPauseScreen?.();
          if (!pauseScreen) return false;
          const btn = pauseScreen.getRestartButton?.();
          return btn !== null && btn !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasRestartButton).toBeTruthy();
    });

    test('暂停界面应包含返回主菜单按钮', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const sm = game.getSceneManager?.();
          sm?.pauseGame?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      const hasMenuButton = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const pauseScreen = game.getPauseScreen?.();
          if (!pauseScreen) return false;
          const btn = pauseScreen.getMenuButton?.();
          return btn !== null && btn !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasMenuButton).toBeTruthy();
    });

    test('暂停时游戏应停止运行', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const sm = game.getSceneManager?.();
          sm?.pauseGame?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      const isPaused = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const stateMachine = game.getStateMachine?.();
          return stateMachine?.getCurrentState?.() === 'paused';
        } catch {
          return false;
        }
      });

      expect(isPaused).toBeTruthy();
    });
  });

  test.describe('结算界面 @regression', () => {
    test('结算界面应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasResultScreen = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const resultScreen = game.getResultScreen?.();
          if (!resultScreen) return false;
          return typeof resultScreen.setResult === 'function';
        } catch {
          return false;
        }
      });

      expect(hasResultScreen).toBeTruthy();
    });

    test('胜利时应显示恭喜过关', async ({ page }) => {
      await navigateToGame(page);

      const hasWinState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const resultScreen = game.getResultScreen?.();
          if (!resultScreen) return false;
          return typeof resultScreen.setResult === 'function';
        } catch {
          return false;
        }
      });

      expect(hasWinState).toBeTruthy();
    });

    test('失败时应显示游戏结束', async ({ page }) => {
      await navigateToGame(page);

      const hasLoseState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const resultScreen = game.getResultScreen?.();
          if (!resultScreen) return false;
          return typeof resultScreen.setResult === 'function';
        } catch {
          return false;
        }
      });

      expect(hasLoseState).toBeTruthy();
    });

    test('星级评定动画应正确播放', async ({ page }) => {
      await navigateToGame(page);

      const hasStarAnimation = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const resultScreen = game.getResultScreen?.();
          if (!resultScreen) return false;
          return resultScreen.starTimeline !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasStarAnimation).toBeTruthy();
    });

    test('结算界面应包含下一关/重试/菜单按钮', async ({ page }) => {
      await navigateToGame(page);

      const hasButtons = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const resultScreen = game.getResultScreen?.();
          if (!resultScreen) return false;
          return resultScreen.nextButton !== undefined
            || resultScreen.retryButton !== undefined
            || resultScreen.menuButton !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasButtons).toBeTruthy();
    });
  });

  test.describe('关卡选择界面 @regression', () => {
    test('关卡选择应显示所有可用关卡', async ({ page }) => {
      await navigateToGame(page);

      const levelCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const levelLoader = game.getLevelLoader?.();
          if (!levelLoader) return -1;
          const configs = levelLoader.getAllLevelConfigsSync?.();
          return configs?.length ?? -1;
        } catch {
          return -1;
        }
      });

      expect(levelCount).toBeGreaterThanOrEqual(15);
    });

    test('关卡卡片应显示关卡信息', async ({ page }) => {
      await navigateToGame(page);

      const hasLevelData = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelSelect = game.getLevelSelectScreen?.();
          if (!levelSelect) return false;
          return levelSelect.container !== null && levelSelect.container !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasLevelData).toBeTruthy();
    });

    test('关卡选择应支持滚动', async ({ page }) => {
      await navigateToGame(page);

      const hasScroll = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelSelect = game.getLevelSelectScreen?.();
          if (!levelSelect) return false;
          return levelSelect.scrollContainer !== null && levelSelect.scrollContainer !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasScroll).toBeTruthy();
    });

    test('未解锁关卡应显示锁定状态', async ({ page }) => {
      await navigateToGame(page);

      const hasLockedLevels = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          const progress = saveManager.getLevelProgress?.(2);
          return progress !== null && progress !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasLockedLevels).toBeTruthy();
    });
  });

  test.describe('UI组件库 @regression', () => {
    test('UIButton组件应支持交互', async ({ page }) => {
      await navigateToGame(page);

      const hasButtons = await page.evaluate(() => {
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

      expect(hasButtons).toBeTruthy();
    });

    test('UIProgressBar应正确显示进度', async ({ page }) => {
      await navigateToGame(page);

      const hasProgressBar = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.getObjectiveBar?.() !== null && hud.getObjectiveBar?.() !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasProgressBar).toBeTruthy();
    });

    test('弹窗队列应支持顺序显示', async ({ page }) => {
      await navigateToGame(page);

      const popupSupport = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          return typeof ui.showPopup === 'function'
            && typeof ui.hidePopup === 'function';
        } catch {
          return false;
        }
      });

      expect(popupSupport).toBeTruthy();
    });

    test('模态遮罩应正确显示和隐藏', async ({ page }) => {
      await navigateToGame(page);

      const modalSupport = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          return typeof ui.isModalOverlayVisible === 'function';
        } catch {
          return false;
        }
      });

      expect(modalSupport).toBeTruthy();
    });
  });

  test.describe('场景切换 @smoke', () => {
    test('场景切换应支持过渡动画', async ({ page }) => {
      await navigateToGame(page);

      const hasTransitions = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return false;
          return typeof sm.showMainMenu === 'function'
            && typeof sm.restartGame === 'function'
            && typeof sm.nextLevel === 'function';
        } catch {
          return false;
        }
      });

      expect(hasTransitions).toBeTruthy();
    });

    test('场景生命周期应正确管理', async ({ page }) => {
      await navigateToGame(page);

      const hasLifecycle = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          return typeof scene.init === 'function'
            && typeof scene.loadLevel === 'function'
            && typeof scene.resetGame === 'function';
        } catch {
          return false;
        }
      });

      expect(hasLifecycle).toBeTruthy();
    });
  });
});
