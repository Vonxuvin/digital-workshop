import { PlatformAdapter } from './PlatformAdapter';

export class MockAdapter implements PlatformAdapter {
  private storage: Map<string, unknown> = new Map();

  async init(): Promise<void> {
    console.log('[MockAdapter] 本地调试环境初始化');
  }

  async login(): Promise<{ code: string }> {
    return { code: 'mock_code_' + Date.now() };
  }

  async getUserInfo(): Promise<{ nickName: string; avatarUrl: string }> {
    return {
      nickName: '测试用户',
      avatarUrl: '',
    };
  }

  async share(title: string): Promise<void> {
    console.log('[MockAdapter] 分享:', title);
  }

  async showRewardedVideo(): Promise<boolean> {
    console.log('[MockAdapter] 显示激励视频（模拟成功）');
    return true;
  }

  async showInterstitialAd(): Promise<void> {
    console.log('[MockAdapter] 显示插屏广告（模拟）');
  }

  async showBannerAd(): Promise<void> {
    console.log('[MockAdapter] 显示 Banner 广告（模拟）');
  }

  async hideBannerAd(): Promise<void> {
    console.log('[MockAdapter] 隐藏 Banner 广告（模拟）');
  }

  async requestPayment(): Promise<void> {
    console.log('[MockAdapter] 发起支付（模拟成功）');
  }

  async setStorage(key: string, data: unknown): Promise<void> {
    this.storage.set(key, data);
  }

  async getStorage<T>(key: string): Promise<T | null> {
    return (this.storage.get(key) as T) || null;
  }

  async removeStorage(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async getSystemInfo(): Promise<any> {
    return {
      brand: 'browser',
      model: 'desktop',
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      platform: 'devtools',
    };
  }

  vibrateShort(): void {
    console.log('[MockAdapter] 短振动');
  }

  vibrateLong(): void {
    console.log('[MockAdapter] 长振动');
  }

  getPlatform(): string {
    return 'mock';
  }
}
