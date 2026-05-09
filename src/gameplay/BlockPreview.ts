import { Container, Graphics } from 'pixi.js';
import { BLOCK_CONFIGS } from './Block';

export class BlockPreview extends Container {
  private graphics: Graphics;
  private currentValue: number = 1;
  private targetX: number = 0;

  constructor() {
    super();
    this.graphics = new Graphics();
    this.addChild(this.graphics);
    this.visible = false;
  }

  show(value: number, x: number, y: number): void {
    this.currentValue = value;
    this.targetX = x;
    this.x = x;
    this.y = y;
    this.visible = true;
    this.draw();
  }

  hide(): void {
    this.visible = false;
  }

  updatePosition(x: number): void {
    this.targetX = x;
    this.x = x;
  }

  private draw(): void {
    const config = BLOCK_CONFIGS[this.currentValue] || BLOCK_CONFIGS[1];
    this.graphics.clear();

    const segments = 16;
    const radius = config.radius;
    for (let i = 0; i < segments; i += 2) {
      const startAngle = (i / segments) * Math.PI * 2;
      const endAngle = ((i + 1) / segments) * Math.PI * 2;
      this.graphics.arc(0, 0, radius, startAngle, endAngle);
      this.graphics.stroke({ width: 2, color: config.color, alpha: 0.6 });
    }

    this.graphics.moveTo(0, radius);
    this.graphics.lineTo(0, 300);
    this.graphics.stroke({ width: 1, color: 0xffffff, alpha: 0.3 });
  }

  getTargetX(): number {
    return this.targetX;
  }

  getValue(): number {
    return this.currentValue;
  }
}
