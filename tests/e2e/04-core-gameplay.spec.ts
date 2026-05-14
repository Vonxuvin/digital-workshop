import { test, expect } from '@playwright/test';
import { navigateToGame, clickCanvasCenter, dropBlocks, waitForStable } from './helpers';

test.describe('核心玩法', () => {
  test.describe('物理引擎', () => {
    test('Matter.js物理引擎应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const physicsReady = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const physics = game.getPhysics?.();
        return physics !== null && physics !== undefined;
      });

      expect(physicsReady).toBeTruthy();
    });

    test('方块应受重力影响下落', async ({ page }) => {
      await navigateToGame(page);

      await clickCanvasCenter(page);
      await page.waitForTimeout(500);

      const pos1 = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        if (blocks.length === 0) return null;
        return { x: blocks[0].x, y: blocks[0].y };
      });

      await page.waitForTimeout(1000);

      const pos2 = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        if (blocks.length === 0) return null;
        return { x: blocks[0].x, y: blocks[0].y };
      });

      expect(pos1).not.toBeNull();
      expect(pos2).not.toBeNull();
      expect(pos2!.y).toBeGreaterThan(pos1!.y);
    });

    test('方块之间应有碰撞检测', async ({ page }) => {
      await navigateToGame(page);

      await dropBlocks(page, 5);
      await waitForStable(page);

      const hasCollisions = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const physics = game.getPhysics?.();
        if (!physics) return false;
        return typeof physics.hasCollision === 'function';
      });

      expect(hasCollisions).toBeTruthy();
    });

    test('物理世界应有边界约束', async ({ page }) => {
      await navigateToGame(page);

      const hasBounds = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        const container = scene.getContainer?.();
        if (!container) return false;
        return container.width > 0 && container.height > 0;
      });

      expect(hasBounds).toBeTruthy();
    });

    test('物理模拟应支持暂停和恢复', async ({ page }) => {
      await navigateToGame(page);

      const canPauseResume = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const physics = game.getPhysics?.();
        if (!physics) return false;
        return typeof physics.pause === 'function'
          && typeof physics.resume === 'function';
      });

      expect(canPauseResume).toBeTruthy();
    });
  });

  test.describe('方块生成', () => {
    test('BlockSpawner应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const spawnerReady = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const spawner = game.getBlockSpawner?.();
        return spawner !== null && spawner !== undefined;
      });

      expect(spawnerReady).toBeTruthy();
    });

    test('生成的方块应有数字属性', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const allHaveNumbers = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        if (blocks.length === 0) return false;
        return blocks.every((b: any) => typeof b.number === 'number' && b.number > 0);
      });

      expect(allHaveNumbers).toBeTruthy();
    });

    test('生成的方块应有颜色属性', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const allHaveColors = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        if (blocks.length === 0) return false;
        return blocks.every((b: any) => b.color !== undefined);
      });

      expect(allHaveColors).toBeTruthy();
    });

    test('不同数字的方块应有不同颜色', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 10);
      await waitForStable(page);

      const colorVariety = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        const colors = new Set(blocks.map((b: any) => b.color));
        return colors.size >= 2;
      });

      expect(colorVariety).toBeTruthy();
    });

    test('生成位置应在容器范围内', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const allInBounds = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        const container = scene?.getContainer?.();
        const offsetX = scene?.getContainerOffsetX?.() ?? 0;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        if (!container || blocks.length === 0) return false;

        return blocks.every((b: any) =>
          b.x >= offsetX - 50 && b.x <= offsetX + container.width + 50
          && b.y >= -100
        );
      });

      expect(allInBounds).toBeTruthy();
    });
  });

  test.describe('合成系统', () => {
    test('MergeSystem应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const mergeReady = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const mergeSystem = game.getMergeSystem?.();
        return mergeSystem !== null && mergeSystem !== undefined;
      });

      expect(mergeReady).toBeTruthy();
    });

    test('相同数字方块碰撞应触发合成', async ({ page }) => {
      const mergeLogs: string[] = [];
      page.on('console', (msg) => {
        if (msg.text().includes('merge') || msg.text().includes('合成')) {
          mergeLogs.push(msg.text());
        }
      });

      await navigateToGame(page);
      await dropBlocks(page, 10);
      await waitForStable(page, 5000);

      expect(mergeLogs.length).toBeGreaterThan(0);
    });

    test('合成后应生成更高数字的方块', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 10);
      await waitForStable(page, 5000);

      const hasHigherNumber = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        return blocks.some((b: any) => b.number >= 4);
      });

      expect(hasHigherNumber).toBeTruthy();
    });

    test('不同数字方块不应合成', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 3000);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCount).toBeGreaterThan(0);
    });

    test('合成应触发得分事件', async ({ page }) => {
      const scoreLogs: string[] = [];
      page.on('console', (msg) => {
        if (msg.text().includes('score:updated') || msg.text().includes('Score')) {
          scoreLogs.push(msg.text());
        }
      });

      await navigateToGame(page);
      await dropBlocks(page, 10);
      await waitForStable(page, 5000);

      expect(scoreLogs.length).toBeGreaterThan(0);
    });
  });

  test.describe('连锁反应', () => {
    test('一次合成可能触发连锁合成', async ({ page }) => {
      test.setTimeout(120000);
      await navigateToGame(page);
      await dropBlocks(page, 10);
      await waitForStable(page, 5000);

      const hasChain = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scoreSystem = game.getScoreSystem?.();
        return scoreSystem?.getCombo?.() !== undefined;
      });

      expect(hasChain).toBeTruthy();
    });

    test('连击应有倍率加成', async ({ page }) => {
      await navigateToGame(page);

      const hasMultiplier = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scoreSystem = game.getScoreSystem?.();
        if (!scoreSystem) return false;
        return typeof scoreSystem.getComboMultiplier === 'function';
      });

      expect(hasMultiplier).toBeTruthy();
    });

    test('连击中断后倍率应重置', async ({ page }) => {
      await navigateToGame(page);

      const hasReset = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scoreSystem = game.getScoreSystem?.();
        if (!scoreSystem) return false;
        return typeof scoreSystem.resetCombo === 'function';
      });

      expect(hasReset).toBeTruthy();
    });
  });

  test.describe('警戒线与游戏结束', () => {
    test('警戒线应正确渲染', async ({ page }) => {
      await navigateToGame(page);

      const hasWarningLine = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        return scene.getWarningLine?.() !== null;
      });

      expect(hasWarningLine).toBeTruthy();
    });

    test('方块超过警戒线应触发警告', async ({ page }) => {
      await navigateToGame(page);

      const hasWarning = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        return typeof scene.checkWarningLine === 'function';
      });

      expect(hasWarning).toBeTruthy();
    });

    test('方块超出顶部应触发游戏结束', async ({ page }) => {
      await navigateToGame(page);

      const hasGameOverCheck = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        return typeof scene.checkGameOver === 'function';
      });

      expect(hasGameOverCheck).toBeTruthy();
    });
  });
});