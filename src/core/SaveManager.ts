import { eventBus } from '../utils/EventBus';

export interface LevelProgress {
  levelId: number;
  unlocked: boolean;
  stars: number;
  highScore: number;
  bestTime: number;
  attempts: number;
  completed: boolean;
}

export interface PlayerData {
  totalScore: number;
  totalStars: number;
  coins: number;
  diamonds: number;
  currentLevel: number;
  levelProgress: Record<number, LevelProgress>;
  unlockedSkins: string[];
  unlockedTalents: string[];
  achievements: Record<string, boolean>;
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    vibrationEnabled: boolean;
  };
  playStatistics: {
    totalGames: number;
    totalPlayTime: number;
    highestMerge: number;
    longestCombo: number;
  };
  lastSaveTime: number;
}

export class SaveManager {
  private static instance: SaveManager;
  private data: PlayerData;
  private readonly STORAGE_KEY = 'digital_workshop_save';
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private isDirty: boolean = false;

  private constructor() {
    this.data = this.getDefaultData();
    this.load();
  }

  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  private getDefaultData(): PlayerData {
    return {
      totalScore: 0,
      totalStars: 0,
      coins: 0,
      diamonds: 0,
      currentLevel: 1,
      levelProgress: {
        1: {
          levelId: 1,
          unlocked: true,
          stars: 0,
          highScore: 0,
          bestTime: 0,
          attempts: 0,
          completed: false,
        },
      },
      unlockedSkins: ['default'],
      unlockedTalents: [],
      achievements: {},
      settings: {
        soundEnabled: true,
        musicEnabled: true,
        vibrationEnabled: true,
      },
      playStatistics: {
        totalGames: 0,
        totalPlayTime: 0,
        highestMerge: 0,
        longestCombo: 0,
      },
      lastSaveTime: Date.now(),
    };
  }

  load(): boolean {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.data = { ...this.getDefaultData(), ...parsed };
        console.log('[SaveManager] 存档加载成功');
        eventBus.emit('save:loaded', this.data);
        return true;
      }
    } catch (error) {
      console.error('[SaveManager] 加载存档失败:', error);
    }
    return false;
  }

  save(): boolean {
    try {
      this.data.lastSaveTime = Date.now();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      this.isDirty = false;
      console.log('[SaveManager] 存档保存成功');
      eventBus.emit('save:saved', this.data);
      return true;
    } catch (error) {
      console.error('[SaveManager] 保存存档失败:', error);
      return false;
    }
  }

  markDirty(): void {
    this.isDirty = true;
  }

  getData(): PlayerData {
    return { ...this.data };
  }

  getLevelProgress(levelId: number): LevelProgress {
    if (!this.data.levelProgress[levelId]) {
      this.data.levelProgress[levelId] = {
        levelId,
        unlocked: false,
        stars: 0,
        highScore: 0,
        bestTime: 0,
        attempts: 0,
        completed: false,
      };
    }
    return this.data.levelProgress[levelId];
  }

  unlockLevel(levelId: number): void {
    const progress = this.getLevelProgress(levelId);
    progress.unlocked = true;
    this.markDirty();
    eventBus.emit('level:unlocked', levelId);
  }

  updateLevelProgress(
    levelId: number,
    score: number,
    time: number,
    stars: number,
    completed: boolean
  ): void {
    const progress = this.getLevelProgress(levelId);
    progress.attempts++;
    if (score > progress.highScore) {
      progress.highScore = score;
    }
    if (time > 0 && (progress.bestTime === 0 || time < progress.bestTime)) {
      progress.bestTime = time;
    }
    if (stars > progress.stars) {
      const newStars = stars - progress.stars;
      this.data.totalStars += newStars;
      progress.stars = stars;
      eventBus.emit('stars:earned', newStars);
    }
    if (completed && !progress.completed) {
      progress.completed = true;
      // 解锁下一关
      const nextLevelId = levelId + 1;
      this.unlockLevel(nextLevelId);
    }
    this.markDirty();
    eventBus.emit('level:progress:updated', { levelId, progress });
  }

  updateStatistics(mergeValue: number, comboCount: number, playTime: number): void {
    this.data.playStatistics.totalGames++;
    this.data.playStatistics.totalPlayTime += playTime;
    if (mergeValue > this.data.playStatistics.highestMerge) {
      this.data.playStatistics.highestMerge = mergeValue;
    }
    if (comboCount > this.data.playStatistics.longestCombo) {
      this.data.playStatistics.longestCombo = comboCount;
    }
    this.markDirty();
  }

  addCoins(amount: number): void {
    this.data.coins += amount;
    this.markDirty();
    eventBus.emit('coins:changed', this.data.coins);
  }

  addDiamonds(amount: number): void {
    this.data.diamonds += amount;
    this.markDirty();
    eventBus.emit('diamonds:changed', this.data.diamonds);
  }

  updateSettings(
    soundEnabled?: boolean,
    musicEnabled?: boolean,
    vibrationEnabled?: boolean
  ): void {
    if (soundEnabled !== undefined) this.data.settings.soundEnabled = soundEnabled;
    if (musicEnabled !== undefined) this.data.settings.musicEnabled = musicEnabled;
    if (vibrationEnabled !== undefined) this.data.settings.vibrationEnabled = vibrationEnabled;
    this.markDirty();
    eventBus.emit('settings:changed', this.data.settings);
  }

  unlockAchievement(achievementId: string): void {
    if (!this.data.achievements[achievementId]) {
      this.data.achievements[achievementId] = true;
      this.markDirty();
      eventBus.emit('achievement:unlocked', achievementId);
    }
  }

  unlockSkin(skinId: string): void {
    if (!this.data.unlockedSkins.includes(skinId)) {
      this.data.unlockedSkins.push(skinId);
      this.markDirty();
      eventBus.emit('skin:unlocked', skinId);
    }
  }

  unlockTalent(talentId: string): void {
    if (!this.data.unlockedTalents.includes(talentId)) {
      this.data.unlockedTalents.push(talentId);
      this.markDirty();
      eventBus.emit('talent:unlocked', talentId);
    }
  }

  startAutoSave(intervalMs: number = 30000): void {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      if (this.isDirty) {
        this.save();
      }
    }, intervalMs);
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  reset(): void {
    this.data = this.getDefaultData();
    this.markDirty();
    this.save();
    eventBus.emit('save:reset', this.data);
  }

  exportSave(): string {
    return JSON.stringify(this.data);
  }

  importSave(saveData: string): boolean {
    try {
      const parsed = JSON.parse(saveData);
      // 简单验证数据结构
      if (typeof parsed.totalScore !== 'number' || !parsed.levelProgress || typeof parsed.levelProgress !== 'object') {
        throw new Error('无效的存档数据');
      }
      this.data = { ...this.getDefaultData(), ...parsed };
      this.save();
      console.log('[SaveManager] 存档导入成功');
      eventBus.emit('save:imported', this.data);
      return true;
    } catch (error) {
      console.error('[SaveManager] 导入存档失败:', error);
      return false;
    }
  }
}
