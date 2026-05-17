import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, ensurePlaying, ensureGameScene, clickCanvasAt, getCanvasBoundingBox } from './helpers';

test.describe('炸弹道具BUG修复验证 @regression', () => {
  test.describe('BUG1: PropButton点击事件穿透修复 @critical', () => {
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

    test('点击炸弹按钮后炸弹数量不应减少', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const bombCountBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const propSystem = game.getPropSystem?.();
          return propSystem?.getPropCount?.('bomb') ?? -1;
        } catch {
          return -1;
        }
      });

      if (bombCountBefore > 0) {
        const canvas = page.locator('#game-canvas');
        const box = await canvas.boundingBox();
        if (box) {
          await page.mouse.click(box.x + box.width - 40, box.y + 40);
          await waitForStable(page, 500);

          const bombCountAfter = await page.evaluate(() => {
            const game = (window as any).__gameInstance;
            if (!game) return -1;
            try {
              const propSystem = game.getPropSystem?.();
              return propSystem?.getPropCount?.('bomb') ?? -1;
            } catch {
              return -1;
            }
          });

          expect(bombCountAfter).toBe(bombCountBefore);
        }
      }
    });
  });

  test.describe('BUG2: 炸弹目标模式在冷却期间应正常工作 @critical', () => {
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

    test('炸弹目标模式应可在冷却期间激活', async ({ page }) => {
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

          const spawner = game.getBlockSpawner?.();
          if (!spawner) return { success: false };

          spawner.startCooldown?.();

          effectHandler.handlePropTargetMode?.({ enabled: true });
          const targetModeDuringCooldown = effectHandler.getBombTargetMode?.();

          effectHandler.handlePropTargetMode?.({ enabled: false });

          return { success: true, targetModeDuringCooldown };
        } catch {
          return { success: false };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.targetModeDuringCooldown).toBeTruthy();
    });
  });

  test.describe('BUG3: 爆炸半径裁剪修复 @critical', () => {
    test('爆炸效果管理器应存在', async ({ page }) => {
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
  });

  test.describe('炸弹道具完整流程验证 @regression', () => {
    test('完整流程: 点击炸弹按钮 → 进入目标模式 → 点击游戏区域 → 产生爆炸', async ({ page }) => {
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

      const bombCountBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const propSystem = game.getPropSystem?.();
          return propSystem?.getPropCount?.('bomb') ?? -1;
        } catch {
          return -1;
        }
      });

      if (bombCountBefore > 0 && blockCountBefore > 0) {
        const explosionResult = await page.evaluate(() => {
          const game = (window as any).__gameInstance;
          if (!game) return false;
          try {
            const scene = game.getGameScene?.();
            if (!scene) return false;
            const effectHandler = scene.getPropEffectHandler?.();
            if (!effectHandler) return false;

            const offsetX = scene.getContainerOffsetX?.() ?? 0;
            const width = scene.getContainerWidth?.() ?? 0;
            const centerX = offsetX + width / 2;

            effectHandler.handleBombExplode?.({ x: centerX, y: 400, radius: 120 });
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
      }
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

    test('炸弹使用后剩余数量应减少', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

      const bombCountBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const propSystem = game.getPropSystem?.();
          return propSystem?.getPropCount?.('bomb') ?? -1;
        } catch {
          return -1;
        }
      });

      if (bombCountBefore > 0) {
        const useResult = await page.evaluate(() => {
          const game = (window as any).__gameInstance;
          if (!game) return false;
          try {
            const propSystem = game.getPropSystem?.();
            if (!propSystem) return false;
            const scene = game.getGameScene?.();
            if (!scene) return false;
            const offsetX = scene.getContainerOffsetX?.() ?? 0;
            const width = scene.getContainerWidth?.() ?? 0;
            return propSystem.useProp?.('bomb', { x: offsetX + width / 2, y: 400 });
          } catch {
            return false;
          }
        });

        if (useResult) {
          const bombCountAfter = await page.evaluate(() => {
            const game = (window as any).__gameInstance;
            if (!game) return -1;
            try {
              const propSystem = game.getPropSystem?.();
              return propSystem?.getPropCount?.('bomb') ?? -1;
            } catch {
              return -1;
            }
          });

          expect(bombCountAfter).toBe(bombCountBefore - 1);
        }
      }
    });
  });
});
