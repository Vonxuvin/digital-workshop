import { PlatformAdapter } from './PlatformAdapter';

declare const wx: any;

export class WXAdapter implements PlatformAdapter {
  private bannerAd: any = null;
  private rewardedVideoAd: any = null;

  async init(): Promise<void> {
    console.log('[WXAdapter] 微信环境初始化');
  }

  async login(): Promise<{ code: string }> {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res: any) => resolve({ code: res.code }),
        fail: reject,
      });
    });
  }

  async getUserInfo(): Promise<{ nickName: string; avatarUrl: string }> {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res: any) => resolve({
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
    return new Promise((resolve, reject) => {
      if (!this.rewardedVideoAd) {
        this.rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId });
      }

      const onLoad = () => {
        this.rewardedVideoAd.show().catch((err: any) => {
          console.error('[Ad] 激励视频展示失败:', err);
          cleanup();
          resolve(false);
        });
      };

      const onError = (err: any) => {
        console.error('[Ad] 激励视频错误:', err);
        cleanup();
        resolve(false);
      };

      const onClose = (res: any) => {
        cleanup();
        resolve(res && res.isEnded);
      };

      const cleanup = () => {
        this.rewardedVideoAd.offLoad(onLoad);
        this.rewardedVideoAd.offError(onError);
        this.rewardedVideoAd.offClose(onClose);
      };

      this.rewardedVideoAd.onLoad(onLoad);
      this.rewardedVideoAd.onError(onError);
      this.rewardedVideoAd.onClose(onClose);

      this.rewardedVideoAd.show().catch(() => {
        this.rewardedVideoAd.load().catch((err: any) => {
          console.error('[Ad] 激励视频加载失败:', err);
          cleanup();
          resolve(false);
        });
      });
    });
  }

  async showInterstitialAd(adUnitId: string): Promise<void> {
    const interstitialAd = wx.createInterstitialAd({ adUnitId });
    interstitialAd.show().catch((err: any) => {
      console.error('[Ad] 插屏广告错误:', err);
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
    this.bannerAd.onResize((size: any) => {
      if (this.bannerAd) {
        this.bannerAd.style.top = systemInfo.windowHeight - size.height;
        this.bannerAd.style.left = (systemInfo.windowWidth - size.width) / 2;
      }
    });
    this.bannerAd.show().catch((err: any) => {
      console.error('[Ad] Banner广告展示失败:', err);
    });
  }

  async hideBannerAd(): Promise<void> {
    if (this.bannerAd) {
      this.bannerAd.hide();
    }
  }

  async requestPayment(orderInfo: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        ...orderInfo as any,
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
        success: (res: any) => resolve(res.data as T),
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

  async getSystemInfo(): Promise<any> {
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
