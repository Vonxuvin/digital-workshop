import Matter from 'matter-js';
import * as PIXI from 'pixi.js';
import { Graphics, Container } from 'pixi.js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';
import { AnimationManager } from '../../utils/AnimationManager';

export interface PaddleConfig extends ModifierConfig {
  type: 'paddle';
  side: 'left' | 'right' | 'both';
  mode?: 'extend' | 'slide';
  extendDuration: number;
  retractDuration: number;
  extendLength: number;
  triggerInterval: number;
  xPosition?: number;
  xRange?: number;
  slideSpeed?: number;
  yPosition?: number;
  initialDirection?: 1 | -1;
}

export class PaddleModifier extends ContainerModifier {
  private paddleBody: Matter.Body | null = null;
  private paddleGraphics: Graphics | null = null;
  private side: 'left' | 'right' | 'both';
  private mode: 'extend' | 'slide';
  private extendDuration: number;
  private retractDuration: number;
  private extendLength: number;
  private xPosition: number;
  private xRange: number;
  private slideSpeed: number;
  private yPosition: number;
  private containerWidth: number;
  private containerHeight: number;
  private phase: 'idle' | 'extending' | 'extended' | 'retracting' = 'idle';
  private slideDirection: 1 | -1 = 1;
  private initialDirection: 1 | -1;
  private phaseElapsed: number = 0;
  private cycleAnimationId: string | null = null;
  private idleDelayRemaining: number = 0;
  private idleDelayAnimationId: string | null = null;

  constructor(
    config: PaddleConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number,
    stageContainer?: Container | null
  ) {
    super(config, physics, stageContainer);
    this.side = config.side || 'left';
    this.mode = config.mode || 'extend';
    this.extendDuration = config.extendDuration * 1000;
    this.retractDuration = config.retractDuration * 1000;
    this.extendLength = config.extendLength;
    this.xPosition = config.xPosition ?? containerWidth * 0.5;
    this.xRange = config.xRange ?? 80;
    this.slideSpeed = config.slideSpeed ?? 15;
    this.yPosition = config.yPosition ?? containerHeight * 0.7;
    this.initialDirection = config.initialDirection ?? 1;
    this.slideDirection = this.initialDirection;
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
    console.log(`[PaddleModifier] 激活挡板 mode=${this.mode} side=${this.side} xPosition=${this.xPosition} yPosition=${this.yPosition}`);

    this.cycleAnimationId = AnimationManager.getInstance().register(
      (deltaMS) => this.updateCycle(deltaMS),
      `paddle_cycle_${Date.now()}`
    );
  }

  private createPaddle(): void {
    const paddleWidth = this.extendLength;
    const paddleHeight = 20;

    this.paddleBody = this.physics.createRectangle(
      this.xPosition,
      this.yPosition,
      paddleWidth,
      paddleHeight,
      {
        isStatic: true,
        friction: 0.5,
        restitution: 0.2,
        label: `paddle_${this.side}_${this.mode}`,
      }
    );

    this.paddleGraphics = new Graphics();
    this.paddleGraphics.roundRect(-paddleWidth / 2, -paddleHeight / 2, paddleWidth, paddleHeight, 5);
    const color = this.side === 'left' ? 0xFF6B6B : (this.side === 'right' ? 0x4ECDC4 : 0xFFD93D);
    this.paddleGraphics.fill({ color });
    this.paddleGraphics.stroke({ width: 2, color: 0xFFFFFF });
    this.paddleGraphics.x = this.xPosition;
    this.paddleGraphics.y = this.yPosition;

    if (this.stageContainer) {
      this.stageContainer.addChild(this.paddleGraphics);
    }
  }

  private updateCycle(deltaMS: number): void {
    this.phaseElapsed += deltaMS;

    if (this.mode === 'slide') {
      this.updateSlideMode(deltaMS);
      return;
    }

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
          const delay = (this.config.triggerInterval || 5) * 1000 - this.extendDuration - this.retractDuration - 1000;
          this.idleDelayRemaining = Math.max(0, delay);
          if (this.idleDelayRemaining > 0) {
            this.idleDelayAnimationId = AnimationManager.getInstance().register(
              (deltaMS) => this.tickIdleDelay(deltaMS),
              `paddle_idle_${Date.now()}`
            );
          } else {
            this.beginNextCycle();
          }
        }
        break;
    }

    this.updatePaddlePosition();
  }

  private updateSlideMode(deltaMS: number): void {
    const dt = deltaMS / 1000;
    this.xPosition += this.slideSpeed * this.slideDirection * dt * 60;

    const minX = this.xRange;
    const maxX = this.containerWidth - this.xRange;

    if (this.xPosition >= maxX) {
      this.xPosition = maxX;
      this.slideDirection = -1;
    } else if (this.xPosition <= minX) {
      this.xPosition = minX;
      this.slideDirection = 1;
    }

    this.updatePaddlePosition();
  }

  private updatePaddlePosition(): void {
    if (!this.paddleBody && !this.paddleGraphics) return;

    let targetX = this.xPosition;
    let targetY = this.yPosition;

    if (this.mode === 'extend') {
      const wallThickness = 10;
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
    }

    if (this.paddleBody) {
      Matter.Body.setPosition(this.paddleBody, {
        x: targetX,
        y: targetY,
      });
    }
    if (this.paddleGraphics) {
      this.paddleGraphics.x = targetX;
      this.paddleGraphics.y = targetY;
    }
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  private tickIdleDelay(deltaMS: number): void {
    this.idleDelayRemaining -= deltaMS;
    if (this.idleDelayRemaining <= 0) {
      if (this.idleDelayAnimationId) {
        AnimationManager.getInstance().unregister(this.idleDelayAnimationId);
        this.idleDelayAnimationId = null;
      }
      this.beginNextCycle();
    }
  }

  private beginNextCycle(): void {
    if (this.state.isActive) {
      this.phase = 'extending';
      this.phaseElapsed = 0;
      this.createPaddle();
    }
  }

  private removePaddle(): void {
    if (this.paddleBody) {
      this.physics.removeBody(this.paddleBody);
      this.paddleBody = null;
    }
    if (this.paddleGraphics) {
      if (this.stageContainer && this.paddleGraphics.parent) {
        this.stageContainer.removeChild(this.paddleGraphics);
      }
      this.paddleGraphics.destroy();
      this.paddleGraphics = null;
    }
  }

  protected onTick(_deltaMS: number): void {
  }

  protected onDeactivate(): void {
    this.removePaddle();
    if (this.cycleAnimationId) {
      AnimationManager.getInstance().unregister(this.cycleAnimationId);
      this.cycleAnimationId = null;
    }
    if (this.idleDelayAnimationId) {
      AnimationManager.getInstance().unregister(this.idleDelayAnimationId);
      this.idleDelayAnimationId = null;
    }
    this.phase = 'idle';
  }

  destroy(): void {
    super.destroy();
    this.removePaddle();
    if (this.cycleAnimationId) {
      AnimationManager.getInstance().unregister(this.cycleAnimationId);
      this.cycleAnimationId = null;
    }
    if (this.idleDelayAnimationId) {
      AnimationManager.getInstance().unregister(this.idleDelayAnimationId);
      this.idleDelayAnimationId = null;
    }
  }
}
