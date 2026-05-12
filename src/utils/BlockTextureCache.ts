import { Application, Graphics, Text, Sprite, Texture, Container } from 'pixi.js';
import { BlockConfig, BLOCK_CONFIGS, getBlockConfig } from '../gameplay/Block';

export class BlockTextureCache {
  private static instance: BlockTextureCache | null = null;
  private textures: Map<string, Texture> = new Map();
  private app: Application | null = null;

  constructor() {}

  static setInstance(instance: BlockTextureCache): void {
    BlockTextureCache.instance = instance;
  }

  static getInstance(): BlockTextureCache {
    if (!BlockTextureCache.instance) {
      BlockTextureCache.instance = new BlockTextureCache();
    }
    return BlockTextureCache.instance;
  }

  static resetInstance(): void {
    if (BlockTextureCache.instance) {
      BlockTextureCache.instance.destroy();
    }
    BlockTextureCache.instance = null;
  }

  setApp(app: Application): void {
    this.app = app;
  }

  getTexture(value: number, isRainbow: boolean = false): Texture {
    const key = isRainbow ? `rainbow_${value}` : `block_${value}`;
    if (this.textures.has(key)) {
      return this.textures.get(key)!;
    }

    const texture = this.createTexture(value, isRainbow);
    this.textures.set(key, texture);
    return texture;
  }

  private createTexture(value: number, isRainbow: boolean): Texture {
    const config = getBlockConfig(value);
    const padding = 4;
    const size = (config.radius + padding) * 2;

    const container = new Container();

    const graphics = new Graphics();
    if (isRainbow) {
      graphics.circle(size / 2, size / 2, config.radius + 2);
      graphics.fill({ color: 0xffffff, alpha: 0.3 });
      graphics.circle(size / 2, size / 2, config.radius);
      graphics.fill({ color: 0xFF69B4 });
      graphics.circle(
        size / 2 - config.radius * 0.25,
        size / 2 - config.radius * 0.25,
        config.radius * 0.35
      );
      graphics.fill({ color: 0xFFD700, alpha: 0.6 });
    } else {
      graphics.circle(size / 2, size / 2, config.radius + 2);
      graphics.fill({ color: config.color, alpha: 0.3 });
      graphics.circle(size / 2, size / 2, config.radius);
      graphics.fill(config.color);
      graphics.circle(
        size / 2 - config.radius * 0.3,
        size / 2 - config.radius * 0.3,
        config.radius * 0.25
      );
      graphics.fill({ color: 0xffffff, alpha: 0.3 });
    }
    container.addChild(graphics);

    const valueText = new Text({
      text: String(value),
      style: {
        fontFamily: 'Arial',
        fontSize: config.radius * 0.8,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    valueText.anchor.set(0.5);
    valueText.x = size / 2;
    valueText.y = size / 2;
    container.addChild(valueText);

    const renderer = this.app?.renderer;
    if (!renderer) {
      throw new Error('[BlockTextureCache] Application renderer not available');
    }

    const texture = renderer.generateTexture({
      target: container,
      resolution: renderer.resolution,
    });

    container.destroy({ children: true });

    return texture;
  }

  preload(values: number[]): void {
    for (const value of values) {
      this.getTexture(value, false);
      this.getTexture(value, true);
    }
  }

  destroy(): void {
    for (const texture of this.textures.values()) {
      texture.destroy(true);
    }
    this.textures.clear();
    this.app = null;
  }
}
