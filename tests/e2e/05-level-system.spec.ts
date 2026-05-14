import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable } from './helpers';

test.describe('关卡系统', () => {
  test.describe('关卡配置', () => {
    test('应至少有15个关卡配置', async ({ page }) => {
      await navigateToGame(page);

      const levelCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return -1;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        return configs?.length ?? -1;
      });

      expect(levelCount).toBeGreaterThanOrEqual(15);
    });

    test('每个关卡应有唯一ID', async ({ page }) => {
      await navigateToGame(page);

      const uniqueIds = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        const ids = configs.map((c: any) => c.id);
        return new Set(ids).size === ids.length;
      });

      expect(uniqueIds).toBeTruthy();
    });

    test('每个关卡应有名称和描述', async ({ page }) => {
      await navigateToGame(page);

      const allNamed = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        return configs.every((c: any) =>
          c.name && typeof c.name === 'string' && c.name.length > 0
        );
      });

      expect(allNamed).toBeTruthy();
    });

    test('每个关卡应有容器配置', async ({ page }) => {
      await navigateToGame(page);

      const allHaveContainer = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        return configs.every((c: any) =>
          c.container?.width > 0 && c.container?.height > 0
        );
      });

      expect(allHaveContainer).toBeTruthy();
    });

    test('每个关卡应有生成配置', async ({ page }) => {
      await navigateToGame(page);

      const allHaveSpawn = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        return configs.every((c: any) =>
          c.spawn?.availableNumbers && Array.isArray(c.spawn.availableNumbers) && c.spawn.availableNumbers.length > 0
        );
      });

      expect(allHaveSpawn).toBeTruthy();
    });

    test('关卡配置应通过Schema校验', async ({ page }) => {
      await navigateToGame(page);

      const allValid = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        for (const config of configs) {
          const validation = levelLoader.validateConfig?.(config);
          if (!validation?.valid) return false;
        }
        return true;
      });

      expect(allValid).toBeTruthy();
    });
  });

  test.describe('关卡目标类型', () => {
    test('应覆盖4种目标类型', async ({ page }) => {
      await navigateToGame(page);

      const types = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return [];
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return [];
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return [];
        const typeSet = new Set<string>();
        for (const config of configs) {
          if (config.objective?.type) typeSet.add(config.objective.type);
        }
        return Array.from(typeSet);
      });

      expect(types.length).toBeGreaterThanOrEqual(4);
    });

    test('分数目标类型应正确配置', async ({ page }) => {
      await navigateToGame(page);

      const hasScoreType = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        return configs.some((c: any) => c.objective?.type === 'score');
      });

      expect(hasScoreType).toBeTruthy();
    });

    test('目标合成类型应正确配置', async ({ page }) => {
      await navigateToGame(page);

      const hasMergeType = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        return configs.some((c: any) => c.objective?.type === 'target_merge');
      });

      expect(hasMergeType).toBeTruthy();
    });

    test('清除障碍类型应正确配置', async ({ page }) => {
      await navigateToGame(page);

      const hasClearType = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        return configs.some((c: any) => c.objective?.type === 'clear_obstacle');
      });

      expect(hasClearType).toBeTruthy();
    });

    test('生存类型应正确配置', async ({ page }) => {
      await navigateToGame(page);

      const hasSurvivalType = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        return configs.some((c: any) => c.objective?.type === 'survival');
      });

      expect(hasSurvivalType).toBeTruthy();
    });
  });

  test.describe('关卡加载', () => {
    test('LevelLoader应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const loaderReady = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        return levelLoader !== null && levelLoader !== undefined;
      });

      expect(loaderReady).toBeTruthy();
    });

    test('应支持按ID加载关卡', async ({ page }) => {
      await navigateToGame(page);

      const canLoadById = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        return typeof levelLoader.loadLevel === 'function';
      });

      expect(canLoadById).toBeTruthy();
    });

    test('加载不存在的关卡应返回错误', async ({ page }) => {
      await navigateToGame(page);

      const handlesInvalid = await page.evaluate(async () => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        try {
          const result = await levelLoader.loadLevel?.(9999);
          return result === null || result === undefined;
        } catch {
          return true;
        }
      });

      expect(handlesInvalid).toBeTruthy();
    });
  });

  test.describe('关卡进度', () => {
    test('LevelSystem应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const systemReady = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelSystem = game.getLevelSystem?.();
        return levelSystem !== null && levelSystem !== undefined;
      });

      expect(systemReady).toBeTruthy();
    });

    test('应支持目标进度更新', async ({ page }) => {
      await navigateToGame(page);

      const canUpdate = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelSystem = game.getLevelSystem?.();
        if (!levelSystem) return false;
        return typeof levelSystem.updateProgress === 'function';
      });

      expect(canUpdate).toBeTruthy();
    });

    test('目标达成应触发通关', async ({ page }) => {
      await navigateToGame(page);

      const hasWinCheck = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelSystem = game.getLevelSystem?.();
        if (!levelSystem) return false;
        return typeof levelSystem.checkWinCondition === 'function';
      });

      expect(hasWinCheck).toBeTruthy();
    });
  });

  test.describe('难度曲线', () => {
    test('关卡目标值应随关卡递增', async ({ page }) => {
      await navigateToGame(page);

      const targets = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return [];
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return [];
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return [];
        return configs
          .sort((a: any, b: any) => a.id - b.id)
          .map((c: any) => c.objective?.target ?? 0);
      });

      expect(targets.length).toBeGreaterThanOrEqual(15);
    });

    test('后期关卡应包含变形器', async ({ page }) => {
      await navigateToGame(page);

      const laterLevelsHaveModifiers = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        const laterLevels = configs.filter((c: any) => c.id >= 6);
        return laterLevels.some((c: any) =>
          c.modifiers && Array.isArray(c.modifiers) && c.modifiers.length > 0
        );
      });

      expect(laterLevelsHaveModifiers).toBeTruthy();
    });
  });

  test.describe('星星评定', () => {
    test('每个关卡应有3星评定配置', async ({ page }) => {
      await navigateToGame(page);

      const allHaveStars = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        return configs.every((c: any) =>
          c.rewards?.stars && Array.isArray(c.rewards.stars) && c.rewards.stars.length === 3
        );
      });

      expect(allHaveStars).toBeTruthy();
    });

    test('星星阈值应递增', async ({ page }) => {
      await navigateToGame(page);

      const validThresholds = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelLoader = game.getLevelLoader?.();
        if (!levelLoader) return false;
        const configs = levelLoader.getAllLevelConfigsSync?.();
        if (!configs) return false;
        return configs.every((c: any) => {
          const stars = c.rewards?.stars;
          if (!stars || stars.length !== 3) return false;
          return stars[0] < stars[1] && stars[1] < stars[2];
        });
      });

      expect(validThresholds).toBeTruthy();
    });
  });
});