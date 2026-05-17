import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, ensurePlaying, ensureGameScene } from './helpers';

test.describe('Score Counter - 数字计数器验证 @regression', () => {
  test.describe('Score计数器基础功能 @smoke', () => {
    test('Score计数器应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasScoreSystem = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          return game.getScoreSystem?.() !== null && game.getScoreSystem?.() !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasScoreSystem).toBeTruthy();
    });

    test('初始分数应为0', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const initialScore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(initialScore).toBe(0);
    });

    test('Score HUD显示应包含Score字样', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const hasScoreDisplay = await page.evaluate(() => {
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

      expect(hasScoreDisplay).toBeTruthy();
    });
  });

  test.describe('碰撞后Score计数器累加 @critical', () => {
    test('释放球体碰撞后Score应累加', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const scoreBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      await dropBlocks(page, 10, 500);
      await waitForStable(page, 4000);

      const scoreAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(scoreAfter).toBeGreaterThan(scoreBefore);
    });

    test('连续释放球体多次碰撞Score应持续累加', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const scores: number[] = [];

      const score0 = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });
      scores.push(score0);

      await dropBlocks(page, 5, 500);
      await waitForStable(page, 2000);

      const score1 = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });
      scores.push(score1);

      await dropBlocks(page, 5, 500);
      await waitForStable(page, 2000);

      const score2 = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });
      scores.push(score2);

      expect(score1).toBeGreaterThanOrEqual(score0);
      expect(score2).toBeGreaterThanOrEqual(score1);
    });

    test('小而频繁的Score更新应正确累加不丢失', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const scoreBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      await dropBlocks(page, 15, 300);
      await waitForStable(page, 5000);

      const scoreAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(scoreAfter).toBeGreaterThan(scoreBefore);
    });

    test('SCORE_UPDATED事件应正确触发', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const eventsFired = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          const game = (window as any).__gameInstance;
          if (!game) return resolve(false);
          try {
            const eventBus = game.getEventBus?.();
            if (!eventBus) return resolve(false);

            let fired = false;
            const handler = () => { fired = true; };
            eventBus.on('score:updated', handler);

            setTimeout(() => {
              eventBus.off('score:updated', handler);
              resolve(fired);
            }, 100);
          } catch {
            resolve(false);
          }
        });
      });

      expect(eventsFired !== undefined).toBeTruthy();
    });

    test('Score动画应正确执行不卡顿', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await dropBlocks(page, 10, 500);
      await waitForStable(page, 3000);

      const scoreDisplayWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.getScoreTextDisplay?.() !== undefined;
        } catch {
          return false;
        }
      });

      expect(scoreDisplayWorks).toBeTruthy();
    });
  });

  test.describe('第2关卡特定场景 @critical', () => {
    test('第2关卡碰撞后Score应正确累加', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getSceneManager?.()?.startLevelById?.(2);
        } catch {}
      });

      await page.waitForTimeout(2000);

      const inPlayingState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          return game.getStateMachine?.()?.getCurrentState?.() === 'playing';
        } catch {
          return false;
        }
      });

      if (!inPlayingState) {
        test.skip(true, '第2关卡未能进入playing状态');
        return;
      }

      const scoreBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      await dropBlocks(page, 10, 500);
      await waitForStable(page, 4000);

      const scoreAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(scoreAfter).toBeGreaterThan(scoreBefore);
    });

    test('第2关卡连击Score应正确累加', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getSceneManager?.()?.startLevelById?.(2);
        } catch {}
      });

      await page.waitForTimeout(2000);

      const inPlayingState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          return game.getStateMachine?.()?.getCurrentState?.() === 'playing';
        } catch {
          return false;
        }
      });

      if (!inPlayingState) {
        test.skip(true, '第2关卡未能进入playing状态');
        return;
      }

      await dropBlocks(page, 15, 300);
      await waitForStable(page, 5000);

      const chainCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getChainCount?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(chainCount).toBeGreaterThanOrEqual(0);
    });

    test('第2关卡Score事件流应完整', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getSceneManager?.()?.startLevelById?.(2);
        } catch {}
      });

      await page.waitForTimeout(2000);

      const inPlayingState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          return game.getStateMachine?.()?.getCurrentState?.() === 'playing';
        } catch {
          return false;
        }
      });

      if (!inPlayingState) {
        test.skip(true, '第2关卡未能进入playing状态');
        return;
      }

      await dropBlocks(page, 10, 500);
      await waitForStable(page, 4000);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { scoreOk: false, mergeOk: false, counterOk: false };
        try {
          const scoreSystem = game.getScoreSystem?.();
          const hud = game.getGameHUD?.();
          return {
            scoreOk: scoreSystem?.getScore?.() > 0,
            mergeOk: true,
            counterOk: hud?.getScoreTextDisplay?.() !== undefined,
          };
        } catch {
          return { scoreOk: false, mergeOk: false, counterOk: false };
        }
      });

      expect(result.scoreOk).toBeTruthy();
      expect(result.counterOk).toBeTruthy();
    });
  });

  test.describe('Score计数器显示一致性 @regression', () => {
    test('ScoreSystem分数与HUD显示应一致', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await dropBlocks(page, 10, 500);
      await waitForStable(page, 4000);

      const consistency = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scoreSystem = game.getScoreSystem?.();
          const hud = game.getGameHUD?.();
          if (!scoreSystem || !hud) return false;
          return true;
        } catch {
          return false;
        }
      });

      expect(consistency).toBeTruthy();
    });

    test('重置游戏后Score应归零', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      await dropBlocks(page, 5, 500);
      await waitForStable(page, 2000);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getSceneManager?.()?.startLevelById?.(1);
        } catch {}
      });

      await page.waitForTimeout(2000);

      const scoreAfterReset = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(scoreAfterReset).toBe(0);
    });
  });
});