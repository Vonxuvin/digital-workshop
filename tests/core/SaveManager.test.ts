import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveManager } from '../../src/core/SaveManager';

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

  it('should export and import save data', () => {
    saveManager.addCoins(500);
    saveManager.updateLevelProgress(1, 2000, 60, 3, true);
    
    const exported = saveManager.exportSave();
    expect(typeof exported).toBe('string');
    
    // 重置实例
    saveManager.reset();
    
    // 导入数据
    const importResult = saveManager.importSave(exported);
    expect(importResult).toBe(true);
    expect(saveManager.getData().coins).toBe(500);
  });
});
