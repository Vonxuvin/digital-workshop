import { PlatformAdapter } from './PlatformAdapter';
import { WXAdapter } from './WXAdapter';
import { MockAdapter } from './MockAdapter';

declare const wx: any;

export function createPlatformAdapter(): PlatformAdapter {
  const isWechat = typeof wx !== 'undefined' && wx.getSystemInfoSync;
  if (isWechat) {
    console.log('[Platform] 使用微信适配器');
    return new WXAdapter();
  }
  console.log('[Platform] 使用本地调试适配器');
  return new MockAdapter();
}
