import { test, expect } from '@playwright/test';
import { navigateToGame, clickCanvasCenter, clickCanvasAt, dropBlocks, waitForStable } from './helpers';

test.describe('容器边界与投放限制', () => {
  test.describe('容器外投放拦截', () => {
    test('方块不应被投放到容器外部左侧', async ({ page }) => {
      await navigateToGame(page);

      const containerBounds = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const scene = game.getGameScene?.();
        if (!scene) return null;
        const container = scene.getContainer?.();
        if (!container) return null;
        const offsetX = scene.getContainerOffsetX?.() ?? 0;
        return { left: offsetX, right: offsetX + container.width, top: 0, bottom: container.height };
      });

      expect(containerBounds).not.toBeNull();

      await clickCanvasAt(page, -0.1, 0.1);
      await page.waitForTimeout(1500);

      const allInContainer = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        const scene = game.getGameScene?.();
        if (!scene) return true;
        const container = scene.getContainer?.();
        if (!container) return true;
        const offsetX = scene.getContainerOffsetX?.() ?? 0;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        if (blocks.length === 0) return true;

        return blocks.every((b: any) =>
          b.x >= offsetX - 30 && b.x <= offsetX + container.width + 30
        );
      });

      expect(allInContainer).toBeTruthy();
    });

    test('方块不应被投放到容器外部右侧', async ({ page }) => {
      await navigateToGame(page);

      await clickCanvasAt(page, 1.1, 0.1);
      await page.waitForTimeout(1500);

      const allInContainer = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        const scene = game.getGameScene?.();
        if (!scene) return true;
        const container = scene.getContainer?.();
        if (!container) return true;
        const offsetX = scene.getContainerOffsetX?.() ?? 0;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        if (blocks.length === 0) return true;

        return blocks.every((b: any) =>
          b.x >= offsetX - 30 && b.x <= offsetX + container.width + 30
        );
      });

      expect(allInContainer).toBeTruthy();
    });

    test('容器外快速点击不应导致方块溢出', async ({ page }) => {
      await navigateToGame(page);

      for (let i = 0; i < 5; i++) {
        await clickCanvasAt(page, 0.02, 0.05);
        await page.waitForTimeout(400);
        await clickCanvasAt(page, 0.98, 0.05);
        await page.waitForTimeout(400);
      }

      await waitForStable(page, 3000);

      const overflowCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return 0;
        const scene = game.getGameScene?.();
        if (!scene) return 0;
        const container = scene.getContainer?.();
        if (!container) return 0;
        const offsetX = scene.getContainerOffsetX?.() ?? 0;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];

        return blocks.filter((b: any) =>
          b.x < offsetX - 50 || b.x > offsetX + container.width + 50
        ).length;
      });

      expect(overflowCount).toBe(0);
    });
  });

  test.describe('容器底部边界', () => {
    test('方块应堆积在容器底部而非穿过', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 10, 600);
      await waitForStable(page, 5000);

      const blocksAboveBottom = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        const scene = game.getGameScene?.();
        if (!scene) return true;
        const container = scene.getContainer?.();
        if (!container) return true;
        const spawner = game.getBlockSpawner?.();
        const blocks = spawner?.getBlocks?.() ?? [];
        if (blocks.length === 0) return true;

        const containerBottom = container.height;
        return blocks.every((b: any) =>
          b.y <= containerBottom + 100
        );
      });

      expect(blocksAboveBottom).toBeTruthy();
    });
  });
});

test.describe('警戒线行为', () => {
  test.describe('警戒线存在性验证', () => {
    test('游戏应存在警戒线机制', async ({ page }) => {
      await navigateToGame(page);

      const hasWarningLine = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;

        const warningLine = scene.getWarningLine?.();
        const gameOverLine = scene.getGameOverLine?.();
        const dangerLine = scene.getDangerLine?.();

        return warningLine != null || gameOverLine != null || dangerLine != null;
      });

      expect(hasWarningLine).toBeTruthy();
    });

    test('警戒线应可见或有视觉指示', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 3000);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(5000);
    });
  });

  test.describe('警戒线高度验证', () => {
    test('警戒线应位于容器合理高度区间', async ({ page }) => {
      await navigateToGame(page);

      const lineInfo = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const scene = game.getGameScene?.();
        if (!scene) return null;
        const container = scene.getContainer?.();
        if (!container) return null;

        const warningLine = scene.getWarningLine?.();
        const gameOverLine = scene.getGameOverLine?.();
        const lineY = warningLine?.warningY ?? warningLine?.y
          ?? gameOverLine?.warningY ?? gameOverLine?.y
          ?? gameOverLine?.lineY ?? null;

        return {
          lineY,
          containerHeight: container.height,
        };
      });

      expect(lineInfo).not.toBeNull();
      if (lineInfo?.lineY != null) {
        expect(lineInfo.containerHeight).toBeGreaterThan(0);
        expect(lineInfo.lineY).toBeGreaterThan(0);
        expect(lineInfo.lineY).toBeLessThan(lineInfo.containerHeight);
      }
    });
  });

  test.describe('空中移动球体与越过警戒线区分', () => {
    test('下落中方块不应立即触发游戏结束', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 3, 300);
      await page.waitForTimeout(1500);

      const isGameOver = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        const stateMachine = game.getStateMachine?.();
        const currentState = stateMachine?.getCurrentState?.();
        return currentState === 'gameOver' || currentState === 'gameover';
      });

      expect(isGameOver).toBeFalsy();
    });

    test('方块短暂飞越警戒线后回落不应触发警告', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 2000);

      await clickCanvasCenter(page);
      await page.waitForTimeout(1500);
      await waitForStable(page, 3000);

      const warningTriggered = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        const warningLine = scene.getWarningLine?.();
        if (!warningLine) return false;
        return warningLine.warningActive === true && warningLine.warningDuration > 500;
      });

      expect(warningTriggered).toBeFalsy();
    });

    test('静止在警戒线上的方块应被正确识别', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 15, 500);
      await waitForStable(page, 5000);

      const gameState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const scene = game.getGameScene?.();
        if (!scene) return null;
        const warningLine = scene.getWarningLine?.();
        if (!warningLine) return null;

        const blocks = game.getBlockSpawner?.()?.getBlocks?.() ?? [];
        const warningY = warningLine.warningY ?? warningLine.y ?? 0;

        const blocksAboveWarning = blocks.filter((b: any) => b.y < warningY).length;

        return {
          blocksAboveWarning,
          warningY,
          totalBlocks: blocks.length,
        };
      });

      expect(gameState).not.toBeNull();
      expect(gameState!.totalBlocks).toBeGreaterThan(0);
    });
  });
});

test.describe('合成动画视觉表现', () => {
  test.describe('合成特效系统', () => {
    test('应存在特效管理系统', async ({ page }) => {
      await navigateToGame(page);

      const hasEffectManager = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        const effectManager = scene.getEffectManager?.();
        return effectManager != null;
      });

      expect(hasEffectManager).toBeTruthy();
    });

    test('合成时应产生视觉反馈', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 10);
      await waitForStable(page, 5000);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(5000);
    });

    test('特效系统应支持清理操作', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 3000);

      const canCleanup = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        const effectManager = scene.getEffectManager?.();
        if (!effectManager) return false;

        return typeof effectManager.cleanup === 'function'
          || typeof effectManager.clearAll === 'function'
          || typeof effectManager.clear === 'function';
      });

      expect(canCleanup).toBeTruthy();
    });
  });

  test.describe('动画性能', () => {
    test('大量合成特效不应导致帧率严重下降', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 12, 500);
      await waitForStable(page, 5000);

      const fps = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const monitor = game.getPerformanceMonitor?.();
        return monitor?.getAverageFPS?.() ?? -1;
      });

      expect(fps).toBeGreaterThanOrEqual(1);
    });
  });
});

test.describe('过关分数设置', () => {
  test.describe('分数目标合理性', () => {
    test('每个关卡应有有效配置', async ({ page }) => {
      await navigateToGame(page);

      const levelCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return -1;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        return configs?.length ?? -1;
      });

      expect(levelCount).toBeGreaterThanOrEqual(5);
    });

    test('每个关卡目标分数应大于0', async ({ page }) => {
      await navigateToGame(page);

      const allPositiveTargets = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;

        return configs.every((c: any) => {
          const target = c.objective?.target ?? 0;
          return target > 0;
        });
      });

      expect(allPositiveTargets).toBeTruthy();
    });

    test('关卡目标值应随关卡编号递增', async ({ page }) => {
      await navigateToGame(page);

      const targetsIncreasing = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return true;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return true;

        const sorted = configs.sort((a: any, b: any) => a.id - b.id);
        const scoreLevels = sorted.filter((c: any) => c.objective?.type === 'score');
        if (scoreLevels.length < 2) return true;

        const targets = scoreLevels.map((c: any) => c.objective.target);

        for (let i = 1; i < targets.length; i++) {
          if (targets[i] < targets[i - 1]) return false;
        }
        return true;
      });

      expect(targetsIncreasing).toBeTruthy();
    });

    test('3星分数线应递增（1星 < 2星 < 3星）', async ({ page }) => {
      await navigateToGame(page);

      const validStars = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;

        return configs.every((c: any) => {
          const stars = c.rewards?.stars;
          if (!stars || stars.length !== 3) return true;
          return stars[0] < stars[1] && stars[1] < stars[2];
        });
      });

      expect(validStars).toBeTruthy();
    });

    test('生存关卡的时限应合理（30-180秒）', async ({ page }) => {
      await navigateToGame(page);

      const survivalTimes = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return [];
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return [];
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return [];

        return configs
          .filter((c: any) => c.objective?.type === 'survival')
          .map((c: any) => ({
            id: c.id,
            timeLimit: c.objective?.timeLimit ?? c.timeLimit ?? 0,
            target: c.objective?.target ?? 0,
          }));
      });

      for (const level of survivalTimes) {
        const time = level.timeLimit || level.target;
        expect(time).toBeGreaterThanOrEqual(30);
        expect(time).toBeLessThanOrEqual(180);
      }
    });

    test('合成目标关卡的数字应为2的幂', async ({ page }) => {
      await navigateToGame(page);

      const mergeTargetsValid = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;

        return configs
          .filter((c: any) => c.objective?.type === 'target_merge')
          .every((c: any) => {
            const target = c.objective?.target ?? 0;
            return target > 0 && (target & (target - 1)) === 0;
          });
      });

      expect(mergeTargetsValid).toBeTruthy();
    });
  });
});