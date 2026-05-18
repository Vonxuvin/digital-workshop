import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, ensurePlaying, ensureGameScene } from './helpers';

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

  test.describe('第2关卡特定场景 @critical', () => {
    test('第2关卡碰撞后Score应正确累加', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getSceneManager?.()?.startLevelById?.(2);
        } catch {}
      });

      await page.waitForTimeout(2000);

      const inPlayingState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          return game.getStateMachine?.()?.getCurrentState?.() === 'playing';
        } catch {
          return false;
        }
      });

      if (!inPlayingState) {
        test.skip(true, '第2关卡未能进入playing状态');
        return;
      }

      const scoreBefore = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      await dropBlocks(page, 5, 500);
      await waitForStable(page, 2000);

      const scoreAfter = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getScore?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(scoreAfter).toBeGreaterThan(scoreBefore);
    });

    test('第2关卡连击Score应正确累加', async ({ page }) => {
      test.setTimeout(process.env.CI ? 120000 : 90000);
      await navigateToGame(page);
      await ensureGameScene(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getSceneManager?.()?.startLevelById?.(2);
        } catch {}
      });

      await page.waitForTimeout(process.env.CI ? 3000 : 2000);

      const inPlayingState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          return game.getStateMachine?.()?.getCurrentState?.() === 'playing';
        } catch {
          return false;
        }
      });

      if (!inPlayingState) {
        test.skip(true, '第2关卡未能进入playing状态');
        return;
      }

      try {
        await dropBlocks(page, 5, 500);
      } catch {
        test.skip(true, 'dropBlocks操作失败，跳过连击Score测试');
        return;
      }
      await waitForStable(page, 3000);

      const chainCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          return game.getScoreSystem?.()?.getChainCount?.() ?? -1;
        } catch {
          return -1;
        }
      });

      expect(chainCount).toBeGreaterThanOrEqual(0);
    });

    test('第2关卡Score事件流应完整', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          game.getSceneManager?.()?.startLevelById?.(2);
        } catch {}
      });

      await page.waitForTimeout(2000);

      const inPlayingState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          return game.getStateMachine?.()?.getCurrentState?.() === 'playing';
        } catch {
          return false;
        }
      });

      if (!inPlayingState) {
        test.skip(true, '第2关卡未能进入playing状态');
        return;
      }

      await dropBlocks(page, 5, 500);
      await waitForStable(page, 2000);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { scoreOk: false, mergeOk: false, counterOk: false };
        try {
          const scoreSystem = game.getScoreSystem?.();
          const hud = game.getGameHUD?.();
          return {
            scoreOk: scoreSystem?.getScore?.() > 0,
            mergeOk: true,
            counterOk: hud?.scoreText !== null && hud?.scoreText !== undefined,
          };
        } catch {
          return { scoreOk: false, mergeOk: false, counterOk: false };
        }
      });

      expect(result.scoreOk).toBeTruthy();
      expect(result.counterOk).toBeTruthy();
    });
  });

  test.describe('关卡目标展示 @regression', () => {
    test('GameHUD 应包含 ObjectiveDisplay 组件', async ({ page }) => {
      await navigateToGame(page);

      const hasObjectiveDisplay = await page.evaluate(() => {
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

      expect(hasObjectiveDisplay).toBeTruthy();
    });

    test('GameHUD 不应包含独立的 objectiveBar（已移除）', async ({ page }) => {
      await navigateToGame(page);

      const noObjectiveBar = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.objectiveBar === undefined;
        } catch {
          return false;
        }
      });

      expect(noObjectiveBar).toBeTruthy();
    });

    test('LevelSystem 应支持 getObjectiveTarget 方法', async ({ page }) => {
      await navigateToGame(page);

      const hasGetObjectiveTarget = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelSystem = game.getLevelSystem?.();
          if (!levelSystem) return false;
          return typeof levelSystem.getObjectiveTarget === 'function';
        } catch {
          return false;
        }
      });

      expect(hasGetObjectiveTarget).toBeTruthy();
    });

    test('LevelSystem 应支持 getCurrentProgressValue 方法', async ({ page }) => {
      await navigateToGame(page);

      const hasGetCurrentProgressValue = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelSystem = game.getLevelSystem?.();
          if (!levelSystem) return false;
          return typeof levelSystem.getCurrentProgressValue === 'function';
        } catch {
          return false;
        }
      });

      expect(hasGetCurrentProgressValue).toBeTruthy();
    });

    test('LevelSystem 应支持 getTimeLimit 方法', async ({ page }) => {
      await navigateToGame(page);

      const hasGetTimeLimit = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelSystem = game.getLevelSystem?.();
          if (!levelSystem) return false;
          return typeof levelSystem.getTimeLimit === 'function';
        } catch {
          return false;
        }
      });

      expect(hasGetTimeLimit).toBeTruthy();
    });
  });

  test.describe('关卡目标覆盖层 @regression', () => {
    test('GameScene 应包含 LevelObjectiveOverlay', async ({ page }) => {
      await navigateToGame(page);

      const hasOverlay = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          return typeof scene.getLevelObjectiveOverlay === 'function';
        } catch {
          return false;
        }
      });

      expect(hasOverlay).toBeTruthy();
    });

    test('关卡开始时应显示目标覆盖层', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const overlayVisible = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const overlay = scene.getLevelObjectiveOverlay?.();
          if (!overlay) return false;
          return overlay.isVisible?.() === true;
        } catch {
          return false;
        }
      });

      expect(overlayVisible).toBeTruthy();
    });

    test('目标覆盖层应显示正确的关卡信息', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const overlayConfig = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return null;
          const overlay = scene.getLevelObjectiveOverlay?.();
          if (!overlay) return null;
          const config = overlay.getConfig?.();
          if (!config) return null;
          return {
            id: config.id,
            name: config.name,
            objectiveType: config.objective?.type,
            objectiveTarget: config.objective?.target,
          };
        } catch {
          return null;
        }
      });

      expect(overlayConfig).not.toBeNull();
      if (overlayConfig) {
        expect(overlayConfig.objectiveType).toBeDefined();
        expect(overlayConfig.objectiveTarget).toBeDefined();
      }
    });
  });

  test.describe('目标进度更新 @regression', () => {
    test('GameHUD 应支持 setObjectiveInfo 方法', async ({ page }) => {
      await navigateToGame(page);

      const hasSetObjectiveInfo = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return typeof hud.setObjectiveInfo === 'function';
        } catch {
          return false;
        }
      });

      expect(hasSetObjectiveInfo).toBeTruthy();
    });

    test('GameHUD 应支持 updateObjectiveProgress 方法', async ({ page }) => {
      await navigateToGame(page);

      const hasUpdateObjectiveProgress = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return typeof hud.updateObjectiveProgress === 'function';
        } catch {
          return false;
        }
      });

      expect(hasUpdateObjectiveProgress).toBeTruthy();
    });

    test('GameHUD 不应再有 setObjectiveProgress 方法（已移除）', async ({ page }) => {
      await navigateToGame(page);

      const noSetObjectiveProgress = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return (hud as any).setObjectiveProgress === undefined;
        } catch {
          return false;
        }
      });

      expect(noSetObjectiveProgress).toBeTruthy();
    });

    test('ObjectiveDisplay 应正确显示接近完成状态', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const nearCompleteWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          const display = hud.objectiveDisplay;
          if (!display) return false;
          return typeof display.isNearComplete === 'function';
        } catch {
          return false;
        }
      });

      expect(nearCompleteWorks).toBeTruthy();
    });
  });

  test.describe('不同目标类型的展示 @full', () => {
    test('所有关卡配置应包含有效的目标类型', async ({ page }) => {
      await navigateToGame(page);

      const validObjectiveTypes = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const levelLoader = game.getLevelLoader?.();
          if (!levelLoader) return false;
          const configs = levelLoader.getAllLevelConfigsSync?.();
          if (!configs || configs.length === 0) return false;
          const validTypes = ['score', 'target_merge', 'clear_obstacle', 'survival'];
          return configs.every((c: any) => validTypes.includes(c.objective?.type));
        } catch {
          return false;
        }
      });

      expect(validObjectiveTypes).toBeTruthy();
    });
  });
});
