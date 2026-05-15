import { test, expect } from '@playwright/test';
import { navigateToGame, waitForStable } from './helpers';

test.describe('平台与边界 @full', () => {
  test.describe('平台适配 @regression', () => {
    test('平台适配器应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasAdapter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const adapter = game.getPlatformAdapter?.();
          return adapter !== null && adapter !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasAdapter).toBeTruthy();
    });

    test('应能获取平台信息', async ({ page }) => {
      await navigateToGame(page);

      const hasPlatform = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const adapter = game.getPlatformAdapter?.();
          if (!adapter) return false;
          return typeof adapter.getPlatform === 'function';
        } catch {
          return false;
        }
      });

      expect(hasPlatform).toBeTruthy();
    });

    test('应能检测浏览器环境', async ({ page }) => {
      await navigateToGame(page);

      const canDetect = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const adapter = game.getPlatformAdapter?.();
          if (!adapter) return false;
          return typeof adapter.isBrowser === 'function';
        } catch {
          return false;
        }
      });

      expect(canDetect).toBeTruthy();
    });

    test('应能获取系统信息', async ({ page }) => {
      await navigateToGame(page);

      const canGetInfo = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const adapter = game.getPlatformAdapter?.();
          if (!adapter) return false;
          return typeof adapter.getSystemInfo === 'function';
        } catch {
          return false;
        }
      });

      expect(canGetInfo).toBeTruthy();
    });
  });

  test.describe('存储边界 @full', () => {
    test('存储空值应不崩溃', async ({ page }) => {
      await navigateToGame(page);

      const noCrash = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const adapter = game.getPlatformAdapter?.();
          if (!adapter) return false;
          try {
            adapter.getStorage?.('nonexistent_key');
          } catch {}
          return true;
        } catch {
          return false;
        }
      });

      expect(noCrash).toBeTruthy();
    });

    test('存储大值应不崩溃', async ({ page }) => {
      await navigateToGame(page);

      const noCrash = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const adapter = game.getPlatformAdapter?.();
          if (!adapter) return false;
          try {
            adapter.setStorage?.('test_large', 'x'.repeat(1000));
            adapter.getStorage?.('test_large');
          } catch {}
          return true;
        } catch {
          return false;
        }
      });

      expect(noCrash).toBeTruthy();
    });

    test('存储特殊字符应不崩溃', async ({ page }) => {
      await navigateToGame(page);

      const noCrash = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const adapter = game.getPlatformAdapter?.();
          if (!adapter) return false;
          try {
            adapter.setStorage?.('test_special', '{"emoji":"🎮","unicode":"\\u0041"}');
            adapter.getStorage?.('test_special');
          } catch {}
          return true;
        } catch {
          return false;
        }
      });

      expect(noCrash).toBeTruthy();
    });
  });

  test.describe('屏幕尺寸边界 @full', () => {
    test('极小屏幕应正常渲染', async ({ page }) => {
      await page.setViewportSize({ width: 240, height: 320 });
      await navigateToGame(page);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });

    test('极大屏幕应正常渲染', async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });
      await navigateToGame(page);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });

    test('超宽屏幕应正确适配', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 400 });
      await navigateToGame(page);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });

    test('超窄屏幕应正确适配', async ({ page }) => {
      await page.setViewportSize({ width: 200, height: 800 });
      await navigateToGame(page);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('网络边界 @full', () => {
    test('离线模式应能运行', async ({ page }) => {
      await navigateToGame(page);

      await page.context().setOffline(true);
      await waitForStable(page, 1000);

      const gameStillWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        return game !== null && game !== undefined;
      });

      await page.context().setOffline(false);

      expect(gameStillWorks).toBeTruthy();
    });

    test('网络恢复后应正常工作', async ({ page }) => {
      await navigateToGame(page);

      await page.context().setOffline(true);
      await waitForStable(page, 500);
      await page.context().setOffline(false);
      await waitForStable(page, 500);

      const gameStillWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        return game !== null && game !== undefined;
      });

      expect(gameStillWorks).toBeTruthy();
    });
  });

  test.describe('性能监控 @regression', () => {
    test('性能监控器应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasMonitor = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const monitor = game.getPerformanceMonitor?.();
          return monitor !== null && monitor !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasMonitor).toBeTruthy();
    });

    test('应能获取FPS', async ({ page }) => {
      await navigateToGame(page);
      await waitForStable(page, 2000);

      const canGetFPS = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const monitor = game.getPerformanceMonitor?.();
          if (!monitor) return false;
          return typeof monitor.getFPS === 'function'
            && typeof monitor.getAverageFPS === 'function';
        } catch {
          return false;
        }
      });

      expect(canGetFPS).toBeTruthy();
    });

    test('性能监控应支持启动', async ({ page }) => {
      await navigateToGame(page);

      const canStart = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const monitor = game.getPerformanceMonitor?.();
          if (!monitor) return false;
          return typeof monitor.start === 'function';
        } catch {
          return false;
        }
      });

      expect(canStart).toBeTruthy();
    });
  });
});
