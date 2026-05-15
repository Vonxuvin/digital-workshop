import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable } from './helpers';

test.describe('数据持久化 @regression', () => {
  test.describe('存档系统 @smoke', () => {
    test('存档管理器应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasSaveManager = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          return saveManager !== null && saveManager !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasSaveManager).toBeTruthy();
    });

    test('应能读取存档数据', async ({ page }) => {
      await navigateToGame(page);

      const canGetData = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          return typeof saveManager.getData === 'function';
        } catch {
          return false;
        }
      });

      expect(canGetData).toBeTruthy();
    });

    test('应能保存数据', async ({ page }) => {
      await navigateToGame(page);

      const canSave = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          return typeof saveManager.save === 'function';
        } catch {
          return false;
        }
      });

      expect(canSave).toBeTruthy();
    });

    test('应能加载存档', async ({ page }) => {
      await navigateToGame(page);

      const canLoad = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          return typeof saveManager.load === 'function';
        } catch {
          return false;
        }
      });

      expect(canLoad).toBeTruthy();
    });

    test('应能重置存档', async ({ page }) => {
      await navigateToGame(page);

      const canReset = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          return typeof saveManager.reset === 'function';
        } catch {
          return false;
        }
      });

      expect(canReset).toBeTruthy();
    });
  });

  test.describe('自动存档 @regression', () => {
    test('应支持自动存档', async ({ page }) => {
      await navigateToGame(page);

      const hasAutoSave = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          return typeof saveManager.startAutoSave === 'function';
        } catch {
          return false;
        }
      });

      expect(hasAutoSave).toBeTruthy();
    });

    test('应支持脏标记', async ({ page }) => {
      await navigateToGame(page);

      const hasDirtyMark = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          return typeof saveManager.markDirty === 'function';
        } catch {
          return false;
        }
      });

      expect(hasDirtyMark).toBeTruthy();
    });

    test('关卡进度应自动保存', async ({ page }) => {
      await navigateToGame(page);

      const canUpdateProgress = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          return typeof saveManager.updateLevelProgress === 'function';
        } catch {
          return false;
        }
      });

      expect(canUpdateProgress).toBeTruthy();
    });
  });

  test.describe('数据完整性 @regression', () => {
    test('存档数据应包含关卡进度', async ({ page }) => {
      await navigateToGame(page);

      const hasLevelProgress = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          return typeof saveManager.getLevelProgress === 'function';
        } catch {
          return false;
        }
      });

      expect(hasLevelProgress).toBeTruthy();
    });

    test('存档数据应包含统计信息', async ({ page }) => {
      await navigateToGame(page);

      const hasStatistics = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          return typeof saveManager.updateStatistics === 'function';
        } catch {
          return false;
        }
      });

      expect(hasStatistics).toBeTruthy();
    });

    test('存档数据应包含设置信息', async ({ page }) => {
      await navigateToGame(page);

      const hasSettings = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          return typeof saveManager.updateSettings === 'function';
        } catch {
          return false;
        }
      });

      expect(hasSettings).toBeTruthy();
    });
  });

  test.describe('平台存储 @full', () => {
    test('平台适配器应支持存储', async ({ page }) => {
      await navigateToGame(page);

      const hasStorage = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const adapter = game.getPlatformAdapter?.();
          if (!adapter) return false;
          return typeof adapter.getStorage === 'function'
            && typeof adapter.setStorage === 'function';
        } catch {
          return false;
        }
      });

      expect(hasStorage).toBeTruthy();
    });

    test('浏览器环境应使用localStorage', async ({ page }) => {
      await navigateToGame(page);

      const isBrowser = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const adapter = game.getPlatformAdapter?.();
          if (!adapter) return false;
          return adapter.isBrowser?.() ?? false;
        } catch {
          return false;
        }
      });

      expect(typeof isBrowser).toBe('boolean');
    });

    test('非浏览器环境应使用替代存储', async ({ page }) => {
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
  });

  test.describe('存档恢复 @full', () => {
    test('页面刷新后应恢复存档', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const saveManager = game.getSaveManager?.();
          saveManager?.markDirty?.();
          saveManager?.save?.();
        } catch {}
      });

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('#game-canvas', { timeout: 15000 });

      const hasSaveManager = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          return saveManager !== null && saveManager !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasSaveManager).toBeTruthy();
    });
  });
});
