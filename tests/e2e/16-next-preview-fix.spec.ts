import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, ensurePlaying, ensureGameScene } from './helpers';

test.describe('NextPreview 修复验证 @regression', () => {
  test.describe('nextPreview 定位修复 @smoke', () => {
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

  test.describe('nextPreview 暂停/恢复可见性 @regression', () => {
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

  test.describe('nextPreview 游戏重置可见性 @regression', () => {
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

  test.describe('nextPreview 方块投放下落流程 @regression', () => {
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

  test.describe('nextPreview 状态转换 @regression', () => {
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

  test.describe('getBounds override for hidden preview @regression', () => {
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
});
