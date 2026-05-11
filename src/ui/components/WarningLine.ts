import { Container, Graphics } from 'pixi.js';
import { eventBus } from '../../utils/EventBus';

export class WarningLine extends Container {
  private graphics: Graphics;
  private containerHeight: number;
  private containerWidth: number;
  private isWarning = false;
  private flashTimer = 0;
  private warningDuration = 0;
  private readonly WARNING_THRESHOLD = 3000;

  constructor(containerHeight: number, containerWidth: number = 800) {
    super();
    this.containerHeight = containerHeight;
    this.containerWidth = containerWidth;

    this.graphics = new Graphics();
    this.addChild(this.graphics);
    this.drawLine();
  }

  private drawLine(): void {
    this.graphics.clear();

    this.graphics.moveTo(0, 0);
    this.graphics.lineTo(this.containerWidth, 0);
    this.graphics.stroke({ width: 2, color: 0xff4444, alpha: 0.8 });

    for (let i = 0; i < this.containerWidth; i += 20) {
      this.graphics.moveTo(i, -5);
      this.graphics.lineTo(i + 10, -5);
    }
    this.graphics.stroke({ width: 2, color: 0xff4444, alpha: 0.5 });
  }

  update(blocks: { y: number; radius: number; speed: number }[], deltaMS: number): void {
    const warningY = this.y;
    const hasBlockAboveLine = blocks.some(block =>
      block.y - block.radius < warningY && block.speed < 2
    );

    if (hasBlockAboveLine) {
      if (!this.isWarning) {
        this.isWarning = true;
        this.warningDuration = 0;
        eventBus.emit('warning:started');
      }
      this.warningDuration += deltaMS;

      this.flashTimer += deltaMS * 0.005;
      const alpha = 0.3 + Math.sin(this.flashTimer) * 0.3;
      this.graphics.alpha = alpha;

      if (this.warningDuration >= this.WARNING_THRESHOLD) {
        eventBus.emit('game:over');
        this.isWarning = false;
      }
    } else {
      if (this.isWarning) {
        this.isWarning = false;
        this.warningDuration = 0;
        eventBus.emit('warning:ended');
      }
      this.graphics.alpha = 0.8;
    }
  }

  getWarningHeight(): number {
    return this.y;
  }

  getWarningDuration(): number {
    return this.warningDuration;
  }

  reset(): void {
    this.isWarning = false;
    this.warningDuration = 0;
    this.flashTimer = 0;
    this.graphics.alpha = 0.8;
  }
}
