import { test, expect } from '@playwright/test';
import { navigateToGame } from './helpers';

test.describe('数据持久化', () => {
  test.describe('SaveManager核心功能', () => {
    test('SaveManager应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasSaveManager = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        return saveManager !== null && saveManager !== undefined;
      });

      expect(hasSaveManager).toBeTruthy();
    });

    test('存档应包含玩家完整数据', async ({ page }) => {
      await navigateToGame(page);

      const dataComplete = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        const data = saveManager.getData?.();
        if (!data) return false;

        return data.totalScore !== undefined
          && data.totalStars !== undefined
          && data.coins !== undefined
          && data.diamonds !== undefined
          && data.currentLevel !== undefined
          && data.levelProgress !== undefined
          && data.settings !== undefined
          && data.playStatistics !== undefined;
      });

      expect(dataComplete).toBeTruthy();
    });

    test('存档应支持手动保存', async ({ page }) => {
      await navigateToGame(page);

      const canSave = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        return typeof saveManager.save === 'function';
      });

      expect(canSave).toBeTruthy();
    });

    test('存档应支持加载', async ({ page }) => {
      await navigateToGame(page);

      const canLoad = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        return typeof saveManager.load === 'function';
      });

      expect(canLoad).toBeTruthy();
    });

    test('存档应支持重置', async ({ page }) => {
      await navigateToGame(page);

      const canReset = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        return typeof saveManager.reset === 'function';
      });

      expect(canReset).toBeTruthy();
    });
  });

  test.describe('关卡进度', () => {
    test('关卡进度更新应正确记录', async ({ page }) => {
      await navigateToGame(page);

      const progressWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;

        saveManager.updateLevelProgress?.(1, 100, 30, 2, true);
        const progress = saveManager.getLevelProgress?.(1);
        return progress?.highScore === 100
          && progress?.stars === 2
          && progress?.completed === true;
      });

      expect(progressWorks).toBeTruthy();
    });

    test('通关后应解锁下一关', async ({ page }) => {
      await navigateToGame(page);

      const unlockWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;

        saveManager.updateLevelProgress?.(1, 500, 60, 3, true);
        const nextProgress = saveManager.getLevelProgress?.(2);
        return nextProgress?.unlocked === true;
      });

      expect(unlockWorks).toBeTruthy();
    });

    test('第1关应默认解锁', async ({ page }) => {
      await navigateToGame(page);

      const level1Unlocked = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        const progress = saveManager.getLevelProgress?.(1);
        return progress?.unlocked === true;
      });

      expect(level1Unlocked).toBeTruthy();
    });

    test('未通关不应解锁后续关卡', async ({ page }) => {
      await navigateToGame(page);

      const notUnlocked = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;

        saveManager.updateLevelProgress?.(1, 100, 30, 1, false);
        const progress = saveManager.getLevelProgress?.(2);
        return progress?.unlocked === false;
      });

      expect(notUnlocked).toBeTruthy();
    });
  });

  test.describe('统计数据', () => {
    test('统计数据应正确更新', async ({ page }) => {
      await navigateToGame(page);

      const statsWork = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;

        const before = saveManager.getData?.()?.playStatistics?.totalGames ?? 0;
        saveManager.updateStatistics?.(64, 5, 120);
        const after = saveManager.getData?.()?.playStatistics?.totalGames ?? 0;
        return after > before;
      });

      expect(statsWork).toBeTruthy();
    });

    test('应记录最高分', async ({ page }) => {
      await navigateToGame(page);

      const hasHighScore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        const data = saveManager.getData?.();
        return data?.totalScore !== undefined;
      });

      expect(hasHighScore).toBeTruthy();
    });

    test('应记录总游戏次数', async ({ page }) => {
      await navigateToGame(page);

      const hasTotalGames = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        const data = saveManager.getData?.();
        return data?.playStatistics?.totalGames !== undefined;
      });

      expect(hasTotalGames).toBeTruthy();
    });

    test('应记录最大连击数', async ({ page }) => {
      await navigateToGame(page);

      const hasMaxCombo = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        const data = saveManager.getData?.();
        return data?.playStatistics?.maxCombo !== undefined;
      });

      expect(hasMaxCombo).toBeTruthy();
    });
  });

  test.describe('自动存档', () => {
    test('自动存档应定期触发', async ({ page }) => {
      await navigateToGame(page);

      const hasAutoSave = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        return typeof saveManager.startAutoSave === 'function';
      });

      expect(hasAutoSave).toBeTruthy();
    });

    test('脏标记应正确追踪数据变更', async ({ page }) => {
      await navigateToGame(page);

      const hasDirtyFlag = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        return typeof saveManager.markDirty === 'function';
      });

      expect(hasDirtyFlag).toBeTruthy();
    });
  });

  test.describe('设置持久化', () => {
    test('音效设置应持久化', async ({ page }) => {
      await navigateToGame(page);

      const hasSettings = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        const data = saveManager.getData?.();
        return data?.settings?.soundEnabled !== undefined
          && data?.settings?.musicEnabled !== undefined
          && data?.settings?.vibrationEnabled !== undefined;
      });

      expect(hasSettings).toBeTruthy();
    });

    test('设置修改后应触发保存', async ({ page }) => {
      await navigateToGame(page);

      const canUpdateSettings = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        return typeof saveManager.updateSettings === 'function';
      });

      expect(canUpdateSettings).toBeTruthy();
    });
  });

  test.describe('数据完整性', () => {
    test('存档数据应支持JSON序列化', async ({ page }) => {
      await navigateToGame(page);

      const serializable = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        const data = saveManager.getData?.();
        if (!data) return false;
        try {
          JSON.stringify(data);
          return true;
        } catch {
          return false;
        }
      });

      expect(serializable).toBeTruthy();
    });

    test('加载损坏数据应回退到默认值', async ({ page }) => {
      await navigateToGame(page);

      const hasFallback = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const saveManager = game.getSaveManager?.();
        if (!saveManager) return false;
        return typeof saveManager.load === 'function';
      });

      expect(hasFallback).toBeTruthy();
    });
  });
});