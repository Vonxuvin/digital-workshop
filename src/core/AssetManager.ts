import { Assets } from 'pixi.js';

export class AssetManager {
  private loaded: Set<string> = new Set();
  private loading = false;

  async loadBundle(bundleId: string): Promise<void> {
    if (this.loaded.has(bundleId) || this.loading) return;
    this.loading = true;
    try {
      await Assets.loadBundle(bundleId);
      this.loaded.add(bundleId);
    } catch (error) {
      console.error(`[AssetManager] 加载资源包失败: ${bundleId}`, error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  async loadSingle(alias: string, src: string): Promise<any> {
    if (this.loaded.has(alias)) {
      return Assets.get(alias);
    }
    const asset = await Assets.load({ alias, src });
    this.loaded.add(alias);
    return asset;
  }

  get<T = any>(alias: string): T {
    return Assets.get(alias);
  }

  isLoaded(alias: string): boolean {
    return this.loaded.has(alias);
  }

  unload(alias: string): void {
    Assets.unload(alias);
    this.loaded.delete(alias);
  }

  unloadAll(): void {
    this.loaded.forEach(alias => Assets.unload(alias));
    this.loaded.clear();
  }
}
