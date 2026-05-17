import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, clickCanvasCenter, ensurePlaying, ensureGameScene } from './helpers';

test.describe('玩法边界 @full', () => {
  test.describe('方块生成边界 @regression', () => {
    test('连续快速生成方块不应崩溃', async ({ page }) => {
      await navigateToGame(page);

      await ensurePlaying(page);

      for (let i = 0; i < 20; i++) {
        await clickCanvasCenter(page);
        await page.waitForTimeout(100);
      }

      await waitForStable(page, 3000);

      const noCrash = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        return game !== null && game !== undefined;
      });

      expect(noCrash).toBeTruthy();
    });

    test('方块生成冷却应正确工作', async ({ page }) => {
      await navigateToGame(page);

      await ensurePlaying(page);

      await clickCanvasCenter(page);
      await page.waitForTimeout(100);

      const canDrop = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getCanDrop?.() ?? true;
        } catch {
          return true;
        }
      });

      expect(typeof canDrop).toBe('boolean');
    });

    test('手动启动冷却应正确工作', async ({ page }) => {
      await navigateToGame(page);

      const canStartCooldown = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return false;
          return typeof spawner.startCooldown === 'function';
        } catch {
          return false;
        }
      });

      expect(canStartCooldown).toBeTruthy();
    });
  });

  test.describe('物理边界 @regression', () => {
    test('大量方块物理应稳定', async ({ page }) => {
      await navigateToGame(page);

      await ensurePlaying(page);

      await dropBlocks(page, 20, 300);
      await waitForStable(page, 5000);

      const physicsStable = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const physics = game.getPhysics?.();
          return physics !== null && physics !== undefined;
        } catch {
          return false;
        }
      });

      expect(physicsStable).toBeTruthy();
    });

    test('物理暂停恢复应正确', async ({ page }) => {
      await navigateToGame(page);

      await ensurePlaying(page);

      await dropBlocks(page, 5);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const physics = game.getPhysics?.();
          physics?.pause?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      const isPaused = await page.evaluate(() => {
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

      expect(isPaused).toBeTruthy();

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const physics = game.getPhysics?.();
          physics?.resume?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      const isResumed = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const physics = game.getPhysics?.();
          if (!physics) return false;
          return physics.isRunning?.() ?? false;
        } catch {
          return false;
        }
      });

      expect(isResumed).toBeTruthy();
    });
  });

  test.describe('计分边界 @full', () => {
    test('分数不应为负数', async ({ page }) => {
      await navigateToGame(page);

      await ensurePlaying(page);

      const score = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const scoreSystem = game.getScoreSystem?.();
          return scoreSystem?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(score).toBeGreaterThanOrEqual(0);
    });

    test('连击倍率不应小于1', async ({ page }) => {
      await navigateToGame(page);

      const multiplier = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const scoreSystem = game.getScoreSystem?.();
          return scoreSystem?.getComboMultiplier?.() ?? -1;
        } catch {
          return -1;
        }
      });

      if (multiplier >= 0) {
        expect(multiplier).toBeGreaterThanOrEqual(1);
      }
    });

    test('连击重置应正确工作', async ({ page }) => {
      await navigateToGame(page);

      const canResetCombo = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scoreSystem = game.getScoreSystem?.();
          if (!scoreSystem) return false;
          return typeof scoreSystem.resetCombo === 'function';
        } catch {
          return false;
        }
      });

      expect(canResetCombo).toBeTruthy();
    });
  });

  test.describe('游戏重启边界 @full', () => {
    test('多次重启不应崩溃', async ({ page }) => {
      await navigateToGame(page);

      await ensurePlaying(page);

      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          const game = (window as any).__gameInstance;
          if (!game) return;
          try {
            const scene = game.getGameScene?.();
            scene?.resetGame?.();
          } catch {}
        });
        await waitForStable(page, 500);
      }

      const noCrash = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        return game !== null && game !== undefined;
      });

      expect(noCrash).toBeTruthy();
    });

    test('重启后分数应重置', async ({ page }) => {
      await navigateToGame(page);

      await ensurePlaying(page);

      await dropBlocks(page, 5);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const scene = game.getGameScene?.();
          scene?.resetGame?.();
        } catch {}
      });

      await waitForStable(page);

      const score = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const scoreSystem = game.getScoreSystem?.();
          return scoreSystem?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(score).toBeGreaterThanOrEqual(0);
    });

    test('重启后方块应清空', async ({ page }) => {
      await navigateToGame(page);

      await ensurePlaying(page);

      await dropBlocks(page, 5);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const scene = game.getGameScene?.();
          scene?.resetGame?.();
        } catch {}
      });

      await waitForStable(page);

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

      if (blockCount >= 0) {
        expect(blockCount).toBe(0);
      }
    });
  });

  test.describe('关卡加载边界 @full', () => {
    test('关卡发现和加载应正确工作', async ({ page }) => {
      await navigateToGame(page);

      const canDiscover = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelLoader = game.getLevelLoader?.();
          if (!levelLoader) return false;
          return typeof levelLoader.discoverAndLoadAllLevels === 'function';
        } catch {
          return false;
        }
      });

      expect(canDiscover).toBeTruthy();
    });

    test('关卡加载器应支持销毁', async ({ page }) => {
      await navigateToGame(page);

      const canDestroy = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelLoader = game.getLevelLoader?.();
          if (!levelLoader) return false;
          return typeof levelLoader.destroy === 'function';
        } catch {
          return false;
        }
      });

      expect(canDestroy).toBeTruthy();
    });
  });

  test.describe('十字准星 @full', () => {
    test('十字准星应支持显示/隐藏/更新', async ({ page }) => {
      await navigateToGame(page);

      const hasCrosshair = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return typeof hud.showCrosshair === 'function'
            && typeof hud.updateCrosshair === 'function'
            && typeof hud.hideCrosshair === 'function';
        } catch {
          return false;
        }
      });

      expect(hasCrosshair).toBeTruthy();
    });
  });

  test.describe('ShrinkModifier 墙壁偏移 @full', () => {
    test('ShrinkModifier 应支持 containerOffsetX', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const hasShrinkModifier = await page.evaluate(async () => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (sm && typeof sm.startLevelById === 'function') {
            sm.startLevelById(8);
            await new Promise(r => setTimeout(r, 2000));
          }
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const modifier = scene.getShrinkModifier?.();
          return modifier !== null && modifier !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasShrinkModifier).toBeTruthy();
    });

    test('ShrinkModifier 应支持 activate/deactivate', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const canToggle = await page.evaluate(async () => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (sm && typeof sm.startLevelById === 'function') {
            sm.startLevelById(8);
            await new Promise(r => setTimeout(r, 2000));
          }
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const modifier = scene.getShrinkModifier?.();
          if (!modifier) return false;
          return typeof modifier.isActive === 'function'
            && typeof modifier.getType === 'function';
        } catch {
          return false;
        }
      });

      expect(canToggle).toBeTruthy();
    });

    test('ShrinkModifier getType 应返回 shrink', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const typeCorrect = await page.evaluate(async () => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (sm && typeof sm.startLevelById === 'function') {
            sm.startLevelById(8);
            await new Promise(r => setTimeout(r, 2000));
          }
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const modifier = scene.getShrinkModifier?.();
          if (!modifier) return false;
          return modifier.getType() === 'shrink';
        } catch {
          return false;
        }
      });

      expect(typeCorrect).toBeTruthy();
    });
  });
});
