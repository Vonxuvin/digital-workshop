import { logger } from '../utils/Logger';
import { Assets } from 'pixi.js';

export class AssetManager {
  private loaded: Set<string> = new Set();
  private loadingBundles: Map<string, Promise<void>> = new Map();

  async loadBundle(bundleId: string): Promise<void> {
    if (this.loaded.has(bundleId)) return;
    const existing = this.loadingBundles.get(bundleId);
    if (existing) return existing;

    const promise = (async () => {
      try {
        await Assets.loadBundle(bundleId);
        this.loaded.add(bundleId);
      } catch (error) {
        logger.error('AssetManager', `加载资源包失败: ${bundleId}`, error);
        throw error;
      } finally {
        this.loadingBundles.delete(bundleId);
      }
    })();

    this.loadingBundles.set(bundleId, promise);
    return promise;
  }

  async loadSingle(alias: string, src: string): Promise<any> {
    if (this.loaded.has(alias)) {
      return Assets.get(alias);
    }
    try {
      const asset = await Assets.load({ alias, src });
      this.loaded.add(alias);
      return asset;
    } catch (error) {
      logger.error('AssetManager', `加载资源失败: ${alias}`, error);
      throw error;
    }
  }

  get<T = any>(alias: string): T | undefined {
    if (!this.loaded.has(alias)) {
      logger.warn('AssetManager', `资源未加载: ${alias}`);
      return undefined;
    }
    return Assets.get(alias);
  }

  isLoaded(alias: string): boolean {
    return this.loaded.has(alias);
  }

  async unload(alias: string): Promise<void> {
    try {
      await Assets.unload(alias);
    } catch (error) {
      logger.error('AssetManager', `卸载资源失败: ${alias}`, error);
    }
    this.loaded.delete(alias);
  }

  async unloadAll(): Promise<void> {
    const aliases = Array.from(this.loaded);
    this.loaded.clear();
    for (const alias of aliases) {
      try {
        await Assets.unload(alias);
      } catch (error) {
        logger.error('AssetManager', `卸载资源失败: ${alias}`, error);
      }
    }
  }
}
