import { Container, Graphics, Text } from 'pixi.js';
import { eventBus } from '../../utils/EventBus';

export interface WarningConfig {
  warningThreshold: number;
  speedThreshold: number;
  gracePeriod: number;
}

const DEFAULT_WARNING_CONFIG: WarningConfig = {
  warningThreshold: 5000,
  speedThreshold: 3,
  gracePeriod: 1000,
};

export class WarningLine extends Container {
  private graphics: Graphics;
  private countdownText: Text;
  private containerHeight: number;
  private containerWidth: number;
  private isWarning = false;
  private flashTimer = 0;
  private warningDuration = 0;
  private readonly WARNING_THRESHOLD: number;
  private readonly SPEED_THRESHOLD: number;
  private readonly GRACE_PERIOD: number;
  private graceTimer = 0;
  private disabled = false;
  private config: WarningConfig;

  private currentColor: number = 0xff4444;
  private currentAlpha: number = 0.8;

  constructor(containerHeight: number, containerWidth: number = 800, config?: Partial<WarningConfig>) {
    super();
    this.containerHeight = containerHeight;
    this.containerWidth = containerWidth;
    this.config = { ...DEFAULT_WARNING_CONFIG, ...config };
    this.WARNING_THRESHOLD = this.config.warningThreshold;
    this.SPEED_THRESHOLD = this.config.speedThreshold;
    this.GRACE_PERIOD = this.config.gracePeriod;

    this.graphics = new Graphics();
    this.addChild(this.graphics);

    this.countdownText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xff4444,
        fontWeight: 'bold',
      },
    });
    this.countdownText.anchor.set(0.5, 0);
    this.countdownText.x = this.containerWidth / 2;
    this.countdownText.y = 8;
    this.countdownText.visible = false;
    this.addChild(this.countdownText);

    this.drawLine();
  }

  private drawLine(color: number = 0xff4444, alpha: number = 0.8): void {
    this.currentColor = color;
    this.currentAlpha = alpha;
    this.graphics.clear();

    this.graphics.moveTo(0, 0);
    this.graphics.lineTo(this.containerWidth, 0);
    this.graphics.stroke({ width: 2, color, alpha });

    for (let i = 0; i < this.containerWidth; i += 20) {
      this.graphics.moveTo(i, -5);
      this.graphics.lineTo(i + 10, -5);
    }
    this.graphics.stroke({ width: 2, color, alpha: alpha * 0.6 });
  }

  update(blocks: { y: number; radius: number; speed: number }[], deltaMS: number): void {
    if (this.disabled) return;

    const warningY = this.y;
    const hasBlockAboveLine = blocks.some(block =>
      block.y - block.radius < warningY && block.speed < this.SPEED_THRESHOLD
    );

    if (hasBlockAboveLine) {
      this.graceTimer = 0;
      if (!this.isWarning) {
        this.isWarning = true;
        this.warningDuration = 0;
        eventBus.emit('warning:started');
      }
      this.warningDuration += deltaMS;

      this.flashTimer += deltaMS * 0.005;
      this.updateVisualFeedback();

      if (this.warningDuration >= this.WARNING_THRESHOLD) {
        this.disabled = true;
        eventBus.emit('game:over');
        this.isWarning = false;
        this.countdownText.visible = false;
      }
    } else {
      if (this.isWarning) {
        this.graceTimer += deltaMS;
        if (this.graceTimer >= this.GRACE_PERIOD) {
          this.isWarning = false;
          this.warningDuration = 0;
          this.graceTimer = 0;
          this.countdownText.visible = false;
          eventBus.emit('warning:ended');
        }
      }
      this.drawLine(0xff4444, 0.8);
    }
  }

  private updateVisualFeedback(): void {
    const progress = this.warningDuration / this.WARNING_THRESHOLD;

    if (progress < 0.3) {
      const alpha = 0.5 + Math.sin(this.flashTimer * 2) * 0.2;
      this.drawLine(0xffff44, alpha);
    } else if (progress < 0.7) {
      const alpha = 0.4 + Math.sin(this.flashTimer * 4) * 0.4;
      this.drawLine(0xff8844, alpha);
      this.showCountdown();
    } else {
      const alpha = 0.3 + Math.sin(this.flashTimer * 8) * 0.5;
      this.drawLine(0xff2222, alpha);
      this.showCountdown();
    }
  }

  private showCountdown(): void {
    const remaining = Math.max(0, Math.ceil((this.WARNING_THRESHOLD - this.warningDuration) / 1000));
    this.countdownText.text = `${remaining}s`;
    this.countdownText.visible = true;
  }

  getWarningHeight(): number {
    return this.y;
  }

  getWarningDuration(): number {
    return this.warningDuration;
  }

  getWarningProgress(): number {
    return this.warningDuration / this.WARNING_THRESHOLD;
  }

  reset(): void {
    this.isWarning = false;
    this.warningDuration = 0;
    this.flashTimer = 0;
    this.graceTimer = 0;
    this.drawLine(0xff4444, 0.8);
    this.countdownText.visible = false;
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    if (disabled) {
      this.isWarning = false;
      this.warningDuration = 0;
      this.drawLine(0xff4444, 0.8);
      this.countdownText.visible = false;
    }
  }

  getGraphics(): Graphics {
    return this.graphics;
  }

  setColor(color: number): void {
    this.drawLine(color, this.currentAlpha);
  }

  getColor(): number {
    return this.currentColor;
  }

  setAlpha(alpha: number): void {
    this.drawLine(this.currentColor, alpha);
  }

  getAlpha(): number {
    return this.currentAlpha;
  }
}