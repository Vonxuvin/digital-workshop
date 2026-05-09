import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LevelLoader } from '../src/core/LevelLoader';

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

  it('should load and cache level config from JSON', async () => {
    const mockConfig = {
      id: 1,
      name: '新手入门',
      objective: { type: 'score', target: 500 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [300, 400, 500] },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    });

    const config = await loader.loadLevel(1);
    expect(config).not.toBeNull();
    expect(config!.id).toBe(1);
    expect(config!.name).toBe('新手入门');
    expect(config!.objective.type).toBe('score');
    expect(config!.objective.target).toBe(500);
    expect(config!.containerWidth).toBe(400);
    expect(config!.containerHeight).toBe(600);
    expect(config!.availableNumbers).toEqual([1, 2, 4]);

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const cached = await loader.loadLevel(1);
    expect(cached).toBe(config);
    expect(global.fetch).toHaveBeenCalledTimes(1);
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
});
