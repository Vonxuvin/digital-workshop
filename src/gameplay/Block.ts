import { Container, Graphics, Text } from 'pixi.js';
import Matter from 'matter-js';

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
};

export class Block extends Container {
  public body: Matter.Body;
  public value: number;
  private config: BlockConfig;
  private graphics: Graphics;
  private valueText: Text;

  constructor(body: Matter.Body, value: number) {
    super();
    this.body = body;
    this.value = value;
    this.config = BLOCK_CONFIGS[value] || BLOCK_CONFIGS[1];

    this.graphics = new Graphics();
    this.drawBlock();
    this.addChild(this.graphics);

    this.valueText = new Text({
      text: String(value),
      style: {
        fontFamily: 'Arial',
        fontSize: this.config.radius * 0.8,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.valueText.anchor.set(0.5);
    this.addChild(this.valueText);

    this.syncFromBody();
  }

  private drawBlock(): void {
    this.graphics.clear();
    this.graphics.circle(0, 0, this.config.radius + 2);
    this.graphics.fill({ color: this.config.color, alpha: 0.3 });
    this.graphics.circle(0, 0, this.config.radius);
    this.graphics.fill(this.config.color);
    this.graphics.circle(-this.config.radius * 0.3, -this.config.radius * 0.3, this.config.radius * 0.25);
    this.graphics.fill({ color: 0xffffff, alpha: 0.3 });
  }

  syncFromBody(): void {
    this.x = this.body.position.x;
    this.y = this.body.position.y;
    this.rotation = this.body.angle;
  }

  getConfig(): BlockConfig {
    return this.config;
  }

  destroy(): void {
    this.graphics.destroy();
    this.valueText.destroy();
    super.destroy();
  }
}
