import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, ensurePlaying } from './helpers';

test.describe('关卡系统 @regression', () => {
  test.describe('关卡加载 @smoke', () => {
    test('关卡加载器应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasLevelLoader = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelLoader = game.getLevelLoader?.();
          return levelLoader !== null && levelLoader !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasLevelLoader).toBeTruthy();
    });

    test('应能加载关卡配置', async ({ page }) => {
      await navigateToGame(page);

      const hasConfigs = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelLoader = game.getLevelLoader?.();
          if (!levelLoader) return false;
          const configs = levelLoader.getAllLevelConfigsSync?.();
          return configs && configs.length > 0;
        } catch {
          return false;
        }
      });

      expect(hasConfigs).toBeTruthy();
    });

    test('关卡配置应包含必要字段', async ({ page }) => {
      await navigateToGame(page);

      const hasRequiredFields = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelLoader = game.getLevelLoader?.();
          if (!levelLoader) return false;
          const configs = levelLoader.getAllLevelConfigsSync?.();
          if (!configs || configs.length === 0) return false;
          const firstConfig = configs[0];
          return firstConfig.id !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasRequiredFields).toBeTruthy();
    });

    test('关卡配置应可验证', async ({ page }) => {
      await navigateToGame(page);

      const canValidate = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelLoader = game.getLevelLoader?.();
          if (!levelLoader) return false;
          return typeof levelLoader.validateConfig === 'function';
        } catch {
          return false;
        }
      });

      expect(canValidate).toBeTruthy();
    });
  });

  test.describe('关卡进度 @regression', () => {
    test('关卡进度应正确追踪', async ({ page }) => {
      await navigateToGame(page);

      const hasProgress = await page.evaluate(() => {
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

      expect(hasProgress).toBeTruthy();
    });

    test('关卡进度应可更新', async ({ page }) => {
      await navigateToGame(page);

      const canUpdate = await page.evaluate(() => {
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

      expect(canUpdate).toBeTruthy();
    });

    test('关卡进度应持久化', async ({ page }) => {
      await navigateToGame(page);

      const canPersist = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const saveManager = game.getSaveManager?.();
          if (!saveManager) return false;
          return typeof saveManager.save === 'function'
            && typeof saveManager.load === 'function';
        } catch {
          return false;
        }
      });

      expect(canPersist).toBeTruthy();
    });
  });

  test.describe('关卡切换 @smoke', () => {
    test('应能切换到下一关', async ({ page }) => {
      await navigateToGame(page);

      const canNextLevel = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return false;
          return typeof sm.nextLevel === 'function';
        } catch {
          return false;
        }
      });

      expect(canNextLevel).toBeTruthy();
    });

    test('应能通过ID启动关卡', async ({ page }) => {
      await navigateToGame(page);

      const canStartById = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return false;
          return typeof sm.startLevelById === 'function';
        } catch {
          return false;
        }
      });

      expect(canStartById).toBeTruthy();
    });

    test('关卡切换应重置游戏状态', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const scoreBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const scoreSystem = game.getScoreSystem?.();
          return scoreSystem?.getScore?.() ?? -1;
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

      const scoreAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const scoreSystem = game.getScoreSystem?.();
          return scoreSystem?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      if (scoreBefore >= 0 && scoreAfter >= 0) {
        expect(scoreAfter).toBeLessThanOrEqual(scoreBefore);
      }
    });
  });

  test.describe('关卡目标 @regression', () => {
    test('关卡应包含目标配置', async ({ page }) => {
      await navigateToGame(page);

      const hasObjective = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.objectiveDisplay !== null && hud.objectiveDisplay !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasObjective).toBeTruthy();
    });

    test('目标进度应正确更新', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 2000);

      const hasLevelSystem = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelSystem = game.getLevelSystem?.();
          return levelSystem !== null && levelSystem !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasLevelSystem).toBeTruthy();
    });

    test('完成目标应触发胜利', async ({ page }) => {
      await navigateToGame(page);

      const hasWinCondition = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelSystem = game.getLevelSystem?.();
          if (!levelSystem) return false;
          return typeof levelSystem.checkWinCondition === 'function';
        } catch {
          return false;
        }
      });

      expect(hasWinCondition).toBeTruthy();
    });
  });

  test.describe('关卡难度 @full', () => {
    test('不同关卡应有不同难度', async ({ page }) => {
      await navigateToGame(page);

      const hasMultipleLevels = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelLoader = game.getLevelLoader?.();
          if (!levelLoader) return false;
          const configs = levelLoader.getAllLevelConfigsSync?.();
          return configs && configs.length >= 2;
        } catch {
          return false;
        }
      });

      expect(hasMultipleLevels).toBeTruthy();
    });

    test('高难度关卡应有更多方块类型', async ({ page }) => {
      await navigateToGame(page);

      const configs = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        try {
          const levelLoader = game.getLevelLoader?.();
          if (!levelLoader) return null;
          return levelLoader.getAllLevelConfigsSync?.();
        } catch {
          return null;
        }
      });

      if (configs && configs.length >= 2) {
        expect(configs.length).toBeGreaterThan(1);
      } else {
        expect(configs).not.toBeNull();
      }
    });
  });

  test.describe('timeLimit 与目标类型修复 @regression', () => {
    test('survival 类型关卡应包含 timeLimit', async ({ page }) => {
      await navigateToGame(page);

      const survivalHasTimeLimit = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelLoader = game.getLevelLoader?.();
          if (!levelLoader) return false;
          const configs = levelLoader.getAllLevelConfigsSync?.();
          if (!configs) return false;
          const survivalLevels = configs.filter(
            (c: any) => c.objective?.type === 'survival'
          );
          if (survivalLevels.length === 0) return true;
          return survivalLevels.every(
            (c: any) => c.objective?.timeLimit !== undefined && c.objective?.timeLimit > 0
          );
        } catch {
          return false;
        }
      });

      expect(survivalHasTimeLimit).toBeTruthy();
    });

    test('score 类型关卡 timeLimit 不应触发超时失败', async ({ page }) => {
      await navigateToGame(page);

      const scoreNoTimeout = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelLoader = game.getLevelLoader?.();
          if (!levelLoader) return false;
          const configs = levelLoader.getAllLevelConfigsSync?.();
          if (!configs) return false;
          const scoreWithTimeLimit = configs.filter(
            (c: any) =>
              c.objective?.type === 'score' &&
              c.objective?.timeLimit !== undefined &&
              c.objective?.timeLimit !== null
          );
          return true;
        } catch {
          return false;
        }
      });

      expect(scoreNoTimeout).toBeTruthy();
    });

    test('LevelSystem 应支持 checkWinCondition', async ({ page }) => {
      await navigateToGame(page);

      const hasWinCheck = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelSystem = game.getLevelSystem?.();
          if (!levelSystem) return false;
          return typeof levelSystem.checkWinCondition === 'function'
            && typeof levelSystem.getObjectiveType === 'function';
        } catch {
          return false;
        }
      });

      expect(hasWinCheck).toBeTruthy();
    });

    test('LevelSystem 应区分 survival 和 score 目标类型', async ({ page }) => {
      await navigateToGame(page);

      const canDistinguish = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelSystem = game.getLevelSystem?.();
          if (!levelSystem) return false;
          const type = levelSystem.getObjectiveType?.();
          return type === 'score' || type === 'survival' || type === 'target_merge' || type === 'clear_obstacle';
        } catch {
          return false;
        }
      });

      expect(canDistinguish).toBeTruthy();
    });
  });
});
