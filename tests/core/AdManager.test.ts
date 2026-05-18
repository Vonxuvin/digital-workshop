import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdManager } from '../../src/core/AdManager';
import { PlatformAdapter } from '../../src/platform/PlatformAdapter';

describe('AdManager', () => {
  let adManager: AdManager;
  let mockPlatform: PlatformAdapter;

  beforeEach(() => {
    mockPlatform = {
      init: vi.fn().mockResolvedValue(undefined),
      showRewardedVideo: vi.fn().mockResolvedValue(true),
      showInterstitialAd: vi.fn().mockResolvedValue(undefined),
      showBannerAd: vi.fn().mockResolvedValue(undefined),
      hideBannerAd: vi.fn().mockResolvedValue(undefined),
    } as unknown as PlatformAdapter;

    adManager = new AdManager(mockPlatform);
  });

  it('should create with default config', () => {
    expect(adManager).toBeDefined();
  });

  it('should create with custom config', () => {
    const customManager = new AdManager(mockPlatform, {
      rewardedVideoUnitId: 'custom-rewarded',
      interstitialUnitId: 'custom-interstitial',
    });
    expect(customManager).toBeDefined();
  });

  it('should return false for isAdPlaying initially', () => {
    expect(adManager.isAdPlaying()).toBe(false);
  });

  describe('showRewardedVideo', () => {
    it('should return true when ad is watched completely', async () => {
      const result = await adManager.showRewardedVideo();
      expect(result).toBe(true);
    });

    it('should return false when ad is not watched completely', async () => {
      (mockPlatform.showRewardedVideo as any).mockResolvedValue(false);
      const result = await adManager.showRewardedVideo();
      expect(result).toBe(false);
    });

    it('should return false on platform error', async () => {
      (mockPlatform.showRewardedVideo as any).mockRejectedValue(new Error('ad error'));
      const result = await adManager.showRewardedVideo();
      expect(result).toBe(false);
    });

    it('should reject concurrent requests', async () => {
      let resolveFirst: (value: boolean) => void;
      (mockPlatform.showRewardedVideo as any).mockImplementation(() => new Promise<boolean>(resolve => { resolveFirst = resolve; }));
      const first = adManager.showRewardedVideo();
      const second = adManager.showRewardedVideo();
      resolveFirst!(true);
      const results = await Promise.all([first, second]);
      expect(results[0]).toBe(true);
      expect(results[1]).toBe(false);
    });

    it('should reset isAdPlaying after completion', async () => {
      await adManager.showRewardedVideo();
      expect(adManager.isAdPlaying()).toBe(false);
    });

    it('should reset isAdPlaying after error', async () => {
      (mockPlatform.showRewardedVideo as any).mockRejectedValue(new Error('ad error'));
      await adManager.showRewardedVideo();
      expect(adManager.isAdPlaying()).toBe(false);
    });

    it('should pass rewardedVideoUnitId to platform', async () => {
      await adManager.showRewardedVideo();
      expect(mockPlatform.showRewardedVideo).toHaveBeenCalledWith('adunit-rewarded-video');
    });

    it('should pass custom unitId to platform', async () => {
      const customManager = new AdManager(mockPlatform, { rewardedVideoUnitId: 'custom-unit' });
      await customManager.showRewardedVideo();
      expect(mockPlatform.showRewardedVideo).toHaveBeenCalledWith('custom-unit');
    });
  });

  describe('showInterstitial', () => {
    it('should call platform showInterstitialAd', async () => {
      await adManager.showInterstitial();
      expect(mockPlatform.showInterstitialAd).toHaveBeenCalledWith('adunit-interstitial');
    });

    it('should handle platform error gracefully', async () => {
      (mockPlatform.showInterstitialAd as any).mockRejectedValue(new Error('interstitial error'));
      await expect(adManager.showInterstitial()).resolves.not.toThrow();
    });

    it('should pass custom interstitialUnitId', async () => {
      const customManager = new AdManager(mockPlatform, { interstitialUnitId: 'custom-interstitial' });
      await customManager.showInterstitial();
      expect(mockPlatform.showInterstitialAd).toHaveBeenCalledWith('custom-interstitial');
    });
  });

  describe('showBanner', () => {
    it('should call platform showBannerAd', async () => {
      await adManager.showBanner();
      expect(mockPlatform.showBannerAd).toHaveBeenCalledWith('adunit-banner');
    });

    it('should handle platform error gracefully', async () => {
      (mockPlatform.showBannerAd as any).mockRejectedValue(new Error('banner error'));
      await expect(adManager.showBanner()).resolves.not.toThrow();
    });

    it('should pass custom bannerUnitId', async () => {
      const customManager = new AdManager(mockPlatform, { bannerUnitId: 'custom-banner' });
      await customManager.showBanner();
      expect(mockPlatform.showBannerAd).toHaveBeenCalledWith('custom-banner');
    });
  });

  describe('hideBanner', () => {
    it('should call platform hideBannerAd', async () => {
      await adManager.hideBanner();
      expect(mockPlatform.hideBannerAd).toHaveBeenCalled();
    });

    it('should handle platform error gracefully', async () => {
      (mockPlatform.hideBannerAd as any).mockRejectedValue(new Error('hide error'));
      await expect(adManager.hideBanner()).resolves.not.toThrow();
    });
  });

  describe('setConfig', () => {
    it('should update config partially', async () => {
      adManager.setConfig({ rewardedVideoUnitId: 'new-rewarded' });
      await adManager.showRewardedVideo();
      expect(mockPlatform.showRewardedVideo).toHaveBeenCalledWith('new-rewarded');
    });

    it('should preserve other config values when updating partially', async () => {
      adManager.setConfig({ rewardedVideoUnitId: 'new-rewarded' });
      await adManager.showInterstitial();
      expect(mockPlatform.showInterstitialAd).toHaveBeenCalledWith('adunit-interstitial');
    });

    it('should update multiple config values', async () => {
      adManager.setConfig({
        rewardedVideoUnitId: 'new-rewarded',
        interstitialUnitId: 'new-interstitial',
        bannerUnitId: 'new-banner',
      });
      await adManager.showRewardedVideo();
      await adManager.showInterstitial();
      await adManager.showBanner();
      expect(mockPlatform.showRewardedVideo).toHaveBeenCalledWith('new-rewarded');
      expect(mockPlatform.showInterstitialAd).toHaveBeenCalledWith('new-interstitial');
      expect(mockPlatform.showBannerAd).toHaveBeenCalledWith('new-banner');
    });
  });
});
