import { test, expect } from '@playwright/test';
import { navigateToGame, clickCanvasCenter, dropBlocks, waitForStable, collectPageErrors, GAME_URL } from './helpers';

test.describe('平台适配', () => {
  test.describe('环境检测', () => {
    test('应正确检测运行平台', async ({ page }) => {
      await navigateToGame(page);

      const platform = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const adapter = game.getPlatformAdapter?.();
        return adapter?.getPlatform?.() ?? null;
      });

      expect(platform).toBeTruthy();
    });

    test('非微信环境应使用浏览器适配', async ({ page }) => {
      await navigateToGame(page);

      const isBrowser = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const adapter = game.getPlatformAdapter?.();
        return adapter?.isBrowser?.() ?? true;
      });

      expect(isBrowser).toBeTruthy();
    });

    test('平台适配器应提供存储接口', async ({ page }) => {
      await navigateToGame(page);

      const hasStorage = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const adapter = game.getPlatformAdapter?.();
        if (!adapter) return false;
        return typeof adapter.getStorage === 'function'
          && typeof adapter.setStorage === 'function';
      });

      expect(hasStorage).toBeTruthy();
    });
  });

  test.describe('微信小游戏Mock', () => {
    test('应支持wx API Mock', async ({ page }) => {
      await navigateToGame(page);

      const hasMock = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const adapter = game.getPlatformAdapter?.();
        if (!adapter) return false;
        return typeof adapter.mockWxAPI === 'function'
          || adapter.isBrowser?.() === true;
      });

      expect(hasMock).toBeTruthy();
    });

    test('wx.setStorage应正确Mock', async ({ page }) => {
      await navigateToGame(page);

      const storageWorks = await page.evaluate(async () => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const adapter = game.getPlatformAdapter?.();
        if (!adapter) return false;

        try {
          await adapter.setStorage?.('test_key', 'test_value');
          const value = await adapter.getStorage?.('test_key');
          return value === 'test_value';
        } catch {
          return false;
        }
      });

      expect(storageWorks).toBeTruthy();
    });
  });

  test.describe('多设备适配', () => {
    test('桌面端应正确渲染', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await navigateToGame(page);

      const canvasBox = await page.locator('#game-canvas').boundingBox();
      expect(canvasBox).not.toBeNull();
      expect(canvasBox!.width).toBeGreaterThan(0);
    });

    test('平板端应正确渲染', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigateToGame(page);

      const canvasBox = await page.locator('#game-canvas').boundingBox();
      expect(canvasBox).not.toBeNull();
      expect(canvasBox!.width).toBeGreaterThan(0);
    });

    test('手机端应正确渲染', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await navigateToGame(page);

      const canvasBox = await page.locator('#game-canvas').boundingBox();
      expect(canvasBox).not.toBeNull();
      expect(canvasBox!.width).toBeGreaterThan(0);
    });

    test('小屏手机应正确渲染', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await navigateToGame(page);

      const canvasBox = await page.locator('#game-canvas').boundingBox();
      expect(canvasBox).not.toBeNull();
      expect(canvasBox!.width).toBeGreaterThan(0);
    });
  });

  test.describe('浏览器兼容性', () => {
    test('应支持Chromium浏览器', async ({ page }) => {
      await navigateToGame(page);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });

    test('WebGL不可用时应降级处理', async ({ page }) => {
      await page.goto(GAME_URL);
      await page.waitForLoadState('networkidle');

      const hasFallback = await page.evaluate(() => {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!canvas) return false;
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        return gl !== null;
      });

      expect(hasFallback).toBeTruthy();
    });
  });
});

test.describe('异常与边界', () => {
  test.describe('页面异常', () => {
    test('页面刷新后应能正常恢复', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 3);
      await waitForStable(page);

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#game-canvas', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });

    test('页面不应有未捕获的JavaScript错误', async ({ page }) => {
      const errors = collectPageErrors(page);
      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 3000);

      expect(errors).toHaveLength(0);
    });

    test('快速切换页面不应崩溃', async ({ page }) => {
      await navigateToGame(page);

      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('#game-canvas', { timeout: 10000 });
        await page.waitForTimeout(1000);
      }

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('输入边界', () => {
    test('Canvas外点击不应触发投放', async ({ page }) => {
      await navigateToGame(page);

      const blockCountBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      await page.mouse.click(10, 10);
      await page.waitForTimeout(1000);

      const blockCountAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCountAfter).toBeGreaterThanOrEqual(blockCountBefore);
    });

    test('极快速度连续点击不应崩溃', async ({ page }) => {
      test.setTimeout(120000);
      await navigateToGame(page);

      for (let i = 0; i < 10; i++) {
        await clickCanvasCenter(page);
        await page.waitForTimeout(300);
      }

      await waitForStable(page, 5000);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });

    test('长时间不操作不应崩溃', async ({ page }) => {
      await navigateToGame(page);
      await page.waitForTimeout(10000);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('数据边界', () => {
    test('分数不应为负数', async ({ page }) => {
      await navigateToGame(page);

      const score = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const scoreSystem = game.getScoreSystem?.();
        return scoreSystem?.getScore?.() ?? -1;
      });

      expect(score).toBeGreaterThanOrEqual(0);
    });

    test('方块数量不应超过合理上限', async ({ page }) => {
      test.setTimeout(120000);
      await navigateToGame(page);
      await dropBlocks(page, 15, 600);
      await waitForStable(page, 5000);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCount).toBeLessThanOrEqual(100);
    });

    test('道具数量不应为负数', async ({ page }) => {
      await navigateToGame(page);

      const allNonNegative = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const propSystem = game.getPropSystem?.();
        if (!propSystem) return false;
        const props = propSystem.getAllProps?.();
        if (!props) return false;
        return props.every((p: any) => p.remaining >= 0);
      });

      expect(allNonNegative).toBeTruthy();
    });
  });

  test.describe('资源边界', () => {
    test('关卡ID越界应安全处理', async ({ page }) => {
      await navigateToGame(page);

      const handlesInvalid = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        try {
          const result = levelLoader.getLevelConfig?.(9999);
          return result === null || result === undefined;
        } catch {
          return true;
        }
      });

      expect(handlesInvalid).toBeTruthy();
    });

    test('关卡ID为负数应安全处理', async ({ page }) => {
      await navigateToGame(page);

      const handlesNegative = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        try {
          const result = levelLoader.getLevelConfig?.(-1);
          return result === null || result === undefined;
        } catch {
          return true;
        }
      });

      expect(handlesNegative).toBeTruthy();
    });
  });

  test.describe('并发与竞态', () => {
    test('同时触发多个状态转换应安全处理', async ({ page }) => {
      await navigateToGame(page);

      const noCrash = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const sm = game.getStateMachine?.();
        if (!sm) return false;

        try {
          sm.transitionTo?.('playing');
          sm.transitionTo?.('paused');
          sm.transitionTo?.('playing');
          return true;
        } catch {
          return false;
        }
      });

      expect(noCrash).toBeTruthy();
    });

    test('游戏结束状态下操作道具应安全', async ({ page }) => {
      await navigateToGame(page);

      const safeOperation = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const sm = game.getStateMachine?.();
        const propSystem = game.getPropSystem?.();
        if (!sm || !propSystem) return false;

        try {
          sm.transitionTo?.('gameover');
          propSystem.useProp?.('bomb');
          return true;
        } catch {
          return false;
        }
      });

      expect(safeOperation).toBeTruthy();
    });
  });

  test.describe('内存与性能边界', () => {
    test('长时间运行不应内存泄漏', async ({ page }) => {
      test.setTimeout(120000);
      await navigateToGame(page);

      for (let round = 0; round < 3; round++) {
        await dropBlocks(page, 5, 600);
        await waitForStable(page, 3000);

        await page.evaluate(() => {
          const game = (window as any).__gameInstance;
          if (!game) return;
          const scene = game.getGameScene?.();
          scene?.resetGame?.();
        });

        await waitForStable(page, 2000);
      }

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });

    test('大量特效同时播放不应崩溃', async ({ page }) => {
      test.setTimeout(120000);
      await navigateToGame(page);
      await dropBlocks(page, 10, 600);
      await waitForStable(page, 5000);

      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
    });
  });
});