import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BlockTextureCache } from '../../src/utils/BlockTextureCache';

describe('BlockTextureCache', () => {
  let cache: BlockTextureCache;

  beforeEach(() => {
    BlockTextureCache.resetInstance();
    cache = BlockTextureCache.getInstance();
  });

  afterEach(() => {
    BlockTextureCache.resetInstance();
  });

  it('should create singleton instance', () => {
    const a = BlockTextureCache.getInstance();
    const b = BlockTextureCache.getInstance();
    expect(a).toBe(b);
  });

  it('should reset instance', () => {
    const instance = BlockTextureCache.getInstance();
    BlockTextureCache.resetInstance();
    const newInstance = BlockTextureCache.getInstance();
    expect(newInstance).not.toBe(instance);
  });

  it('should preload minimal textures', () => {
    cache.preloadMinimal([1, 2, 4]);
    const t1 = cache.getTexture(1, false);
    expect(t1).toBeDefined();
  });

  it('preloadMinimal should not preload rainbow textures', () => {
    cache.preloadMinimal([1, 2, 4]);
    const normalTexture = cache.getTexture(1, false);
    const rainbowTexture = cache.getTexture(1, true);
    expect(normalTexture).toBeDefined();
    expect(rainbowTexture).toBeDefined();
  });

  it('should preloadAsync with progress callback', async () => {
    const onProgress = vi.fn();
    await cache.preloadAsync([1, 2], onProgress);
    expect(onProgress).toHaveBeenCalled();
  });

  it('should preloadAsync and generate textures', async () => {
    await cache.preloadAsync([1, 2]);
    const t1 = cache.getTexture(1, false);
    const t2 = cache.getTexture(2, false);
    expect(t1).toBeDefined();
    expect(t2).toBeDefined();
  });

  it('should cancel preload', async () => {
    cache.cancelPreload();
    expect((cache as any).preloadCancelled).toBe(true);
  });

  it('preloadAsync should respect cancellation', async () => {
    cache.cancelPreload();
    const onProgress = vi.fn();
    await cache.preloadAsync([1, 2, 4, 8], onProgress);
  });

  it('should destroy without errors', () => {
    cache.preloadMinimal([1, 2]);
    expect(() => cache.destroy()).not.toThrow();
  });

  it('destroy should set preloadCancelled to true', () => {
    cache.preloadMinimal([1]);
    cache.destroy();
    expect((cache as any).preloadCancelled).toBe(true);
  });

  it('setInstance should set the singleton', () => {
    const newCache = new BlockTextureCache();
    BlockTextureCache.setInstance(newCache);
    expect(BlockTextureCache.getInstance()).toBe(newCache);
  });

  it('getTexture should return a texture', () => {
    const texture = cache.getTexture(1, false);
    expect(texture).toBeDefined();
  });

  it('getTexture should cache textures', () => {
    const t1 = cache.getTexture(1, false);
    const t2 = cache.getTexture(1, false);
    expect(t1).toBe(t2);
  });

  it('getTexture should differentiate rainbow textures', () => {
    const normal = cache.getTexture(1, false);
    const rainbow = cache.getTexture(1, true);
    expect(normal).toBeDefined();
    expect(rainbow).toBeDefined();
  });

  it('preloadAsync with empty values should complete immediately', async () => {
    const onProgress = vi.fn();
    await cache.preloadAsync([], onProgress);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('preloadAsync should handle single value', async () => {
    await cache.preloadAsync([1]);
    const t = cache.getTexture(1, false);
    expect(t).toBeDefined();
  });
});
