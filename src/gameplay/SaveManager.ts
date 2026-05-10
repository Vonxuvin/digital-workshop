export interface LevelProgress {
  unlocked: boolean;
  stars: number;
  highScore: number;
}

interface SaveData {
  version: number;
  levels: Record<number, LevelProgress>;
}

export class SaveManager {
  private static instance: SaveManager;
  private storage: Map<number, LevelProgress> = new Map();
  private readonly STORAGE_KEY = 'digital_workshop_progress';
  private dataVersion = 1;

  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  load(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;
      const data: SaveData = JSON.parse(raw);
      if (data.version !== this.dataVersion) return;
      if (data.levels && typeof data.levels === 'object') {
        this.storage.clear();
        for (const [key, value] of Object.entries(data.levels)) {
          const id = Number(key);
          if (!isNaN(id) && value && typeof value.stars === 'number' && typeof value.highScore === 'number') {
            this.storage.set(id, {
              unlocked: value.unlocked ?? false,
              stars: value.stars,
              highScore: value.highScore,
            });
          }
        }
      }
    } catch {
      this.storage.clear();
    }
  }

  save(): void {
    const levels: Record<number, LevelProgress> = {};
    this.storage.forEach((progress, id) => {
      levels[id] = progress;
    });
    const data: SaveData = {
      version: this.dataVersion,
      levels,
    };
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch {
      console.error('[SaveManager] 保存失败');
    }
  }

  getLevelProgress(levelId: number): LevelProgress {
    const progress = this.storage.get(levelId);
    if (progress) return { ...progress };
    return {
      unlocked: levelId === 1,
      stars: 0,
      highScore: 0,
    };
  }

  updateLevelProgress(levelId: number, stars: number, score: number): void {
    const current = this.getLevelProgress(levelId);
    const updated: LevelProgress = {
      unlocked: current.unlocked,
      stars: Math.max(current.stars, stars),
      highScore: Math.max(current.highScore, score),
    };
    this.storage.set(levelId, updated);
    this.save();
  }

  isLevelUnlocked(levelId: number): boolean {
    if (levelId === 1) return true;
    const prevProgress = this.getLevelProgress(levelId - 1);
    return prevProgress.stars > 0;
  }

  reset(): void {
    this.storage.clear();
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      console.error('[SaveManager] 重置失败');
    }
  }
}
