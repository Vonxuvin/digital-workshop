import { PlatformAdapter } from './PlatformAdapter';
import { WXAdapter } from './WXAdapter';
import { MockAdapter } from './MockAdapter';

declare const wx: any;

let sharedInstance: PlatformAdapter | null = null;

export function createPlatformAdapter(): PlatformAdapter {
  if (sharedInstance) {
    return sharedInstance;
  }
  const isWechat = typeof wx !== 'undefined' && wx.getSystemInfoSync;
  if (isWechat) {
    console.log('[Platform] 使用微信适配器');
    sharedInstance = new WXAdapter();
  } else {
    console.log('[Platform] 使用本地调试适配器');
    sharedInstance = new MockAdapter();
  }
  return sharedInstance;
}

export function resetPlatformAdapter(): void {
  sharedInstance = null;
}
