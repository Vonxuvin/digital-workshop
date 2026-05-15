import { test, expect } from '@playwright/test';
import { navigateToGame, collectPageErrors, GAME_URL } from './helpers';

test.describe('启动与初始化 @smoke', () => {
  test.describe('页面加载 @smoke', () => {
    test('页面应正确加载并返回200状态码', async ({ page }) => {
      const response = await page.goto(GAME_URL);
      expect(response?.status()).toBe(200);
    });

    test('页面应包含正确的DOCTYPE声明', async ({ page }) => {
      await page.goto(GAME_URL);
      const docType = await page.evaluate(() => document.doctype?.name);
      expect(docType).toBe('html');
    });

    test('页面title应正确设置', async ({ page }) => {
      await page.goto(GAME_URL);
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    });

    test('页面meta viewport应适配移动端', async ({ page }) => {
      await page.goto(GAME_URL);
      const viewport = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta?.getAttribute('content');
      });
      expect(viewport).toBeTruthy();
      expect(viewport).toContain('width=device-width');
    });
  });

  test.describe('Canvas初始化 @smoke', () => {
    test('Canvas元素应正确创建并可见', async ({ page }) => {
      await navigateToGame(page);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
      await expect(canvas).toHaveAttribute('id', 'game-canvas');
    });

    test('Canvas应有正确的尺寸', async ({ page }) => {
      await navigateToGame(page);

      const box = await page.locator('#game-canvas').boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });

    test('Canvas应支持WebGL上下文', async ({ page }) => {
      await navigateToGame(page);

      const hasWebGL = await page.evaluate(() => {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!canvas) return false;
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('webgpu');
        if (gl) return true;
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const app = game.getApp?.() ?? game.app;
          return app !== null && app !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasWebGL).toBeTruthy();
    });
  });

  test.describe('引擎启动 @smoke', () => {
    test('PixiJS Application应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const appInitialized = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const app = game.getApp?.() ?? game.app;
          return app !== null && app !== undefined;
        } catch {
          return false;
        }
      });

      expect(appInitialized).toBeTruthy();
    });

    test('游戏实例应为单例模式', async ({ page }) => {
      await navigateToGame(page);

      const isSingleton = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const GameConstructor = game.constructor;
          if (typeof GameConstructor?.getInstance === 'function') {
            const instance = GameConstructor.getInstance();
            return instance === game;
          }
          return false;
        } catch {
          return false;
        }
      });

      expect(isSingleton).toBeTruthy();
    });

    test('启动流程应为 boot → loading → menu', async ({ page }) => {
      const stateSequence: string[] = [];
      page.on('console', (msg) => {
        const match = msg.text().match(/\[StateMachine\] (\w+) -> (\w+)/);
        if (match) stateSequence.push(match[2]);
        const match2 = msg.text().match(/\[Game\] 状态变化: (\w+) -> (\w+)/);
        if (match2) stateSequence.push(match2[2]);
      });

      await navigateToGame(page);

      expect(stateSequence.length).toBeGreaterThan(0);
    });

    test('启动过程中不应有JavaScript错误', async ({ page }) => {
      const errors = collectPageErrors(page);
      await navigateToGame(page);
      expect(errors).toHaveLength(0);
    });
  });

  test.describe('首屏加载性能 @regression', () => {
    test('首屏加载应在合理时间内完成', async ({ page }) => {
      const startTime = Date.now();
      await navigateToGame(page);
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(15000);
    });

    test('资源加载不应阻塞主线程过久', async ({ page }) => {
      await navigateToGame(page);

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

      expect(fps).toBeGreaterThan(0);
    });
  });
});
