import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPlatformAdapter, resetPlatformAdapter } from '../../src/platform/PlatformFactory';
import { MockAdapter } from '../../src/platform/MockAdapter';

describe('PlatformFactory', () => {
  beforeEach(() => {
    resetPlatformAdapter();
  });

  afterEach(() => {
    resetPlatformAdapter();
  });

  it('should create a MockAdapter in browser environment', () => {
    const adapter = createPlatformAdapter();
    expect(adapter).toBeInstanceOf(MockAdapter);
  });

  it('should return the same instance on subsequent calls', () => {
    const a = createPlatformAdapter();
    const b = createPlatformAdapter();
    expect(a).toBe(b);
  });

  it('should create a new instance after reset', () => {
    const a = createPlatformAdapter();
    resetPlatformAdapter();
    const b = createPlatformAdapter();
    expect(a).not.toBe(b);
  });

  it('should allow init on the created adapter', async () => {
    const adapter = createPlatformAdapter();
    await expect(adapter.init()).resolves.toBeUndefined();
  });

  it('should return system info from the adapter', async () => {
    const adapter = createPlatformAdapter();
    const info = await adapter.getSystemInfo();
    expect(info).toBeDefined();
    expect(info.platform).toBe('devtools');
  });

  it('resetPlatformAdapter should not throw', () => {
    expect(() => resetPlatformAdapter()).not.toThrow();
  });

  it('should handle multiple resets', () => {
    createPlatformAdapter();
    resetPlatformAdapter();
    resetPlatformAdapter();
    resetPlatformAdapter();
    const adapter = createPlatformAdapter();
    expect(adapter).toBeInstanceOf(MockAdapter);
  });
});
