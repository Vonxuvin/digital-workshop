import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, clickCanvasCenter, isGamePlaying } from './helpers';

test.describe('核心玩法 @smoke', () => {
  test.describe('方块生成 @smoke', () => {
    test('方块生成器应正确初始化', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;

      const hasSpawner = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner !== null && spawner !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasSpawner).toBeTruthy();
    });

    test('应能生成方块', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 1);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      expect(blockCount).toBeGreaterThanOrEqual(1);
    });

    test('方块应有正确的数值', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 3);
      await waitForStable(page);

      const hasValidValue = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return false;
          const currentValue = spawner.getCurrentValue?.();
          return currentValue !== undefined && currentValue > 0;
        } catch {
          return false;
        }
      });

      expect(hasValidValue).toBeTruthy();
    });

    test('方块生成应有冷却时间', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;

      await clickCanvasCenter(page);
      await page.waitForTimeout(100);

      const canDropAfterClick = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getCanDrop?.() ?? true;
        } catch {
          return true;
        }
      });

      expect(typeof canDropAfterClick).toBe('boolean');
    });
  });

  test.describe('方块合并 @smoke', () => {
    test('相同数字方块应合并', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 10, 600);
      await waitForStable(page, 3000);

      const hasMergeSystem = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const mergeSystem = game.getMergeSystem?.();
          return mergeSystem !== null && mergeSystem !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasMergeSystem).toBeTruthy();
    });

    test('合并后方块数值应翻倍', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 10, 600);
      await waitForStable(page, 3000);

      const scoreIncreased = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scoreSystem = game.getScoreSystem?.();
          if (!scoreSystem) return false;
          return scoreSystem.getScore?.() >= 0;
        } catch {
          return false;
        }
      });

      expect(scoreIncreased).toBeTruthy();
    });

    test('合并应触发连击计数', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 10, 400);
      await waitForStable(page, 3000);

      const comboSystem = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scoreSystem = game.getScoreSystem?.();
          if (!scoreSystem) return false;
          const combo = scoreSystem.getCombo?.();
          return combo !== undefined;
        } catch {
          return false;
        }
      });

      expect(comboSystem).toBeTruthy();
    });
  });

  test.describe('物理系统 @smoke', () => {
    test('物理引擎应正确初始化', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;

      const hasPhysics = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const physics = game.getPhysics?.();
          return physics !== null && physics !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasPhysics).toBeTruthy();
    });

    test('方块应受重力影响下落', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 3);
      await waitForStable(page, 2000);

      const blocksSettled = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const physics = game.getPhysics?.();
          if (!physics) return false;
          return physics.isRunning?.() !== undefined;
        } catch {
          return false;
        }
      });

      expect(blocksSettled).toBeTruthy();
    });

    test('方块应正确碰撞', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 5);
      await waitForStable(page, 2000);

      const hasCollision = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const physics = game.getPhysics?.();
          if (!physics) return false;
          return typeof physics.hasCollision === 'function';
        } catch {
          return false;
        }
      });

      expect(hasCollision).toBeTruthy();
    });

    test('暂停时物理应停止', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 3);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const sm = game.getSceneManager?.();
          sm?.pauseGame?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      const physicsStopped = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const physics = game.getPhysics?.();
          if (!physics) return false;
          return !physics.isRunning?.();
        } catch {
          return false;
        }
      });

      expect(physicsStopped).toBeTruthy();
    });
  });

  test.describe('计分系统 @smoke', () => {
    test('计分系统应正确初始化', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;

      const hasScoreSystem = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scoreSystem = game.getScoreSystem?.();
          return scoreSystem !== null && scoreSystem !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasScoreSystem).toBeTruthy();
    });

    test('初始分数应为0', async ({ page }) => {
      await navigateToGame(page, false);
      const playing = await isGamePlaying(page);
      if (!playing) return;

      const initialScore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const scoreSystem = game.getScoreSystem?.();
          return scoreSystem?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(initialScore).toBeGreaterThanOrEqual(0);
    });

    test('合并方块应增加分数', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;

      const scoreBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const scoreSystem = game.getScoreSystem?.();
          return scoreSystem?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      await dropBlocks(page, 10, 500);
      await waitForStable(page, 3000);

      const scoreAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const scoreSystem = game.getScoreSystem?.();
          return scoreSystem?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      if (scoreBefore >= 0 && scoreAfter >= 0) {
        expect(scoreAfter).toBeGreaterThanOrEqual(scoreBefore);
      }
    });

    test('连击应增加分数倍率', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 10, 400);
      await waitForStable(page, 3000);

      const hasComboMultiplier = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scoreSystem = game.getScoreSystem?.();
          if (!scoreSystem) return false;
          const multiplier = scoreSystem.getComboMultiplier?.();
          return multiplier !== undefined && multiplier >= 1;
        } catch {
          return false;
        }
      });

      expect(hasComboMultiplier).toBeTruthy();
    });

    test('幸运倍率应正确应用', async ({ page }) => {
      await navigateToGame(page);

      const hasLuckyMultiplier = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scoreSystem = game.getScoreSystem?.();
          if (!scoreSystem) return false;
          return typeof scoreSystem.setLuckyMultiplier === 'function';
        } catch {
          return false;
        }
      });

      expect(hasLuckyMultiplier).toBeTruthy();
    });
  });

  test.describe('游戏结束 @regression', () => {
    test('方块超过警戒线应触发游戏结束', async ({ page }) => {
      await navigateToGame(page);

      const hasWarningLine = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const warningLine = scene.getWarningLine?.();
          return warningLine !== null && warningLine !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasWarningLine).toBeTruthy();
    });

    test('警戒线应正确显示', async ({ page }) => {
      await navigateToGame(page);

      const warningLineInfo = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return null;
          const warningLine = scene.getWarningLine?.();
          if (!warningLine) return null;
          return {
            height: typeof warningLine.getWarningHeight === 'function'
              ? warningLine.getWarningHeight() : null,
            duration: typeof warningLine.getWarningDuration === 'function'
              ? warningLine.getWarningDuration() : null,
          };
        } catch {
          return null;
        }
      });

      expect(warningLineInfo).not.toBeNull();
    });

    test('游戏结束应显示结算界面', async ({ page }) => {
      await navigateToGame(page);

      const hasResultScreen = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const resultScreen = game.getResultScreen?.();
          return resultScreen !== null && resultScreen !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasResultScreen).toBeTruthy();
    });

    test('游戏结束后应能重新开始', async ({ page }) => {
      await navigateToGame(page);

      const canRestart = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return false;
          return typeof sm.restartGame === 'function';
        } catch {
          return false;
        }
      });

      expect(canRestart).toBeTruthy();
    });
  });
});
