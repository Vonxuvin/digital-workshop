import { describe, it, expect } from 'vitest';
import { MockAdapter } from '../src/platform/MockAdapter';

describe('MockAdapter', () => {
  it('should return mock user info', async () => {
    const adapter = new MockAdapter();
    const userInfo = await adapter.getUserInfo();
    expect(userInfo.nickName).toBe('测试用户');
  });

  it('should store and retrieve data', async () => {
    const adapter = new MockAdapter();
    await adapter.setStorage('test_key', { value: 42 });
    const data = await adapter.getStorage<{ value: number }>('test_key');
    expect(data?.value).toBe(42);
  });

  it('should return system info', async () => {
    const adapter = new MockAdapter();
    const info = await adapter.getSystemInfo();
    expect(info.platform).toBe('devtools');
    expect(info.screenWidth).toBeGreaterThan(0);
  });

  it('should simulate rewarded video', async () => {
    const adapter = new MockAdapter();
    const result = await adapter.showRewardedVideo('test_ad');
    expect(result).toBe(true);
  });
});
