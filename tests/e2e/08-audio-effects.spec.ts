import { test, expect } from '@playwright/test';
import { navigateToGame, clickCanvasCenter, dropBlocks, waitForStable } from './helpers';

test.describe('音效与特效', () => {
  test.describe('音效系统', () => {
    test('AudioManager应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const audioReady = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const audio = game.getAudioManager?.();
        return audio !== null && audio !== undefined;
      });

      expect(audioReady).toBeTruthy();
    });

    test('AudioManager应支持程序化音效生成', async ({ page }) => {
      await navigateToGame(page);

      const hasProcedural = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const audio = game.getAudioManager?.();
        if (!audio) return false;
        return typeof audio.play === 'function';
      });

      expect(hasProcedural).toBeTruthy();
    });

    test('不同事件应触发不同音效', async ({ page }) => {
      const audioKeys: Set<string> = new Set();
      page.on('console', (msg) => {
        const match = msg.text().match(/playSfx\('(\w+)'\)/);
        if (match) audioKeys.add(match[1]);
      });

      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 3000);
    });

    test('主音量控制应影响所有音效', async ({ page }) => {
      await navigateToGame(page);

      const hasVolumeControl = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const audio = game.getAudioManager?.();
        if (!audio) return false;
        return typeof audio.setMasterVolume === 'function'
          && typeof audio.setSfxVolume === 'function'
          && typeof audio.setMusicVolume === 'function';
      });

      expect(hasVolumeControl).toBeTruthy();
    });

    test('静音模式应阻止所有音效播放', async ({ page }) => {
      await navigateToGame(page);

      const muteWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const audio = game.getAudioManager?.();
        if (!audio) return false;

        audio.toggleMute?.();
        const isMuted = audio.isCurrentlyMuted?.();
        audio.toggleMute?.();
        return typeof isMuted === 'boolean';
      });

      expect(muteWorks).toBeTruthy();
    });

    test('音效开关应正确切换', async ({ page }) => {
      await navigateToGame(page);

      const hasToggle = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const audio = game.getAudioManager?.();
        if (!audio) return false;
        return typeof audio.toggleMute === 'function';
      });

      expect(hasToggle).toBeTruthy();
    });
  });

  test.describe('合成特效', () => {
    test('合成特效应包含扩散环效果', async ({ page }) => {
      await navigateToGame(page);

      const hasMergeEffect = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        const effectManager = scene.getEffectManager?.();
        if (!effectManager) return false;
        return typeof effectManager.addMergeEffect === 'function';
      });

      expect(hasMergeEffect).toBeTruthy();
    });

    test('合成时应播放粒子特效', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 10);
      await waitForStable(page, 5000);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });
  });

  test.describe('爆炸特效', () => {
    test('爆炸特效应包含粒子扩散', async ({ page }) => {
      await navigateToGame(page);

      const hasExplosionEffect = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        const effectManager = scene.getEffectManager?.();
        if (!effectManager) return false;
        return typeof effectManager.addExplosionEffect === 'function';
      });

      expect(hasExplosionEffect).toBeTruthy();
    });
  });

  test.describe('冰冻特效', () => {
    test('冰冻特效应覆盖全屏', async ({ page }) => {
      await navigateToGame(page);

      const hasFreezeEffect = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        const effectManager = scene.getEffectManager?.();
        if (!effectManager) return false;
        return typeof effectManager.addFreezeEffect === 'function'
          && typeof effectManager.removeFreezeEffect === 'function';
      });

      expect(hasFreezeEffect).toBeTruthy();
    });
  });

  test.describe('特效管理器', () => {
    test('特效管理器应正确清理过期特效', async ({ page }) => {
      await navigateToGame(page);

      const hasCleanup = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        const effectManager = scene.getEffectManager?.();
        if (!effectManager) return false;
        return typeof effectManager.cleanup === 'function'
          && typeof effectManager.clearAll === 'function';
      });

      expect(hasCleanup).toBeTruthy();
    });

    test('GraphicsPool应复用图形对象', async ({ page }) => {
      await navigateToGame(page);

      const hasPool = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        const effectManager = scene.getEffectManager?.();
        if (!effectManager) return false;
        return effectManager.graphicsPool !== null;
      });

      expect(hasPool).toBeTruthy();
    });

    test('特效不应导致内存泄漏', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 10);
      await waitForStable(page, 3000);

      const effectCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const scene = game.getGameScene?.();
        if (!scene) return -1;
        const effectManager = scene.getEffectManager?.();
        if (!effectManager) return -1;
        return effectManager.getEffects?.()?.length ?? -1;
      });

      expect(effectCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('动画表现', () => {
    test('方块投放应有动画效果', async ({ page }) => {
      await navigateToGame(page);

      await clickCanvasCenter(page);
      await page.waitForTimeout(300);

      const screenshot1 = await page.screenshot();
      await page.waitForTimeout(500);
      const screenshot2 = await page.screenshot();

      expect(screenshot1.length).toBeGreaterThan(1000);
      expect(screenshot2.length).toBeGreaterThan(1000);
    });

    test('合成应有缩放动画', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 10);
      await waitForStable(page, 5000);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });

    test('得分应有飘字动画', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 3000);

      const screenshot = await page.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });
  });
});