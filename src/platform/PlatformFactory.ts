import { logger } from '../utils/Logger';
import { PlatformAdapter } from './PlatformAdapter';
import { WXAdapter } from './WXAdapter';
import { MockAdapter } from './MockAdapter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const wx: any;

let sharedInstance: PlatformAdapter | null = null;

export function createPlatformAdapter(): PlatformAdapter {
  if (sharedInstance) {
    return sharedInstance;
  }
  try {
    const isWechat = typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function';
    if (isWechat) {
      logger.info('Platform', '使用微信适配器');
      sharedInstance = new WXAdapter();
    } else {
      logger.info('Platform', '使用本地调试适配器');
      sharedInstance = new MockAdapter();
    }
  } catch {
    logger.info('Platform', '使用本地调试适配器');
    sharedInstance = new MockAdapter();
  }
  return sharedInstance;
}

export function resetPlatformAdapter(): void {
  sharedInstance = null;
}
