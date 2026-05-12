import { Container, Sprite } from 'pixi.js';
import Matter from 'matter-js';
import { BlockTextureCache } from '../utils/BlockTextureCache';

export interface BlockConfig {
  value: number;
  color: number;
  radius: number;
  mass: number;
}

export const BLOCK_CONFIGS: Record<number, BlockConfig> = {
  1: { value: 1, color: 0xFF6B6B, radius: 20, mass: 1 },
  2: { value: 2, color: 0x4ECDC4, radius: 22, mass: 2 },
  4: { value: 4, color: 0x45B7D1, radius: 25, mass: 4 },
  8: { value: 8, color: 0x96CEB4, radius: 28, mass: 8 },
  16: { value: 16, color: 0xFFEAA7, radius: 32, mass: 16 },
  32: { value: 32, color: 0xDDA0DD, radius: 36, mass: 32 },
  64: { value: 64, color: 0x98D8C8, radius: 40, mass: 64 },
  128: { value: 128, color: 0xFF8C94, radius: 44, mass: 128 },
  256: { value: 256, color: 0xFFD700, radius: 48, mass: 256 },
  512: { value: 512, color: 0xE74C3C, radius: 52, mass: 512 },
  1024: { value: 1024, color: 0x8E44AD, radius: 56, mass: 1024 },
  2048: { value: 2048, color: 0xF39C12, radius: 60, mass: 2048 },
};

export function getBlockConfig(value: number): BlockConfig {
  if (value <= 0 || !Number.isFinite(value)) return BLOCK_CONFIGS[1];
  if (BLOCK_CONFIGS[value]) return BLOCK_CONFIGS[value];
  const tier = Math.log2(value);
  if (!Number.isFinite(tier)) return BLOCK_CONFIGS[1];
  const hue = (tier * 30) % 360;
  const color = hslToHex(hue, 70, 60);
  const radius = Math.min(60, 40 + tier * 2);
  return { value, color, radius, mass: value };
}

function hslToHex(h: number, s: number, l: number): number {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

export class Block extends Container {
  public body: Matter.Body;
  public value: number;
  private config: BlockConfig;
  private sprite: Sprite;
  private _destroyed: boolean = false;
  public isRainbow: boolean = false;

  constructor(body: Matter.Body, value: number, isRainbow: boolean = false) {
    super();
    this.body = body;
    this.value = value;
    this.isRainbow = isRainbow;
    this.config = getBlockConfig(value);

    const cache = BlockTextureCache.getInstance();
    const texture = cache.getTexture(value, isRainbow);
    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);

    const padding = 4;
    const textureSize = (this.config.radius + padding) * 2;
    this.sprite.width = textureSize;
    this.sprite.height = textureSize;

    this.addChild(this.sprite);

    this.syncFromBody();
  }

  syncFromBody(): void {
    if (this._destroyed) return;
    if (this.body.isSleeping) return;
    this.x = this.body.position.x;
    this.y = this.body.position.y;
    this.rotation = this.body.angle;
  }

  getConfig(): BlockConfig {
    return this.config;
  }

  get isDestroyed(): boolean {
    return this._destroyed;
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.sprite.destroy();
    super.destroy();
  }
}
