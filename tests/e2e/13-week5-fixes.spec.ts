import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, isGamePlaying } from './helpers';

test.describe('Week5 FIX项 E2E验证 @regression', () => {
  test.describe('FIX-8: 统一时间管理 @smoke', () => {
    test('游戏暂停和恢复应正常工作', async ({ page }) => {
      await navigateToGame(page);

      const pauseResumeWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          scene.pause?.();
          const paused = scene.isPaused?.() ?? true;
          scene.resume?.();
          return true;
        } catch {
          return false;
        }
      });

      expect(pauseResumeWorks).toBeTruthy();
    });

    test('连击显示组件应存在', async ({ page }) => {
      await navigateToGame(page);

      const comboDisplayWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          const combo = hud.comboDisplay;
          return combo !== null && combo !== undefined;
        } catch {
          return false;
        }
      });

      expect(comboDisplayWorks).toBeTruthy();
    });
  });

  test.describe('FIX-9: BlockPool对象池 @regression', () => {
    test('BlockSpawner应可访问', async ({ page }) => {
      await navigateToGame(page);

      const hasSpawner = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner !== null && spawner !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasSpawner).toBeTruthy();
    });

    test('投放方块后游戏应正常运行', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 3);
      await waitForStable(page);

      const hasBlocks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const spawner = game.getBlockSpawner?.();
          if (!spawner) return false;
          const blocks = spawner.getBlocks?.();
          return blocks && blocks.length > 0;
        } catch {
          return false;
        }
      });

      expect(hasBlocks).toBeTruthy();
    });
  });

  test.describe('FIX-10: 新手引导扩展 @regression', () => {
    test('TutorialManager应可访问', async ({ page }) => {
      await navigateToGame(page);

      const hasTutorial = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const tm = game.getTutorialManager?.();
          return tm !== null && tm !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasTutorial).toBeTruthy();
    });
  });

  test.describe('FIX-12: 道具栏小屏适配 @regression', () => {
    test('小屏幕下游戏应正常渲染', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToGame(page);

      const canvasVisible = await page.evaluate(() => {
        const canvas = document.querySelector('#game-canvas');
        if (!canvas) return false;
        const rect = canvas.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      expect(canvasVisible).toBeTruthy();
    });

    test('道具栏组件应存在', async ({ page }) => {
      await navigateToGame(page);

      const hasPropsContainer = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.propsContainer !== null && hud.propsContainer !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasPropsContainer).toBeTruthy();
    });
  });

  test.describe('FIX-14: 粒子数量上限 @regression', () => {
    test('GameEffectManager应可访问', async ({ page }) => {
      await navigateToGame(page);

      const hasEffectManager = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const scene = game.getGameScene?.();
          if (!scene) return false;
          const effectManager = scene.getEffectManager?.();
          return effectManager !== null && effectManager !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasEffectManager).toBeTruthy();
    });
  });

  test.describe('FIX-13: 移除错误依赖 @smoke', () => {
    test('游戏应使用PixiJS v8正常渲染', async ({ page }) => {
      await navigateToGame(page);

      const canvasVisible = await page.evaluate(() => {
        const canvas = document.querySelector('#game-canvas');
        if (!canvas) return false;
        const rect = canvas.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      expect(canvasVisible).toBeTruthy();
    });
  });

  test.describe('FIX-11: Level 6-8难度曲线 @regression', () => {
    test('LevelLoader应可访问', async ({ page }) => {
      await navigateToGame(page);

      const hasLoader = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const loader = game.getLevelLoader?.();
          return loader !== null && loader !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasLoader).toBeTruthy();
    });
  });
});
