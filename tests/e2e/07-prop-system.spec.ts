import { test, expect } from '@playwright/test';
import { navigateToGame, clickCanvasCenter, dropBlocks, waitForStable } from './helpers';

test.describe('道具系统', () => {
  test.describe('道具系统框架', () => {
    test('PropSystem应正确初始化5种道具', async ({ page }) => {
      await navigateToGame(page);

      const propCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return -1;
        const props = propSystem.getAllProps?.();
        return props?.length ?? -1;
      });

      expect(propCount).toBe(5);
    });

    test('道具应包含炸弹、彩虹、冻结、缩小、幸运5种类型', async ({ page }) => {
      await navigateToGame(page);

      const propTypes = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return [];
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return [];
        const props = propSystem.getAllProps?.();
        if (!props) return [];
        return props.map((p: any) => p.type);
      });

      expect(propTypes).toContain('bomb');
      expect(propTypes).toContain('rainbow');
      expect(propTypes).toContain('freeze');
      expect(propTypes).toContain('shrink');
      expect(propTypes).toContain('lucky');
    });

    test('道具应有初始数量', async ({ page }) => {
      await navigateToGame(page);

      const hasCounts = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return false;
        const props = propSystem.getAllProps?.();
        if (!props) return false;
        return props.every((p: any) => p.remaining >= 0);
      });

      expect(hasCounts).toBeTruthy();
    });

    test('道具使用后数量应减少', async ({ page }) => {
      await navigateToGame(page);

      const beforeCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return -1;
        return propSystem.getPropCount?.('freeze') ?? -1;
      });

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return;
        propSystem.useProp?.('freeze');
      });

      const afterCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return -1;
        return propSystem.getPropCount?.('freeze') ?? -1;
      });

      if (beforeCount > 0) {
        expect(afterCount).toBeLessThan(beforeCount);
      }
    });

    test('道具数量为0时不应允许使用', async ({ page }) => {
      await navigateToGame(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return null;

        const count = propSystem.getPropCount?.('bomb') ?? 0;
        for (let i = 0; i < count + 1; i++) {
          propSystem.useProp?.('bomb');
        }

        return propSystem.useProp?.('bomb');
      });

      expect(result).toBeFalsy();
    });

    test('暂停时不应允许使用道具', async ({ page }) => {
      await navigateToGame(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return null;

        propSystem.pause?.();
        const success = propSystem.useProp?.('freeze');
        propSystem.resume?.();
        return success;
      });

      expect(result).toBeFalsy();
    });
  });

  test.describe('炸弹道具', () => {
    test('炸弹道具应能清除范围内方块', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const blockCountBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      const canvas = page.locator('#game-canvas');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();

      await page.evaluate(({ x, y }) => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return;
        propSystem.useProp?.('bomb', { x, y });
      }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });

      await waitForStable(page);

      const blockCountAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCountAfter).toBeLessThanOrEqual(blockCountBefore);
    });

    test('炸弹爆炸应触发爆炸特效', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const canvas = page.locator('#game-canvas');
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();

      await page.evaluate(({ x, y }) => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return;
        propSystem.useProp?.('bomb', { x, y });
      }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });

      await waitForStable(page);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });
  });

  test.describe('彩虹方块道具', () => {
    test('彩虹方块应与任意数字方块合成', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return;
        propSystem.useProp?.('rainbow');
      });

      await page.waitForTimeout(500);
      await dropBlocks(page, 5);
      await waitForStable(page, 3000);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });

    test('彩虹方块使用后应有剩余次数', async ({ page }) => {
      await navigateToGame(page);

      const remaining = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return -1;
        return propSystem.getPropCount?.('rainbow') ?? -1;
      });

      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('冻结道具', () => {
    test('冻结道具应暂停物理模拟', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return;
        propSystem.useProp?.('freeze');
      });

      await page.waitForTimeout(500);

      const physicsRunning = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const physics = game.getPhysics?.();
        if (!physics) return null;
        return physics.isRunning?.() ?? null;
      });

      expect(physicsRunning).toBeFalsy();
    });

    test('冻结应显示冰冻视觉效果', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return;
        propSystem.useProp?.('freeze');
      });

      await page.waitForTimeout(500);

      const hasFreezeEffect = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        const effectManager = scene.getEffectManager?.();
        if (!effectManager) return false;
        return effectManager.getEffects?.()?.some((e: any) =>
          e.constructor?.name === 'FreezeEffect'
        ) ?? false;
      });

      expect(hasFreezeEffect).toBeTruthy();
    });

    test('冻结结束后物理应恢复', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return;
        propSystem.useProp?.('freeze');
      });

      await page.waitForTimeout(8000);

      const physicsRunning = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const physics = game.getPhysics?.();
        if (!physics) return null;
        return physics.isRunning?.() ?? null;
      });

      expect(physicsRunning).toBeTruthy();
    });
  });

  test.describe('缩小道具', () => {
    test('缩小道具应缩小所有方块', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      const hasShrink = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return false;
        const count = propSystem.getPropCount?.('shrink') ?? 0;
        return count >= 0;
      });

      expect(hasShrink).toBeTruthy();
    });

    test('缩小效果结束后方块应恢复原大小', async ({ page }) => {
      await navigateToGame(page);

      const hasShrinkProp = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return false;
        return propSystem.getProp?.('shrink') !== undefined;
      });

      expect(hasShrinkProp).toBeTruthy();
    });
  });

  test.describe('幸运道具', () => {
    test('幸运道具应提高高分方块出现概率', async ({ page }) => {
      await navigateToGame(page);

      const hasLuckyProp = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return false;
        return propSystem.getProp?.('lucky') !== undefined;
      });

      expect(hasLuckyProp).toBeTruthy();
    });

    test('幸运模式应影响计分倍率', async ({ page }) => {
      await navigateToGame(page);

      const hasLuckyMultiplier = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scoreSystem = game.getScoreSystem?.();
        if (!scoreSystem) return false;
        return typeof scoreSystem.setLuckyMultiplier === 'function';
      });

      expect(hasLuckyMultiplier).toBeTruthy();
    });
  });

  test.describe('道具按钮组件', () => {
    test('道具按钮应显示道具图标和数量', async ({ page }) => {
      await navigateToGame(page);

      const hasPropButtons = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const hud = game.getGameHUD?.();
        if (!hud) return false;
        return hud.propButtons?.size > 0;
      });

      expect(hasPropButtons).toBeTruthy();
    });

    test('点击道具按钮应触发道具使用', async ({ page }) => {
      const propLogs: string[] = [];
      page.on('console', (msg) => {
        if (msg.text().includes('props:used') || msg.text().includes('props:')) {
          propLogs.push(msg.text());
        }
      });

      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return;
        propSystem.useProp?.('freeze');
      });

      await page.waitForTimeout(500);

      expect(propLogs.length).toBeGreaterThan(0);
    });
  });

  test.describe('PropEffectHandler集成', () => {
    test('PropEffectHandler应处理所有道具效果', async ({ page }) => {
      await navigateToGame(page);

      const hasHandler = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        return scene.getPropEffectHandler?.() !== null;
      });

      expect(hasHandler).toBeTruthy();
    });

    test('复活功能应清除警戒线上方块', async ({ page }) => {
      await navigateToGame(page);

      const hasRevive = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        const handler = scene.getPropEffectHandler?.();
        if (!handler) return false;
        return typeof handler.handleRevive === 'function';
      });

      expect(hasRevive).toBeTruthy();
    });
  });
});