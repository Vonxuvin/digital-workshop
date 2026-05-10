import Matter from 'matter-js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export interface PaddleConfig extends ModifierConfig {
  type: 'paddle';
  side: 'left' | 'right';
  extendDuration: number;    // 伸出持续时间（秒）
  retractDuration: number;   // 缩回持续时间（秒）
  extendLength: number;      // 伸出长度（像素）
  triggerInterval: number;   // 触发间隔（秒）
  yPosition?: number;        // 挡板Y位置（默认容器中间）
}

export class PaddleModifier extends ContainerModifier {
  private paddleBody: Matter.Body | null = null;
  private paddleGraphics: any = null;
  private side: 'left' | 'right';
  private extendDuration: number;
  private retractDuration: number;
  private extendLength: number;
  private yPosition: number;
  private containerWidth: number;
  private containerHeight: number;
  private phase: 'idle' | 'extending' | 'extended' | 'retracting' = 'idle';
  private phaseElapsed: number = 0;
  private cycleTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    config: PaddleConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number
  ) {
    super(config, physics);
    this.side = config.side;
    this.extendDuration = config.extendDuration * 1000;
    this.retractDuration = config.retractDuration * 1000;
    this.extendLength = config.extendLength;
    this.yPosition = config.yPosition ?? containerHeight * 0.6;
    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;
  }

  getType(): 'paddle' {
    return 'paddle';
  }

  protected onActivate(): void {
    this.startCycle();
  }

  private startCycle(): void {
    this.phase = 'extending';
    this.phaseElapsed = 0;
    this.createPaddle();

    this.cycleTimer = setInterval(() => {
      this.updateCycle();
    }, 16);
  }

  private createPaddle(): void {
    const wallThickness = 10;
    const paddleWidth = this.extendLength;
    const paddleHeight = 20;

    const startX = this.side === 'left'
      ? wallThickness + paddleWidth / 2
      : this.containerWidth - wallThickness - paddleWidth / 2;

    this.paddleBody = this.physics.createRectangle(
      startX,
      this.yPosition,
      paddleWidth,
      paddleHeight,
      {
        isStatic: true,
        friction: 0.5,
        restitution: 0.2,
        label: `paddle_${this.side}`,
      }
    );
  }

  private updateCycle(): void {
    this.phaseElapsed += 16;

    switch (this.phase) {
      case 'extending':
        if (this.phaseElapsed >= this.extendDuration) {
          this.phase = 'extended';
          this.phaseElapsed = 0;
        }
        break;
      case 'extended':
        if (this.phaseElapsed >= 1000) {
          this.phase = 'retracting';
          this.phaseElapsed = 0;
        }
        break;
      case 'retracting':
        if (this.phaseElapsed >= this.retractDuration) {
          this.removePaddle();
          this.phase = 'idle';
          this.phaseElapsed = 0;
          // 等待下一个触发间隔
          setTimeout(() => {
            if (this.state.isActive) {
              this.phase = 'extending';
              this.phaseElapsed = 0;
              this.createPaddle();
            }
          }, (this.config.triggerInterval || 5) * 1000 - this.extendDuration - this.retractDuration - 1000);
        }
        break;
    }

    this.updatePaddlePosition();
  }

  private updatePaddlePosition(): void {
    if (!this.paddleBody) return;

    const wallThickness = 10;
    let targetX: number;

    switch (this.phase) {
      case 'extending': {
        const t = Math.min(1, this.phaseElapsed / this.extendDuration);
        const eased = this.easeOutQuad(t);
        const retractedX = this.side === 'left'
          ? wallThickness - this.extendLength / 2
          : this.containerWidth - wallThickness + this.extendLength / 2;
        const extendedX = this.side === 'left'
          ? wallThickness + this.extendLength / 2
          : this.containerWidth - wallThickness - this.extendLength / 2;
        targetX = retractedX + (extendedX - retractedX) * eased;
        break;
      }
      case 'extended':
        targetX = this.side === 'left'
          ? wallThickness + this.extendLength / 2
          : this.containerWidth - wallThickness - this.extendLength / 2;
        break;
      case 'retracting': {
        const t = Math.min(1, this.phaseElapsed / this.retractDuration);
        const eased = this.easeInQuad(t);
        const extendedX = this.side === 'left'
          ? wallThickness + this.extendLength / 2
          : this.containerWidth - wallThickness - this.extendLength / 2;
        const retractedX = this.side === 'left'
          ? wallThickness - this.extendLength / 2
          : this.containerWidth - wallThickness + this.extendLength / 2;
        targetX = extendedX + (retractedX - extendedX) * eased;
        break;
      }
      default:
        return;
    }

    Matter.Body.setPosition(this.paddleBody, {
      x: targetX,
      y: this.yPosition,
    });
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  private removePaddle(): void {
    if (this.paddleBody) {
      this.physics.removeBody(this.paddleBody);
      this.paddleBody = null;
    }
  }

  protected onTick(): void {
    // 循环逻辑在 cycleTimer 中处理
  }

  protected onDeactivate(): void {
    this.removePaddle();
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
    this.phase = 'idle';
  }

  destroy(): void {
    super.destroy();
    this.removePaddle();
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
  }
}
