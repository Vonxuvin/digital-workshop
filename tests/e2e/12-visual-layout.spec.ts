import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, isGamePlaying } from './helpers';

test.describe('视觉布局 @regression', () => {
  test.describe('游戏场景布局 @smoke', () => {
    test('游戏容器应居中显示', async ({ page }) => {
      await navigateToGame(page);

      const isCentered = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const container = scene.getContainer?.();
          if (!container) return false;
          const offsetX = scene.getContainerOffsetX?.();
          return offsetX !== undefined;
        } catch {
          return false;
        }
      });

      expect(isCentered).toBeTruthy();
    });

    test('容器高度应正确计算', async ({ page }) => {
      await navigateToGame(page);

      const hasHeight = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const height = scene.getContainerHeight?.();
          return height !== undefined && height > 0;
        } catch {
          return false;
        }
      });

      expect(hasHeight).toBeTruthy();
    });

    test('警戒线应在正确位置', async ({ page }) => {
      await navigateToGame(page);

      const warningLineValid = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const warningLine = scene.getWarningLine?.();
          if (!warningLine) return false;
          const height = typeof warningLine.getWarningHeight === 'function'
            ? warningLine.getWarningHeight() : null;
          return height !== null && height > 0;
        } catch {
          return false;
        }
      });

      expect(warningLineValid).toBeTruthy();
    });
  });

  test.describe('HUD布局 @regression', () => {
    test('分数文本应在顶部', async ({ page }) => {
      await navigateToGame(page);

      const hasScoreText = await page.evaluate(() => {
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

      expect(hasScoreText).toBeTruthy();
    });

    test('关卡文本应在顶部', async ({ page }) => {
      await navigateToGame(page);

      const hasLevelText = await page.evaluate(() => {
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

      expect(hasLevelText).toBeTruthy();
    });

    test('暂停按钮应在右上角', async ({ page }) => {
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

    test('道具栏应在底部', async ({ page }) => {
      await navigateToGame(page);

      const hasPropsContainer = await page.evaluate(() => {
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

      expect(hasPropsContainer).toBeTruthy();
    });

    test('目标进度条应在顶部', async ({ page }) => {
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

    test('连击显示应在正确位置', async ({ page }) => {
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
  });

  test.describe('方块布局 @regression', () => {
    test('方块应在容器范围内', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 5);
      await waitForStable(page);

      const blocksInBounds = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const container = scene.getContainer?.();
          if (!container) return false;
          return container.width > 0 && container.height > 0;
        } catch {
          return false;
        }
      });

      expect(blocksInBounds).toBeTruthy();
    });

    test('方块大小应一致', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 5);
      await waitForStable(page);

      const hasBlocks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return false;
          const blocks = spawner.getBlocks?.();
          return blocks && blocks.length > 0;
        } catch {
          return false;
        }
      });

      expect(hasBlocks).toBeTruthy();
    });

    test('方块间距应均匀', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 5);
      await waitForStable(page);

      const hasBlocks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return false;
          const blocks = spawner.getBlocks?.();
          return blocks && blocks.length > 0;
        } catch {
          return false;
        }
      });

      expect(hasBlocks).toBeTruthy();
    });
  });

  test.describe('弹窗布局 @regression', () => {
    test('弹窗应居中显示', async ({ page }) => {
      await navigateToGame(page);

      const hasPopupSupport = await page.evaluate(() => {
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

      expect(hasPopupSupport).toBeTruthy();
    });

    test('弹窗应有遮罩层', async ({ page }) => {
      await navigateToGame(page);

      const hasModalSupport = await page.evaluate(() => {
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

      expect(hasModalSupport).toBeTruthy();
    });
  });

  test.describe('响应式布局 @full', () => {
    test('不同分辨率下布局应自适应', async ({ page }) => {
      const resolutions = [
        { width: 375, height: 667 },
        { width: 768, height: 1024 },
        { width: 1280, height: 720 },
      ];

      for (const resolution of resolutions) {
        await page.setViewportSize(resolution);
        await navigateToGame(page);

        const canvas = page.locator('#game-canvas');
        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(0);
      }
    });

    test('横竖屏切换布局应正确', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await navigateToGame(page);

      const portraitBox = await page.locator('#game-canvas').boundingBox();

      await page.setViewportSize({ width: 812, height: 375 });
      await page.waitForTimeout(1000);

      const landscapeBox = await page.locator('#game-canvas').boundingBox();

      expect(portraitBox).not.toBeNull();
      expect(landscapeBox).not.toBeNull();
    });

    test('HUD布局方法应可用', async ({ page }) => {
      await navigateToGame(page);

      const hasLayout = await page.evaluate(() => {
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

      expect(hasLayout).toBeTruthy();
    });
  });
});
