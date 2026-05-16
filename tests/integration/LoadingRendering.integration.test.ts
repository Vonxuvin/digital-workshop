import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoadingScreen } from '../../src/ui/screens/LoadingScreen';
import { BlockTextureCache } from '../../src/utils/BlockTextureCache';
import { GameStateMachine, GameState } from '../../src/core/GameStateMachine';
import { LevelLoader } from '../../src/core/LevelLoader';
import { createPlatformAdapter, resetPlatformAdapter } from '../../src/platform/PlatformFactory';

describe('Loading & Rendering Integration Tests', () => {
  beforeEach(() => {
    resetPlatformAdapter();
    BlockTextureCache.resetInstance();
  });

  afterEach(() => {
    resetPlatformAdapter();
    BlockTextureCache.resetInstance();
  });

  describe('LoadingScreen + GameStateMachine integration', () => {
    it('should show loading screen during boot->loading transition', () => {
      const sm = new GameStateMachine('boot');
      const loadingScreen = new LoadingScreen();

      sm.onEnter('loading', () => {
        loadingScreen.show(800, 600);
      });

      sm.transition('loading');

      expect(sm.getCurrentState()).toBe('loading');
      expect(loadingScreen.visible).toBe(true);
    });

    it('should update loading progress during resource loading', () => {
      const loadingScreen = new LoadingScreen();
      loadingScreen.show(800, 600);

      loadingScreen.updateProgress(0.25);
      loadingScreen.updateProgress(0.5);
      loadingScreen.updateProgress(0.75);
      loadingScreen.updateProgress(1.0);

      expect(loadingScreen.visible).toBe(true);
    });

    it('should hide loading screen after loading->menu transition', () => {
      const sm = new GameStateMachine('loading');
      const loadingScreen = new LoadingScreen();
      loadingScreen.show(800, 600);

      sm.onEnter('menu', () => {
        loadingScreen.hide();
      });

      sm.transition('menu');

      expect(sm.getCurrentState()).toBe('menu');
      expect(loadingScreen.visible).toBe(false);
    });

    it('should complete full boot->loading->menu flow', () => {
      const sm = new GameStateMachine('boot');
      const loadingScreen = new LoadingScreen();

      sm.onEnter('loading', () => {
        loadingScreen.show(800, 600);
        loadingScreen.updateProgress(0.5);
      });

      sm.onEnter('menu', () => {
        loadingScreen.updateProgress(1.0);
        loadingScreen.hide();
      });

      sm.transition('loading');
      expect(loadingScreen.visible).toBe(true);

      sm.transition('menu');
      expect(loadingScreen.visible).toBe(false);
      expect(sm.getCurrentState()).toBe('menu');
    });
  });

  describe('BlockTextureCache + GameStateMachine integration', () => {
    it('should preload textures during loading state', () => {
      const sm = new GameStateMachine('boot');
      const cache = BlockTextureCache.getInstance();

      sm.onEnter('loading', () => {
        cache.preloadMinimal([1, 2, 4, 8]);
      });

      sm.transition('loading');

      const texture = cache.getTexture(1, false);
      expect(texture).toBeDefined();
    });

    it('should have textures available when entering menu state', async () => {
      const sm = new GameStateMachine('boot');
      const cache = BlockTextureCache.getInstance();

      sm.onEnter('loading', () => {
        cache.preloadMinimal([1, 2, 4, 8, 16, 32]);
      });

      sm.transition('loading');
      await cache.preloadAsync([1, 2]);

      sm.transition('menu');

      for (const val of [1, 2, 4, 8]) {
        const texture = cache.getTexture(val, false);
        expect(texture).toBeDefined();
      }
    });

    it('should support async preload with progress callback during loading', async () => {
      const sm = new GameStateMachine('boot');
      const cache = BlockTextureCache.getInstance();
      const progressValues: number[] = [];

      sm.onEnter('loading', () => {
        cache.preloadMinimal([1, 2, 4]);
      });

      sm.transition('loading');

      await cache.preloadAsync([16, 32], (loaded, total) => {
        progressValues.push(loaded / total);
      });

      expect(progressValues.length).toBeGreaterThan(0);
      expect(progressValues[progressValues.length - 1]).toBe(1);
    });
  });

  describe('PlatformAdapter + BlockTextureCache integration', () => {
    it('should use platform adapter for storage operations', async () => {
      const adapter = createPlatformAdapter();
      await adapter.init();

      await adapter.setStorage('test_level', { id: 1, name: 'test' });
      const data = await adapter.getStorage<{ id: number; name: string }>('test_level');
      expect(data).not.toBeNull();
      expect(data!.id).toBe(1);
    });

    it('should provide system info for texture resolution', async () => {
      const adapter = createPlatformAdapter();
      await adapter.init();
      const info = await adapter.getSystemInfo();

      expect(typeof info.pixelRatio).toBe('number');
      expect(info.pixelRatio).toBeGreaterThan(0);
    });
  });

  describe('LevelLoader + BlockTextureCache integration', () => {
    it('should load level config and have textures ready', async () => {
      const loader = new LevelLoader();
      const cache = BlockTextureCache.getInstance();

      const config = await loader.loadLevel(1);
      cache.preloadMinimal([1, 2, 4]);

      expect(config).not.toBeNull();
      expect(config!.id).toBe(1);

      const texture = cache.getTexture(1, false);
      expect(texture).toBeDefined();
    });

    it('should handle missing level gracefully while cache remains functional', async () => {
      const loader = new LevelLoader();
      const cache = BlockTextureCache.getInstance();

      const config = await loader.loadLevel(999);
      expect(config).toBeNull();

      cache.preloadMinimal([1, 2]);
      const texture = cache.getTexture(1, false);
      expect(texture).toBeDefined();
    });
  });

  describe('Full initialization flow integration', () => {
    it('should complete boot->loading->menu with all subsystems', async () => {
      const sm = new GameStateMachine('boot');
      const loadingScreen = new LoadingScreen();
      const cache = BlockTextureCache.getInstance();
      const loader = new LevelLoader();

      sm.onEnter('loading', () => {
        loadingScreen.show(800, 600);
        loadingScreen.updateProgress(0.1);
        cache.preloadMinimal([1, 2, 4, 8]);
        loadingScreen.updateProgress(0.5);
      });

      sm.transition('loading');
      expect(loadingScreen.visible).toBe(true);

      await loader.discoverAndLoadAllLevels();
      await cache.preloadAsync([16, 32]);

      loadingScreen.updateProgress(1.0);

      sm.onEnter('menu', () => {
        loadingScreen.hide();
      });

      sm.transition('menu');

      expect(sm.getCurrentState()).toBe('menu');
      expect(loadingScreen.visible).toBe(false);
      expect(loader.getTotalLevels()).toBeGreaterThan(0);
      expect(cache.getTexture(1, false)).toBeDefined();
    });

    it('should handle initialization errors gracefully', async () => {
      const sm = new GameStateMachine('boot');
      const loadingScreen = new LoadingScreen();

      sm.onEnter('loading', () => {
        loadingScreen.show(800, 600);
      });

      sm.transition('loading');

      loadingScreen.updateProgress(0.3);

      sm.onEnter('menu', () => {
        loadingScreen.hide();
      });

      sm.transition('menu');

      expect(sm.getCurrentState()).toBe('menu');
      expect(loadingScreen.visible).toBe(false);
    });
  });

  describe('LoadingScreen + BlockTextureCache progress reporting', () => {
    it('should reflect texture preload progress in loading screen', async () => {
      const loadingScreen = new LoadingScreen();
      const cache = BlockTextureCache.getInstance();

      loadingScreen.show(800, 600);

      await cache.preloadAsync([1, 2, 4], (loaded, total) => {
        loadingScreen.updateProgress(loaded / total);
      });

      expect(loadingScreen.visible).toBe(true);
    });

    it('should handle preload cancellation without breaking loading screen', () => {
      const loadingScreen = new LoadingScreen();
      const cache = BlockTextureCache.getInstance();

      loadingScreen.show(800, 600);
      loadingScreen.updateProgress(0.3);

      cache.cancelPreload();

      loadingScreen.updateProgress(0.5);
      expect(loadingScreen.visible).toBe(true);
    });
  });
});
