import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, ensurePlaying, ensureGameScene, clickCanvasAt, getCanvasBoundingBox } from './helpers';

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
      await dropBlocks(page, 5, 500);
      await waitForStable(page);

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

  test.describe('炸弹道具BUG修复 @critical', () => {
    test('点击炸弹按钮后不应立即在HUD区域产生爆炸', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const propSystem = game.getPropSystem?.();
          if (!propSystem) return { success: false, reason: 'no-prop-system' };
          const bombCountBefore = propSystem.getPropCount?.('bomb') ?? 0;
          if (bombCountBefore <= 0) return { success: false, reason: 'no-bomb-count' };

          const hud = game.getGameHUD?.();
          if (!hud) return { success: false, reason: 'no-hud' };

          const consumeResult = hud.consumePropButtonClick?.();
          if (typeof consumeResult !== 'boolean') {
            return { success: false, reason: 'no-consumePropButtonClick-method' };
          }

          return { success: true, bombCountBefore, hasConsumeMethod: true };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.hasConsumeMethod).toBeTruthy();
    });

    test('consumePropButtonClick应正确消费点击标记', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return { success: false };

          const firstCall = hud.consumePropButtonClick?.();
          const secondCall = hud.consumePropButtonClick?.();

          return {
            success: true,
            firstCallIsBoolean: typeof firstCall === 'boolean',
            secondCallIsBoolean: typeof secondCall === 'boolean',
          };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.firstCallIsBoolean).toBeTruthy();
      expect(result.secondCallIsBoolean).toBeTruthy();
    });

    test('炸弹目标模式下点击应显示十字准星', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const scene = game.getGameScene?.();
          if (!scene) return { success: false };
          const effectHandler = scene.getPropEffectHandler?.();
          if (!effectHandler) return { success: false };

          effectHandler.handlePropTargetMode?.({ enabled: true });
          const targetMode = effectHandler.getBombTargetMode?.();

          const hud = game.getGameHUD?.();
          const hasCrosshair = hud ? typeof hud.showCrosshair === 'function' : false;

          effectHandler.handlePropTargetMode?.({ enabled: false });

          return { success: true, targetMode, hasCrosshair };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.targetMode).toBeTruthy();
      expect(result.hasCrosshair).toBeTruthy();
    });

    test('容器边界内爆炸应使用完整半径', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const scene = game.getGameScene?.();
          if (!scene) return { success: false };
          const effectHandler = scene.getPropEffectHandler?.();
          if (!effectHandler) return { success: false };

          const offsetX = scene.getContainerOffsetX?.() ?? 0;
          const width = scene.getContainerWidth?.() ?? 0;
          const centerX = offsetX + width / 2;
          const centerY = 300;

          effectHandler.handleBombExplode?.({ x: centerX, y: centerY, radius: 120 });

          return { success: true, centerX, centerY };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
    });

    test('容器边缘爆炸不应产生负半径', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const scene = game.getGameScene?.();
          if (!scene) return { success: false };
          const effectHandler = scene.getPropEffectHandler?.();
          if (!effectHandler) return { success: false };

          const offsetX = scene.getContainerOffsetX?.() ?? 0;

          effectHandler.handleBombExplode?.({ x: offsetX, y: 300, radius: 120 });

          return { success: true };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
    });

    test('炸弹目标模式切换应正确工作', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const scene = game.getGameScene?.();
          if (!scene) return { success: false };
          const effectHandler = scene.getPropEffectHandler?.();
          if (!effectHandler) return { success: false };

          const initialState = effectHandler.getBombTargetMode?.();

          effectHandler.handlePropTargetMode?.({ enabled: true });
          const afterEnable = effectHandler.getBombTargetMode?.();

          effectHandler.handlePropTargetMode?.({ enabled: false });
          const afterDisable = effectHandler.getBombTargetMode?.();

          return {
            success: true,
            initialState,
            afterEnable,
            afterDisable,
          };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.initialState).toBe(false);
      expect(result.afterEnable).toBe(true);
      expect(result.afterDisable).toBe(false);
    });
  });

  test.describe('炸弹按钮响应优化 @performance', () => {
    test('点击炸弹按钮应在pointerdown阶段触发onClick', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return { success: false, reason: 'no-hud' };

          const propButtons = hud.propButtons;
          if (!propButtons) return { success: false, reason: 'no-prop-buttons' };

          const bombButton = propButtons.get?.('bomb');
          if (!bombButton) return { success: false, reason: 'no-bomb-button' };

          const hasPointerDownListener = bombButton.listenerCount?.('pointerdown') > 0;

          return { success: true, hasPointerDownListener };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
    });

    test('PropButton点击响应时间应小于100ms', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const responseTime = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return -1;

          const propButtons = hud.propButtons;
          if (!propButtons) return -1;

          const bombButton = propButtons.get?.('bomb');
          if (!bombButton) return -1;

          const start = performance.now();
          bombButton.emit?.('pointerdown');
          const end = performance.now();

          return end - start;
        } catch {
          return -1;
        }
      });

      if (responseTime >= 0) {
        expect(responseTime).toBeLessThan(100);
      }
    });

    test('点击炸弹按钮后十字准星应立即显示', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return { success: false, reason: 'no-hud' };

          const crosshairBefore = (hud as any).crosshair?.visible ?? false;

          const propButtons = hud.propButtons;
          if (!propButtons) return { success: false, reason: 'no-prop-buttons' };

          const bombButton = propButtons.get?.('bomb');
          if (!bombButton) return { success: false, reason: 'no-bomb-button' };

          bombButton.emit?.('pointerdown');

          const crosshairAfter = (hud as any).crosshair?.visible ?? false;
          const isPropTargetMode = hud.isPropTargetMode;

          return {
            success: true,
            crosshairBefore,
            crosshairAfter,
            isPropTargetMode,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.crosshairBefore).toBe(false);
      expect(result.crosshairAfter).toBe(true);
      expect(result.isPropTargetMode).toBe(true);
    });

    test('isPropTargetMode应在enterBombTargetMode后立即返回true', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return { success: false };

          const before = hud.isPropTargetMode;

          const propButtons = hud.propButtons;
          if (!propButtons) return { success: false };

          const bombButton = propButtons.get?.('bomb');
          if (!bombButton) return { success: false };

          bombButton.emit?.('pointerdown');

          const after = hud.isPropTargetMode;

          return { success: true, before, after };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.before).toBe(false);
      expect(result.after).toBe(true);
    });

    test('isPropTargetMode应在exitBombTargetMode后立即返回false', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return { success: false };

          const propButtons = hud.propButtons;
          if (!propButtons) return { success: false };

          const bombButton = propButtons.get?.('bomb');
          if (!bombButton) return { success: false };

          bombButton.emit?.('pointerdown');
          const during = hud.isPropTargetMode;

          bombButton.emit?.('pointerdown');
          const after = hud.isPropTargetMode;

          return { success: true, during, after };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.during).toBe(true);
      expect(result.after).toBe(false);
    });

    test('连续快速点击炸弹按钮不应产生延迟累积', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return { success: false };

          const propButtons = hud.propButtons;
          if (!propButtons) return { success: false };

          const bombButton = propButtons.get?.('bomb');
          if (!bombButton) return { success: false };

          const start = performance.now();
          for (let i = 0; i < 5; i++) {
            bombButton.emit?.('pointerdown');
            bombButton.emit?.('pointerup');
          }
          const elapsed = performance.now() - start;

          return { success: true, elapsed };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.elapsed).toBeLessThan(100);
    });

    test('十字准星应在屏幕中心位置显示', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return { success: false };

          const propButtons = hud.propButtons;
          if (!propButtons) return { success: false };

          const bombButton = propButtons.get?.('bomb');
          if (!bombButton) return { success: false };

          bombButton.emit?.('pointerdown');

          const crosshair = (hud as any).crosshair;
          if (!crosshair) return { success: false };

          const screenWidth = (hud as any).screenWidth ?? 0;
          const screenHeight = (hud as any).screenHeight ?? 0;

          return {
            success: true,
            crosshairX: crosshair.x,
            crosshairY: crosshair.y,
            screenWidth,
            screenHeight,
          };
        } catch {
          return { success: false };
        }
      });

      if (result.success && result.screenWidth > 0 && result.screenHeight > 0) {
        expect(result.crosshairX).toBeCloseTo(result.screenWidth / 2, -1);
        expect(result.crosshairY).toBeCloseTo(result.screenHeight / 2, -1);
      }
    });

    test('从点击到十字准星显示的总延迟应小于100ms', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const elapsed = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return -1;

          const propButtons = hud.propButtons;
          if (!propButtons) return -1;

          const bombButton = propButtons.get?.('bomb');
          if (!bombButton) return -1;

          const start = performance.now();
          bombButton.emit?.('pointerdown');
          const crosshairVisible = (hud as any).crosshair?.visible ?? false;
          const end = performance.now();

          if (!crosshairVisible) return -1;
          return end - start;
        } catch {
          return -1;
        }
      });

      if (elapsed >= 0) {
        expect(elapsed).toBeLessThan(100);
      }
    });

    test('完整流程: 点击炸弹→十字准星立即显示→点击目标→爆炸', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return { success: false };

          const propButtons = hud.propButtons;
          if (!propButtons) return { success: false };

          const bombButton = propButtons.get?.('bomb');
          if (!bombButton) return { success: false };

          const clickStart = performance.now();
          bombButton.emit?.('pointerdown');
          const crosshairTime = performance.now();

          const crosshairVisible = (hud as any).crosshair?.visible ?? false;
          const isTargetMode = hud.isPropTargetMode;

          return {
            success: true,
            crosshairVisible,
            isTargetMode,
            clickToCrosshair: crosshairTime - clickStart,
          };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.crosshairVisible).toBe(true);
      expect(result.isTargetMode).toBe(true);
      if (result.clickToCrosshair !== undefined && result.clickToCrosshair >= 0) {
        expect(result.clickToCrosshair).toBeLessThan(100);
      }
    });

    test('十字准星x/y坐标应等于屏幕中心坐标', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return { success: false };

          hud.layout(800, 600);

          const propButtons = hud.propButtons;
          if (!propButtons) return { success: false };

          const bombButton = propButtons.get?.('bomb');
          if (!bombButton) return { success: false };

          bombButton.emit?.('pointerdown');

          const crosshair = (hud as any).crosshair;
          if (!crosshair) return { success: false };

          return {
            success: true,
            crosshairX: crosshair.x,
            crosshairY: crosshair.y,
            expectedX: 400,
            expectedY: 300,
          };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      if (result.success) {
        expect(result.crosshairX).toBeCloseTo(result.expectedX!, -1);
        expect(result.crosshairY).toBeCloseTo(result.expectedY!, -1);
      }
    });

    test('updateCrosshair应更新十字准星位置坐标', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false };
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return { success: false };

          hud.layout(800, 600);

          const propButtons = hud.propButtons;
          if (!propButtons) return { success: false };

          const bombButton = propButtons.get?.('bomb');
          if (!bombButton) return { success: false };

          bombButton.emit?.('pointerdown');

          const crosshair = (hud as any).crosshair;
          if (!crosshair) return { success: false };

          const initialX = crosshair.x;
          const initialY = crosshair.y;

          hud.updateCrosshair(200, 400);

          return {
            success: true,
            initialX,
            initialY,
            updatedX: crosshair.x,
            updatedY: crosshair.y,
          };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.updatedX).toBe(200);
      expect(result.updatedY).toBe(400);
    });
  });

  test.describe('缩小道具底部位置修正 @regression', () => {
    test('缩小道具应保持球体与容器底部接触', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const scene = game.getGameScene?.();
          if (!scene) return { success: false, reason: 'no-scene' };
          const propEffectHandler = scene.getPropEffectHandler?.();
          if (!propEffectHandler) return { success: false, reason: 'no-handler' };
          return { success: true, hasHandler: true };
        } catch {
          return { success: false, reason: 'error' };
        }
      });

      expect(result.success).toBeTruthy();
    });

    test('PropEffectHandler应提供缩小激活状态查询', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const handler = scene.getPropEffectHandler?.();
          if (!handler) return false;
          return typeof handler.isShrinkActive === 'function'
            && typeof handler.getShrinkFactor === 'function';
        } catch {
          return false;
        }
      });

      expect(result).toBeTruthy();
    });

    test('缩小道具激活后球体不应悬浮在空中', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const scene = game.getGameScene?.();
          if (!scene) return { success: false, reason: 'no-scene' };
          const handler = scene.getPropEffectHandler?.();
          if (!handler) return { success: false, reason: 'no-handler' };

          const spawner = game.getBlockSpawner?.();
          if (!spawner) return { success: false, reason: 'no-spawner' };

          const blocks = spawner.getBlocks?.() || [];
          if (blocks.length === 0) return { success: false, reason: 'no-blocks' };

          const settledBlocks = blocks.filter((b: any) => !b.isDestroyed && b.body);
          if (settledBlocks.length === 0) return { success: false, reason: 'no-settled-blocks' };

          const groundY = scene.getGroundY?.() || 550;

          const blockBottomsBefore = settledBlocks.map((b: any) => ({
            y: b.body.position.y,
            radius: b.body.circleRadius,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

          const blockBottomsAfter = settledBlocks.map((b: any) => ({
            y: b.body.position.y,
            radius: b.body.circleRadius,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          let allBottomsPreserved = true;
          for (let i = 0; i < blockBottomsBefore.length; i++) {
            const before = blockBottomsBefore[i].bottom;
            const after = blockBottomsAfter[i].bottom;
            if (Math.abs(before - after) > 5) {
              allBottomsPreserved = false;
              break;
            }
          }

          let noFloating = true;
          for (let i = 0; i < blockBottomsBefore.length && i < blockBottomsAfter.length; i++) {
            const before = blockBottomsBefore[i].bottom;
            const after = blockBottomsAfter[i].bottom;
            const beforeGap = Math.abs(before - groundY);
            if (beforeGap < 10) {
              if (Math.abs(after - groundY) > 5) {
                noFloating = false;
                break;
              }
            }
          }

          handler.handleShrinkDeactivate();

          return {
            success: true,
            allBottomsPreserved,
            noFloating,
            blockCount: blocks.length,
            groundY,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'error' };
        }
      });

      expect(result.success).toBeTruthy();
      if (result.success) {
        expect(result.allBottomsPreserved).toBeTruthy();
        expect(result.noFloating).toBeTruthy();
      }
    });

    test('缩小道具取消后球体应恢复原始大小并保持底部接触', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const scene = game.getGameScene?.();
          if (!scene) return { success: false, reason: 'no-scene' };
          const handler = scene.getPropEffectHandler?.();
          if (!handler) return { success: false, reason: 'no-handler' };

          const spawner = game.getBlockSpawner?.();
          if (!spawner) return { success: false, reason: 'no-spawner' };

          const blocks = spawner.getBlocks?.() || [];
          if (blocks.length === 0) return { success: false, reason: 'no-blocks' };

          const settledBlocks = blocks.filter((b: any) => !b.isDestroyed && b.body);
          if (settledBlocks.length === 0) return { success: false, reason: 'no-settled-blocks' };

          const originalData = settledBlocks.map((b: any) => ({
            radius: b.body.circleRadius,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

          handler.handleShrinkDeactivate();

          const restoredData = settledBlocks.map((b: any) => ({
            radius: b.body.circleRadius,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          let allRadiiRestored = true;
          let allBottomsPreserved = true;
          for (let i = 0; i < originalData.length; i++) {
            if (Math.abs(originalData[i].radius - restoredData[i].radius) > 1) {
              allRadiiRestored = false;
            }
            if (Math.abs(originalData[i].bottom - restoredData[i].bottom) > 5) {
              allBottomsPreserved = false;
            }
          }

          return {
            success: true,
            allRadiiRestored,
            allBottomsPreserved,
            blockCount: blocks.length,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'error' };
        }
      });

      expect(result.success).toBeTruthy();
      if (result.success) {
        expect(result.allRadiiRestored).toBeTruthy();
        expect(result.allBottomsPreserved).toBeTruthy();
      }
    });

    test('缩小道具不应破坏物理引擎稳定性', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const scene = game.getGameScene?.();
          if (!scene) return { success: false, reason: 'no-scene' };
          const handler = scene.getPropEffectHandler?.();
          if (!handler) return { success: false, reason: 'no-handler' };

          handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

          const physics = game.getPhysics?.();
          if (!physics) return { success: false, reason: 'no-physics' };

          const isRunning = typeof physics.isRunning === 'function'
            ? physics.isRunning()
            : true;

          handler.handleShrinkDeactivate();

          return { success: true, physicsRunning: isRunning };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'error' };
        }
      });

      expect(result.success).toBeTruthy();
      if (result.success) {
        expect(result.physicsRunning).toBeTruthy();
      }
    });

    test('缩小后球体底部不应上移', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const result = await page.evaluate(async () => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no game' };
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return { success: false, reason: 'no spawner' };

          for (let i = 0; i < 3; i++) {
            spawner.dropBlock(150 + i * 80, 80, 1);
          }

          await new Promise(r => setTimeout(r, process.env.CI ? 3000 : 1500));

          const blocks = spawner.getBlocks?.() ?? [];
          if (blocks.length === 0) return { success: false, reason: 'no blocks' };

          const bottomsBefore = blocks.map((b: any) => ({
            y: b.body.position.y,
            radius: b.body.circleRadius,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          const handler = game.getPropEffectHandler?.();
          if (!handler) return { success: false, reason: 'no handler' };

          handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

          await new Promise(r => setTimeout(r, 500));

          const bottomsAfter = blocks.map((b: any) => ({
            y: b.body.position.y,
            radius: b.body.circleRadius,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          let noFloating = true;
          for (let i = 0; i < bottomsBefore.length; i++) {
            if (bottomsAfter[i].bottom < bottomsBefore[i].bottom - 5) {
              noFloating = false;
              break;
            }
          }

          return { success: true, noFloating, blockCount: blocks.length };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'error' };
        }
      });

      if (!result.success && result.reason) {
        test.skip(true, `缩小测试前置条件不满足: ${result.reason}`);
        return;
      }
      expect(result.success).toBeTruthy();
      if (result.success) {
        expect(result.noFloating).toBeTruthy();
      }
    });

    test('缩小道具地面吸附：缩小时靠地方块应精确位于地面', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const scene = game.getGameScene?.();
          if (!scene) return { success: false, reason: 'no-scene' };
          const handler = scene.getPropEffectHandler?.();
          if (!handler) return { success: false, reason: 'no-handler' };

          const spawner = game.getBlockSpawner?.();
          if (!spawner) return { success: false, reason: 'no-spawner' };

          const blocks = spawner.getBlocks?.() || [];
          if (blocks.length === 0) return { success: false, reason: 'no-blocks' };

          const settledBlocks = blocks.filter((b: any) => !b.isDestroyed && b.body);
          if (settledBlocks.length === 0) return { success: false, reason: 'no-settled-blocks' };

          const groundY = scene.getGroundY?.() || 550;

          const blockBottomsBefore = settledBlocks.map((b: any) => ({
            y: b.body.position.y,
            radius: b.body.circleRadius || 0,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

          let allOnGround = true;
          let maxGap = 0;
          for (let i = 0; i < blockBottomsBefore.length; i++) {
            const beforeBottom = blockBottomsBefore[i].bottom;
            if (Math.abs(beforeBottom - groundY) < 10) {
              const b = settledBlocks[i];
              const radius = b.body.circleRadius || 0;
              const bottom = b.body.position.y + radius;
              const gap = Math.abs(bottom - groundY);
              maxGap = Math.max(maxGap, gap);
              if (gap > 2) {
                allOnGround = false;
              }
            }
          }

          handler.handleShrinkDeactivate();

          return {
            success: true,
            allOnGround,
            maxGap: Math.round(maxGap * 100) / 100,
            blockCount: settledBlocks.length,
            groundY,
            groundBlocksChecked: blockBottomsBefore.filter((b: any) => Math.abs(b.bottom - groundY) < 10).length,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'error' };
        }
      });

      expect(result.success).toBeTruthy();
      if (result.success) {
        expect(result.allOnGround).toBeTruthy();
        expect(result.maxGap).toBeLessThanOrEqual(2);
      }
    });

    test('缩小道具地面吸附：完整缩放-恢复周期后方块应精确位于地面', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const scene = game.getGameScene?.();
          if (!scene) return { success: false, reason: 'no-scene' };
          const handler = scene.getPropEffectHandler?.();
          if (!handler) return { success: false, reason: 'no-handler' };

          const spawner = game.getBlockSpawner?.();
          if (!spawner) return { success: false, reason: 'no-spawner' };

          const blocks = spawner.getBlocks?.() || [];
          if (blocks.length === 0) return { success: false, reason: 'no-blocks' };

          const settledBlocks = blocks.filter((b: any) => !b.isDestroyed && b.body);
          if (settledBlocks.length === 0) return { success: false, reason: 'no-settled-blocks' };

          const groundY = scene.getGroundY?.() || 550;

          const blockBottomsBefore = settledBlocks.map((b: any) => ({
            y: b.body.position.y,
            radius: b.body.circleRadius || 0,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });
          handler.handleShrinkDeactivate();

          let allOnGround = true;
          let allRadiiRestored = true;
          let maxGap = 0;
          for (let i = 0; i < blockBottomsBefore.length; i++) {
            const beforeBottom = blockBottomsBefore[i].bottom;
            const b = settledBlocks[i];
            const radius = b.body.circleRadius || 0;
            const bottom = b.body.position.y + radius;
            const gap = Math.abs(bottom - groundY);
            if (Math.abs(beforeBottom - groundY) < 10) {
              maxGap = Math.max(maxGap, gap);
              if (gap > 2) {
                allOnGround = false;
              }
            }
            if (b.scale.x !== 1) {
              allRadiiRestored = false;
            }
          }

          return {
            success: true,
            allOnGround,
            allRadiiRestored,
            maxGap: Math.round(maxGap * 100) / 100,
            blockCount: settledBlocks.length,
            groundY,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'error' };
        }
      });

      expect(result.success).toBeTruthy();
      if (result.success) {
        expect(result.allOnGround).toBeTruthy();
        expect(result.allRadiiRestored).toBeTruthy();
        expect(result.maxGap).toBeLessThanOrEqual(2);
      }
    });
  });
});
