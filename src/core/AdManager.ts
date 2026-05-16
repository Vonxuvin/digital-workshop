import { PlatformAdapter } from '../platform/PlatformAdapter';

export interface AdConfig {
  rewardedVideoUnitId: string;
  interstitialUnitId: string;
  bannerUnitId: string;
}

const DEFAULT_AD_CONFIG: AdConfig = {
  rewardedVideoUnitId: 'adunit-rewarded-video',
  interstitialUnitId: 'adunit-interstitial',
  bannerUnitId: 'adunit-banner',
};

export class AdManager {
  private platform: PlatformAdapter;
  private config: AdConfig;
  private isShowingRewardedVideo = false;

  constructor(platform: PlatformAdapter, config?: Partial<AdConfig>) {
    this.platform = platform;
    this.config = { ...DEFAULT_AD_CONFIG, ...config };
  }

  setConfig(config: Partial<AdConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async showRewardedVideo(): Promise<boolean> {
    if (this.isShowingRewardedVideo) {
      console.warn('[AdManager] 激励视频正在展示中，忽略重复请求');
      return false;
    }

    this.isShowingRewardedVideo = true;
    console.log('[AdManager] 开始展示激励视频');

    try {
      const result = await this.platform.showRewardedVideo(this.config.rewardedVideoUnitId);
      console.log(`[AdManager] 激励视频结果: ${result ? '完整观看' : '中途退出'}`);
      return result;
    } catch (error) {
      console.error('[AdManager] 激励视频展示失败:', error);
      return false;
    } finally {
      this.isShowingRewardedVideo = false;
    }
  }

  async showInterstitial(): Promise<void> {
    try {
      await this.platform.showInterstitialAd(this.config.interstitialUnitId);
    } catch (error) {
      console.error('[AdManager] 插屏广告展示失败:', error);
    }
  }

  async showBanner(): Promise<void> {
    try {
      await this.platform.showBannerAd(this.config.bannerUnitId);
    } catch (error) {
      console.error('[AdManager] Banner广告展示失败:', error);
    }
  }

  async hideBanner(): Promise<void> {
    try {
      await this.platform.hideBannerAd();
    } catch (error) {
      console.error('[AdManager] Banner广告隐藏失败:', error);
    }
  }

  isAdPlaying(): boolean {
    return this.isShowingRewardedVideo;
  }
}