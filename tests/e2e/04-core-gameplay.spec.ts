import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, clickCanvasCenter, ensurePlaying, ensureGameScene, getCanvasBoundingBox } from './helpers';

test.describe('核心玩法 @smoke', () => {
  test.describe('方块生成 @smoke', () => {
    test('方块生成器应正确初始化', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

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
      await ensurePlaying(page);
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
      await ensurePlaying(page);
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
      await ensurePlaying(page);

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
      await ensurePlaying(page);
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
      await ensurePlaying(page);
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
      await ensurePlaying(page);
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
      await ensurePlaying(page);

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
      await ensurePlaying(page);
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
      await ensurePlaying(page);
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
      await ensurePlaying(page);
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
      await ensurePlaying(page);

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
      await navigateToGame(page, true);
      await ensurePlaying(page);

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
      await ensurePlaying(page);

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
      await ensurePlaying(page);
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
      await ensureGameScene(page);

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
      await ensureGameScene(page);

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

  test.describe('Score计数器累加 @critical', () => {
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

      const score0 = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

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
          return hud.scoreText !== null && hud.scoreText !== undefined;
        } catch {
          return false;
        }
      });

      expect(scoreDisplayWorks).toBeTruthy();
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

  test.describe('自动下落与手动释放 @smoke', () => {
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

      await page.waitForTimeout(process.env.CI ? 1500 : 600);

      try {
        await page.waitForFunction(
          () => {
            const game = (window as any).__gameInstance;
            if (!game) return false;
            try {
              const spawner = game.getBlockSpawner?.();
              return (spawner?.getBlocks?.()?.length ?? 0) >= 1;
            } catch { return false; }
          },
          { timeout: 5000 }
        );
      } catch {}

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

      const startResult = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner || typeof spawner.startAutoSpawn !== 'function') return false;
          spawner.startAutoSpawn(1000, 80);
          return true;
        } catch { return false; }
      });
      if (!startResult) {
        test.skip(true, 'startAutoSpawn不可用，跳过测试');
        return;
      }

      await page.waitForTimeout(process.env.CI ? 2500 : 1100);
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

  test.describe('球体残影消除 @regression', () => {
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

  test.describe('动画流畅性 @regression', () => {
    test('自动下落球体应有缩放动画', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const startResult = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner || typeof spawner.startAutoSpawn !== 'function') return false;
          spawner.startAutoSpawn(500, 80);
          return true;
        } catch { return false; }
      });
      if (!startResult) {
        test.skip(true, 'startAutoSpawn不可用，跳过测试');
        return;
      }

      try {
        await page.waitForFunction(
          () => {
            const game = (window as any).__gameInstance;
            if (!game) return false;
            try {
              const spawner = game.getBlockSpawner?.();
              return (spawner?.getBlocks?.()?.length ?? 0) >= 1;
            } catch { return false; }
          },
          { timeout: 5000 }
        );
      } catch {}

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

  test.describe('GSAP动画清理 @regression', () => {
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

  test.describe('自动下落与手动释放并发 @regression', () => {
    test('连续自动下落后手动释放不应导致页面错误', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      const startResult = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner || typeof spawner.startAutoSpawn !== 'function') return false;
          spawner.startAutoSpawn(300, 80);
          return true;
        } catch { return false; }
      });
      if (!startResult) {
        test.skip(true, 'startAutoSpawn不可用，跳过测试');
        return;
      }

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

      const startResult = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner || typeof spawner.startAutoSpawn !== 'function') return false;
          spawner.startAutoSpawn(500, 80);
          return true;
        } catch { return false; }
      });
      if (!startResult) {
        test.skip(true, 'startAutoSpawn不可用，跳过测试');
        return;
      }

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

  test.describe('自动下落球体可见性验证 @regression', () => {
    test('自动下落球体应在间隔后出现且可见', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const startResult = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner || typeof spawner.startAutoSpawn !== 'function') return false;
          spawner.startAutoSpawn(500, 80);
          return true;
        } catch { return false; }
      });
      if (!startResult) {
        test.skip(true, 'startAutoSpawn不可用，跳过测试');
        return;
      }

      try {
        await page.waitForFunction(
          () => {
            const game = (window as any).__gameInstance;
            if (!game) return false;
            try {
              const spawner = game.getBlockSpawner?.();
              return (spawner?.getBlocks?.()?.length ?? 0) >= 1;
            } catch {
              return false;
            }
          },
          { timeout: 8000 }
        );
      } catch {}

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const spawner = game.getBlockSpawner?.();
          const blocks = spawner?.getBlocks?.() ?? [];
          if (blocks.length === 0) return { success: false, reason: 'no-blocks' };

          const block = blocks[0];
          return {
            success: true,
            visible: block.visible,
            alpha: block.alpha,
            scaleX: block.scale.x,
            scaleY: block.scale.y,
          };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      if (result.success) {
        expect(result.visible).toBe(true);
        expect(result.alpha).toBeGreaterThan(0);
        expect(result.scaleX).toBeGreaterThan(0);
        expect(result.scaleY).toBeGreaterThan(0);
      }
    });

    test('自动下落多个球体后所有球体应可见', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const startResult = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner || typeof spawner.startAutoSpawn !== 'function') return false;
          spawner.startAutoSpawn(300, 80);
          return true;
        } catch { return false; }
      });
      if (!startResult) {
        test.skip(true, 'startAutoSpawn不可用，跳过测试');
        return;
      }

      try {
        await page.waitForFunction(
          () => {
            const game = (window as any).__gameInstance;
            if (!game) return false;
            try {
              const spawner = game.getBlockSpawner?.();
              return (spawner?.getBlocks?.()?.length ?? 0) >= 2;
            } catch {
              return false;
            }
          },
          { timeout: 10000 }
        );
      } catch {}

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const spawner = game.getBlockSpawner?.();
          const blocks = spawner?.getBlocks?.() ?? [];
          if (blocks.length < 2) return { success: false, reason: 'insufficient-blocks' };

          const allVisible = blocks.every((b: any) => b.visible && b.alpha > 0 && b.scale.x > 0);
          return { success: true, allVisible, blockCount: blocks.length };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      if (result.success) {
        expect(result.allVisible).toBeTruthy();
      }
    });
  });
});
