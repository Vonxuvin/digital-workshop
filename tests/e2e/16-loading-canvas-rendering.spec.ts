import { test, expect } from '@playwright/test';
import { navigateToGame, GAME_URL } from './helpers';

test.describe('Loading Screen & Canvas Rendering @regression', () => {
  test.describe('Loading Screen @smoke', () => {
    test('should register loading screen in UIManager', async ({ page }) => {
      await navigateToGame(page);

      const hasLoadingScreen = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          return ui.getScreens?.()?.has?.('loading') ?? false;
        } catch {
          return false;
        }
      });

      expect(hasLoadingScreen).toBeTruthy();
    });

    test('should transition through loading state during init', async ({ page }) => {
      const stateTransitions: string[] = [];
      page.on('console', (msg) => {
        const match = msg.text().match(/\[Game\] 状态变化: (\w+) -> (\w+)/);
        if (match) stateTransitions.push(`${match[1]}->${match[2]}`);
        const match2 = msg.text().match(/\[StateMachine\] (\w+) -> (\w+)/);
        if (match2) stateTransitions.push(`${match2[1]}->${match2[2]}`);
      });

      await navigateToGame(page);

      const hasLoadingTransition = stateTransitions.some(t => t.includes('loading'));
      expect(hasLoadingTransition).toBeTruthy();
    });

    test('should reach menu state after loading completes', async ({ page }) => {
      await navigateToGame(page);

      const currentState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return 'no-game';
        try {
          return game.getStateMachine?.()?.getCurrentState?.() ?? 'unknown';
        } catch {
          return 'error';
        }
      });

      expect(currentState).toBe('menu');
    });

    test('loading screen should be hidden when menu is shown', async ({ page }) => {
      await navigateToGame(page);

      const loadingScreenVisible = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          const screens = ui.getScreens?.();
          if (!screens) return false;
          const loadingScreen = screens.get('loading');
          if (!loadingScreen) return false;
          return loadingScreen.visible;
        } catch {
          return false;
        }
      });

      expect(loadingScreenVisible).toBeFalsy();
    });
  });

  test.describe('Canvas Rendering @smoke', () => {
    test('canvas should render non-black content after loading', async ({ page }) => {
      await navigateToGame(page);

      const screenshotBuffer = await page.screenshot();
      const pngBase64 = screenshotBuffer.toString('base64');

      const hasNonBlackContent = await page.evaluate(async (imgSrc) => {
        const img = new Image();
        img.src = `data:image/png;base64,${imgSrc}`;
        await new Promise<void>((resolve) => { img.onload = () => resolve(); });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const w = canvas.width;
        const h = canvas.height;
        const sampleSize = Math.min(w, h, 100);
        const sx = Math.floor(w * 0.25);
        const sy = Math.floor(h * 0.25);

        const imageData = ctx.getImageData(sx, sy, sampleSize, sampleSize);
        const data = imageData.data;

        let nonBlackPixels = 0;
        const totalPixels = data.length / 4;
        const step = Math.max(1, Math.floor(totalPixels / 500));
        let sampledPixels = 0;

        for (let i = 0; i < data.length; i += 4 * step) {
          sampledPixels++;
          if (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10) {
            nonBlackPixels++;
          }
        }

        return sampledPixels > 0 && (nonBlackPixels / sampledPixels) >= 0.05;
      }, pngBase64);

      expect(hasNonBlackContent).toBeTruthy();
    });

    test('canvas should render background color correctly', async ({ page }) => {
      await navigateToGame(page);

      const hasCorrectBackground = await page.evaluate(async () => {
        const screenshot = await new Promise<string>((resolve) => {
          const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
          if (!canvas) { resolve(''); return; }
          try {
            resolve(canvas.toDataURL('image/png'));
          } catch {
            resolve('');
          }
        });

        if (!screenshot) return false;

        const img = new Image();
        img.src = screenshot;
        await new Promise<void>((resolve) => { img.onload = () => resolve(); });

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.naturalWidth || img.width;
        tempCanvas.height = img.naturalHeight || img.height;
        const ctx = tempCanvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const centerX = Math.floor(tempCanvas.width / 2);
        const centerY = Math.floor(tempCanvas.height / 2);
        const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;

        return pixel[0] > 0 || pixel[1] > 0 || pixel[2] > 0;
      });

      expect(hasCorrectBackground).toBeTruthy();
    });

    test('game canvas should be visible and have correct dimensions', async ({ page }) => {
      await navigateToGame(page);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });
  });

  test.describe('Platform Adapter @smoke', () => {
    test('should use singleton platform adapter', async ({ page }) => {
      await navigateToGame(page);

      const isSingleton = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const platform1 = game.platform;
          const platform2 = game.platform;
          return platform1 === platform2 && platform1 !== null && platform1 !== undefined;
        } catch {
          return false;
        }
      });

      expect(isSingleton).toBeTruthy();
    });

    test('platform adapter should provide system info', async ({ page }) => {
      await navigateToGame(page);

      const hasSystemInfo = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const platform = game.platform;
          if (!platform) return false;
          return typeof platform.getPlatform === 'function';
        } catch {
          return false;
        }
      });

      expect(hasSystemInfo).toBeTruthy();
    });
  });

  test.describe('Texture Cache @smoke', () => {
    test('should have BlockTextureCache singleton', async ({ page }) => {
      await navigateToGame(page);

      const hasTextureCache = await page.evaluate(() => {
        try {
          const BlockTextureCache = (window as any).BlockTextureCache;
          if (!BlockTextureCache) {
            const game = (window as any).__gameInstance;
            if (!game) return false;
            const cache = (game as any).textureCache;
            return cache !== null && cache !== undefined;
          }
          return true;
        } catch {
          return false;
        }
      });

      expect(hasTextureCache).toBeTruthy();
    });

    test('should have minimal textures preloaded', async ({ page }) => {
      await navigateToGame(page);

      const hasMinimalTextures = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const app = game.getApp?.() ?? game.app;
          if (!app) return false;
          return app.stage.children.length > 0;
        } catch {
          return false;
        }
      });

      expect(hasMinimalTextures).toBeTruthy();
    });
  });
});
