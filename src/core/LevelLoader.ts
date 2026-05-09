import { LevelConfig } from '../gameplay/LevelSystem';

export class LevelLoader {
  private static instance: LevelLoader;
  private levelConfigs: Map<number, LevelConfig> = new Map();

  static getInstance(): LevelLoader {
    if (!LevelLoader.instance) {
      LevelLoader.instance = new LevelLoader();
    }
    return LevelLoader.instance;
  }

  async loadLevel(levelId: number): Promise<LevelConfig | null> {
    if (this.levelConfigs.has(levelId)) {
      return this.levelConfigs.get(levelId)!;
    }

    try {
      const response = await fetch(`/src/data/levels/level_${String(levelId).padStart(2, '0')}.json`);
      if (!response.ok) {
        console.error(`[LevelLoader] 关卡 ${levelId} 加载失败`);
        return null;
      }

      const data = await response.json();
      const config = this.parseLevelConfig(data);
      if (!config) {
        console.error(`[LevelLoader] 关卡 ${levelId} 数据格式无效`);
        return null;
      }
      this.levelConfigs.set(levelId, config);
      return config;
    } catch (error) {
      console.error(`[LevelLoader] 加载关卡 ${levelId} 出错:`, error);
      return null;
    }
  }

  private parseLevelConfig(data: any): LevelConfig | null {
    if (!data || typeof data !== 'object') return null;
    if (typeof data.id !== 'number' || typeof data.name !== 'string') return null;
    if (!data.objective || typeof data.objective.type !== 'string' || typeof data.objective.target !== 'number') return null;
    if (!data.container || typeof data.container.width !== 'number' || typeof data.container.height !== 'number') return null;
    if (!data.spawn || !Array.isArray(data.spawn.availableNumbers)) return null;

    return {
      id: data.id,
      name: data.name,
      objective: {
        type: data.objective.type,
        target: data.objective.target,
        timeLimit: data.objective.timeLimit,
      },
      containerWidth: data.container.width,
      containerHeight: data.container.height,
      availableNumbers: data.spawn.availableNumbers,
      spawnInterval: data.spawn.spawnInterval,
      obstacles: data.obstacles || undefined,
      rewards: data.rewards || undefined,
    };
  }

  getLevelConfig(levelId: number): LevelConfig | null {
    return this.levelConfigs.get(levelId) || null;
  }

  clearCache(): void {
    this.levelConfigs.clear();
  }
}
