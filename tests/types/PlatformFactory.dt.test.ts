import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPlatformAdapter, resetPlatformAdapter } from '../../src/platform/PlatformFactory';
import { PlatformAdapter } from '../../src/platform/PlatformAdapter';
import { MockAdapter } from '../../src/platform/MockAdapter';

describe('PlatformFactory DT Tests', () => {
  beforeEach(() => {
    resetPlatformAdapter();
  });

  afterEach(() => {
    resetPlatformAdapter();
  });

  describe('function signatures', () => {
    it('createPlatformAdapter should be a function', () => {
      expect(typeof createPlatformAdapter).toBe('function');
    });

    it('createPlatformAdapter should have no required params', () => {
      expect(createPlatformAdapter.length).toBe(0);
    });

    it('resetPlatformAdapter should be a function', () => {
      expect(typeof resetPlatformAdapter).toBe('function');
    });

    it('resetPlatformAdapter should have no params', () => {
      expect(resetPlatformAdapter.length).toBe(0);
    });
  });

  describe('return types', () => {
    it('createPlatformAdapter should return PlatformAdapter', () => {
      const adapter = createPlatformAdapter();
      expect(adapter).toBeDefined();
      expect(typeof adapter).toBe('object');
    });

    it('resetPlatformAdapter should return void', () => {
      const result = resetPlatformAdapter();
      expect(result).toBeUndefined();
    });
  });

  describe('PlatformAdapter interface compliance', () => {
    it('should implement init method returning Promise<void>', async () => {
      const adapter = createPlatformAdapter();
      const result = adapter.init();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should implement login method returning Promise', async () => {
      const adapter = createPlatformAdapter();
      const result = adapter.login();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should implement getUserInfo method returning Promise', async () => {
      const adapter = createPlatformAdapter();
      const result = adapter.getUserInfo();
      expect(result).toBeInstanceOf(Promise);
    });

    it('should implement share method returning Promise<void>', async () => {
      const adapter = createPlatformAdapter();
      const result = adapter.share('test');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should implement getSystemInfo method returning Promise', async () => {
      const adapter = createPlatformAdapter();
      const result = adapter.getSystemInfo();
      expect(result).toBeInstanceOf(Promise);
      const info = await result;
      expect(typeof info.brand).toBe('string');
      expect(typeof info.model).toBe('string');
      expect(typeof info.screenWidth).toBe('number');
      expect(typeof info.screenHeight).toBe('number');
      expect(typeof info.pixelRatio).toBe('number');
      expect(typeof info.platform).toBe('string');
    });

    it('should implement setStorage method returning Promise<void>', async () => {
      const adapter = createPlatformAdapter();
      const result = adapter.setStorage('key', 'value');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should implement getStorage method returning Promise', async () => {
      const adapter = createPlatformAdapter();
      const result = adapter.getStorage('key');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should implement removeStorage method returning Promise<void>', async () => {
      const adapter = createPlatformAdapter();
      const result = adapter.removeStorage('key');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should implement vibrateShort returning void', () => {
      const adapter = createPlatformAdapter();
      const result = adapter.vibrateShort();
      expect(result).toBeUndefined();
    });

    it('should implement vibrateLong returning void', () => {
      const adapter = createPlatformAdapter();
      const result = adapter.vibrateLong();
      expect(result).toBeUndefined();
    });

    it('should implement getPlatform returning string', () => {
      const adapter = createPlatformAdapter();
      const result = adapter.getPlatform();
      expect(typeof result).toBe('string');
    });
  });

  describe('singleton pattern type constraints', () => {
    it('should return same reference type on repeated calls', () => {
      const a = createPlatformAdapter();
      const b = createPlatformAdapter();
      expect(a).toBe(b);
      expect(a.constructor).toBe(b.constructor);
    });

    it('should return MockAdapter in browser environment', () => {
      const adapter = createPlatformAdapter();
      expect(adapter).toBeInstanceOf(MockAdapter);
    });

    it('should return new instance after reset', () => {
      const a = createPlatformAdapter();
      resetPlatformAdapter();
      const b = createPlatformAdapter();
      expect(a).not.toBe(b);
      expect(b).toBeInstanceOf(MockAdapter);
    });
  });
});
