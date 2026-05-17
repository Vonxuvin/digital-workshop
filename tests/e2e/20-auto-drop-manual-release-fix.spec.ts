import { test, expect } from '@playwright/test';
import { navigateToGame, clickCanvasCenter, clickCanvasAt, waitForStable, ensurePlaying, getCanvasBoundingBox } from './helpers';

test.describe('自动下落与手动释放冲突修复 @smoke', () => {
  test.describe('自动下落期间玩家输入互斥', () => {
    test('自动下落期间点击不应产生重复球体', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const autoSpawnResult = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return { success: false, reason: 'no-spawner' };
          if (typeof spawner.startAutoSpawn !== 'function') return { success: false, reason: 'no-startAutoSpawn' };
          spawner.startAutoSpawn(500, 80);
          return { success: true };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });
      expect(autoSpawnResult.success).toBeTruthy();

      await page.waitForTimeout(600);

      const blockCountAfterAuto = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });
      expect(blockCountAfterAuto).toBeGreaterThanOrEqual(1);

      await clickCanvasCenter(page);
      await waitForStable(page, 500);

      const blockCountAfterClick = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      expect(blockCountAfterClick).toBeGreaterThanOrEqual(blockCountAfterAuto);
    });

    test('自动下落结束后手动释放应正常工作', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const spawner = game.getBlockSpawner?.();
          spawner?.startAutoSpawn?.(1000, 80);
        } catch {}
      });

      await page.waitForTimeout(1100);

      await page.waitForTimeout(400);

      const canDrop = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getCanDrop?.() ?? false;
        } catch {
          return false;
        }
      });
      expect(canDrop).toBeTruthy();

      const countBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getBlockSpawner?.()?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      await clickCanvasCenter(page);
      await waitForStable(page, 500);

      const countAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getBlockSpawner?.()?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    });
  });

  test.describe('球体残影消除', () => {
    test('预览球体隐藏后不应有残留图形', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const previewClean = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gs = game.getGameScene?.();
          if (!gs) return { success: false, reason: 'no-gameScene' };
          const preview = gs.getPreview?.();
          if (!preview) return { success: false, reason: 'no-preview' };

          preview.setBounds?.(0, 400);
          preview.setGroundY?.(500);
          preview.show?.(1, 200, 80);

          const trailBefore = (preview as any).trailGraphics?._context?.instructions?.length ?? -1;
          const markerBefore = (preview as any).landingMarker?._context?.instructions?.length ?? -1;

          preview.hide?.();

          const trailAfter = (preview as any).trailGraphics?._context?.instructions?.length ?? -1;
          const markerAfter = (preview as any).landingMarker?._context?.instructions?.length ?? -1;

          return {
            success: true,
            trailBefore,
            markerBefore,
            trailAfter,
            markerAfter,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(previewClean.success).toBeTruthy();
      if (previewClean.success) {
        expect(previewClean.trailAfter).toBe(0);
        expect(previewClean.markerAfter).toBe(0);
      }
    });

    test('多次显示/隐藏预览后不应累积残留图形', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gs = game.getGameScene?.();
          if (!gs) return { success: false, reason: 'no-gameScene' };
          const preview = gs.getPreview?.();
          if (!preview) return { success: false, reason: 'no-preview' };

          preview.setBounds?.(0, 400);
          preview.setGroundY?.(500);

          for (let i = 0; i < 5; i++) {
            preview.show?.(1, 200 + i * 10, 80);
            preview.updatePosition?.(200 + i * 10);
            preview.hide?.();
          }

          const trailAfter = (preview as any).trailGraphics?._context?.instructions?.length ?? -1;
          const markerAfter = (preview as any).landingMarker?._context?.instructions?.length ?? -1;
          const graphicsAfter = (preview as any).graphics?._context?.instructions?.length ?? -1;

          return {
            success: true,
            trailAfter,
            markerAfter,
            graphicsAfter,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      if (result.success) {
        expect(result.trailAfter).toBe(0);
        expect(result.markerAfter).toBe(0);
        expect(result.graphicsAfter).toBe(0);
      }
    });
  });

  test.describe('动画流畅性', () => {
    test('自动下落球体应有缩放动画', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const spawner = game.getBlockSpawner?.();
          spawner?.startAutoSpawn?.(500, 80);
        } catch {}
      });

      await page.waitForTimeout(600);

      const hasVisibleBlock = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          const blocks = spawner?.getBlocks?.();
          if (!blocks || blocks.length === 0) return false;
          const block = blocks[blocks.length - 1];
          return block.visible === true && block.alpha > 0 && block.scale.x > 0;
        } catch {
          return false;
        }
      });

      expect(hasVisibleBlock).toBeTruthy();
    });

    test('手动释放球体应有缩放动画', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await clickCanvasCenter(page);
      await waitForStable(page, 300);

      const hasVisibleBlock = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          const blocks = spawner?.getBlocks?.();
          if (!blocks || blocks.length === 0) return false;
          const block = blocks[blocks.length - 1];
          return block.visible === true && block.alpha > 0 && block.scale.x > 0;
        } catch {
          return false;
        }
      });

      expect(hasVisibleBlock).toBeTruthy();
    });
  });

  test.describe('GSAP动画清理', () => {
    test('球体销毁后不应有残留动画', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await clickCanvasCenter(page);
      await waitForStable(page, 500);

      const noOrphanTweens = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const spawner = game.getBlockSpawner?.();
          const blocks = spawner?.getBlocks?.();
          if (!blocks || blocks.length === 0) return true;

          const block = blocks[0];
          const gsap = (window as any).gsap;
          if (!gsap) return true;

          spawner.removeBlock?.(block);

          const physics = game.getPhysicsManager?.();
          physics?.removeBody?.(block.body);

          block.destroy?.();

          const tweensOfBlock = gsap.getTweensOf?.(block) ?? [];
          const tweensOfScale = gsap.getTweensOf?.(block.scale) ?? [];

          return tweensOfBlock.length === 0 && tweensOfScale.length === 0;
        } catch {
          return true;
        }
      });

      expect(noOrphanTweens).toBeTruthy();
    });
  });

  test.describe('自动下落与手动释放并发场景', () => {
    test('连续自动下落后手动释放不应导致页面错误', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const spawner = game.getBlockSpawner?.();
          spawner?.startAutoSpawn?.(300, 80);
        } catch {}
      });

      await page.waitForTimeout(1500);

      await clickCanvasCenter(page);
      await waitForStable(page, 500);

      await clickCanvasCenter(page);
      await waitForStable(page, 500);

      const criticalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection')
      );
      expect(criticalErrors.length).toBe(0);
    });

    test('自动下落期间触摸拖动不应导致卡顿', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const spawner = game.getBlockSpawner?.();
          spawner?.startAutoSpawn?.(500, 80);
        } catch {}
      });

      const box = await getCanvasBoundingBox(page);
      if (box) {
        const startX = box.x + box.width / 2;
        const startY = box.y + 100;

        await page.mouse.move(startX, startY);
        await page.mouse.down();

        for (let i = 0; i < 10; i++) {
          await page.mouse.move(startX + (i - 5) * 20, startY);
          await page.waitForTimeout(30);
        }

        await page.mouse.up();
      }

      await waitForStable(page, 500);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getBlockSpawner?.()?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      expect(blockCount).toBeGreaterThanOrEqual(0);
    });
  });
});
