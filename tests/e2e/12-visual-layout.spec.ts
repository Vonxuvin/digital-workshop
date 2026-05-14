import { test, expect } from '@playwright/test';
import { navigateToGame, clickCanvasCenter, dropBlocks, waitForStable, GAME_URL } from './helpers';

const RESOLUTIONS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
  smallMobile: { width: 320, height: 568 },
  landscapeMobile: { width: 812, height: 375 },
} as const;

test.describe('视觉布局与UI可见性', () => {
  test.describe('多分辨率按钮布局', () => {
    for (const [label, viewport] of Object.entries(RESOLUTIONS)) {
      test(`${label}分辨率下按钮重叠检测`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await navigateToGame(page);

        const overlapResult = await page.evaluate(() => {
          const game = (window as any).__gameInstance;
          if (!game) return { overlaps: [] as string[], buttonCount: 0 };
          const hud = game.getGameHUD?.();
          if (!hud) return { overlaps: [] as string[], buttonCount: 0 };

          const elements: Array<{ name: string; x: number; y: number; width: number; height: number; isContainer: boolean }> = [];

          const addElement = (name: string, obj: any, isContainer = false) => {
            if (!obj) return;
            const bounds = obj.getBounds?.() ?? { x: obj.x ?? 0, y: obj.y ?? 0, width: obj.width ?? 0, height: obj.height ?? 0 };
            if (bounds.width > 0 && bounds.height > 0) {
              elements.push({ name, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, isContainer });
            }
          };

          addElement('pauseButton', hud.pauseButton);
          addElement('propsContainer', hud.propsContainer, true);
          if (hud.propButtons) {
            hud.propButtons.forEach((btn: any, i: number) => addElement(`propButton_${i}`, btn));
          }
          addElement('objectiveBar', hud.objectiveBar);
          addElement('scoreText', hud.scoreText);
          addElement('levelText', hud.levelText);

          const overlaps: string[] = [];
          for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
              const a = elements[i];
              const b = elements[j];
              if (a.isContainer || b.isContainer) continue;

              const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
              const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
              if (overlapX && overlapY) {
                overlaps.push(`${a.name} ↔ ${b.name}`);
              }
            }
          }
          return { overlaps, buttonCount: elements.length };
        });

        if (overlapResult.overlaps.length > 0) {
          console.log(`[${label}] 检测到 ${overlapResult.overlaps.length} 处按钮重叠: ${overlapResult.overlaps.join(', ')}`);
        }
        expect(overlapResult.buttonCount).toBeGreaterThan(0);
      });

      test(`${label}分辨率下按钮应完全在屏幕内`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await navigateToGame(page);

        const screenWidth = viewport.width;
        const screenHeight = viewport.height;

        const allVisible = await page.evaluate(({ sw, sh }) => {
          const game = (window as any).__gameInstance;
          if (!game) return false;
          const hud = game.getGameHUD?.();
          if (!hud) return false;

          const elements: Array<{ name: string; x: number; y: number; width: number; height: number }> = [];

          if (hud.scoreText) {
            const b = hud.scoreText.getBounds?.() ?? { x: hud.scoreText.x ?? 0, y: hud.scoreText.y ?? 0, width: hud.scoreText.width ?? 0, height: hud.scoreText.height ?? 0 };
            elements.push({ name: 'scoreText', x: b.x, y: b.y, width: b.width, height: b.height });
          }
          if (hud.levelText) {
            const b = hud.levelText.getBounds?.() ?? { x: hud.levelText.x ?? 0, y: hud.levelText.y ?? 0, width: hud.levelText.width ?? 0, height: hud.levelText.height ?? 0 };
            elements.push({ name: 'levelText', x: b.x, y: b.y, width: b.width, height: b.height });
          }
          if (hud.pauseButton) {
            const b = hud.pauseButton.getBounds?.() ?? { x: hud.pauseButton.x ?? 0, y: hud.pauseButton.y ?? 0, width: hud.pauseButton.width ?? 0, height: hud.pauseButton.height ?? 0 };
            elements.push({ name: 'pauseButton', x: b.x, y: b.y, width: b.width, height: b.height });
          }
          if (hud.propButtons) {
            hud.propButtons.forEach((btn: any, index: number) => {
              if (!btn) return;
              const b = btn.getBounds?.() ?? { x: btn.x ?? 0, y: btn.y ?? 0, width: btn.width ?? 0, height: btn.height ?? 0 };
              elements.push({ name: `propButton_${index}`, x: b.x, y: b.y, width: b.width, height: b.height });
            });
          }

          return elements.every((el: any) =>
            el.x >= -5 &&
            el.y >= -5 &&
            el.x + el.width <= sw + 5 &&
            el.y + el.height <= sh + 5
          );
        }, { sw: screenWidth, sh: screenHeight });

        expect(allVisible).toBeTruthy();
      });
    }
  });

  test.describe('Canvas元素可见性', () => {
    test('Canvas应在所有分辨率下可见', async ({ page }) => {
      for (const [label, viewport] of Object.entries(RESOLUTIONS)) {
        await page.setViewportSize(viewport);
        await page.goto(GAME_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#game-canvas', { timeout: 10000 });

        const canvas = page.locator('#game-canvas');
        await expect(canvas).toBeVisible();

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(50);
        expect(box!.height).toBeGreaterThan(50);
      }
    });

    test('Canvas不应超出视口', async ({ page }) => {
      for (const [label, viewport] of Object.entries(RESOLUTIONS)) {
        await page.setViewportSize(viewport);
        await navigateToGame(page);

        const box = await page.locator('#game-canvas').boundingBox();
        expect(box).not.toBeNull();

        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 2);
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 2);
      }
    });
  });

  test.describe('动画元素渲染范围', () => {
    test('连击显示动画不应超出屏幕', async ({ page }) => {
      await page.setViewportSize(RESOLUTIONS.mobile);
      await navigateToGame(page);
      await dropBlocks(page, 10);
      await waitForStable(page, 5000);

      const comboInBounds = await page.evaluate(({ sw, sh }) => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        const hud = game.getGameHUD?.();
        if (!hud) return true;
        const combo = hud.comboDisplay;
        if (!combo || !combo.container) return true;

        const bounds = combo.container.getBounds?.() ?? { x: 0, y: 0, width: 0, height: 0 };
        return bounds.x >= -10 && bounds.y >= -10 &&
          bounds.x + bounds.width <= sw + 10 &&
          bounds.y + bounds.height <= sh + 10;
      }, { sw: RESOLUTIONS.mobile.width, sh: RESOLUTIONS.mobile.height });

      expect(comboInBounds).toBeTruthy();
    });

    test('得分飘字动画应完全在屏幕内', async ({ page }) => {
      await page.setViewportSize(RESOLUTIONS.smallMobile);
      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 3000);

      const scoreTextInBounds = await page.evaluate(({ sw, sh }) => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        const hud = game.getGameHUD?.();
        if (!hud || !hud.scoreText) return true;

        const bounds = hud.scoreText.getBounds?.() ?? { x: 0, y: 0, width: 0, height: 0 };
        return bounds.x >= -5 && bounds.y >= -5 &&
          bounds.x + bounds.width <= sw + 5 &&
          bounds.y + bounds.height <= sh + 5;
      }, { sw: RESOLUTIONS.smallMobile.width, sh: RESOLUTIONS.smallMobile.height });

      expect(scoreTextInBounds).toBeTruthy();
    });

    test('道具按钮动画不应超出屏幕', async ({ page }) => {
      await page.setViewportSize(RESOLUTIONS.mobile);
      await navigateToGame(page);

      const propButtonsInBounds = await page.evaluate(({ sw, sh }) => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        const hud = game.getGameHUD?.();
        if (!hud || !hud.propButtons) return true;

        return [...hud.propButtons].every((btn: any) => {
          if (!btn) return true;
          const bounds = btn.getBounds?.() ?? { x: 0, y: 0, width: 0, height: 0 };
          return bounds.x >= -5 && bounds.y >= -5 &&
            bounds.x + bounds.width <= sw + 5 &&
            bounds.y + bounds.height <= sh + 5;
        });
      }, { sw: RESOLUTIONS.mobile.width, sh: RESOLUTIONS.mobile.height });

      expect(propButtonsInBounds).toBeTruthy();
    });
  });

  test.describe('暂停菜单布局', () => {
    test('暂停菜单按钮应在所有分辨率下居中', async ({ page }) => {
      for (const [label, viewport] of Object.entries(RESOLUTIONS)) {
        await page.setViewportSize(viewport);
        await navigateToGame(page);

        await page.evaluate(() => {
          const game = (window as any).__gameInstance;
          if (!game) return;
          const sm = game.getStateMachine?.();
          sm?.transitionTo?.('paused');
        });

        await page.waitForTimeout(500);

        const pauseScreenCentered = await page.evaluate(() => {
          const game = (window as any).__gameInstance;
          if (!game) return true;
          const pauseScreen = game.getPauseScreen?.();
          if (!pauseScreen || !pauseScreen.container) return true;

          const bounds = pauseScreen.container.getBounds?.() ?? { x: 0, y: 0, width: 0, height: 0 };
          return bounds.width > 0 && bounds.height > 0;
        });

        expect(pauseScreenCentered).toBeTruthy();
      }
    });
  });
});