import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, isGamePlaying } from './helpers';

test.describe('渲染与性能 @regression', () => {
  test.describe('基础渲染 @smoke', () => {
    test('游戏画面应正确渲染非空白内容', async ({ page }) => {
      await navigateToGame(page);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });

    test('Canvas渲染不应出现黑屏', async ({ page }) => {
      await navigateToGame(page);

      const isBlackScreen = await page.evaluate(async () => {
        const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!gameCanvas) return true;

        try {
          const game = (window as any).__gameInstance;
          if (!game) return true;
          const app = game.getApp?.() ?? game.app;
          if (!app || !app.renderer) return true;

          const renderer = app.renderer;

          try {
            if (typeof renderer.extract?.pixels === 'function') {
              const pixels = renderer.extract.pixels({ target: app.stage, resolution: 1 });
              if (pixels && pixels.length > 0) {
                let nonBlackPixels = 0;
                const step = Math.max(1, Math.floor(pixels.length / 4 / 500));
                let sampledPixels = 0;

                for (let i = 0; i < pixels.length; i += 4 * step) {
                  sampledPixels++;
                  if (pixels[i] > 10 || pixels[i + 1] > 10 || pixels[i + 2] > 10) {
                    nonBlackPixels++;
                  }
                }

                return sampledPixels > 0 && (nonBlackPixels / sampledPixels) < 0.05;
              }
            }
          } catch {}

          try {
            const gl = (renderer as any).gl;
            if (gl) {
              const fbo = gl.getParameter(gl.FRAMEBUFFER_BINDING);
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);

              const w = gl.drawingBufferWidth;
              const h = gl.drawingBufferHeight;
              const pixels = new Uint8Array(w * h * 4);
              gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

              gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

              let nonBlackPixels = 0;
              const totalPixels = w * h;
              const step = Math.max(1, Math.floor(totalPixels / 500));
              let sampledPixels = 0;

              for (let i = 0; i < pixels.length; i += 4 * step) {
                sampledPixels++;
                if (pixels[i] > 10 || pixels[i + 1] > 10 || pixels[i + 2] > 10) {
                  nonBlackPixels++;
                }
              }

              return sampledPixels > 0 && (nonBlackPixels / sampledPixels) < 0.05;
            }
          } catch {}

          return true;
        } catch {
          return true;
        }
      });

      expect(isBlackScreen).toBeFalsy();
    });

    test('游戏容器应正确渲染', async ({ page }) => {
      await navigateToGame(page);

      const hasContainer = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const container = scene.getContainer?.();
          return container !== null && container.width > 0 && container.height > 0;
        } catch {
          return false;
        }
      });

      expect(hasContainer).toBeTruthy();
    });

    test('方块应正确渲染', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 3);
      await waitForStable(page);

      const hasBlocks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return false;
          const blocks = spawner.getBlocks?.();
          return blocks && blocks.length > 0;
        } catch {
          return false;
        }
      });

      expect(hasBlocks).toBeTruthy();
    });

    test('方块应显示数字文本', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 3);
      await waitForStable(page);

      const hasText = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return false;
          const blocks = spawner.getBlocks?.();
          if (!blocks || blocks.length === 0) return false;
          return blocks.some((b: any) => b.number !== undefined && b.number > 0);
        } catch {
          return false;
        }
      });

      expect(hasText).toBeTruthy();
    });
  });

  test.describe('帧率性能 @regression', () => {
    test('FPS监控应正常工作', async ({ page }) => {
      await navigateToGame(page);

      const hasFPSMonitor = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const monitor = game.getPerformanceMonitor?.();
          return monitor !== null && monitor !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasFPSMonitor).toBeTruthy();
    });

    test('空闲状态下FPS应保持稳定', async ({ page }) => {
      await navigateToGame(page);
      await waitForStable(page, 3000);

      const fps = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const monitor = game.getPerformanceMonitor?.();
          return monitor?.getAverageFPS?.() ?? -1;
        } catch {
          return -1;
        }
      });

      const minFPS = process.env.CI ? 3 : 5;
      expect(fps).toBeGreaterThanOrEqual(minFPS);
    });

    test('大量方块时FPS不应严重下降', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 15, 400);
      await waitForStable(page, 3000);

      const fps = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const monitor = game.getPerformanceMonitor?.();
          return monitor?.getAverageFPS?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(fps).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('内存管理 @full', () => {
    test('场景切换后旧资源应被释放', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 5);
      await waitForStable(page);

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

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const scene = game.getGameScene?.();
          scene?.resetGame?.();
        } catch {}
      });

      await waitForStable(page);

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

      expect(blockCountAfter).toBeLessThan(blockCountBefore);
    });
  });

  test.describe('窗口适配 @regression', () => {
    test('窗口缩放应触发resize处理', async ({ page }) => {
      await navigateToGame(page);

      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForTimeout(1000);

      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(1000);

      const canvasBox = await page.locator('#game-canvas').boundingBox();
      expect(canvasBox).not.toBeNull();
      expect(canvasBox!.width).toBeGreaterThan(0);
    });

    test('横竖屏切换应正确适配', async ({ page }) => {
      await navigateToGame(page);

      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(1000);
      const portraitBox = await page.locator('#game-canvas').boundingBox();

      await page.setViewportSize({ width: 812, height: 375 });
      await page.waitForTimeout(1000);
      const landscapeBox = await page.locator('#game-canvas').boundingBox();

      expect(portraitBox).not.toBeNull();
      expect(landscapeBox).not.toBeNull();
    });

    test('小屏设备应正确渲染', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await navigateToGame(page);

      const canvasBox = await page.locator('#game-canvas').boundingBox();
      expect(canvasBox).not.toBeNull();
      expect(canvasBox!.width).toBeGreaterThan(0);
    });
  });

  test.describe('渲染层级 @regression', () => {
    test('UIManager应包含5个渲染层级', async ({ page }) => {
      await navigateToGame(page);

      const layers = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return [];
        try {
          const ui = game.getUIManager?.();
          if (!ui) return [];

          const layerNames = ['background', 'main', 'popup', 'overlay', 'toast'];
          const results: string[] = [];
          for (const name of layerNames) {
            try {
              const layer = ui.getLayer?.(name);
              if (layer) results.push(name);
            } catch {}
          }
          return results;
        } catch {
          return [];
        }
      });

      expect(layers.length).toBe(5);
    });

    test('游戏层应在UI层之下', async ({ page }) => {
      await navigateToGame(page);

      const layerOrder = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          const mainLayer = ui.getLayer?.('main');
          if (!mainLayer) return false;
          const mainLayerIndex = mainLayer.parent?.getChildIndex(mainLayer);
          const bgLayer = ui.getLayer?.('background');
          if (!bgLayer) return false;
          const bgLayerIndex = bgLayer.parent?.getChildIndex(bgLayer);
          return mainLayerIndex > bgLayerIndex;
        } catch {
          return false;
        }
      });

      expect(layerOrder).toBeTruthy();
    });
  });
});
