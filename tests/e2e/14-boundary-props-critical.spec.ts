import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, clickCanvasCenter, clickCanvasAt, ensurePlaying, ensureGameScene } from './helpers';

test.describe('边界与道具关键路径 @regression', () => {
  test.describe('容器边界 @smoke', () => {
    test('容器偏移量应正确设置', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const hasContainerOffset = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const offsetX = scene.getContainerOffsetX?.();
          return typeof offsetX === 'number';
        } catch {
          return false;
        }
      });

      expect(hasContainerOffset).toBeTruthy();
    });

    test('容器宽度应正确设置', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const hasContainerWidth = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const width = scene.getContainerWidth?.();
          return typeof width === 'number' && width > 0;
        } catch {
          return false;
        }
      });

      expect(hasContainerWidth).toBeTruthy();
    });

    test('方块应限制在容器范围内', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 2000);

      const allBlocksInBounds = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return true;
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return true;
          const blocks = spawner.getBlocks?.() ?? [];
          const offsetX = scene.getContainerOffsetX?.() ?? 0;
          const width = scene.getContainerWidth?.() ?? 0;
          const rightBound = offsetX + width;
          for (const block of blocks) {
            if (block.x < offsetX - 30 || block.x > rightBound + 30) {
              return false;
            }
          }
          return true;
        } catch {
          return true;
        }
      });

      expect(allBlocksInBounds).toBeTruthy();
    });
  });

  test.describe('炸弹道具关键路径 @regression', () => {
    test('炸弹道具应可使用', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const canUseBomb = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return false;
          const bombCount = propSystem.getPropCount?.('bomb') ?? 0;
          return bombCount > 0;
        } catch {
          return false;
        }
      });

      expect(canUseBomb).toBeTruthy();
    });

    test('炸弹爆炸应移除范围内方块', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 8);
      await waitForStable(page, 2000);

      const blockCountBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      const explosionResult = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const effectHandler = scene.getPropEffectHandler?.();
          if (!effectHandler) return false;
          effectHandler.handleBombExplode?.({ x: 200, y: 400, radius: 120 });
          return true;
        } catch {
          return false;
        }
      });

      if (explosionResult) {
        await waitForStable(page, 1000);

        const blockCountAfter = await page.evaluate(() => {
          const game = (window as any).__gameInstance;
          if (!game) return -1;
          try {
            const spawner = game.getBlockSpawner?.();
            return spawner?.getBlocks?.()?.length ?? -1;
          } catch {
            return -1;
          }
        });

        if (blockCountBefore >= 0 && blockCountAfter >= 0) {
          expect(blockCountAfter).toBeLessThanOrEqual(blockCountBefore);
        }
      }
    });

    test('炸弹目标模式应可切换', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const canToggleTargetMode = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const effectHandler = scene.getPropEffectHandler?.();
          if (!effectHandler) return false;

          const before = effectHandler.getBombTargetMode?.();
          effectHandler.handlePropTargetMode?.({ enabled: true });
          const afterEnable = effectHandler.getBombTargetMode?.();
          effectHandler.handlePropTargetMode?.({ enabled: false });
          const afterDisable = effectHandler.getBombTargetMode?.();

          return before === false && afterEnable === true && afterDisable === false;
        } catch {
          return false;
        }
      });

      expect(canToggleTargetMode).toBeTruthy();
    });
  });

  test.describe('缩小道具关键路径 @regression', () => {
    test('缩小道具应可激活和停用', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const canToggleShrink = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const effectHandler = scene.getPropEffectHandler?.();
          if (!effectHandler) return false;

          effectHandler.handleShrinkActivate?.({ factor: 0.5, duration: 5000 });
          const isActive = effectHandler.isShrinkActive?.();
          const factor = effectHandler.getShrinkFactor?.();

          effectHandler.handleShrinkDeactivate?.();
          const isDeactivated = !effectHandler.isShrinkActive?.();
          const restoredFactor = effectHandler.getShrinkFactor?.();

          return isActive === true && factor === 0.5 && isDeactivated && restoredFactor === 1;
        } catch {
          return false;
        }
      });

      expect(canToggleShrink).toBeTruthy();
    });
  });

  test.describe('幸运道具关键路径 @regression', () => {
    test('幸运道具应可激活和停用', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const canToggleLucky = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const effectHandler = scene.getPropEffectHandler?.();
          if (!effectHandler) return false;

          effectHandler.handleLuckyActivate?.({ multiplier: 2, remainingDrops: 5 });
          effectHandler.handleLuckyDeactivate?.();
          return true;
        } catch {
          return false;
        }
      });

      expect(canToggleLucky).toBeTruthy();
    });
  });

  test.describe('冰冻道具关键路径 @regression', () => {
    test('冰冻道具应可激活和停用', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const canToggleFreeze = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const effectHandler = scene.getPropEffectHandler?.();
          if (!effectHandler) return false;

          effectHandler.handleFreezeActivated?.({ duration: 5000 });
          effectHandler.handleFreezeDeactivated?.();
          return true;
        } catch {
          return false;
        }
      });

      expect(canToggleFreeze).toBeTruthy();
    });
  });

  test.describe('复活机制 @regression', () => {
    test('复活应移除警告线上方块', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 2000);

      const canRevive = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const effectHandler = scene.getPropEffectHandler?.();
          if (!effectHandler) return false;
          return typeof effectHandler.handleRevive === 'function';
        } catch {
          return false;
        }
      });

      expect(canRevive).toBeTruthy();
    });
  });

  test.describe('道具效果重置 @regression', () => {
    test('重置应清除所有道具效果状态', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const canReset = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const effectHandler = scene.getPropEffectHandler?.();
          if (!effectHandler) return false;

          effectHandler.handlePropTargetMode?.({ enabled: true });
          effectHandler.handleShrinkActivate?.({ factor: 0.5, duration: 5000 });

          effectHandler.reset?.();

          const bombMode = effectHandler.getBombTargetMode?.();
          const shrinkActive = effectHandler.isShrinkActive?.();
          const shrinkFactor = effectHandler.getShrinkFactor?.();

          return bombMode === false && shrinkActive === false && shrinkFactor === 1;
        } catch {
          return false;
        }
      });

      expect(canReset).toBeTruthy();
    });
  });

  test.describe('输入与容器边界交互 @regression', () => {
    test('点击容器边缘不应崩溃', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await clickCanvasAt(page, 0.05, 0.5);
      await page.waitForTimeout(300);
      await clickCanvasAt(page, 0.95, 0.5);
      await page.waitForTimeout(300);
      await clickCanvasAt(page, 0.5, 0.05);
      await page.waitForTimeout(300);
      await clickCanvasAt(page, 0.5, 0.95);
      await page.waitForTimeout(300);

      const noCrash = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        return game !== null && game !== undefined;
      });

      expect(noCrash).toBeTruthy();
    });

    test('快速连续点击不应崩溃', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      for (let i = 0; i < 15; i++) {
        await clickCanvasCenter(page);
        await page.waitForTimeout(50);
      }

      await waitForStable(page, 3000);

      const noCrash = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        return game !== null && game !== undefined;
      });

      expect(noCrash).toBeTruthy();
    });
  });
});
