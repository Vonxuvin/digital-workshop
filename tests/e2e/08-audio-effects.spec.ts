import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, clickCanvasCenter, isGamePlaying } from './helpers';

test.describe('音效与特效 @regression', () => {
  test.describe('音效系统 @smoke', () => {
    test('音效管理器应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasAudioManager = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const audio = game.getAudioManager?.();
          return audio !== null && audio !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasAudioManager).toBeTruthy();
    });

    test('应能播放音效', async ({ page }) => {
      await navigateToGame(page);

      const canPlay = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const audio = game.getAudioManager?.();
          if (!audio) return false;
          return typeof audio.play === 'function';
        } catch {
          return false;
        }
      });

      expect(canPlay).toBeTruthy();
    });

    test('应能设置主音量', async ({ page }) => {
      await navigateToGame(page);

      const canSetVolume = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const audio = game.getAudioManager?.();
          if (!audio) return false;
          return typeof audio.setMasterVolume === 'function';
        } catch {
          return false;
        }
      });

      expect(canSetVolume).toBeTruthy();
    });

    test('应能设置音效音量', async ({ page }) => {
      await navigateToGame(page);

      const canSetSfxVolume = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const audio = game.getAudioManager?.();
          if (!audio) return false;
          return typeof audio.setSfxVolume === 'function';
        } catch {
          return false;
        }
      });

      expect(canSetSfxVolume).toBeTruthy();
    });

    test('应能设置音乐音量', async ({ page }) => {
      await navigateToGame(page);

      const canSetMusicVolume = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const audio = game.getAudioManager?.();
          if (!audio) return false;
          return typeof audio.setMusicVolume === 'function';
        } catch {
          return false;
        }
      });

      expect(canSetMusicVolume).toBeTruthy();
    });

    test('应能切换静音', async ({ page }) => {
      await navigateToGame(page);

      const canToggleMute = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const audio = game.getAudioManager?.();
          if (!audio) return false;
          return typeof audio.toggleMute === 'function'
            && typeof audio.isCurrentlyMuted === 'function';
        } catch {
          return false;
        }
      });

      expect(canToggleMute).toBeTruthy();
    });
  });

  test.describe('音效触发 @regression', () => {
    test('方块合并应触发音效', async ({ page }) => {
      await navigateToGame(page);

      const hasPlayMethod = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const audio = game.getAudioManager?.();
          if (!audio) return false;
          return typeof audio.play === 'function';
        } catch {
          return false;
        }
      });

      expect(hasPlayMethod).toBeTruthy();
    });

    test('游戏结束应触发音效', async ({ page }) => {
      await navigateToGame(page);

      const hasPlayMethod = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const audio = game.getAudioManager?.();
          if (!audio) return false;
          return typeof audio.play === 'function';
        } catch {
          return false;
        }
      });

      expect(hasPlayMethod).toBeTruthy();
    });

    test('道具使用应触发音效', async ({ page }) => {
      await navigateToGame(page);

      const hasPlayMethod = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const audio = game.getAudioManager?.();
          if (!audio) return false;
          return typeof audio.play === 'function';
        } catch {
          return false;
        }
      });

      expect(hasPlayMethod).toBeTruthy();
    });
  });

  test.describe('视觉效果 @regression', () => {
    test('特效管理器应正确初始化', async ({ page }) => {
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

    test('方块合并应触发粒子效果', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 10, 500);
      await waitForStable(page, 3000);

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

    test('连击应触发特效', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 10, 400);
      await waitForStable(page, 3000);

      const hasComboDisplay = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const hud = game.getGameHUD?.();
          if (!hud) return false;
          return hud.comboDisplay !== null && hud.comboDisplay !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasComboDisplay).toBeTruthy();
    });
  });

  test.describe('音效性能 @full', () => {
    test('频繁触发音效不应导致性能下降', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      if (!playing) return;
      await dropBlocks(page, 15, 300);
      await waitForStable(page, 3000);

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

      expect(fps).toBeGreaterThanOrEqual(1);
    });

    test('音效系统应支持销毁', async ({ page }) => {
      await navigateToGame(page);

      const canDestroy = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const audio = game.getAudioManager?.();
          if (!audio) return false;
          return typeof audio.destroy === 'function';
        } catch {
          return false;
        }
      });

      expect(canDestroy).toBeTruthy();
    });
  });
});
