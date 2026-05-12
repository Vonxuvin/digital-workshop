import { LevelConfig } from '../gameplay/LevelSystem';
import { createPlatformAdapter } from '../platform/PlatformFactory';

const levelModules = import.meta.glob('/src/data/levels/level_*.json', { eager: true }) as Record<string, any>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class LevelLoader {
  private static instance: LevelLoader | null = null;
  private levelConfigs: Map<number, LevelConfig> = new Map();
  private hotReloadTimer: ReturnType<typeof setInterval> | null = null;
  private watchedLevels: Set<number> = new Set();
  private onConfigReload?: (levelId: number, config: LevelConfig) => void;

  constructor() {}

  static setInstance(instance: LevelLoader): void {
    LevelLoader.instance = instance;
  }

  /** @deprecated 使用依赖注入代替，保留向后兼容 */
  static getInstance(): LevelLoader {
    if (!LevelLoader.instance) {
      LevelLoader.instance = new LevelLoader();
    }
    return LevelLoader.instance;
  }

  private async loadJSON(url: string): Promise<any> {
    try {
      if (typeof fetch !== 'undefined') {
        const response = await fetch(url);
        if (response.ok) {
          const contentType = response.headers?.get?.('content-type');
          if (contentType != null && !contentType.includes('application/json') && !contentType.includes('text/plain')) {
            return null;
          }
          return await response.json();
        }
      }
    } catch {}

    try {
      const platform = createPlatformAdapter();
      await platform.init();
      const data = await platform.getStorage<any>(url);
      if (data) return data;
    } catch {}

    return null;
  }

  async loadLevel(levelId: number): Promise<LevelConfig | null> {
    if (this.levelConfigs.has(levelId)) {
      return this.levelConfigs.get(levelId)!;
    }

    const moduleKey = `/src/data/levels/level_${String(levelId).padStart(2, '0')}.json`;
    const moduleData = levelModules[moduleKey];
    if (moduleData && moduleData.default) {
      const data = moduleData.default;
      const validation = this.validateConfig(data);
      if (validation.valid) {
        const config = this.parseLevelConfig(data);
        if (config) {
          this.levelConfigs.set(levelId, config);
          return config;
        }
      }
    }

    const url = `/src/data/levels/level_${String(levelId).padStart(2, '0')}.json`;
    const data = await this.loadJSON(url);
    if (!data) {
      return null;
    }

    const validation = this.validateConfig(data);
    if (!validation.valid) {
      console.error(`[LevelLoader] 关卡 ${levelId} 数据校验失败:`, validation.errors);
      return null;
    }
    const config = this.parseLevelConfig(data);
    if (!config) {
      console.error(`[LevelLoader] 关卡 ${levelId} 数据格式无效`);
      return null;
    }
    this.levelConfigs.set(levelId, config);
    return config;
  }

  loadFromData(levelId: number, data: any): LevelConfig | null {
    const validation = this.validateConfig(data);
    if (!validation.valid) {
      console.error(`[LevelLoader] 关卡 ${levelId} 数据校验失败:`, validation.errors);
      return null;
    }
    const config = this.parseLevelConfig(data);
    if (!config) {
      console.error(`[LevelLoader] 关卡 ${levelId} 数据格式无效`);
      return null;
    }
    this.levelConfigs.set(levelId, config);
    return config;
  }

  validateConfig(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('数据必须是一个对象');
      return { valid: false, errors };
    }

    if (data.id === undefined || data.id === null) {
      errors.push('缺少必填字段: id');
    } else if (typeof data.id !== 'number') {
      errors.push('id 必须是数字');
    } else if (data.id < 1) {
      errors.push('id 必须 >= 1');
    }

    if (data.name === undefined || data.name === null) {
      errors.push('缺少必填字段: name');
    } else if (typeof data.name !== 'string') {
      errors.push('name 必须是字符串');
    } else if (data.name.length < 1) {
      errors.push('name 不能为空');
    }

    if (!data.objective || typeof data.objective !== 'object') {
      errors.push('缺少必填字段: objective');
    } else {
      const validObjectiveTypes = ['score', 'target_merge', 'clear_obstacle', 'survival'];
      if (!data.objective.type) {
        errors.push('objective 缺少必填字段: type');
      } else if (typeof data.objective.type !== 'string') {
        errors.push('objective.type 必须是字符串');
      } else if (!validObjectiveTypes.includes(data.objective.type)) {
        errors.push(`objective.type 必须是 ${validObjectiveTypes.join(', ')} 之一`);
      }

      if (data.objective.target === undefined || data.objective.target === null) {
        errors.push('objective 缺少必填字段: target');
      } else if (typeof data.objective.target !== 'number') {
        errors.push('objective.target 必须是数字');
      } else if (data.objective.target < 0) {
        errors.push('objective.target 必须 >= 0');
      }

      if (data.objective.type === 'clear_obstacle' && (!data.obstacles || !Array.isArray(data.obstacles) || data.obstacles.length === 0)) {
        errors.push('clear_obstacle 目标必须提供非空的 obstacles 数组');
      }

      if (data.objective.timeLimit !== undefined) {
        if (typeof data.objective.timeLimit !== 'number') {
          errors.push('objective.timeLimit 必须是数字');
        } else if (data.objective.timeLimit < 0) {
          errors.push('objective.timeLimit 必须 >= 0');
        }
      }
    }

    if (!data.container || typeof data.container !== 'object') {
      errors.push('缺少必填字段: container');
    } else {
      if (data.container.width === undefined || data.container.width === null) {
        errors.push('container 缺少必填字段: width');
      } else if (typeof data.container.width !== 'number') {
        errors.push('container.width 必须是数字');
      } else if (data.container.width < 100) {
        errors.push('container.width 必须 >= 100');
      }

      if (data.container.height === undefined || data.container.height === null) {
        errors.push('container 缺少必填字段: height');
      } else if (typeof data.container.height !== 'number') {
        errors.push('container.height 必须是数字');
      } else if (data.container.height < 100) {
        errors.push('container.height 必须 >= 100');
      }

      if (data.container.shape !== undefined) {
        const validShapes = ['rectangle', 'circle', 'custom'];
        if (typeof data.container.shape !== 'string' || !validShapes.includes(data.container.shape)) {
          errors.push(`container.shape 必须是 ${validShapes.join(', ')} 之一`);
        }
      }
    }

    if (!data.spawn || typeof data.spawn !== 'object') {
      errors.push('缺少必填字段: spawn');
    } else {
      if (!Array.isArray(data.spawn.availableNumbers)) {
        errors.push('spawn 缺少必填字段: availableNumbers');
      } else if (data.spawn.availableNumbers.length < 1) {
        errors.push('spawn.availableNumbers 至少需要 1 个元素');
      } else {
        for (let i = 0; i < data.spawn.availableNumbers.length; i++) {
          if (typeof data.spawn.availableNumbers[i] !== 'number') {
            errors.push(`spawn.availableNumbers[${i}] 必须是数字`);
          }
        }
      }

      if (data.spawn.spawnInterval !== undefined) {
        if (typeof data.spawn.spawnInterval !== 'number') {
          errors.push('spawn.spawnInterval 必须是数字');
        } else if (data.spawn.spawnInterval < 0) {
          errors.push('spawn.spawnInterval 必须 >= 0');
        }
      }
    }

    if (data.obstacles !== undefined) {
      if (!Array.isArray(data.obstacles)) {
        errors.push('obstacles 必须是数组');
      } else {
        for (let i = 0; i < data.obstacles.length; i++) {
          const obs = data.obstacles[i];
          if (!obs || typeof obs !== 'object') {
            errors.push(`obstacles[${i}] 必须是对象`);
          } else {
            if (obs.x === undefined || typeof obs.x !== 'number') {
              errors.push(`obstacles[${i}].x 必须是数字`);
            }
            if (obs.y === undefined || typeof obs.y !== 'number') {
              errors.push(`obstacles[${i}].y 必须是数字`);
            }
            if (obs.value === undefined || typeof obs.value !== 'number') {
              errors.push(`obstacles[${i}].value 必须是数字`);
            } else if (obs.value < 1) {
              errors.push(`obstacles[${i}].value 必须 >= 1`);
            }
          }
        }
      }
    }

    if (data.rewards !== undefined) {
      if (typeof data.rewards !== 'object') {
        errors.push('rewards 必须是对象');
      } else {
        if (data.rewards.stars !== undefined) {
          if (!Array.isArray(data.rewards.stars)) {
            errors.push('rewards.stars 必须是数组');
          } else if (data.rewards.stars.length !== 3) {
            errors.push('rewards.stars 必须包含 3 个元素');
          } else {
            for (let i = 0; i < data.rewards.stars.length; i++) {
              if (typeof data.rewards.stars[i] !== 'number') {
                errors.push(`rewards.stars[${i}] 必须是数字`);
              }
            }
          }
        }
        if (data.rewards.blueprintFragments !== undefined) {
          if (typeof data.rewards.blueprintFragments !== 'number') {
            errors.push('rewards.blueprintFragments 必须是数字');
          } else if (data.rewards.blueprintFragments < 0) {
            errors.push('rewards.blueprintFragments 必须 >= 0');
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private parseLevelConfig(data: any): LevelConfig | null {
    const validation = this.validateConfig(data);
    if (!validation.valid) return null;

    const config = {
      id: data.id,
      name: data.name,
      objective: {
        type: data.objective.type,
        target: data.objective.target,
        timeLimit: data.objective.timeLimit,
      },
      container: {
        width: data.container.width,
        height: data.container.height,
        shape: data.container.shape || 'rectangle',
      },
      spawn: {
        availableNumbers: data.spawn.availableNumbers,
        spawnInterval: data.spawn.spawnInterval,
      },
      modifiers: data.modifiers || undefined,
      obstacles: data.obstacles || undefined,
      rewards: data.rewards || { stars: [0, 0, 0] },
    };

    Object.defineProperties(config, {
      containerWidth: {
        get() { return this.container.width; },
        enumerable: true,
        configurable: true,
      },
      containerHeight: {
        get() { return this.container.height; },
        enumerable: true,
        configurable: true,
      },
      availableNumbers: {
        get() { return this.spawn.availableNumbers; },
        enumerable: true,
        configurable: true,
      },
      spawnInterval: {
        get() { return this.spawn.spawnInterval; },
        enumerable: true,
        configurable: true,
      },
    });

    return config as LevelConfig;
  }

  getLevelConfig(levelId: number): LevelConfig | null {
    return this.levelConfigs.get(levelId) || null;
  }

  clearCache(): void {
    this.levelConfigs.clear();
  }

  enableHotReload(callback?: (levelId: number, config: LevelConfig) => void): void {
    if (typeof window === 'undefined') return;
    const isDev = window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1';
    if (!isDev) return;

    this.onConfigReload = callback;
    if (this.hotReloadTimer) return;

    this.hotReloadTimer = setInterval(async () => {
      for (const levelId of this.watchedLevels) {
        try {
          const response = await fetch(`/src/data/levels/level_${String(levelId).padStart(2, '0')}.json?t=${Date.now()}`);
          if (!response.ok) continue;
          const data = await response.json();
          const validation = this.validateConfig(data);
          if (!validation.valid) continue;
          const config = this.parseLevelConfig(data);
          if (!config) continue;

          const existing = this.levelConfigs.get(levelId);
          if (existing && JSON.stringify(existing) !== JSON.stringify(config)) {
            this.levelConfigs.set(levelId, config);
            this.onConfigReload?.(levelId, config);
          }
        } catch {
          continue;
        }
      }
    }, 5000);
  }

  disableHotReload(): void {
    if (this.hotReloadTimer) {
      clearInterval(this.hotReloadTimer);
      this.hotReloadTimer = null;
    }
    this.watchedLevels.clear();
    this.onConfigReload = undefined;
  }

  watchLevel(levelId: number): void {
    this.watchedLevels.add(levelId);
  }

  unwatchLevel(levelId: number): void {
    this.watchedLevels.delete(levelId);
  }

  getTotalLevels(): number {
    return this.levelConfigs.size;
  }

  async discoverAndLoadAllLevels(): Promise<void> {
    for (const [path, module] of Object.entries(levelModules)) {
      const match = path.match(/level_(\d+)\.json$/);
      if (match) {
        const levelId = parseInt(match[1], 10);
        if (!this.levelConfigs.has(levelId)) {
          const data = module?.default || module;
          if (data) {
            const validation = this.validateConfig(data);
            if (validation.valid) {
              const config = this.parseLevelConfig(data);
              if (config) {
                this.levelConfigs.set(levelId, config);
              }
            }
          }
        }
      }
    }

    let id = 1;
    while (this.levelConfigs.has(id)) {
      id++;
    }
  }

  async getAllLevelConfigs(): Promise<LevelConfig[]> {
    await this.discoverAndLoadAllLevels();
    const configs: LevelConfig[] = [];
    const sortedIds = Array.from(this.levelConfigs.keys()).sort((a, b) => a - b);
    for (const id of sortedIds) {
      const config = this.levelConfigs.get(id);
      if (config) configs.push(config);
    }
    return configs;
  }
}
