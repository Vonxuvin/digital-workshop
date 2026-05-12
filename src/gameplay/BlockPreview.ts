import { Container, Graphics } from 'pixi.js';
import { BLOCK_CONFIGS } from './Block';

export class BlockPreview extends Container {
  private graphics: Graphics;
  private currentValue: number = 1;
  private targetX: number = 0;
  private trajectoryLength: number = 500;
  private groundY: number = 600;
  private minX: number = -Infinity;
  private maxX: number = Infinity;

  constructor() {
    super();
    this.graphics = new Graphics();
    this.addChild(this.graphics);
    this.visible = false;
  }

  setGroundY(y: number): void {
    this.groundY = y;
  }

  setBounds(minX: number, maxX: number): void {
    this.minX = minX;
    this.maxX = maxX;
  }

  show(value: number, x: number, y: number): void {
    this.currentValue = value;
    const config = BLOCK_CONFIGS[this.currentValue] || BLOCK_CONFIGS[1];
    this.targetX = Math.max(this.minX + config.radius, Math.min(this.maxX - config.radius, x));
    this.x = this.targetX;
    this.y = y;
    this.trajectoryLength = Math.max(0, this.groundY - y);
    this.visible = true;
    this.draw();
  }

  hide(): void {
    this.visible = false;
  }

  updatePosition(x: number): void {
    const config = BLOCK_CONFIGS[this.currentValue] || BLOCK_CONFIGS[1];
    this.targetX = Math.max(this.minX + config.radius, Math.min(this.maxX - config.radius, x));
    this.x = this.targetX;
  }

  setNextValue(value: number): void {
    this.currentValue = value;
    if (this.visible) {
      this.draw();
    }
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

    const dashLength = 12;
    const gapLength = 8;
    let currentY = radius + 4;
    while (currentY < this.trajectoryLength) {
      const endY = Math.min(currentY + dashLength, this.trajectoryLength);
      this.graphics.moveTo(0, currentY);
      this.graphics.lineTo(0, endY);
      this.graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.4 });
      currentY = endY + gapLength;
    }
  }

  getTargetX(): number {
    return this.targetX;
  }

  getValue(): number {
    return this.currentValue;
  }
}
