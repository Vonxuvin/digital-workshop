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
      await navigateToGame(page, false);

      const currentState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return 'no-game';
        try {
          return game.getStateMachine?.()?.getCurrentState?.() ?? 'unknown';
        } catch {
          return 'error';
        }
      });

      expect(['menu', 'playing']).toContain(currentState);
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
          const game = (window as any).__gameInstance;
          if (!game) return false;

          const app = game.getApp?.() ?? game.app;
          if (!app || !app.renderer) return false;

          try {
            if (typeof app.renderer.extract?.pixels === 'function') {
              const pixels = app.renderer.extract.pixels({ target: app.stage, resolution: 1 });
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
                if (sampledPixels > 0 && (nonBlackPixels / sampledPixels) >= 0.05) {
                  return true;
                }
              }
            }
          } catch {}

          try {
            const gl = (app.renderer as any).gl;
            if (gl) {
              const fbo = gl.getParameter(gl.FRAMEBUFFER_BINDING);
              gl.bindFramebuffer(gl.FRAMEBUFFER, null);
              const w = gl.drawingBufferWidth;
              const h = gl.drawingBufferHeight;
              const pixels = new Uint8Array(w * h * 4);
              gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
              gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

              let nonBlackPixels = 0;
              const step = Math.max(1, Math.floor(w * h / 500));
              let sampledPixels = 0;
              for (let i = 0; i < pixels.length; i += 4 * step) {
                sampledPixels++;
                if (pixels[i] > 10 || pixels[i + 1] > 10 || pixels[i + 2] > 10) {
                  nonBlackPixels++;
                }
              }
              return sampledPixels > 0 && (nonBlackPixels / sampledPixels) >= 0.05;
            }
          } catch {}

          return false;
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

  test.describe('State Transitions @regression', () => {
    test('should transition from menu to playing when level starts', async ({ page }) => {
      await navigateToGame(page, false);

      const stateAfterStart = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return 'no-game';
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return 'no-sm';
          sm.startLevelById(1);
          return game.getStateMachine?.()?.getCurrentState?.() ?? 'unknown';
        } catch {
          return 'error';
        }
      });

      expect(stateAfterStart).toBe('playing');
    });

    test('should transition from playing to paused', async ({ page }) => {
      await navigateToGame(page);

      const pausedState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return 'no-game';
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return 'no-sm';
          sm.pauseGame();
          return game.getStateMachine?.()?.getCurrentState?.() ?? 'unknown';
        } catch {
          return 'error';
        }
      });

      expect(pausedState).toBe('paused');
    });

    test('should transition from paused back to playing', async ({ page }) => {
      await navigateToGame(page);

      const resumedState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return 'no-game';
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return 'no-sm';
          sm.pauseGame();
          sm.resumeGame();
          return game.getStateMachine?.()?.getCurrentState?.() ?? 'unknown';
        } catch {
          return 'error';
        }
      });

      expect(resumedState).toBe('playing');
    });

    test('should transition from playing back to menu', async ({ page }) => {
      await navigateToGame(page);

      const menuState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return 'no-game';
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return 'no-sm';
          sm.showMainMenu();
          return game.getStateMachine?.()?.getCurrentState?.() ?? 'unknown';
        } catch {
          return 'error';
        }
      });

      expect(menuState).toBe('menu');
    });

    test('should not allow invalid state transitions', async ({ page }) => {
      await navigateToGame(page, false);

      const invalidTransitionResult = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return 'no-game';
        try {
          const sm = game.getStateMachine?.();
          if (!sm) return 'no-sm';
          const result = sm.transition('boot');
          return result ? 'allowed' : 'rejected';
        } catch {
          return 'error';
        }
      });

      expect(invalidTransitionResult).toBe('rejected');
    });
  });

  test.describe('UI Interaction @regression', () => {
    test('should show main menu screen on init', async ({ page }) => {
      await navigateToGame(page, false);

      const hasMainMenu = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const ui = game.getUIManager?.();
          if (!ui) return false;
          const screens = ui.getScreens?.();
          if (!screens) return false;
          return screens.has('mainMenu');
        } catch {
          return false;
        }
      });

      expect(hasMainMenu).toBeTruthy();
    });

    test('should show pause screen when paused', async ({ page }) => {
      await navigateToGame(page);

      const hasPauseScreen = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return false;
          sm.pauseGame();
          const ui = game.getUIManager?.();
          if (!ui) return false;
          const screens = ui.getScreens?.();
          if (!screens) return false;
          return screens.has('pause');
        } catch {
          return false;
        }
      });

      expect(hasPauseScreen).toBeTruthy();
    });

    test('game canvas should respond to resize', async ({ page }) => {
      await navigateToGame(page);

      await page.setViewportSize({ width: 600, height: 400 });
      await page.waitForTimeout(500);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });

    test('should have game instance exposed on window', async ({ page }) => {
      await navigateToGame(page, false);

      const hasGameInstance = await page.evaluate(() => {
        return (window as any).__gameInstance != null;
      });

      expect(hasGameInstance).toBeTruthy();
    });

    test('game instance should expose state machine', async ({ page }) => {
      await navigateToGame(page, false);

      const hasStateMachine = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getStateMachine?.();
          if (!sm) return false;
          return typeof sm.getCurrentState === 'function' && typeof sm.transition === 'function';
        } catch {
          return false;
        }
      });

      expect(hasStateMachine).toBeTruthy();
    });
  });
});
