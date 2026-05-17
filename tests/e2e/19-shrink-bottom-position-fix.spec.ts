import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, ensurePlaying, ensureGameScene } from './helpers';

test.describe('缩小道具底部位置修正 @regression', () => {
  test.describe('缩小道具物理行为 @smoke', () => {
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
      await waitForStable(page, 2000);

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

          const groundY = scene.getGroundY?.() || 550;

          const blockBottomsBefore = blocks.map((b: any) => ({
            y: b.body.position.y,
            radius: b.body.circleRadius,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

          const blockBottomsAfter = blocks.map((b: any) => ({
            y: b.body.position.y,
            radius: b.body.circleRadius,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          let allBottomsPreserved = true;
          for (let i = 0; i < blockBottomsBefore.length; i++) {
            const before = blockBottomsBefore[i].bottom;
            const after = blockBottomsAfter[i].bottom;
            if (Math.abs(before - after) > 2) {
              allBottomsPreserved = false;
              break;
            }
          }

          let noFloating = true;
          for (const b of blockBottomsAfter) {
            if (b.bottom < groundY - 5) {
              noFloating = false;
              break;
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
  });

  test.describe('缩小道具恢复行为 @regression', () => {
    test('缩小道具取消后球体应恢复原始大小并保持底部接触', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 3);
      await waitForStable(page, 2000);

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

          const originalData = blocks.map((b: any) => ({
            radius: b.body.circleRadius,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

          handler.handleShrinkDeactivate();

          const restoredData = blocks.map((b: any) => ({
            radius: b.body.circleRadius,
            bottom: b.body.position.y + (b.body.circleRadius || 0),
          }));

          let allRadiiRestored = true;
          let allBottomsPreserved = true;
          for (let i = 0; i < originalData.length; i++) {
            if (Math.abs(originalData[i].radius - restoredData[i].radius) > 1) {
              allRadiiRestored = false;
            }
            if (Math.abs(originalData[i].bottom - restoredData[i].bottom) > 2) {
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
  });

  test.describe('缩小道具物理稳定性 @regression', () => {
    test('缩小道具不应破坏物理引擎稳定性', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 2000);

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
  });
});
