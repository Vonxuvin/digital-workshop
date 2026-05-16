import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BlockTextureCache } from '../../src/utils/BlockTextureCache';
import { Application, Texture } from 'pixi.js';

describe('BlockTextureCache DT Tests', () => {
  beforeEach(() => {
    BlockTextureCache.resetInstance();
  });

  afterEach(() => {
    BlockTextureCache.resetInstance();
  });

  describe('static method signatures', () => {
    it('should have static getInstance method', () => {
      expect(typeof BlockTextureCache.getInstance).toBe('function');
      expect(BlockTextureCache.getInstance.length).toBe(0);
    });

    it('should have static setInstance method', () => {
      expect(typeof BlockTextureCache.setInstance).toBe('function');
      expect(BlockTextureCache.setInstance.length).toBe(1);
    });

    it('should have static resetInstance method', () => {
      expect(typeof BlockTextureCache.resetInstance).toBe('function');
      expect(BlockTextureCache.resetInstance.length).toBe(0);
    });
  });

  describe('instance method signatures', () => {
    let cache: BlockTextureCache;

    beforeEach(() => {
      cache = BlockTextureCache.getInstance();
    });

    it('should have setApp method accepting Application', () => {
      expect(typeof cache.setApp).toBe('function');
      expect(cache.setApp.length).toBe(1);
    });

    it('should have getTexture method accepting value and optional isRainbow', () => {
      expect(typeof cache.getTexture).toBe('function');
      expect(cache.getTexture.length).toBe(1);
    });

    it('should have preload method accepting number array', () => {
      expect(typeof cache.preload).toBe('function');
      expect(cache.preload.length).toBe(1);
    });

    it('should have preloadMinimal method accepting number array', () => {
      expect(typeof cache.preloadMinimal).toBe('function');
      expect(cache.preloadMinimal.length).toBe(1);
    });

    it('should have preloadAsync method accepting values and optional callback', () => {
      expect(typeof cache.preloadAsync).toBe('function');
      expect(cache.preloadAsync.length).toBe(2);
    });

    it('should have cancelPreload method with no params', () => {
      expect(typeof cache.cancelPreload).toBe('function');
      expect(cache.cancelPreload.length).toBe(0);
    });

    it('should have destroy method', () => {
      expect(typeof cache.destroy).toBe('function');
    });
  });

  describe('return types', () => {
    let cache: BlockTextureCache;

    beforeEach(() => {
      cache = BlockTextureCache.getInstance();
    });

    it('getInstance should return BlockTextureCache instance', () => {
      const instance = BlockTextureCache.getInstance();
      expect(instance).toBeInstanceOf(BlockTextureCache);
    });

    it('getTexture should return Texture instance', () => {
      const texture = cache.getTexture(1, false);
      expect(texture).toBeInstanceOf(Texture);
    });

    it('preloadAsync should return a Promise', () => {
      const result = cache.preloadAsync([1]);
      expect(result).toBeInstanceOf(Promise);
      return result;
    });

    it('setApp should return void', () => {
      const result = cache.setApp(null as any);
      expect(result).toBeUndefined();
    });

    it('cancelPreload should return void', () => {
      const result = cache.cancelPreload();
      expect(result).toBeUndefined();
    });
  });

  describe('internal property types', () => {
    let cache: BlockTextureCache;

    beforeEach(() => {
      cache = BlockTextureCache.getInstance();
    });

    it('should have textures as Map<string, Texture>', () => {
      expect((cache as any).textures).toBeInstanceOf(Map);
    });

    it('should have pendingKeys as Set<string>', () => {
      expect((cache as any).pendingKeys).toBeInstanceOf(Set);
    });

    it('should have preloadCancelled as boolean', () => {
      expect(typeof (cache as any).preloadCancelled).toBe('boolean');
    });

    it('should have app as Application or null', () => {
      const app = (cache as any).app;
      expect(app === null || app instanceof Application).toBe(true);
    });
  });

  describe('singleton pattern type constraints', () => {
    it('getInstance should always return same instance type', () => {
      const a = BlockTextureCache.getInstance();
      const b = BlockTextureCache.getInstance();
      expect(typeof a).toBe(typeof b);
      expect(a.constructor).toBe(b.constructor);
    });

    it('setInstance should accept BlockTextureCache type', () => {
      const newCache = new BlockTextureCache();
      BlockTextureCache.setInstance(newCache);
      expect(BlockTextureCache.getInstance()).toBe(newCache);
    });

    it('resetInstance should allow creating new instance', () => {
      const old = BlockTextureCache.getInstance();
      BlockTextureCache.resetInstance();
      const newInst = BlockTextureCache.getInstance();
      expect(newInst).toBeInstanceOf(BlockTextureCache);
      expect(newInst).not.toBe(old);
    });
  });

  describe('preloadAsync callback type', () => {
    it('should accept onProgress callback with (loaded: number, total: number) signature', async () => {
      const cache = BlockTextureCache.getInstance();
      let receivedLoaded: number | undefined;
      let receivedTotal: number | undefined;
      await cache.preloadAsync([1], (loaded, total) => {
        receivedLoaded = loaded;
        receivedTotal = total;
      });
      expect(typeof receivedLoaded).toBe('number');
      expect(typeof receivedTotal).toBe('number');
    });
  });
});
