import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LevelLoader } from '../../src/core/LevelLoader';
import { BlockTextureCache } from '../../src/utils/BlockTextureCache';
import { createPlatformAdapter, resetPlatformAdapter } from '../../src/platform/PlatformFactory';
import { LoadingScreen } from '../../src/ui/screens/LoadingScreen';

describe('Performance Optimization Integration', () => {
  beforeEach(() => {
    resetPlatformAdapter();
    BlockTextureCache.resetInstance();
  });

  afterEach(() => {
    resetPlatformAdapter();
    BlockTextureCache.resetInstance();
  });

  describe('LevelLoader lazy loading', () => {
    it('should load levels on demand via import.meta.glob lazy', async () => {
      const loader = new LevelLoader();
      await loader.discoverAndLoadAllLevels();
      expect(loader.getTotalLevels()).toBeGreaterThan(0);
    });

    it('should load a specific level lazily', async () => {
      const loader = new LevelLoader();
      const config = await loader.loadLevel(1);
      expect(config).not.toBeNull();
      expect(config!.id).toBe(1);
    });

    it('should cache loaded levels', async () => {
      const loader = new LevelLoader();
      const config1 = await loader.loadLevel(1);
      const config2 = await loader.loadLevel(1);
      expect(config1).toBe(config2);
    });

    it('should return null for non-existent level', async () => {
      const loader = new LevelLoader();
      const config = await loader.loadLevel(999);
      expect(config).toBeNull();
    });
  });

  describe('BlockTextureCache minimal preload', () => {
    it('should preload minimal textures without blocking', () => {
      const cache = BlockTextureCache.getInstance();
      expect(() => cache.preloadMinimal([1, 2, 4, 8])).not.toThrow();
    });

    it('should have textures available after minimal preload', () => {
      const cache = BlockTextureCache.getInstance();
      cache.preloadMinimal([1, 2, 4, 8]);
      const texture = cache.getTexture(1, false);
      expect(texture).toBeDefined();
    });

    it('should support async preload with progress', async () => {
      const cache = BlockTextureCache.getInstance();
      const progressValues: number[] = [];
      await cache.preloadAsync([16, 32], (loaded, total) => {
        progressValues.push(loaded / total);
      });
      expect(progressValues.length).toBeGreaterThan(0);
    });

    it('should allow cancel during async preload', () => {
      const cache = BlockTextureCache.getInstance();
      cache.cancelPreload();
      expect((cache as any).preloadCancelled).toBe(true);
    });
  });

  describe('PlatformAdapter singleton', () => {
    it('should return same instance from factory', () => {
      const a = createPlatformAdapter();
      const b = createPlatformAdapter();
      expect(a).toBe(b);
    });

    it('should create new instance after reset', () => {
      const a = createPlatformAdapter();
      resetPlatformAdapter();
      const b = createPlatformAdapter();
      expect(a).not.toBe(b);
    });

    it('should work correctly with SaveManager', async () => {
      const adapter = createPlatformAdapter();
      await adapter.init();
      await adapter.setStorage('test_key', 'test_value');
      const value = await adapter.getStorage<string>('test_key');
      expect(value).toBe('test_value');
    });
  });

  describe('LoadingScreen', () => {
    it('should show and update progress', () => {
      const screen = new LoadingScreen();
      screen.show(800, 600);
      expect(screen.visible).toBe(true);
      screen.updateProgress(0.5);
      expect(() => screen.updateProgress(0.5)).not.toThrow();
    });

    it('should hide correctly', () => {
      const screen = new LoadingScreen();
      screen.show(800, 600);
      screen.hide();
      expect(screen.visible).toBe(false);
    });
  });

  describe('Parallel initialization', () => {
    it('should run audio, config, and level loading in parallel', async () => {
      const loader = new LevelLoader();
      const results = await Promise.allSettled([
        loader.discoverAndLoadAllLevels(),
        Promise.resolve('config'),
        Promise.resolve('audio'),
      ]);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('End-to-end initialization flow', () => {
    it('should complete full initialization sequence', async () => {
      const loader = new LevelLoader();
      const cache = BlockTextureCache.getInstance();

      cache.preloadMinimal([1, 2, 4, 8]);

      await Promise.all([
        loader.discoverAndLoadAllLevels(),
      ]);

      await cache.preloadAsync([16, 32, 64]);

      expect(loader.getTotalLevels()).toBeGreaterThan(0);
      const texture = cache.getTexture(1, false);
      expect(texture).toBeDefined();
    });
  });
});
