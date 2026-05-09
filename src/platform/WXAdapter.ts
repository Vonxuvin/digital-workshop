import { PlatformAdapter } from './PlatformAdapter';

declare const wx: any;

export class WXAdapter implements PlatformAdapter {
  private bannerAd: any = null;

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
    wx.showShareMenu({ withShareTicket: true });
    wx.onShareAppMessage(() => ({
      title,
      imageUrl,
    }));
  }

  async showRewardedVideo(adUnitId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId });
      rewardedVideoAd.onLoad(() => console.log('[Ad] 激励视频加载成功'));
      rewardedVideoAd.onError((err: any) => {
        console.error('[Ad] 激励视频错误:', err);
        resolve(false);
      });
      rewardedVideoAd.onClose((res: any) => {
        resolve(res && res.isEnded);
      });
      rewardedVideoAd.show().catch(() => {
        rewardedVideoAd.load().then(() => rewardedVideoAd.show());
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
        top: systemInfo.windowHeight - 100,
        width: systemInfo.windowWidth,
      },
    });
    this.bannerAd.show();
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
    wx.setStorageSync(key, data);
  }

  async getStorage<T>(key: string): Promise<T | null> {
    try {
      return wx.getStorageSync(key) as T;
    } catch {
      return null;
    }
  }

  async removeStorage(key: string): Promise<void> {
    wx.removeStorageSync(key);
  }

  async getSystemInfo(): Promise<any> {
    return new Promise((resolve) => {
      wx.getSystemInfo({ success: resolve });
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
