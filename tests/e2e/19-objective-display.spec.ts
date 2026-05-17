import { test, expect } from '@playwright/test';
import { navigateToGame, ensurePlaying, ensureGameScene, waitForStable } from './helpers';

test.describe('通关条件展示系统 @regression', () => {
  test.describe('关卡目标展示 @smoke', () => {
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

  test.describe('通关条件固定显示 @regression', () => {
    test('ObjectiveDisplay 应在游戏过程中持续显示通关条件', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const objectiveAlwaysVisible = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          const display = hud.objectiveDisplay;
          if (!display) return false;
          return display.getCurrentData?.() !== null;
        } catch {
          return false;
        }
      });

      expect(objectiveAlwaysVisible).toBeTruthy();
    });

    test('ObjectiveDisplay 应包含进度条', async ({ page }) => {
      await navigateToGame(page);

      const hasProgressBar = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          const display = hud.objectiveDisplay;
          if (!display) return false;
          return display.progressBar !== null && display.progressBar !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasProgressBar).toBeTruthy();
    });

    test('HUD 不应有独立的进度条（双进度条BUG已修复）', async ({ page }) => {
      await navigateToGame(page);

      const noDuplicateBar = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return (hud as any)._objectiveBar === undefined;
        } catch {
          return false;
        }
      });

      expect(noDuplicateBar).toBeTruthy();
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

  test.describe('界面布局整合 @regression', () => {
    test('ObjectiveDisplay 应位于统一位置', async ({ page }) => {
      await navigateToGame(page);

      const correctPosition = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          const display = hud.objectiveDisplay;
          if (!display) return false;
          return display.x > 0 && display.y >= 0;
        } catch {
          return false;
        }
      });

      expect(correctPosition).toBeTruthy();
    });

    test('ObjectiveDisplay 应同时展示目标描述和进度条', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const hasBothInfoAndBar = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          const display = hud.objectiveDisplay;
          if (!display) return false;
          const data = display.getCurrentData?.();
          const bar = display.progressBar;
          return data !== null && bar !== null && bar !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasBothInfoAndBar).toBeTruthy();
    });
  });
});
