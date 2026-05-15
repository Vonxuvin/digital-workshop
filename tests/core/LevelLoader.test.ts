import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  describe('loadFromData', () => {
    const validData = {
      id: 10,
      name: 'Data Level',
      objective: { type: 'score', target: 500 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [100, 200, 300] },
    };

    it('should load valid data and return config', () => {
      const config = loader.loadFromData(10, validData);
      expect(config).not.toBeNull();
      expect(config!.id).toBe(10);
      expect(config!.name).toBe('Data Level');
    });

    it('should cache the loaded config', () => {
      loader.loadFromData(10, validData);
      const cached = loader.getLevelConfig(10);
      expect(cached).not.toBeNull();
      expect(cached!.id).toBe(10);
    });

    it('should return null for invalid data', () => {
      const config = loader.loadFromData(11, { id: 'bad' });
      expect(config).toBeNull();
    });

    it('should return null for null data', () => {
      const config = loader.loadFromData(12, null);
      expect(config).toBeNull();
    });

    it('should return null when parseLevelConfig returns null despite valid validation', () => {
      const spy = vi.spyOn(loader as any, 'parseLevelConfig').mockReturnValue(null);
      const config = loader.loadFromData(13, validData);
      expect(config).toBeNull();
      spy.mockRestore();
    });
  });

  describe('getAllLevelConfigsSync', () => {
    it('should return empty array when no levels loaded', () => {
      expect(loader.getAllLevelConfigsSync()).toEqual([]);
    });

    it('should return sorted configs after loading', () => {
      const makeData = (id: number) => ({
        id,
        name: `Level ${id}`,
        objective: { type: 'score', target: id * 100 },
        container: { width: 400, height: 600 },
        spawn: { availableNumbers: [1, 2] },
        rewards: { stars: [100, 200, 300] },
      });
      loader.loadFromData(5, makeData(5));
      loader.loadFromData(3, makeData(3));
      loader.loadFromData(7, makeData(7));
      const configs = loader.getAllLevelConfigsSync();
      expect(configs).toHaveLength(3);
      expect(configs[0].id).toBe(3);
      expect(configs[1].id).toBe(5);
      expect(configs[2].id).toBe(7);
    });
  });

  describe('discoverAndLoadAllLevels', () => {
    it('should load levels from levelModules', async () => {
      await loader.discoverAndLoadAllLevels();
      expect(loader.getTotalLevels()).toBeGreaterThan(0);
    });
  });

  describe('getAllLevelConfigs', () => {
    it('should return all configs sorted by id', async () => {
      const configs = await loader.getAllLevelConfigs();
      expect(configs.length).toBeGreaterThan(0);
      for (let i = 1; i < configs.length; i++) {
        expect(configs[i].id).toBeGreaterThan(configs[i - 1].id);
      }
    });
  });

  describe('enableHotReload / disableHotReload', () => {
    afterEach(() => {
      loader.disableHotReload();
      delete (globalThis as any).location;
    });

    it('should enable hot reload on localhost', () => {
      (globalThis as any).location = { hostname: 'localhost' };
      loader.enableHotReload();
      expect((loader as any).hotReloadTimer).not.toBeNull();
    });

    it('should enable hot reload on 127.0.0.1', () => {
      (globalThis as any).location = { hostname: '127.0.0.1' };
      loader.enableHotReload();
      expect((loader as any).hotReloadTimer).not.toBeNull();
    });

    it('should not enable hot reload on non-localhost hostname', () => {
      (globalThis as any).location = { hostname: 'example.com' };
      loader.enableHotReload();
      expect((loader as any).hotReloadTimer).toBeNull();
    });

    it('should not enable hot reload when no location', () => {
      delete (globalThis as any).location;
      loader.enableHotReload();
      expect((loader as any).hotReloadTimer).toBeNull();
    });

    it('should disable hot reload and clear timer', () => {
      (globalThis as any).location = { hostname: 'localhost' };
      loader.enableHotReload();
      expect((loader as any).hotReloadTimer).not.toBeNull();
      loader.disableHotReload();
      expect((loader as any).hotReloadTimer).toBeNull();
    });

    it('should accept callback in enableHotReload', () => {
      (globalThis as any).location = { hostname: 'localhost' };
      const cb = vi.fn();
      loader.enableHotReload(cb);
      expect((loader as any).onConfigReload).toBe(cb);
    });

    it('should not create duplicate timer on repeated enableHotReload calls', () => {
      (globalThis as any).location = { hostname: 'localhost' };
      loader.enableHotReload();
      const firstTimer = (loader as any).hotReloadTimer;
      loader.enableHotReload();
      expect((loader as any).hotReloadTimer).toBe(firstTimer);
    });
  });

  describe('loadJSON', () => {
    it('should return null for non-json/non-plain content-type', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/html' },
        json: () => Promise.resolve({ id: 1 }),
      });
      const result = await (loader as any).loadJSON('/test.json');
      expect(result).toBeNull();
    });

    it('should return data for json content-type', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ id: 1 }),
      });
      const result = await (loader as any).loadJSON('/test.json');
      expect(result).toEqual({ id: 1 });
    });

    it('should return data for text/plain content-type', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'text/plain' },
        json: () => Promise.resolve({ id: 1 }),
      });
      const result = await (loader as any).loadJSON('/test.json');
      expect(result).toEqual({ id: 1 });
    });

    it('should return data when content-type is null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve({ id: 1 }),
      });
      const result = await (loader as any).loadJSON('/test.json');
      expect(result).toEqual({ id: 1 });
    });

    it('should return null when response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      const result = await (loader as any).loadJSON('/test.json');
      expect(result).toBeNull();
    });
  });

  describe('loadLevelFile', () => {
    afterEach(() => {
      delete (globalThis as any).require;
      delete (globalThis as any).wx;
    });

    it('should load with globalThis.require', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('no fetch'));
      const mockData = { id: 50, name: 'Require Level' };
      (globalThis as any).require = vi.fn().mockReturnValue(mockData);
      const result = await (loader as any).loadLevelFile('level_50.json');
      expect(result).toEqual(mockData);
    });

    it('should load with globalThis.require returning default', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('no fetch'));
      const mockData = { default: { id: 51, name: 'Default Level' } };
      (globalThis as any).require = vi.fn().mockReturnValue(mockData);
      const result = await (loader as any).loadLevelFile('level_51.json');
      expect(result).toEqual({ id: 51, name: 'Default Level' });
    });

    it('should load with wx environment', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('no fetch'));
      delete (globalThis as any).require;
      const validData = JSON.stringify({ id: 52, name: 'WX Level' });
      (globalThis as any).wx = {
        getFileSystemManager: () => ({
          readFileSync: () => validData,
        }),
        env: { USER_DATA_PATH: '/tmp/wx' },
      };
      const result = await (loader as any).loadLevelFile('level_52.json');
      expect(result).toEqual({ id: 52, name: 'WX Level' });
    });

    it('should return null when all methods fail', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('no fetch'));
      delete (globalThis as any).require;
      delete (globalThis as any).wx;
      const result = await (loader as any).loadLevelFile('level_99.json');
      expect(result).toBeNull();
    });

    it('should handle wx readFileSync throwing error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('no fetch'));
      delete (globalThis as any).require;
      (globalThis as any).wx = {
        getFileSystemManager: () => ({
          readFileSync: () => { throw new Error('read fail'); },
        }),
        env: { USER_DATA_PATH: '/tmp/wx' },
      };
      const result = await (loader as any).loadLevelFile('level_53.json');
      expect(result).toBeNull();
    });

    it('should handle globalThis.require throwing error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('no fetch'));
      (globalThis as any).require = vi.fn().mockImplementation(() => { throw new Error('require fail'); });
      delete (globalThis as any).wx;
      const result = await (loader as any).loadLevelFile('level_54.json');
      expect(result).toBeNull();
    });
  });

  describe('validateConfig (additional)', () => {
    const createValidConfig = () => ({
      id: 1,
      name: '测试关卡',
      objective: { type: 'score', target: 1000 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [500, 1000, 2000] },
    });

    it('should reject objective.type as non-string number', () => {
      const config = createValidConfig();
      (config.objective as any).type = 123;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject objective with missing type', () => {
      const config = createValidConfig();
      delete config.objective.type;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject container missing width', () => {
      const config = createValidConfig();
      delete config.container.width;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject container missing height', () => {
      const config = createValidConfig();
      delete config.container.height;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject container.width as non-number string', () => {
      const config = createValidConfig();
      (config.container as any).width = 'wide';
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject container.height as non-number string', () => {
      const config = createValidConfig();
      (config.container as any).height = 'tall';
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject container.height too small', () => {
      const config = createValidConfig();
      config.container.height = 50;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject container.width as null', () => {
      const config = createValidConfig();
      (config.container as any).width = null;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject container.height as null', () => {
      const config = createValidConfig();
      (config.container as any).height = null;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject spawn.spawnInterval as non-number', () => {
      const config = createValidConfig();
      (config.spawn as any).spawnInterval = 'fast';
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject spawn.spawnInterval negative', () => {
      const config = createValidConfig();
      config.spawn.spawnInterval = -1;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should accept spawn.spawnInterval as valid number', () => {
      const config = createValidConfig();
      config.spawn.spawnInterval = 1000;
      expect(loader.validateConfig(config).valid).toBe(true);
    });

    it('should reject obstacles with missing x', () => {
      const config = createValidConfig();
      config.obstacles = [{ y: 100, value: 4 }];
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject obstacles with missing y', () => {
      const config = createValidConfig();
      config.obstacles = [{ x: 100, value: 4 }];
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject obstacles with missing value', () => {
      const config = createValidConfig();
      config.obstacles = [{ x: 100, y: 200 }];
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject obstacles element as non-object', () => {
      const config = createValidConfig();
      (config as any).obstacles = ['not-an-object'];
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject rewards as non-object string', () => {
      const config = createValidConfig();
      (config as any).rewards = 'invalid';
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject rewards as non-object number', () => {
      const config = createValidConfig();
      (config as any).rewards = 42;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject clear_obstacle objective without obstacles', () => {
      const config = createValidConfig();
      config.objective.type = 'clear_obstacle';
      delete config.obstacles;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject clear_obstacle objective with empty obstacles', () => {
      const config = createValidConfig();
      config.objective.type = 'clear_obstacle';
      config.obstacles = [];
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should accept clear_obstacle with valid obstacles', () => {
      const config = createValidConfig();
      config.objective.type = 'clear_obstacle';
      config.obstacles = [{ x: 100, y: 200, value: 4 }];
      expect(loader.validateConfig(config).valid).toBe(true);
    });

    it('should reject missing objective', () => {
      const config = createValidConfig();
      delete (config as any).objective;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject missing container', () => {
      const config = createValidConfig();
      delete (config as any).container;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject missing spawn', () => {
      const config = createValidConfig();
      delete (config as any).spawn;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject id as null', () => {
      const config = createValidConfig();
      (config as any).id = null;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject name as null', () => {
      const config = createValidConfig();
      (config as any).name = null;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should accept valid survival objective', () => {
      const config = createValidConfig();
      config.objective.type = 'survival';
      expect(loader.validateConfig(config).valid).toBe(true);
    });

    it('should accept valid target_merge objective', () => {
      const config = createValidConfig();
      config.objective.type = 'target_merge';
      expect(loader.validateConfig(config).valid).toBe(true);
    });

    it('should reject objective.target as null', () => {
      const config = createValidConfig();
      (config.objective as any).target = null;
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject obstacles with x as non-number', () => {
      const config = createValidConfig();
      config.obstacles = [{ x: 'bad', y: 200, value: 4 }];
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject obstacles with y as non-number', () => {
      const config = createValidConfig();
      config.obstacles = [{ x: 100, y: 'bad', value: 4 }];
      expect(loader.validateConfig(config).valid).toBe(false);
    });

    it('should reject obstacles with value as non-number', () => {
      const config = createValidConfig();
      config.obstacles = [{ x: 100, y: 200, value: 'bad' }];
      expect(loader.validateConfig(config).valid).toBe(false);
    });
  });

  describe('getTotalLevels', () => {
    it('should return 0 when no levels loaded', () => {
      expect(loader.getTotalLevels()).toBe(0);
    });

    it('should return count of loaded levels', () => {
      const makeData = (id: number) => ({
        id,
        name: `Level ${id}`,
        objective: { type: 'score', target: id * 100 },
        container: { width: 400, height: 600 },
        spawn: { availableNumbers: [1, 2] },
        rewards: { stars: [100, 200, 300] },
      });
      loader.loadFromData(1, makeData(1));
      expect(loader.getTotalLevels()).toBe(1);
      loader.loadFromData(2, makeData(2));
      expect(loader.getTotalLevels()).toBe(2);
    });
  });

  describe('setInstance', () => {
    it('should set the singleton instance', () => {
      const newInstance = new LevelLoader();
      LevelLoader.setInstance(newInstance);
      expect(LevelLoader.getInstance()).toBe(newInstance);
      LevelLoader.setInstance(loader);
    });
  });

  describe('loadLevel (additional)', () => {
    it('should return null when validation fails for module data', async () => {
      const spy = vi.spyOn(loader, 'validateConfig').mockReturnValue({ valid: false, errors: ['test'] });
      loader.clearCache();
      global.fetch = vi.fn().mockRejectedValue(new Error('no fetch'));
      delete (globalThis as any).require;
      delete (globalThis as any).wx;
      const config = await loader.loadLevel(1);
      expect(config).toBeNull();
      spy.mockRestore();
    });
  });

  describe('destroy', () => {
    it('should clear cache and disable hot reload', () => {
      const makeData = (id: number) => ({
        id,
        name: `Level ${id}`,
        objective: { type: 'score', target: id * 100 },
        container: { width: 400, height: 600 },
        spawn: { availableNumbers: [1, 2] },
        rewards: { stars: [100, 200, 300] },
      });
      loader.loadFromData(1, makeData(1));
      expect(loader.getTotalLevels()).toBe(1);
      loader.destroy();
      expect(loader.getTotalLevels()).toBe(0);
    });
  });

  describe('hot reload timer callback', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      loader.disableHotReload();
      delete (globalThis as any).location;
    });

    it('should detect config change and call callback', async () => {
      (globalThis as any).location = { hostname: 'localhost' };

      const originalData = {
        id: 1,
        name: 'Original',
        objective: { type: 'score', target: 100 },
        container: { width: 400, height: 600 },
        spawn: { availableNumbers: [1, 2] },
        rewards: { stars: [100, 200, 300] },
      };
      loader.loadFromData(1, originalData);

      const changedData = {
        id: 1,
        name: 'Changed',
        objective: { type: 'score', target: 200 },
        container: { width: 400, height: 600 },
        spawn: { availableNumbers: [1, 2] },
        rewards: { stars: [100, 200, 300] },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(changedData),
      });

      const callback = vi.fn();
      loader.watchLevel(1);
      loader.enableHotReload(callback);

      await vi.advanceTimersByTimeAsync(5000);

      expect(callback).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Changed' }));
    });

    it('should skip when fetch response is not ok', async () => {
      (globalThis as any).location = { hostname: 'localhost' };

      const originalData = {
        id: 1,
        name: 'Original',
        objective: { type: 'score', target: 100 },
        container: { width: 400, height: 600 },
        spawn: { availableNumbers: [1, 2] },
        rewards: { stars: [100, 200, 300] },
      };
      loader.loadFromData(1, originalData);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const callback = vi.fn();
      loader.watchLevel(1);
      loader.enableHotReload(callback);

      await vi.advanceTimersByTimeAsync(5000);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should skip when validation fails for fetched data', async () => {
      (globalThis as any).location = { hostname: 'localhost' };

      const originalData = {
        id: 1,
        name: 'Original',
        objective: { type: 'score', target: 100 },
        container: { width: 400, height: 600 },
        spawn: { availableNumbers: [1, 2] },
        rewards: { stars: [100, 200, 300] },
      };
      loader.loadFromData(1, originalData);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve({ id: 'invalid' }),
      });

      const callback = vi.fn();
      loader.watchLevel(1);
      loader.enableHotReload(callback);

      await vi.advanceTimersByTimeAsync(5000);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should skip when config has not changed', async () => {
      (globalThis as any).location = { hostname: 'localhost' };

      const originalData = {
        id: 1,
        name: 'Original',
        objective: { type: 'score', target: 100 },
        container: { width: 400, height: 600 },
        spawn: { availableNumbers: [1, 2] },
        rewards: { stars: [100, 200, 300] },
      };
      loader.loadFromData(1, originalData);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(originalData),
      });

      const callback = vi.fn();
      loader.watchLevel(1);
      loader.enableHotReload(callback);

      await vi.advanceTimersByTimeAsync(5000);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle fetch error in timer callback', async () => {
      (globalThis as any).location = { hostname: 'localhost' };

      const originalData = {
        id: 1,
        name: 'Original',
        objective: { type: 'score', target: 100 },
        container: { width: 400, height: 600 },
        spawn: { availableNumbers: [1, 2] },
        rewards: { stars: [100, 200, 300] },
      };
      loader.loadFromData(1, originalData);

      global.fetch = vi.fn().mockRejectedValue(new Error('network fail'));

      const callback = vi.fn();
      loader.watchLevel(1);
      loader.enableHotReload(callback);

      await vi.advanceTimersByTimeAsync(5000);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});