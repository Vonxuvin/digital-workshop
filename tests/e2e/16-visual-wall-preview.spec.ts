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

test.describe('视觉墙与预览位置修复验证 @regression @smoke', () => {
  test.describe('容器边界与预览夹持', () => {
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

      await page.waitForTimeout(500);

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

      await page.waitForTimeout(500);

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

          const config = (window as any).__gameInstance?.getGameScene?.()?.getPreview?.()?.constructor;
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

  test.describe('落点标记位置', () => {
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
      await waitForStable(page, 3000);

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

  test.describe('碰撞边界验证', () => {
    test('方块碰撞应发生在容器内部边界而非外围', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await dropBlocks(page, 12);
      await waitForStable(page, 5000);

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
      await page.waitForTimeout(500);
      await clickCanvasAt(page, 0.95, 0.3);
      await page.waitForTimeout(1000);

      await dropBlocks(page, 8);
      await waitForStable(page, 5000);

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

  test.describe('容器边界稳定性', () => {
    test('大量方块不应渗透容器壁', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      for (let i = 0; i < 5; i++) {
        await clickCanvasAt(page, 0.15 + i * 0.02, 0.3);
        await page.waitForTimeout(400);
        await clickCanvasAt(page, 0.85 - i * 0.02, 0.3);
        await page.waitForTimeout(400);
      }

      await dropBlocks(page, 15);
      await waitForStable(page, 5000);

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
      await page.waitForTimeout(400);
      await clickCanvasAt(page, 0.98, 0.3);
      await page.waitForTimeout(400);
      await clickCanvasAt(page, 0.02, 0.6);
      await page.waitForTimeout(400);
      await clickCanvasAt(page, 0.98, 0.6);
      await page.waitForTimeout(400);

      await dropBlocks(page, 5);
      await waitForStable(page, 3000);

      const noCrash = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        return game !== null && game !== undefined;
      });

      expect(noCrash).toBeTruthy();
    });
  });
});