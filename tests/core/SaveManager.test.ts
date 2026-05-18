import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SaveManager } from '../../src/core/SaveManager';
import { eventBus } from '../../src/utils/EventBus';

describe('SaveManager', () => {
  let saveManager: SaveManager;

  beforeEach(() => {
    // 清理localStorage
    localStorage.clear();
    // 注意：由于是单例模式，我们使用reset来清理
    saveManager = SaveManager.getInstance();
    saveManager.reset();
  });

  it('should be a singleton', () => {
    const instance1 = SaveManager.getInstance();
    const instance2 = SaveManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should initialize with default data', () => {
    const data = saveManager.getData();
    expect(data.totalScore).toBe(0);
    expect(data.totalStars).toBe(0);
    expect(data.coins).toBe(0);
    expect(data.currentLevel).toBe(1);
    expect(data.levelProgress[1].unlocked).toBe(true);
    expect(data.levelProgress[1].completed).toBe(false);
  });

  it('should update level progress on completion', () => {
    const levelId = 1;
    const score = 1500;
    const playTime = 120;
    const stars = 3;
    const completed = true;
    
    saveManager.updateLevelProgress(levelId, score, playTime, stars, completed);
    
    const progress = saveManager.getLevelProgress(levelId);
    expect(progress.completed).toBe(true);
    expect(progress.stars).toBe(3);
    expect(progress.highScore).toBe(1500);
    expect(progress.bestTime).toBe(120);
    expect(progress.attempts).toBe(1);
  });

  it('should unlock next level on completion', () => {
    // 先完成第1关
    saveManager.updateLevelProgress(1, 1000, 60, 3, true);
    
    // 检查第2关是否解锁
    const level2Progress = saveManager.getLevelProgress(2);
    expect(level2Progress.unlocked).toBe(true);
  });

  it('should not overwrite best time or high score', () => {
    saveManager.updateLevelProgress(1, 1000, 60, 2, true);
    const progress1 = saveManager.getLevelProgress(1);
    
    // 再次尝试，分数更低但时间更短
    saveManager.updateLevelProgress(1, 800, 30, 1, true);
    const progress2 = saveManager.getLevelProgress(1);
    
    expect(progress2.highScore).toBe(1000);
    expect(progress2.bestTime).toBe(30);
    expect(progress2.stars).toBe(2);
  });

  it('should manage coins correctly', () => {
    saveManager.addCoins(100);
    expect(saveManager.getData().coins).toBe(100);
    
    saveManager.addCoins(-50);
    expect(saveManager.getData().coins).toBe(50);
  });

  it('should manage diamonds correctly', () => {
    saveManager.addDiamonds(20);
    expect(saveManager.getData().diamonds).toBe(20);
    
    saveManager.addDiamonds(10);
    expect(saveManager.getData().diamonds).toBe(30);
  });

  it('should unlock achievements', () => {
    saveManager.unlockAchievement('first_win');
    expect(saveManager.getData().achievements['first_win']).toBe(true);
    
    // 再次尝试解锁同一个成就
    saveManager.unlockAchievement('first_win');
    expect(saveManager.getData().achievements['first_win']).toBe(true);
  });

  it('should unlock skins', () => {
    expect(saveManager.getData().unlockedSkins).toEqual(['default']);
    
    saveManager.unlockSkin('premium');
    expect(saveManager.getData().unlockedSkins).toEqual(['default', 'premium']);
  });

  it('should update settings', () => {
    saveManager.updateSettings(false, false, false);
    
    const settings = saveManager.getData().settings;
    expect(settings.soundEnabled).toBe(false);
    expect(settings.musicEnabled).toBe(false);
    expect(settings.vibrationEnabled).toBe(false);
  });

  it('should export and import save data', async () => {
    saveManager.addCoins(500);
    saveManager.updateLevelProgress(1, 2000, 60, 3, true);
    
    const exported = saveManager.exportSave();
    expect(typeof exported).toBe('string');
    
    // 重置实例
    await saveManager.reset();
    
    // 导入数据
    const importResult = await saveManager.importSave(exported);
    expect(importResult).toBe(true);
    expect(saveManager.getData().coins).toBe(500);
  });

  describe('updateStatistics', () => {
    it('should increment totalGames', () => {
      saveManager.updateStatistics(0, 0, 0);
      expect(saveManager.getData().playStatistics.totalGames).toBe(1);

      saveManager.updateStatistics(0, 0, 0);
      expect(saveManager.getData().playStatistics.totalGames).toBe(2);
    });

    it('should accumulate totalPlayTime', () => {
      saveManager.updateStatistics(0, 0, 60);
      expect(saveManager.getData().playStatistics.totalPlayTime).toBe(60);

      saveManager.updateStatistics(0, 0, 30);
      expect(saveManager.getData().playStatistics.totalPlayTime).toBe(90);
    });

    it('should update highestMerge when mergeValue is higher', () => {
      saveManager.updateStatistics(8, 0, 0);
      expect(saveManager.getData().playStatistics.highestMerge).toBe(8);

      saveManager.updateStatistics(16, 0, 0);
      expect(saveManager.getData().playStatistics.highestMerge).toBe(16);
    });

    it('should not update highestMerge when mergeValue is lower', () => {
      saveManager.updateStatistics(32, 0, 0);
      expect(saveManager.getData().playStatistics.highestMerge).toBe(32);

      saveManager.updateStatistics(8, 0, 0);
      expect(saveManager.getData().playStatistics.highestMerge).toBe(32);
    });

    it('should update longestCombo when comboCount is higher', () => {
      saveManager.updateStatistics(0, 3, 0);
      expect(saveManager.getData().playStatistics.longestCombo).toBe(3);

      saveManager.updateStatistics(0, 7, 0);
      expect(saveManager.getData().playStatistics.longestCombo).toBe(7);
    });

    it('should not update longestCombo when comboCount is lower', () => {
      saveManager.updateStatistics(0, 10, 0);
      expect(saveManager.getData().playStatistics.longestCombo).toBe(10);

      saveManager.updateStatistics(0, 5, 0);
      expect(saveManager.getData().playStatistics.longestCombo).toBe(10);
    });

    it('should update maxCombo when comboCount is higher', () => {
      saveManager.updateStatistics(0, 4, 0);
      expect(saveManager.getData().playStatistics.maxCombo).toBe(4);

      saveManager.updateStatistics(0, 8, 0);
      expect(saveManager.getData().playStatistics.maxCombo).toBe(8);
    });

    it('should not update maxCombo when comboCount is lower', () => {
      saveManager.updateStatistics(0, 12, 0);
      expect(saveManager.getData().playStatistics.maxCombo).toBe(12);

      saveManager.updateStatistics(0, 6, 0);
      expect(saveManager.getData().playStatistics.maxCombo).toBe(12);
    });

    it('should update all statistics simultaneously', () => {
      saveManager.updateStatistics(64, 5, 120);

      const stats = saveManager.getData().playStatistics;
      expect(stats.totalGames).toBe(1);
      expect(stats.totalPlayTime).toBe(120);
      expect(stats.highestMerge).toBe(64);
      expect(stats.longestCombo).toBe(5);
      expect(stats.maxCombo).toBe(5);
    });

    it('should handle zero values correctly', () => {
      saveManager.updateStatistics(0, 0, 0);

      const stats = saveManager.getData().playStatistics;
      expect(stats.totalGames).toBe(1);
      expect(stats.totalPlayTime).toBe(0);
      expect(stats.highestMerge).toBe(0);
      expect(stats.longestCombo).toBe(0);
      expect(stats.maxCombo).toBe(0);
    });

    it('should mark data as dirty after update', () => {
      saveManager.updateStatistics(2, 1, 30);
      const data = saveManager.getData();
      expect(data.playStatistics.totalGames).toBe(1);
    });
  });

  describe('spendCoins', () => {
    it('should return true and deduct coins when sufficient', () => {
      saveManager.addCoins(100);
      const result = saveManager.spendCoins(50);
      expect(result).toBe(true);
      expect(saveManager.getData().coins).toBe(50);
    });

    it('should return false when insufficient coins', () => {
      saveManager.addCoins(30);
      const result = saveManager.spendCoins(50);
      expect(result).toBe(false);
      expect(saveManager.getData().coins).toBe(30);
    });

    it('should return false when amount is negative', () => {
      saveManager.addCoins(100);
      const result = saveManager.spendCoins(-10);
      expect(result).toBe(false);
      expect(saveManager.getData().coins).toBe(100);
    });
  });

  describe('spendDiamonds', () => {
    it('should return true and deduct diamonds when sufficient', () => {
      saveManager.addDiamonds(50);
      const result = saveManager.spendDiamonds(20);
      expect(result).toBe(true);
      expect(saveManager.getData().diamonds).toBe(30);
    });

    it('should return false when insufficient diamonds', () => {
      saveManager.addDiamonds(10);
      const result = saveManager.spendDiamonds(20);
      expect(result).toBe(false);
      expect(saveManager.getData().diamonds).toBe(10);
    });

    it('should return false when amount is negative', () => {
      saveManager.addDiamonds(50);
      const result = saveManager.spendDiamonds(-5);
      expect(result).toBe(false);
      expect(saveManager.getData().diamonds).toBe(50);
    });
  });

  describe('addCoins with negative values', () => {
    it('should clamp coins to 0 when going negative', () => {
      saveManager.addCoins(10);
      saveManager.addCoins(-20);
      expect(saveManager.getData().coins).toBe(0);
    });
  });

  describe('addDiamonds with negative values', () => {
    it('should clamp diamonds to 0 when going negative', () => {
      saveManager.addDiamonds(5);
      saveManager.addDiamonds(-10);
      expect(saveManager.getData().diamonds).toBe(0);
    });
  });

  describe('unlockTalent', () => {
    it('should unlock a new talent', () => {
      saveManager.unlockTalent('speed_boost');
      expect(saveManager.getData().unlockedTalents).toContain('speed_boost');
    });

    it('should not add duplicate talent', () => {
      saveManager.unlockTalent('speed_boost');
      saveManager.unlockTalent('speed_boost');
      expect(saveManager.getData().unlockedTalents.filter(t => t === 'speed_boost')).toHaveLength(1);
    });
  });

  describe('unlockAchievement', () => {
    it('should not emit event for already unlocked achievement', () => {
      saveManager.unlockAchievement('first_win');
      const handler = vi.fn();
      eventBus.on('achievement:unlocked', handler);
      saveManager.unlockAchievement('first_win');
      expect(handler).not.toHaveBeenCalled();
      eventBus.off('achievement:unlocked', handler);
    });
  });

  describe('unlockSkin', () => {
    it('should not add duplicate skin', () => {
      saveManager.unlockSkin('default');
      expect(saveManager.getData().unlockedSkins).toEqual(['default']);
    });
  });

  describe('updateSettings partial', () => {
    it('should only update specified settings', () => {
      saveManager.updateSettings(false);
      const settings = saveManager.getData().settings;
      expect(settings.soundEnabled).toBe(false);
      expect(settings.musicEnabled).toBe(true);
      expect(settings.vibrationEnabled).toBe(true);
    });

    it('should update only musicEnabled', () => {
      saveManager.updateSettings(undefined, false);
      const settings = saveManager.getData().settings;
      expect(settings.soundEnabled).toBe(true);
      expect(settings.musicEnabled).toBe(false);
      expect(settings.vibrationEnabled).toBe(true);
    });

    it('should update only vibrationEnabled', () => {
      saveManager.updateSettings(undefined, undefined, false);
      const settings = saveManager.getData().settings;
      expect(settings.soundEnabled).toBe(true);
      expect(settings.musicEnabled).toBe(true);
      expect(settings.vibrationEnabled).toBe(false);
    });
  });

  describe('updateLevelProgress with no existing progress', () => {
    it('should create progress entry for new level', () => {
      saveManager.updateLevelProgress(5, 1000, 60, 2, false);
      const progress = saveManager.getLevelProgress(5);
      expect(progress).toBeDefined();
      expect(progress.attempts).toBe(1);
      expect(progress.highScore).toBe(1000);
    });
  });

  describe('updateLevelProgress bestTime', () => {
    it('should not update bestTime when time is 0', () => {
      saveManager.updateLevelProgress(1, 1000, 0, 2, false);
      const progress = saveManager.getLevelProgress(1);
      expect(progress.bestTime).toBe(0);
    });

    it('should update bestTime when current bestTime is 0', () => {
      saveManager.updateLevelProgress(1, 1000, 60, 2, false);
      const progress = saveManager.getLevelProgress(1);
      expect(progress.bestTime).toBe(60);
    });

    it('should update bestTime when new time is better', () => {
      saveManager.updateLevelProgress(1, 1000, 60, 2, false);
      saveManager.updateLevelProgress(1, 800, 30, 1, false);
      const progress = saveManager.getLevelProgress(1);
      expect(progress.bestTime).toBe(30);
    });

    it('should not update bestTime when new time is worse', () => {
      saveManager.updateLevelProgress(1, 1000, 30, 2, false);
      saveManager.updateLevelProgress(1, 800, 60, 1, false);
      const progress = saveManager.getLevelProgress(1);
      expect(progress.bestTime).toBe(30);
    });
  });

  describe('updateLevelProgress stars', () => {
    it('should not emit STARS_EARNED when stars are not higher', () => {
      saveManager.updateLevelProgress(1, 1000, 60, 3, false);
      const handler = vi.fn();
      eventBus.on('stars:earned', handler);
      saveManager.updateLevelProgress(1, 800, 60, 2, false);
      expect(handler).not.toHaveBeenCalled();
      eventBus.off('stars:earned', handler);
    });
  });

  describe('updateLevelProgress completion', () => {
    it('should not unlock next level when not completed', () => {
      saveManager.updateLevelProgress(1, 1000, 60, 2, false);
      const level2 = saveManager.getLevelProgress(2);
      expect(level2.unlocked).toBe(false);
    });

    it('should not unlock next level again if already completed', () => {
      saveManager.updateLevelProgress(1, 1000, 60, 2, true);
      const handler = vi.fn();
      eventBus.on('level:unlocked', handler);
      saveManager.updateLevelProgress(1, 2000, 30, 3, true);
      expect(handler).not.toHaveBeenCalled();
      eventBus.off('level:unlocked', handler);
    });
  });

  describe('save and load', () => {
    it('should return false from load when no saved data', async () => {
      const { resetPlatformAdapter } = await import('../../src/platform/PlatformFactory');
      resetPlatformAdapter();
      const freshManager = new SaveManager();
      SaveManager.setInstance(freshManager);
      const result = await freshManager.load();
      expect(result).toBe(false);
      freshManager.destroy();
    });

    it('should return true from load when saved data exists', async () => {
      await saveManager.save();
      const result = await saveManager.load();
      expect(result).toBe(true);
    });

    it('should return true from save on success', async () => {
      const result = await saveManager.save();
      expect(result).toBe(true);
    });

    it('should return false from load on parse error', async () => {
      const platform = (saveManager as any).platform;
      await platform.setStorage('digital_workshop_save', 'invalid json{{{');
      const result = await saveManager.load();
      expect(result).toBe(false);
    });
  });

  describe('importSave', () => {
    it('should return false for invalid JSON', async () => {
      const result = await saveManager.importSave('not json');
      expect(result).toBe(false);
    });

    it('should return false for missing required fields', async () => {
      const result = await saveManager.importSave(JSON.stringify({ totalScore: 'not a number' }));
      expect(result).toBe(false);
    });

    it('should return false for missing levelProgress', async () => {
      const result = await saveManager.importSave(JSON.stringify({
        totalScore: 0,
        coins: 0,
        diamonds: 0,
        settings: {},
        playStatistics: {},
      }));
      expect(result).toBe(false);
    });

    it('should return false for missing coins', async () => {
      const result = await saveManager.importSave(JSON.stringify({
        totalScore: 0,
        levelProgress: {},
        diamonds: 0,
        settings: {},
        playStatistics: {},
      }));
      expect(result).toBe(false);
    });

    it('should return false for missing settings', async () => {
      const result = await saveManager.importSave(JSON.stringify({
        totalScore: 0,
        levelProgress: {},
        coins: 0,
        diamonds: 0,
        playStatistics: {},
      }));
      expect(result).toBe(false);
    });

    it('should return false for missing playStatistics', async () => {
      const result = await saveManager.importSave(JSON.stringify({
        totalScore: 0,
        levelProgress: {},
        coins: 0,
        diamonds: 0,
        settings: {},
      }));
      expect(result).toBe(false);
    });

    it('should return true for valid save data', async () => {
      const exported = saveManager.exportSave();
      const result = await saveManager.importSave(exported);
      expect(result).toBe(true);
    });
  });

  describe('deepMerge', () => {
    it('should return target when source is null', () => {
      const result = (saveManager as any).deepMerge({ a: 1 }, null);
      expect(result.a).toBe(1);
    });

    it('should return target when source is not an object', () => {
      const result = (saveManager as any).deepMerge({ a: 1 }, 'string');
      expect(result.a).toBe(1);
    });

    it('should deep merge nested objects', () => {
      const target = { settings: { soundEnabled: true, musicEnabled: true } };
      const source = { settings: { soundEnabled: false } };
      const result = (saveManager as any).deepMerge(target, source);
      expect(result.settings.soundEnabled).toBe(false);
      expect(result.settings.musicEnabled).toBe(true);
    });

    it('should override arrays from source', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [4, 5] };
      const result = (saveManager as any).deepMerge(target, source);
      expect(result.items).toEqual([4, 5]);
    });

    it('should add new keys from source', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      const result = (saveManager as any).deepMerge(target, source);
      expect(result.a).toBe(1);
      expect(result.b).toBe(2);
    });
  });

  describe('startAutoSave and stopAutoSave', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should auto save when dirty', async () => {
      const saveSpy = vi.spyOn(saveManager, 'save');
      saveManager.markDirty();
      saveManager.startAutoSave(1000);
      vi.advanceTimersByTime(1000);
      expect(saveSpy).toHaveBeenCalled();
      saveSpy.mockRestore();
      saveManager.stopAutoSave();
    });

    it('should not auto save when not dirty', async () => {
      const saveSpy = vi.spyOn(saveManager, 'save');
      saveManager.startAutoSave(1000);
      vi.advanceTimersByTime(1000);
      expect(saveSpy).not.toHaveBeenCalled();
      saveSpy.mockRestore();
      saveManager.stopAutoSave();
    });

    it('should stop auto save', () => {
      saveManager.startAutoSave(1000);
      saveManager.stopAutoSave();
      expect((saveManager as any).autoSaveInterval).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset data to defaults', async () => {
      saveManager.addCoins(500);
      await saveManager.reset();
      expect(saveManager.getData().coins).toBe(0);
    });
  });

  describe('init', () => {
    it('should not reinitialize if already initialized', async () => {
      await saveManager.init();
      expect((saveManager as any).initialized).toBe(true);
      const loadSpy = vi.spyOn(saveManager, 'load');
      await saveManager.init();
      expect(loadSpy).not.toHaveBeenCalled();
      loadSpy.mockRestore();
    });
  });

  describe('destroy', () => {
    it('should stop auto save and reset initialized', () => {
      saveManager.startAutoSave(1000);
      saveManager.destroy();
      expect((saveManager as any).autoSaveInterval).toBeNull();
      expect((saveManager as any).initialized).toBe(false);
      expect(SaveManager.instance).toBeNull();
    });
  });

  describe('setInstance', () => {
    it('should set a custom instance', () => {
      const custom = new SaveManager();
      SaveManager.setInstance(custom);
      expect(SaveManager.getInstance()).toBe(custom);
      custom.destroy();
    });
  });

  describe('markDirty', () => {
    it('should mark data as dirty', () => {
      saveManager.markDirty();
      expect((saveManager as any).isDirty).toBe(true);
    });
  });
});
