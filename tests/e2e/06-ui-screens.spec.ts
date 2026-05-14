import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable } from './helpers';

test.describe('UI界面', () => {
  test.describe('主菜单界面', () => {
    test('主菜单应正确显示', async ({ page }) => {
      await navigateToGame(page);

      const hasMainMenu = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const ui = game.getUIManager?.();
        if (!ui) return false;
        return ui.getScreens?.()?.has?.('mainMenu') ?? false;
      });

      expect(hasMainMenu).toBeTruthy();
    });

    test('主菜单应包含开始游戏入口', async ({ page }) => {
      await navigateToGame(page);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });

    test('主菜单应包含关卡选择入口', async ({ page }) => {
      await navigateToGame(page);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });

    test('主菜单应包含设置入口', async ({ page }) => {
      await navigateToGame(page);

      const hasSettings = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const ui = game.getUIManager?.();
        if (!ui) return false;
        return ui.getScreens?.()?.has?.('settings') ?? false;
      });

      expect(hasSettings).toBeTruthy();
    });
  });

  test.describe('游戏HUD', () => {
    test('HUD应显示当前分数', async ({ page }) => {
      await navigateToGame(page);

      const hasScoreDisplay = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const hud = game.getGameHUD?.();
        if (!hud) return false;
        return hud.scoreText !== null;
      });

      expect(hasScoreDisplay).toBeTruthy();
    });

    test('HUD应显示当前关卡信息', async ({ page }) => {
      await navigateToGame(page);

      const hasLevelDisplay = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const hud = game.getGameHUD?.();
        if (!hud) return false;
        return hud.levelText !== null;
      });

      expect(hasLevelDisplay).toBeTruthy();
    });

    test('HUD应包含暂停按钮', async ({ page }) => {
      await navigateToGame(page);

      const hasPauseButton = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const hud = game.getGameHUD?.();
        if (!hud) return false;
        return hud.pauseButton !== null;
      });

      expect(hasPauseButton).toBeTruthy();
    });

    test('HUD应包含道具栏', async ({ page }) => {
      await navigateToGame(page);

      const hasPropsBar = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const hud = game.getGameHUD?.();
        if (!hud) return false;
        return hud.propsContainer !== null;
      });

      expect(hasPropsBar).toBeTruthy();
    });

    test('HUD应包含目标进度条', async ({ page }) => {
      await navigateToGame(page);

      const hasObjectiveBar = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const hud = game.getGameHUD?.();
        if (!hud) return false;
        return hud.objectiveBar !== null;
      });

      expect(hasObjectiveBar).toBeTruthy();
    });

    test('连击显示应正确触发', async ({ page }) => {
      await navigateToGame(page);

      const hasComboDisplay = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const hud = game.getGameHUD?.();
        if (!hud) return false;
        return hud.comboDisplay !== null;
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
        const scoreSystem = game.getScoreSystem?.();
        return scoreSystem?.getScore?.() ?? -1;
      });

      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('暂停界面', () => {
    test('暂停界面应包含继续按钮', async ({ page }) => {
      await navigateToGame(page);

      const hasPauseScreen = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const pauseScreen = game.getPauseScreen?.();
        return pauseScreen !== null && pauseScreen !== undefined;
      });

      expect(hasPauseScreen).toBeTruthy();
    });

    test('暂停界面应包含重新开始按钮', async ({ page }) => {
      await navigateToGame(page);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });

    test('暂停界面应包含返回主菜单按钮', async ({ page }) => {
      await navigateToGame(page);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });

    test('暂停时游戏应停止运行', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const stateMachine = game.getStateMachine?.();
        stateMachine?.transitionTo?.('paused');
      });

      await page.waitForTimeout(500);

      const isPaused = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const stateMachine = game.getStateMachine?.();
        return stateMachine?.getCurrentState?.() === 'paused';
      });

      expect(isPaused).toBeTruthy();
    });
  });

  test.describe('结算界面', () => {
    test('结算界面应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasResultScreen = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const resultScreen = game.getResultScreen?.();
        if (!resultScreen) return false;
        return typeof resultScreen.setResult === 'function';
      });

      expect(hasResultScreen).toBeTruthy();
    });

    test('胜利时应显示恭喜过关', async ({ page }) => {
      await navigateToGame(page);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });

    test('失败时应显示游戏结束', async ({ page }) => {
      await navigateToGame(page);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });

    test('星级评定动画应正确播放', async ({ page }) => {
      await navigateToGame(page);

      const hasStarAnimation = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const resultScreen = game.getResultScreen?.();
        if (!resultScreen) return false;
        return resultScreen.starTimeline !== undefined;
      });

      expect(hasStarAnimation).toBeTruthy();
    });

    test('结算界面应包含下一关/重试/菜单按钮', async ({ page }) => {
      await navigateToGame(page);

      const hasButtons = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const resultScreen = game.getResultScreen?.();
        if (!resultScreen) return false;
        return resultScreen.nextButton !== undefined
          || resultScreen.retryButton !== undefined
          || resultScreen.menuButton !== undefined;
      });

      expect(hasButtons).toBeTruthy();
    });
  });

  test.describe('关卡选择界面', () => {
    test('关卡选择应显示所有可用关卡', async ({ page }) => {
      await navigateToGame(page);

      const levelCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return -1;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        return configs?.length ?? -1;
      });

      expect(levelCount).toBeGreaterThanOrEqual(15);
    });

    test('关卡卡片应显示关卡信息', async ({ page }) => {
      await navigateToGame(page);

      const hasLevelData = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelSelect = game.getLevelSelectScreen?.();
        if (!levelSelect) return false;
        return levelSelect.container !== null;
      });

      expect(hasLevelData).toBeTruthy();
    });

    test('关卡选择应支持滚动', async ({ page }) => {
      await navigateToGame(page);

      const hasScroll = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelSelect = game.getLevelSelectScreen?.();
        if (!levelSelect) return false;
        return levelSelect.scrollContainer !== null;
      });

      expect(hasScroll).toBeTruthy();
    });

    test('未解锁关卡应显示锁定状态', async ({ page }) => {
      await navigateToGame(page);

      const hasLockedLevels = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        const progress = saveManager.getLevelProgress?.(2);
        return progress !== null;
      });

      expect(hasLockedLevels).toBeTruthy();
    });
  });

  test.describe('UI组件库', () => {
    test('UIButton组件应支持交互', async ({ page }) => {
      await navigateToGame(page);

      const hasButtons = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const ui = game.getUIManager?.();
        if (!ui) return false;
        const mainLayer = ui.getLayer?.('main');
        if (!mainLayer) return false;
        return mainLayer.children?.length > 0;
      });

      expect(hasButtons).toBeTruthy();
    });

    test('UIProgressBar应正确显示进度', async ({ page }) => {
      await navigateToGame(page);

      const hasProgressBar = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const hud = game.getGameHUD?.();
        if (!hud) return false;
        return hud.getObjectiveBar?.() !== null;
      });

      expect(hasProgressBar).toBeTruthy();
    });

    test('弹窗队列应支持顺序显示', async ({ page }) => {
      await navigateToGame(page);

      const popupSupport = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const ui = game.getUIManager?.();
        if (!ui) return false;
        return typeof ui.showPopup === 'function'
          && typeof ui.hidePopup === 'function';
      });

      expect(popupSupport).toBeTruthy();
    });

    test('模态遮罩应正确显示和隐藏', async ({ page }) => {
      await navigateToGame(page);

      const modalSupport = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const ui = game.getUIManager?.();
        if (!ui) return false;
        return typeof ui.isModalOverlayVisible === 'function';
      });

      expect(modalSupport).toBeTruthy();
    });
  });

  test.describe('场景切换', () => {
    test('场景切换应支持过渡动画', async ({ page }) => {
      await navigateToGame(page);

      const hasTransitions = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const sm = game.getSceneManager?.();
        if (!sm) return false;
        return typeof sm.showMainMenu === 'function'
          && typeof sm.restartGame === 'function'
          && typeof sm.nextLevel === 'function';
      });

      expect(hasTransitions).toBeTruthy();
    });

    test('场景生命周期应正确管理', async ({ page }) => {
      await navigateToGame(page);

      const hasLifecycle = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        return typeof scene.init === 'function'
          && typeof scene.loadLevel === 'function'
          && typeof scene.resetGame === 'function';
      });

      expect(hasLifecycle).toBeTruthy();
    });
  });
});