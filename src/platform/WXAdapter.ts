import { logger } from '../utils/Logger';
import { PlatformAdapter } from './PlatformAdapter';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const wx: any;

interface WXSystemInfo {
  brand: string;
  model: string;
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  pixelRatio: number;
  platform: string;
}

interface WXLoginResult {
  code: string;
}

interface WXUserProfileResult {
  userInfo: {
    nickName: string;
    avatarUrl: string;
  };
}

interface WXRewardedVideoCloseResult {
  isEnded: boolean;
}

interface WXBannerAdResizeResult {
  width: number;
  height: number;
}

interface WXStorageResult<T> {
  data: T;
}

interface WXBannerAd {
  show(): Promise<void>;
  hide(): void;
  onResize(callback: (size: WXBannerAdResizeResult) => void): void;
  style: { top: number; left: number };
}

interface WXRewardedVideoAd {
  show(): Promise<void>;
  load(): Promise<void>;
  onLoad(callback: () => void): void;
  offLoad(callback: () => void): void;
  onError(callback: (err: unknown) => void): void;
  offError(callback: (err: unknown) => void): void;
  onClose(callback: (res: WXRewardedVideoCloseResult) => void): void;
  offClose(callback: (res: WXRewardedVideoCloseResult) => void): void;
}

interface WXInterstitialAd {
  show(): Promise<void>;
}

export class WXAdapter implements PlatformAdapter {
  private bannerAd: WXBannerAd | null = null;
  private rewardedVideoAd: WXRewardedVideoAd | null = null;

  async init(): Promise<void> {
    logger.info('WXAdapter', '微信环境初始化');
  }

  async login(): Promise<{ code: string }> {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res: WXLoginResult) => resolve({ code: res.code }),
        fail: reject,
      });
    });
  }

  async getUserInfo(): Promise<{ nickName: string; avatarUrl: string }> {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res: WXUserProfileResult) => resolve({
          nickName: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl,
        }),
        fail: reject,
      });
    });
  }

  async share(title: string, imageUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.shareAppMessage({
        title,
        imageUrl,
        success: resolve,
        fail: reject,
      });
    });
  }

  async showRewardedVideo(adUnitId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.rewardedVideoAd) {
        this.rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId });
      }

      const onLoad = () => {
        this.rewardedVideoAd!.show().catch((err: unknown) => {
          logger.error('Ad', '激励视频展示失败:', err);
          cleanup();
          resolve(false);
        });
      };

      const onError = (err: unknown) => {
        logger.error('Ad', '激励视频错误:', err);
        cleanup();
        resolve(false);
      };

      const onClose = (res: WXRewardedVideoCloseResult) => {
        cleanup();
        resolve(res && res.isEnded);
      };

      const cleanup = () => {
        this.rewardedVideoAd!.offLoad(onLoad);
        this.rewardedVideoAd!.offError(onError);
        this.rewardedVideoAd!.offClose(onClose);
      };

      this.rewardedVideoAd?.onLoad(onLoad);
      this.rewardedVideoAd?.onError(onError);
      this.rewardedVideoAd?.onClose(onClose);

      this.rewardedVideoAd?.show().catch(() => {
        this.rewardedVideoAd?.load().catch((err: unknown) => {
          logger.error('Ad', '激励视频加载失败:', err);
          cleanup();
          resolve(false);
        });
      });
    });
  }

  async showInterstitialAd(adUnitId: string): Promise<void> {
    const interstitialAd: WXInterstitialAd = wx.createInterstitialAd({ adUnitId });
    interstitialAd.show().catch((err: unknown) => {
      logger.error('Ad', '插屏广告错误:', err);
    });
  }

  async showBannerAd(adUnitId: string): Promise<void> {
    const systemInfo = await this.getSystemInfo();
    this.bannerAd = wx.createBannerAd({
      adUnitId,
      style: {
        left: 0,
        top: systemInfo.windowHeight,
        width: systemInfo.windowWidth,
      },
    });
    this.bannerAd?.onResize((size: WXBannerAdResizeResult) => {
      if (this.bannerAd) {
        this.bannerAd.style.top = systemInfo.windowHeight - size.height;
        this.bannerAd.style.left = (systemInfo.windowWidth - size.width) / 2;
      }
    });
    this.bannerAd?.show().catch((err: unknown) => {
      logger.error('Ad', 'Banner广告展示失败:', err);
    });
  }

  async hideBannerAd(): Promise<void> {
    if (this.bannerAd) {
      this.bannerAd.hide();
    }
  }

  async requestPayment(orderInfo: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        ...orderInfo,
        success: resolve,
        fail: reject,
      });
    });
  }

  async setStorage(key: string, data: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.setStorage({
        key,
        data,
        success: resolve,
        fail: reject,
      });
    });
  }

  async getStorage<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      wx.getStorage({
        key,
        success: (res: WXStorageResult<T>) => resolve(res.data),
        fail: () => resolve(null),
      });
    });
  }

  async removeStorage(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.removeStorage({
        key,
        success: resolve,
        fail: reject,
      });
    });
  }

  async getSystemInfo(): Promise<WXSystemInfo> {
    return new Promise((resolve, reject) => {
      wx.getSystemInfo({
        success: resolve,
        fail: reject,
      });
    });
  }

  vibrateShort(): void {
    wx.vibrateShort({ type: 'light' });
  }

  vibrateLong(): void {
    wx.vibrateLong();
  }

  getPlatform(): string {
    return 'wechat';
  }
}
