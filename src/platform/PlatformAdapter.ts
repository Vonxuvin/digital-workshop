export interface PlatformAdapter {
  init(): Promise<void>;
  login(): Promise<{ code: string }>;
  getUserInfo(): Promise<{ nickName: string; avatarUrl: string }>;
  share(title: string, imageUrl?: string): Promise<void>;
  showRewardedVideo(adUnitId: string): Promise<boolean>;
  showInterstitialAd(adUnitId: string): Promise<void>;
  showBannerAd(adUnitId: string): Promise<void>;
  hideBannerAd(): Promise<void>;
  requestPayment(orderInfo: unknown): Promise<void>;
  setStorage(key: string, data: unknown): Promise<void>;
  getStorage<T>(key: string): Promise<T | null>;
  removeStorage(key: string): Promise<void>;
  getSystemInfo(): Promise<{
    brand: string;
    model: string;
    screenWidth: number;
    screenHeight: number;
    windowWidth: number;
    windowHeight: number;
    pixelRatio: number;
    platform: string;
  }>;
  vibrateShort(): void;
  vibrateLong(): void;
  getPlatform(): string;
  isBrowser?(): boolean;
  mockWxAPI?(): void;
}
