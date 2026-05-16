import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SaveManager, PlayerData, LevelProgress } from '../../src/core/SaveManager';
import { eventBus } from '../../src/utils/EventBus';
import { PlatformAdapter } from '../../src/platform/PlatformAdapter';

class MockPlatformAdapter implements PlatformAdapter {
  private storage: Map<string, string> = new Map();

  async init(): Promise<void> {}
  async login(): Promise<{ code: string }> { return { code: 'test_code' }; }
  async getUserInfo(): Promise<{ nickName: string; avatarUrl: string }> { return { nickName: 'Test', avatarUrl: '' }; }
  async share(title: string, imageUrl?: string): Promise<void> {}
  async showRewardedVideo(adUnitId: string): Promise<boolean> { return true; }
  async showInterstitialAd(adUnitId: string): Promise<void> {}
  async showBannerAd(adUnitId: string): Promise<void> {}
  async hideBannerAd(): Promise<void> {}
  async requestPayment(orderInfo: unknown): Promise<void> {}
  async getStorage<T>(key: string): Promise<T | null> {
    const value = this.storage.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }
  async setStorage(key: string, value: unknown): Promise<void> {
    this.storage.set(key, JSON.stringify(value));
  }
  async removeStorage(key: string): Promise<void> {
    this.storage.delete(key);
  }
  getPlatform(): string { return 'test'; }
  vibrateShort(): void {}
  vibrateLong(): void {}
  async getSystemInfo() {
    return {
      screenWidth: 800,
      screenHeight: 600,
      pixelRatio: 2,
      platform: 'test',
      brand: '',
      model: '',
      windowWidth: 800,
      windowHeight: 600,
    };
  }
}

describe('Save/Load Integration Tests', () => {

  describe('SaveManager Core Integration', () => {
    let saveManager: SaveManager;

    beforeEach(() => {
      saveManager = new SaveManager();
    });

    it('should initialize with default data', () => {
      const data = saveManager.getData();

      expect(data.totalScore).toBe(0);
      expect(data.totalStars).toBe(0);
      expect(data.currentLevel).toBe(1);
      expect(data.levelProgress[1].unlocked).toBe(true);
      expect(data.levelProgress[1].completed).toBe(false);
      expect(data.settings.soundEnabled).toBe(true);
      expect(data.settings.musicEnabled).toBe(true);
      expect(data.unlockedSkins).toContain('default');
    });
  });

  describe('Level Progress Integration', () => {
    let saveManager: SaveManager;

    beforeEach(() => {
      saveManager = new SaveManager();
    });

    it('should update level progress after completing a level', () => {
      const progressHandler = vi.fn();
      eventBus.on('level:progress:updated', progressHandler);

      saveManager.updateLevelProgress(1, 500, 120, 3, true);

      const progress = saveManager.getLevelProgress(1);
      expect(progress.attempts).toBe(1);
      expect(progress.highScore).toBe(500);
      expect(progress.bestTime).toBe(120);
      expect(progress.stars).toBe(3);
      expect(progress.completed).toBe(true);

      expect(progressHandler).toHaveBeenCalledWith({
        levelId: 1,
        progress: expect.objectContaining({ stars: 3, completed: true }),
      });

      eventBus.off('level:progress:updated', progressHandler);
    });

    it('should unlock next level when current level completed', () => {
      const unlockHandler = vi.fn();
      eventBus.on('level:unlocked', unlockHandler);

      saveManager.updateLevelProgress(1, 500, 120, 3, true);

      expect(unlockHandler).toHaveBeenCalledWith(2);

      const progress2 = saveManager.getLevelProgress(2);
      expect(progress2.unlocked).toBe(true);

      eventBus.off('level:unlocked', unlockHandler);
    });

    it('should not unlock next level if already completed', () => {
      saveManager.updateLevelProgress(1, 500, 120, 3, true);

      const unlockHandler = vi.fn();
      eventBus.on('level:unlocked', unlockHandler);

      saveManager.updateLevelProgress(1, 600, 100, 3, true);

      expect(unlockHandler).not.toHaveBeenCalled();

      eventBus.off('level:unlocked', unlockHandler);
    });

    it('should accumulate total stars', () => {
      const starsHandler = vi.fn();
      eventBus.on('stars:earned', starsHandler);

      saveManager.updateLevelProgress(1, 500, 120, 3, true);

      expect(starsHandler).toHaveBeenCalledWith(3);
      expect(saveManager.getData().totalStars).toBe(3);

      saveManager.updateLevelProgress(2, 600, 100, 2, true);

      expect(saveManager.getData().totalStars).toBe(5);

      eventBus.off('stars:earned', starsHandler);
    });

    it('should only keep highest score', () => {
      saveManager.updateLevelProgress(1, 300, 120, 2, false);

      saveManager.updateLevelProgress(1, 500, 100, 3, true);

      const progress = saveManager.getLevelProgress(1);
      expect(progress.highScore).toBe(500);
    });

    it('should track attempts even when not completed', () => {
      saveManager.updateLevelProgress(1, 100, 60, 1, false);
      saveManager.updateLevelProgress(1, 200, 50, 2, false);

      const progress = saveManager.getLevelProgress(1);
      expect(progress.attempts).toBe(2);
      expect(progress.completed).toBe(false);
    });

    it('should only keep best (lowest) time', () => {
      saveManager.updateLevelProgress(1, 500, 200, 3, true);

      saveManager.updateLevelProgress(1, 600, 100, 3, true);

      const progress = saveManager.getLevelProgress(1);
      expect(progress.bestTime).toBe(100);
    });
  });

  describe('Statistics Integration', () => {
    let saveManager: SaveManager;

    beforeEach(() => {
      saveManager = new SaveManager();
    });

    it('should update play statistics', () => {
      saveManager.updateStatistics(256, 5, 120000);

      const data = saveManager.getData();
      expect(data.playStatistics.totalGames).toBe(1);
      expect(data.playStatistics.highestMerge).toBe(256);
      expect(data.playStatistics.longestCombo).toBe(5);
      expect(data.playStatistics.totalPlayTime).toBe(120000);
    });

    it('should track max combo across games', () => {
      saveManager.updateStatistics(64, 3, 60000);
      expect(saveManager.getData().playStatistics.maxCombo).toBe(3);

      saveManager.updateStatistics(128, 7, 60000);
      expect(saveManager.getData().playStatistics.maxCombo).toBe(7);

      saveManager.updateStatistics(256, 2, 60000);
      expect(saveManager.getData().playStatistics.maxCombo).toBe(7);
    });

    it('should track highest merge across games', () => {
      saveManager.updateStatistics(64, 1, 60000);
      expect(saveManager.getData().playStatistics.highestMerge).toBe(64);

      saveManager.updateStatistics(512, 1, 60000);
      expect(saveManager.getData().playStatistics.highestMerge).toBe(512);
    });

    it('should accumulate total play time', () => {
      saveManager.updateStatistics(64, 1, 60000);
      expect(saveManager.getData().playStatistics.totalPlayTime).toBe(60000);

      saveManager.updateStatistics(128, 1, 30000);
      expect(saveManager.getData().playStatistics.totalPlayTime).toBe(90000);
    });
  });

  describe('Settings Integration', () => {
    let saveManager: SaveManager;

    beforeEach(() => {
      saveManager = new SaveManager();
    });

    it('should toggle sound setting', () => {
      saveManager.updateSettings(false);
      expect(saveManager.getData().settings.soundEnabled).toBe(false);

      saveManager.updateSettings(true);
      expect(saveManager.getData().settings.soundEnabled).toBe(true);
    });

    it('should toggle music setting', () => {
      saveManager.updateSettings(undefined, false);
      expect(saveManager.getData().settings.musicEnabled).toBe(false);
    });

    it('should toggle vibration setting', () => {
      saveManager.updateSettings(undefined, undefined, false);
      expect(saveManager.getData().settings.vibrationEnabled).toBe(false);
    });
  });

  describe('Save/Load Persistence Integration', () => {
    let saveManager: SaveManager;

    beforeEach(() => {
      saveManager = new SaveManager();
    });

    it('should emit save:saved when save completes', async () => {
      saveManager.markDirty();

      const handler = vi.fn();
      eventBus.on('save:saved', handler);

      await saveManager.save();

      expect(handler).toHaveBeenCalled();

      eventBus.off('save:saved', handler);
    });

    it('should emit save:loaded when loading', async () => {
      const handler = vi.fn();
      eventBus.on('save:loaded', handler);

      await saveManager.load();

      expect(handler).toHaveBeenCalled();

      eventBus.off('save:loaded', handler);
    });

    it('should mark dirty and trigger save', async () => {
      const handler = vi.fn();
      eventBus.on('save:saved', handler);

      saveManager.updateLevelProgress(1, 500, 120, 3, true);
      await saveManager.save();

      expect(handler).toHaveBeenCalled();

      eventBus.off('save:saved', handler);
    });
  });

  describe('Level Unlock Progression', () => {
    let saveManager: SaveManager;

    beforeEach(() => {
      saveManager = new SaveManager();
    });

    it('should unlock levels in sequence', () => {
      saveManager.updateLevelProgress(1, 500, 120, 3, true);
      expect(saveManager.getLevelProgress(2).unlocked).toBe(true);
      expect(saveManager.getLevelProgress(3).unlocked).toBe(false);

      saveManager.updateLevelProgress(2, 600, 100, 3, true);
      expect(saveManager.getLevelProgress(3).unlocked).toBe(true);
    });

    it('should create default progress for unknown levels', () => {
      const progress = saveManager.getLevelProgress(99);
      expect(progress.levelId).toBe(99);
      expect(progress.unlocked).toBe(false);
      expect(progress.stars).toBe(0);
    });
  });
});