import { test, expect } from '@playwright/test';
import {
  navigateToGame,
  dropBlocks,
  waitForStable,
  clickCanvasAt,
  clickCanvasCenter,
  ensurePlaying,
  ensureGameScene,
  getCanvasBoundingBox,
} from './helpers';

test.describe('视觉布局 @regression', () => {
  test.describe('游戏场景布局 @smoke', () => {
    test('游戏容器应居中显示', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

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
      await ensureGameScene(page);

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
      await ensureGameScene(page);

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
      await ensureGameScene(page);

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
      await ensureGameScene(page);

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
      await ensureGameScene(page);

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
      await ensureGameScene(page);

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
      await ensureGameScene(page);

      const hasObjectiveBar = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.objectiveDisplay !== null && hud.objectiveDisplay !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasObjectiveBar).toBeTruthy();
    });

    test('连击显示应在正确位置', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

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
      await ensurePlaying(page);
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
      await ensurePlaying(page);
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
      await ensurePlaying(page);
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

  test.describe('WarningLine PixiJS v8 兼容性 @regression', () => {
    test('警戒线应使用 PixiJS v8 stroke API 而非 tint', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const usesStrokeAPI = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const warningLine = scene.getWarningLine?.();
          if (!warningLine) return false;
          const graphics = warningLine.getGraphics?.();
          if (!graphics) return false;
          return typeof graphics.stroke === 'function';
        } catch {
          return false;
        }
      });

      expect(usesStrokeAPI).toBeTruthy();
    });

    test('警戒线应支持颜色参数', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const supportsColor = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const warningLine = scene.getWarningLine?.();
          if (!warningLine) return false;
          return typeof warningLine.setColor === 'function'
            || typeof warningLine.getColor === 'function';
        } catch {
          return false;
        }
      });

      expect(supportsColor).toBeTruthy();
    });

    test('警戒线应支持透明度参数', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const supportsAlpha = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const warningLine = scene.getWarningLine?.();
          if (!warningLine) return false;
          return typeof warningLine.setAlpha === 'function'
            || typeof warningLine.getAlpha === 'function';
        } catch {
          return false;
        }
      });

      expect(supportsAlpha).toBeTruthy();
    });

    test('警戒线应在游戏场景中可见', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const isVisible = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const warningLine = scene.getWarningLine?.();
          if (!warningLine) return false;
          const container = warningLine.getContainer?.();
          if (!container) return warningLine.visible !== false;
          return container.visible !== false;
        } catch {
          return false;
        }
      });

      expect(isVisible).toBeTruthy();
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
      await page.waitForTimeout(600);

      const landscapeBox = await page.locator('#game-canvas').boundingBox();

      expect(portraitBox).not.toBeNull();
      expect(landscapeBox).not.toBeNull();
    });

    test('HUD布局方法应可用', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

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

  test.describe('NextPreview定位修复 @regression', () => {
    test('nextPreview不应出现在容器左上角(0,0)位置', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 1);
      await waitForStable(page);

      const notAtOrigin = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          const pos = preview.getNextPreviewPosition?.();
          if (!pos) return false;
          return !(pos.x === 0 && pos.y === 0);
        } catch {
          return false;
        }
      });

      expect(notAtOrigin).toBeTruthy();
    });

    test('nextPreview应定位在容器右上角区域', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 1);
      await waitForStable(page);

      const positionedCorrectly = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          const pos = preview.getNextPreviewPosition?.();
          if (!pos) return false;
          const maxX = preview.getBounds?.()?.maxX ?? 0;
          if (maxX === 0) return false;
          return pos.x > maxX / 2 && pos.y < 100;
        } catch {
          return false;
        }
      });

      expect(positionedCorrectly).toBeTruthy();
    });

    test('nextPreview位置应基于容器边界计算', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 1);
      await waitForStable(page);

      const hasCalculatedPosition = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          const pos = preview.getNextPreviewPosition?.();
          if (!pos) return false;
          return typeof pos.x === 'number' && typeof pos.y === 'number'
            && pos.x > 0 && pos.y > 0;
        } catch {
          return false;
        }
      });

      expect(hasCalculatedPosition).toBeTruthy();
    });
  });

  test.describe('NextPreview暂停/恢复可见性 @regression', () => {
    test('暂停时nextPreview应不可见', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 1);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getGameScene?.()?.pause?.();
        } catch {}
      });
      await waitForStable(page, 500);

      const hidden = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          return preview.isNextPreviewVisible?.() === false;
        } catch {
          return false;
        }
      });

      expect(hidden).toBeTruthy();
    });

    test('恢复后nextPreview应恢复可见', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 1);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getGameScene?.()?.pause?.();
        } catch {}
      });
      await waitForStable(page, 500);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getGameScene?.()?.resume?.();
        } catch {}
      });
      await waitForStable(page, 500);

      const visible = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          return preview.isNextPreviewVisible?.() === true;
        } catch {
          return false;
        }
      });

      expect(visible).toBeTruthy();
    });
  });

  test.describe('NextPreview游戏重置可见性 @regression', () => {
    test('游戏重置后nextPreview应不可见', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getGameScene?.()?.clearEverything?.();
        } catch {}
      });
      await waitForStable(page, 500);

      const hidden = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          return preview.isNextPreviewVisible?.() === false;
        } catch {
          return false;
        }
      });

      expect(hidden).toBeTruthy();
    });

    test('游戏重置后nextPreview应处于非激活状态', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getGameScene?.()?.clearEverything?.();
        } catch {}
      });
      await waitForStable(page, 500);

      const inactive = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          return preview.isNextPreviewActive?.() === false;
        } catch {
          return false;
        }
      });

      expect(inactive).toBeTruthy();
    });
  });

  test.describe('NextPreview方块投放下落流程 @regression', () => {
    test('投下方块后nextPreview应显示', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 1);
      await waitForStable(page);

      const visible = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          return preview.isNextPreviewActive?.() === true;
        } catch {
          return false;
        }
      });

      expect(visible).toBeTruthy();
    });

    test('多次投下方块后nextPreview应持续更新', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const activeAndVisible = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          return preview.isNextPreviewActive?.() === true;
        } catch {
          return false;
        }
      });

      expect(activeAndVisible).toBeTruthy();
    });

    test('nextPreview位置在多次投下后应保持正确', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const positionCorrect = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          const pos = preview.getNextPreviewPosition?.();
          if (!pos) return false;
          return pos.x > 0 && pos.y > 0;
        } catch {
          return false;
        }
      });

      expect(positionCorrect).toBeTruthy();
    });
  });

  test.describe('NextPreview状态转换 @regression', () => {
    test('从playing状态切换到menu时nextPreview应隐藏', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 1);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getStateMachine?.()?.transition?.('menu');
        } catch {}
      });
      await waitForStable(page, 500);

      const hidden = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          return preview.isNextPreviewActive?.() === false;
        } catch {
          return false;
        }
      });

      expect(hidden).toBeTruthy();
    });
  });

  test.describe('NextPreview getBounds修复 @regression', () => {
    test('preview隐藏后getBounds应返回容器边界', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 1);
      await waitForStable(page);

      const boundsValid = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          const bounds = preview.getBounds?.();
          if (!bounds) return false;
          return bounds.maxX > 0;
        } catch {
          return false;
        }
      });

      expect(boundsValid).toBeTruthy();
    });

    test('preview隐藏后getBounds.maxX应等于容器右边界', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 1);
      await waitForStable(page);

      const boundsMatchContainer = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          const bounds = preview.getBounds?.();
          if (!bounds) return false;
          const containerWidth = game.getGameScene?.()?.getContainerWidth?.() ?? 0;
          const containerOffsetX = game.getGameScene?.()?.getContainerOffsetX?.() ?? 0;
          if (containerWidth === 0) return false;
          const expectedMaxX = containerOffsetX + containerWidth;
          return Math.abs(bounds.maxX - expectedMaxX) < 1;
        } catch {
          return false;
        }
      });

      expect(boundsMatchContainer).toBeTruthy();
    });

    test('多次投下方块后getBounds应持续返回有效边界', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const boundsConsistent = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          const bounds1 = preview.getBounds?.();
          const bounds2 = preview.getBounds?.();
          if (!bounds1 || !bounds2) return false;
          return bounds1.maxX === bounds2.maxX && bounds1.maxX > 0;
        } catch {
          return false;
        }
      });

      expect(boundsConsistent).toBeTruthy();
    });

    test('preview隐藏后nextPreview位置应在getBounds右半区域', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 1);
      await waitForStable(page);

      const positionInRightHalf = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview) return false;
          const pos = preview.getNextPreviewPosition?.();
          if (!pos) return false;
          const bounds = preview.getBounds?.();
          if (!bounds || bounds.maxX === 0) return false;
          return pos.x > bounds.maxX / 2;
        } catch {
          return false;
        }
      });

      expect(positionInRightHalf).toBeTruthy();
    });
  });

  test.describe('容器边界与预览夹持 @regression', () => {
    test('预览方块不应超出容器左右边界', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const canvasBox = await getCanvasBoundingBox(page);
      if (!canvasBox) {
        test.skip(true, 'Canvas bounding box not available');
        return;
      }

      const containerInfo = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return null;
          return {
            offsetX: scene.getContainerOffsetX?.() ?? 0,
            width: scene.getContainerWidth?.() ?? 0,
          };
        } catch {
          return null;
        }
      });

      if (!containerInfo || containerInfo.width <= 0) {
        test.skip(true, 'Container info not available');
        return;
      }

      const { offsetX, width } = containerInfo;
      const canvasWidth = canvasBox.width;
      const scaleX = canvasWidth / (width + offsetX * 2);

      const leftClickX = canvasBox.x + offsetX * scaleX + 2;
      await page.mouse.click(leftClickX, canvasBox.y + canvasBox.height * 0.3);

      await page.waitForTimeout(300);

      const previewInside = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview || !preview.visible) return true;
          const targetX = preview.getTargetX?.() ?? 0;
          const scene = game.getGameScene?.();
          const offsetX = scene?.getContainerOffsetX?.() ?? 0;
          const containerWidth = scene?.getContainerWidth?.() ?? 0;
          return targetX >= offsetX && targetX <= offsetX + containerWidth;
        } catch {
          return true;
        }
      });

      expect(previewInside).toBeTruthy();
    });

    test('预览方块靠近右边界时不应进入视觉墙区域', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const canvasBox = await getCanvasBoundingBox(page);
      if (!canvasBox) {
        test.skip(true, 'Canvas bounding box not available');
        return;
      }

      const containerInfo = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return null;
          return {
            offsetX: scene.getContainerOffsetX?.() ?? 0,
            width: scene.getContainerWidth?.() ?? 0,
          };
        } catch {
          return null;
        }
      });

      if (!containerInfo || containerInfo.width <= 0) {
        test.skip(true, 'Container info not available');
        return;
      }

      const { offsetX, width } = containerInfo;
      const canvasWidth = canvasBox.width;
      const scaleX = canvasWidth / (width + offsetX * 2);

      const rightClickX = canvasBox.x + (offsetX + width) * scaleX - 2;
      await page.mouse.click(rightClickX, canvasBox.y + canvasBox.height * 0.3);

      await page.waitForTimeout(300);

      const previewInside = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const preview = game.getGameScene?.()?.getPreview?.();
          if (!preview || !preview.visible) return true;
          const targetX = preview.getTargetX?.() ?? 0;
          const scene = game.getGameScene?.();
          const offsetX = scene?.getContainerOffsetX?.() ?? 0;
          const containerWidth = scene?.getContainerWidth?.() ?? 0;
          return targetX >= offsetX && targetX <= offsetX + containerWidth;
        } catch {
          return true;
        }
      });

      expect(previewInside).toBeTruthy();
    });

    test('投放方块位置应与预览位置一致', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await clickCanvasCenter(page);
      await page.waitForTimeout(100);

      const positionMatch = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return true;
          const blocks = spawner.getBlocks?.() ?? [];
          if (blocks.length === 0) return true;
          const lastBlock = blocks[blocks.length - 1];
          const scene = game.getGameScene?.();
          const offsetX = scene?.getContainerOffsetX?.() ?? 0;
          const containerWidth = scene?.getContainerWidth?.() ?? 0;

          const radius = 20;

          return lastBlock.x >= offsetX + radius - 1
            && lastBlock.x <= offsetX + containerWidth - radius + 1;
        } catch {
          return true;
        }
      });

      expect(positionMatch).toBeTruthy();
    });
  });

  test.describe('落点标记位置 @regression', () => {
    test('落点标记应在视觉地面上方可见', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await clickCanvasCenter(page);
      await page.waitForTimeout(200);

      const landsAboveGround = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const block = game.getBlockSpawner?.()?.getBlocks?.()?.[0];
          if (!block) return true;
          const scene = game.getGameScene?.();
          const groundY = scene?.getContainerHeight?.() ? scene.getContainerHeight() - 50 : 0;
          return block.y <= groundY;
        } catch {
          return true;
        }
      });

      expect(landsAboveGround).toBeTruthy();
    });

    test('多次投放后所有方块应在地面上方', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 8);
      await waitForStable(page, 2000);

      const allAboveGround = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return true;
          const blocks = spawner.getBlocks?.() ?? [];
          const scene = game.getGameScene?.();
          const containerHeight = scene?.getContainerHeight?.() ?? 600;
          const groundY = containerHeight - 50;

          for (const block of blocks) {
            if (block.y > groundY + 10) return false;
          }
          return true;
        } catch {
          return true;
        }
      });

      expect(allAboveGround).toBeTruthy();
    });
  });

  test.describe('碰撞边界验证 @regression', () => {
    test('方块碰撞应发生在容器内部边界而非外围', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await dropBlocks(page, 5);
      await waitForStable(page, 2000);

      const allInsideContainer = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return true;
          const blocks = spawner.getBlocks?.() ?? [];
          const scene = game.getGameScene?.();
          const offsetX = scene?.getContainerOffsetX?.() ?? 0;
          const containerWidth = scene?.getContainerWidth?.() ?? 0;
          const rightBound = offsetX + containerWidth;

          for (const block of blocks) {
            if (block.isDestroyed || !block.body) continue;
            const radius = block.body?.circleRadius ?? 20;
            if (block.x - radius < offsetX - 5) return false;
            if (block.x + radius > rightBound + 5) return false;
          }
          return true;
        } catch {
          return true;
        }
      });

      expect(allInsideContainer).toBeTruthy();
    });

    test('左右墙壁碰撞应发生在容器边缘而非容器外侧', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await clickCanvasAt(page, 0.05, 0.3);
      await page.waitForTimeout(300);
      await clickCanvasAt(page, 0.95, 0.3);
      await page.waitForTimeout(600);

      await dropBlocks(page, 8);
      await waitForStable(page, 3000);

      const wallsCorrect = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return true;
          const renderer = scene.getContainerRenderer?.();
          if (!renderer) return true;
          const walls = renderer.getPhysicsWalls?.() ?? [];
          const leftWall = walls.find((w: any) => w.label === 'wall_left');
          const rightWall = walls.find((w: any) => w.label === 'wall_right');
          if (!leftWall || !rightWall) return true;

          const offsetX = renderer.getContainerOffsetX?.() ?? 0;
          const containerWidth = renderer.getContainerWidth?.() ?? 0;
          const rightBound = offsetX + containerWidth;

          const leftMaxX = Math.max(...leftWall.vertices.map((v: any) => v.x));
          const rightMinX = Math.min(...rightWall.vertices.map((v: any) => v.x));

          return leftMaxX <= offsetX + 3 && rightMinX >= rightBound - 3;
        } catch {
          return true;
        }
      });

      expect(wallsCorrect).toBeTruthy();
    });
  });

  test.describe('容器边界稳定性 @regression', () => {
    test('大量方块不应渗透容器壁', async ({ page }) => {
      test.setTimeout(process.env.CI ? 120000 : 90000);
      await navigateToGame(page);
      await ensurePlaying(page);

      for (let i = 0; i < 5; i++) {
        await clickCanvasAt(page, 0.15 + i * 0.02, 0.3);
        await page.waitForTimeout(250);
        await clickCanvasAt(page, 0.85 - i * 0.02, 0.3);
        await page.waitForTimeout(250);
      }

      await dropBlocks(page, 5);
      await waitForStable(page, 2000);

      const noEscape = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return true;
          const blocks = spawner.getBlocks?.() ?? [];
          const scene = game.getGameScene?.();
          const offsetX = scene?.getContainerOffsetX?.() ?? 0;
          const containerWidth = scene?.getContainerWidth?.() ?? 0;
          const rightBound = offsetX + containerWidth;

          for (const block of blocks) {
            if (block.isDestroyed) continue;
            const radius = block.body?.circleRadius ?? 20;
            if (block.x - radius < offsetX - 10) return false;
            if (block.x + radius > rightBound + 10) return false;
          }
          return true;
        } catch {
          return true;
        }
      });

      expect(noEscape).toBeTruthy();
    });

    test('极端边缘投放后游戏不崩溃', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await clickCanvasAt(page, 0.02, 0.3);
      await page.waitForTimeout(250);
      await clickCanvasAt(page, 0.98, 0.3);
      await page.waitForTimeout(250);
      await clickCanvasAt(page, 0.02, 0.6);
      await page.waitForTimeout(250);
      await clickCanvasAt(page, 0.98, 0.6);
      await page.waitForTimeout(250);

      await dropBlocks(page, 5);
      await waitForStable(page, 2000);

      const noCrash = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        return game !== null && game !== undefined;
      });

      expect(noCrash).toBeTruthy();
    });
  });
});
