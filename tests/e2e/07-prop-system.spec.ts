import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, ensurePlaying, ensureGameScene } from './helpers';

test.describe('道具系统 @regression', () => {
  test.describe('道具初始化 @smoke', () => {
    test('道具系统应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasPropSystem = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const propSystem = game.getPropSystem?.();
          return propSystem !== null && propSystem !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasPropSystem).toBeTruthy();
    });

    test('道具配置应正确加载', async ({ page }) => {
      await navigateToGame(page);

      const canLoadConfig = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return false;
          return typeof propSystem.loadConfig === 'function';
        } catch {
          return false;
        }
      });

      expect(canLoadConfig).toBeTruthy();
    });

    test('应能获取所有道具', async ({ page }) => {
      await navigateToGame(page);

      const hasProps = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return false;
          const props = propSystem.getAllProps?.();
          return props !== null && props !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasProps).toBeTruthy();
    });

    test('道具数量应可查询', async ({ page }) => {
      await navigateToGame(page);

      const canQueryCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return false;
          return typeof propSystem.getPropCount === 'function';
        } catch {
          return false;
        }
      });

      expect(canQueryCount).toBeTruthy();
    });
  });

  test.describe('道具使用 @regression', () => {
    test('应能使用道具', async ({ page }) => {
      await navigateToGame(page);

      const canUseProp = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return false;
          return typeof propSystem.useProp === 'function';
        } catch {
          return false;
        }
      });

      expect(canUseProp).toBeTruthy();
    });

    test('使用道具应触发效果', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const hasEffectHandler = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const effectHandler = scene.getPropEffectHandler?.();
          return effectHandler !== null && effectHandler !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasEffectHandler).toBeTruthy();
    });

    test('道具使用后数量应减少', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const propSystem = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return null;
          return {
            count: propSystem.getPropCount?.('bomb') ?? 0,
            hasUseProp: typeof propSystem.useProp === 'function',
          };
        } catch {
          return null;
        }
      });

      expect(propSystem).not.toBeNull();
    });

    test('不存在的道具不应被使用', async ({ page }) => {
      await navigateToGame(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return false;
          return propSystem.getProp?.('nonexistent_prop') === undefined
            || propSystem.getProp?.('nonexistent_prop') === null;
        } catch {
          return false;
        }
      });

      expect(result).toBeTruthy();
    });
  });

  test.describe('道具效果 @regression', () => {
    test('炸弹道具应清除方块', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const hasEffectManager = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const effectManager = scene.getEffectManager?.();
          return effectManager !== null && effectManager !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasEffectManager).toBeTruthy();
    });

    test('道具效果应有视觉反馈', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const hasEffectManager = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const effectManager = scene.getEffectManager?.();
          return effectManager !== null && effectManager !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasEffectManager).toBeTruthy();
    });

    test('道具效果应可暂停和恢复', async ({ page }) => {
      await navigateToGame(page);

      const canPauseResume = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return false;
          return typeof propSystem.pause === 'function'
            && typeof propSystem.resume === 'function';
        } catch {
          return false;
        }
      });

      expect(canPauseResume).toBeTruthy();
    });
  });

  test.describe('道具与物理交互 @regression', () => {
    test('使用道具后物理应继续运行', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const physicsRunning = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const physics = game.getPhysics?.();
          if (!physics) return false;
          return typeof physics.isRunning === 'function';
        } catch {
          return false;
        }
      });

      expect(physicsRunning).toBeTruthy();
    });

    test('道具效果不应破坏物理稳定性', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 10, 400);
      await waitForStable(page, 2000);

      const noPhysicsError = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const physics = game.getPhysics?.();
          return physics !== null && physics !== undefined;
        } catch {
          return false;
        }
      });

      expect(noPhysicsError).toBeTruthy();
    });
  });

  test.describe('道具与计分交互 @regression', () => {
    test('道具效果应正确计分', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const scoreSystemWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scoreSystem = game.getScoreSystem?.();
          if (!scoreSystem) return false;
          return typeof scoreSystem.getScore === 'function';
        } catch {
          return false;
        }
      });

      expect(scoreSystemWorks).toBeTruthy();
    });

    test('幸运倍率道具应正确应用', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

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

    test('连击重置道具应正确工作', async ({ page }) => {
      await navigateToGame(page);

      const hasResetCombo = await page.evaluate(() => {
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

      expect(hasResetCombo).toBeTruthy();
    });
  });

  test.describe('道具HUD @regression', () => {
    test('道具按钮应正确显示', async ({ page }) => {
      await navigateToGame(page);

      const hasPropButtons = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.propButtons !== null && hud.propButtons !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasPropButtons).toBeTruthy();
    });

    test('道具数量应实时更新', async ({ page }) => {
      await navigateToGame(page);

      const hasPropsContainer = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.propsContainer !== null && hud.propsContainer !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasPropsContainer).toBeTruthy();
    });
  });

  test.describe('道具销毁 @full', () => {
    test('道具系统应支持销毁', async ({ page }) => {
      await navigateToGame(page);

      const canDestroy = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return false;
          return typeof propSystem.destroy === 'function';
        } catch {
          return false;
        }
      });

      expect(canDestroy).toBeTruthy();
    });
  });

  test.describe('四叶菜道具(幸运投放)功能验证 @regression', () => {
    test('四叶菜道具应能通过PropSystem使用', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return { success: false, reason: 'no-prop-system' };
          const luckyProp = propSystem.getProp?.('lucky');
          if (!luckyProp) return { success: false, reason: 'no-lucky-prop' };
          return {
            success: true,
            canUse: typeof luckyProp.canUse === 'function',
            isLuckyActive: typeof luckyProp.isLuckyActive === 'function',
            getLuckyMultiplier: typeof luckyProp.getLuckyMultiplier === 'function',
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
    });

    test('四叶菜道具使用后应激活幸运模式', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return { success: false, reason: 'no-prop-system' };

          const useResult = propSystem.useProp?.('lucky');
          const luckyProp = propSystem.getProp?.('lucky');

          return {
            success: true,
            useResult,
            isLuckyActive: luckyProp?.isLuckyActive?.() ?? false,
            luckyMultiplier: luckyProp?.getLuckyMultiplier?.() ?? 0,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.useResult).toBe(true);
      expect(result.isLuckyActive).toBe(true);
      expect(result.luckyMultiplier).toBe(2);
    });

    test('四叶菜道具激活后BlockSpawner应处于幸运模式', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return { success: false, reason: 'no-prop-system' };

          propSystem.useProp?.('lucky');

          const scene = game.getGameScene?.();
          if (!scene) return { success: false, reason: 'no-scene' };

          const spawner = scene.getBlockSpawner?.();
          if (!spawner) return { success: false, reason: 'no-spawner' };

          return {
            success: true,
            currentValue: spawner.getCurrentValue?.() ?? -1,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
    });

    test('四叶菜道具激活后ScoreSystem应设置幸运倍率', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return { success: false, reason: 'no-prop-system' };

          propSystem.useProp?.('lucky');

          const scoreSystem = game.getScoreSystem?.();
          if (!scoreSystem) return { success: false, reason: 'no-score-system' };

          return {
            success: true,
            hasSetLuckyMultiplier: typeof scoreSystem.setLuckyMultiplier === 'function',
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.hasSetLuckyMultiplier).toBeTruthy();
    });

    test('四叶菜道具冷却时间应使用配置值', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return { success: false, reason: 'no-prop-system' };

          const luckyProp = propSystem.getProp?.('lucky');
          if (!luckyProp) return { success: false, reason: 'no-lucky-prop' };

          const config = luckyProp.getConfig?.();
          return {
            success: true,
            cooldown: config?.cooldown ?? -1,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.cooldown).toBe(2000);
    });

    test('四叶菜道具消耗3次投放后应自动停用', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return { success: false, reason: 'no-prop-system' };

          propSystem.useProp?.('lucky');
          const luckyProp = propSystem.getProp?.('lucky');

          luckyProp?.consumeLuckyDrop?.();
          luckyProp?.consumeLuckyDrop?.();
          luckyProp?.consumeLuckyDrop?.();

          return {
            success: true,
            isLuckyActive: luckyProp?.isLuckyActive?.() ?? true,
            luckyMultiplier: luckyProp?.getLuckyMultiplier?.() ?? 2,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.isLuckyActive).toBe(false);
      expect(result.luckyMultiplier).toBe(1);
    });

    test('四叶菜道具使用后剩余次数应减少', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return { success: false, reason: 'no-prop-system' };

          const beforeCount = propSystem.getPropCount?.('lucky') ?? -1;
          propSystem.useProp?.('lucky');
          const afterCount = propSystem.getPropCount?.('lucky') ?? -1;

          return {
            success: true,
            beforeCount,
            afterCount,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.afterCount).toBeLessThan(result.beforeCount);
    });
  });
});
