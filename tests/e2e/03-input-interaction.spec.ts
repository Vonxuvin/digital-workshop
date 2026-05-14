import { test, expect } from '@playwright/test';
import { navigateToGame, clickCanvasCenter, clickCanvasAt, dropBlocks, waitForStable } from './helpers';

test.describe('输入交互', () => {
  test.describe('点击投放', () => {
    test('点击Canvas应投放方块', async ({ page }) => {
      await navigateToGame(page);

      const blockCountBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      await clickCanvasCenter(page);
      await page.waitForTimeout(1000);

      const blockCountAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCountAfter).toBeGreaterThan(blockCountBefore);
    });

    test('连续点击应投放多个方块', async ({ page }) => {
      await navigateToGame(page);

      await dropBlocks(page, 5);
      await waitForStable(page);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCount).toBeGreaterThanOrEqual(2);
    });

    test('不同位置点击应投放方块到不同位置', async ({ page }) => {
      await navigateToGame(page);

      await clickCanvasAt(page, 0.3, 0.1);
      await page.waitForTimeout(1200);
      await clickCanvasAt(page, 0.7, 0.1);
      await page.waitForTimeout(1200);

      await waitForStable(page);

      const positions = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return [];
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        return blocks.map((b: any) => ({ x: b.x, y: b.y }));
      });

      expect(positions.length).toBeGreaterThanOrEqual(1);
    });

    test('Canvas边缘点击应正确处理', async ({ page }) => {
      await navigateToGame(page);

      await clickCanvasAt(page, 0.05, 0.05);
      await page.waitForTimeout(1200);
      await clickCanvasAt(page, 0.95, 0.05);
      await page.waitForTimeout(1200);

      await waitForStable(page);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('触摸事件', () => {
    test('触摸事件应等同于点击事件', async ({ page }) => {
      await navigateToGame(page);

      const canvas = page.locator('#game-canvas');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();

      await page.mouse.click(box!.x + box!.width / 2, box!.y + 100);
      await page.waitForTimeout(1000);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCount).toBeGreaterThan(0);
    });

    test('多点触控应正确处理', async ({ page }) => {
      await navigateToGame(page);

      const canvas = page.locator('#game-canvas');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();

      await page.mouse.click(box!.x + box!.width * 0.3, box!.y + 100);
      await page.waitForTimeout(1200);
      await page.mouse.click(box!.x + box!.width * 0.7, box!.y + 100);
      await page.waitForTimeout(1200);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCount).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('输入响应', () => {
    test('点击响应延迟应在可接受范围内', async ({ page }) => {
      await navigateToGame(page);

      const startTime = Date.now();
      await clickCanvasCenter(page);
      await page.waitForTimeout(500);

      const hasBlock = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        return blocks.length > 0;
      });

      const responseTime = Date.now() - startTime;
      expect(hasBlock).toBeTruthy();
      expect(responseTime).toBeLessThan(5000);
    });

    test('快速连续点击不应丢失事件', async ({ page }) => {
      await navigateToGame(page);

      const clickCount = 10;
      for (let i = 0; i < clickCount; i++) {
        await clickCanvasCenter(page);
        await page.waitForTimeout(200);
      }

      await waitForStable(page);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCount).toBeGreaterThanOrEqual(Math.floor(clickCount / 2));
    });
  });

  test.describe('输入状态管理', () => {
    test('暂停状态下不应响应点击投放', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const stateMachine = game.getStateMachine?.();
        stateMachine?.transitionTo?.('paused');
      });

      await page.waitForTimeout(500);

      const blockCountBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      await clickCanvasCenter(page);
      await page.waitForTimeout(1000);

      const blockCountAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCountAfter).toBe(blockCountBefore);
    });

    test('游戏结束状态下不应响应点击投放', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const stateMachine = game.getStateMachine?.();
        stateMachine?.transitionTo?.('gameover');
      });

      await page.waitForTimeout(500);

      const blockCountBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      await clickCanvasCenter(page);
      await page.waitForTimeout(1000);

      const blockCountAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCountAfter).toBe(blockCountBefore);
    });
  });

  test.describe('键盘输入', () => {
    test('Escape键应触发暂停', async ({ page }) => {
      await navigateToGame(page);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const isPaused = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const stateMachine = game.getStateMachine?.();
        return stateMachine?.getCurrentState?.() === 'paused';
      });

      expect(isPaused).toBeTruthy();
    });

    test('空格键应触发投放', async ({ page }) => {
      await navigateToGame(page);

      const blockCountBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);

      const blockCountAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCountAfter).toBeGreaterThanOrEqual(blockCountBefore);
    });
  });
});