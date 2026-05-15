import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LevelLoader } from '../../src/core/LevelLoader';

describe('LevelLoader', () => {
  let loader: LevelLoader;

  beforeEach(() => {
    loader = LevelLoader.getInstance();
    loader.clearCache();
  });

  it('should be singleton', () => {
    const a = LevelLoader.getInstance();
    const b = LevelLoader.getInstance();
    expect(a).toBe(b);
  });

  it('should return null for non-existent level', async () => {
    const config = await loader.loadLevel(999);
    expect(config).toBeNull();
  });

  it('should return null from getLevelConfig when not loaded', () => {
    expect(loader.getLevelConfig(1)).toBeNull();
  });

  it('should clear cache', () => {
    loader.clearCache();
    expect(loader.getLevelConfig(1)).toBeNull();
  });

  it('should load and cache level config from JSON via fetch fallback', async () => {
    const mockConfig = {
      id: 99,
      name: 'Test Level',
      objective: { type: 'score', target: 500 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [300, 400, 500] },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    });

    const config = await loader.loadLevel(99);
    expect(config).not.toBeNull();
    expect(config!.id).toBe(99);
    expect(config!.name).toBe('Test Level');
    expect(config!.objective.type).toBe('score');
    expect(config!.objective.target).toBe(500);
    expect(config!.containerWidth).toBe(400);
    expect(config!.containerHeight).toBe(600);
    expect(config!.availableNumbers).toEqual([1, 2, 4]);

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const cached = await loader.loadLevel(99);
    expect(cached).toBe(config);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should load level from pre-loaded modules', async () => {
    const config = await loader.loadLevel(1);
    expect(config).not.toBeNull();
    expect(config!.id).toBe(1);
    expect(config!.name).toBe('新手入门');
  });

  it('should handle fetch error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const config = await loader.loadLevel(99);
    expect(config).toBeNull();
  });

  it('should handle network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const config = await loader.loadLevel(99);
    expect(config).toBeNull();
  });

  describe('validateConfig', () => {
    const createValidConfig = () => ({
      id: 1,
      name: '测试关卡',
      objective: { type: 'score', target: 1000 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [500, 1000, 2000] },
    });

    it('应验证有效配置', () => {
      const result = loader.validateConfig(createValidConfig());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应验证空对象无效', () => {
      const result = loader.validateConfig({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应验证非对象无效', () => {
      expect(loader.validateConfig(null).valid).toBe(false);
      expect(loader.validateConfig(undefined).valid).toBe(false);
      expect(loader.validateConfig('string').valid).toBe(false);
      expect(loader.validateConfig(123).valid).toBe(false);
    });

    it('应验证id类型', () => {
      const config = createValidConfig();
      config.id = 'not-a-number';
      expect(loader.validateConfig(config).valid).toBe(false);

      config.id = 0;
      expect(loader.validateConfig(config).valid).toBe(false);

      config.id = -1;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('应验证name类型和长度', () => {
      const config = createValidConfig();

      config.name = 123;
      expect(loader.validateConfig(config).valid).toBe(false);

      config.name = '';
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('应验证objective.type', () => {
      const config = createValidConfig();

      config.objective.type = 'invalid_type';
      expect(loader.validateConfig(config).valid).toBe(false);

      config.objective.type = null;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('应验证objective.target', () => {
      const config = createValidConfig();

      config.objective.target = 'not-a-number';
      expect(loader.validateConfig(config).valid).toBe(false);

      config.objective.target = -1;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('应验证objective.timeLimit', () => {
      const config = createValidConfig();
      config.objective.timeLimit = 'invalid';

      expect(loader.validateConfig(config).valid).toBe(false);

      config.objective.timeLimit = -1;
      expect(loader.validateConfig(config).valid).toBe(false);

      config.objective.timeLimit = 0;
      expect(loader.validateConfig(config).valid).toBe(true);
    });

    it('应验证container.width', () => {
      const config = createValidConfig();

      config.container.width = 'invalid';
      expect(loader.validateConfig(config).valid).toBe(false);

      config.container.width = 50;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('应验证container.shape', () => {
      const config = createValidConfig();

      config.container.shape = 'invalid_shape';
      expect(loader.validateConfig(config).valid).toBe(false);

      config.container.shape = 'circle';
      expect(loader.validateConfig(config).valid).toBe(true);

      config.container.shape = 'rectangle';
      expect(loader.validateConfig(config).valid).toBe(true);
    });

    it('应验证spawn.availableNumbers', () => {
      const config = createValidConfig();

      config.spawn.availableNumbers = 'not-an-array';
      expect(loader.validateConfig(config).valid).toBe(false);

      config.spawn.availableNumbers = [];
      expect(loader.validateConfig(config).valid).toBe(false);

      config.spawn.availableNumbers = ['not', 'numbers'];
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('应验证obstacles数组', () => {
      const config = createValidConfig();

      config.obstacles = 'not-an-array';
      expect(loader.validateConfig(config).valid).toBe(false);

      config.obstacles = [{ x: 100, y: 200, value: 4 }];
      expect(loader.validateConfig(config).valid).toBe(true);

      config.obstacles = [{ x: 'invalid', y: 200, value: 4 }];
      expect(loader.validateConfig(config).valid).toBe(false);

      config.obstacles = [{ x: 100, y: 200, value: 0 }];
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('应验证rewards.stars', () => {
      const config = createValidConfig();

      config.rewards.stars = 'not-an-array';
      expect(loader.validateConfig(config).valid).toBe(false);

      config.rewards.stars = [100, 200];
      expect(loader.validateConfig(config).valid).toBe(false);

      config.rewards.stars = [100, 200, 'invalid'];
      expect(loader.validateConfig(config).valid).toBe(false);

      config.rewards.stars = [100, 200, 300];
      expect(loader.validateConfig(config).valid).toBe(true);
    });

    it('应验证rewards.blueprintFragments', () => {
      const config = createValidConfig();

      config.rewards.blueprintFragments = 'invalid';
      expect(loader.validateConfig(config).valid).toBe(false);

      config.rewards.blueprintFragments = -1;
      expect(loader.validateConfig(config).valid).toBe(false);

      config.rewards.blueprintFragments = 5;
      expect(loader.validateConfig(config).valid).toBe(true);
    });
  });

  describe('Hot Reload', () => {
    it('watchLevel和unwatchLevel应正常工作', () => {
      loader.watchLevel(1);
      loader.watchLevel(2);
      loader.unwatchLevel(1);
    });

    it('getLevelConfig应返回null当未加载', () => {
      expect(loader.getLevelConfig(999)).toBeNull();
    });
  });
});