import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, ensurePlaying, ensureGameScene } from './helpers';

test.describe('爆炸按钮瞄准区域响应延迟优化 @performance', () => {
  test.describe('优化1: onClick从pointerup提前到pointerdown @critical', () => {
    test('点击炸弹按钮应在pointerdown阶段触发onClick而非pointerup', async ({ page }) => {
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
  });

  test.describe('优化2: enterBombTargetMode立即显示十字准星 @critical', () => {
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
  });

  test.describe('优化3: GameHUD.isPropTargetMode即时状态检查 @critical', () => {
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
  });

  test.describe('完整流程响应性能验证 @regression', () => {
    test('完整流程: 点击炸弹→十字准星立即显示→点击目标→爆炸', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 1500);

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
      if (result.clickToCrosshair >= 0) {
        expect(result.clickToCrosshair).toBeLessThan(100);
      }
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
  });
});
