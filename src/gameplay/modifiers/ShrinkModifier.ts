import { logger } from '../../utils/Logger';
import Matter from 'matter-js';
import * as PIXI from 'pixi.js';
import { Container, Graphics } from 'pixi.js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';
import { eventBus, GameEvents } from '../../utils/EventBus';

export interface ShrinkConfig extends ModifierConfig {
  targetWidth: number;
  shrinkSpeed: number;
  minWidth: number;
}

export class ShrinkModifier extends ContainerModifier {
  private targetWidth: number;
  private shrinkSpeed: number;
  private minWidth: number;
  private originalWidth: number;
  private currentWidth: number;
  private leftWall: Matter.Body | null = null;
  private rightWall: Matter.Body | null = null;
  private leftWallGraphic: Graphics | null = null;
  private rightWallGraphic: Graphics | null = null;
  private containerWidth: number;
  private containerHeight: number;
  private groundY: number;
  private containerOffsetX: number;

  constructor(
    config: ShrinkConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number,
    groundY: number,
    stageContainer?: Container | null,
    containerOffsetX: number = 0
  ) {
    super(config, physics, stageContainer);
    this.targetWidth = config.targetWidth;
    this.shrinkSpeed = config.shrinkSpeed;
    this.minWidth = config.minWidth;
    this.originalWidth = containerWidth;
    this.currentWidth = containerWidth;
    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;
    this.groundY = groundY;
    this.containerOffsetX = containerOffsetX;
  }

  getType(): 'shrink' {
    return 'shrink';
  }

  protected onActivate(): void {
    this.findWalls();
    this.createWallGraphics();
    logger.info('ShrinkModifier', `激活收缩容器, targetWidth=${this.targetWidth}, minWidth=${this.minWidth}`);
  }

  protected showWarning(): void {
    if (!this.stageContainer) return;

    this.warningContainer = new Container();
    const centerX = this.containerOffsetX + this.originalWidth / 2;
    const halfTargetWidth = this.targetWidth / 2;
    const leftTargetX = centerX - halfTargetWidth;
    const rightTargetX = centerX + halfTargetWidth;

    const leftLine = new Graphics();
    leftLine.moveTo(0, 0);
    leftLine.lineTo(0, this.containerHeight);
    leftLine.stroke({ width: 2, color: 0xFF6B6B, alpha: 0.6 });
    leftLine.x = leftTargetX;
    leftLine.y = 0;

    const rightLine = new Graphics();
    rightLine.moveTo(0, 0);
    rightLine.lineTo(0, this.containerHeight);
    rightLine.stroke({ width: 2, color: 0xFF6B6B, alpha: 0.6 });
    rightLine.x = rightTargetX;
    rightLine.y = 0;

    const arrowLeft = new Graphics();
    arrowLeft.moveTo(-8, this.containerHeight / 2 - 15);
    arrowLeft.lineTo(0, this.containerHeight / 2);
    arrowLeft.lineTo(8, this.containerHeight / 2 - 15);
    arrowLeft.stroke({ width: 2, color: 0xFF6B6B, alpha: 0.6 });
    arrowLeft.x = leftTargetX;
    arrowLeft.y = 0;

    const arrowRight = new Graphics();
    arrowRight.moveTo(-8, this.containerHeight / 2 - 15);
    arrowRight.lineTo(0, this.containerHeight / 2);
    arrowRight.lineTo(8, this.containerHeight / 2 - 15);
    arrowRight.stroke({ width: 2, color: 0xFF6B6B, alpha: 0.6 });
    arrowRight.rotation = Math.PI;
    arrowRight.x = rightTargetX;
    arrowRight.y = this.containerHeight;

    const warningText = new PIXI.Text({
      text: '边界即将收缩',
      style: {
        fontSize: 14,
        fill: 0xFF6B6B,
        fontFamily: 'Arial',
      },
    });
    warningText.anchor.set(0.5);
    warningText.x = centerX;
    warningText.y = this.containerHeight / 2;

    this.warningContainer.addChild(leftLine);
    this.warningContainer.addChild(rightLine);
    this.warningContainer.addChild(arrowLeft);
    this.warningContainer.addChild(arrowRight);
    this.warningContainer.addChild(warningText);
    this.stageContainer.addChild(this.warningContainer);
  }

  protected updateWarning(_deltaMS: number): void {
    if (!this.warningContainer || this.warningContainer.children.length < 2) return;
    const leftLine = this.warningContainer.children[0] as Graphics;
    const rightLine = this.warningContainer.children[1] as Graphics;
    const pulse = 0.3 + 0.2 * Math.sin(Date.now() * 0.005);
    leftLine.alpha = pulse;
    rightLine.alpha = pulse;
  }

  private findWalls(): void {
    const engine = this.physics.getEngine();
    const bodies = Matter.Composite.allBodies(engine.world);

    for (const body of bodies) {
      if (body.label?.includes('wall_left') || body.label?.includes('left')) {
        this.leftWall = body;
      } else if (body.label?.includes('wall_right') || body.label?.includes('right')) {
        this.rightWall = body;
      }
    }
  }

  private createWallGraphics(): void {
    this.leftWallGraphic = new Graphics();
    this.leftWallGraphic.rect(0, 0, 6, this.containerHeight);
    this.leftWallGraphic.fill({ color: 0x9B59B6 });
    this.leftWallGraphic.x = 0;
    this.leftWallGraphic.y = 0;

    this.rightWallGraphic = new Graphics();
    this.rightWallGraphic.rect(0, 0, 6, this.containerHeight);
    this.rightWallGraphic.fill({ color: 0x9B59B6 });
    this.rightWallGraphic.x = this.containerWidth - 6;
    this.rightWallGraphic.y = 0;

    if (this.stageContainer) {
      this.stageContainer.addChild(this.leftWallGraphic);
      this.stageContainer.addChild(this.rightWallGraphic);
    }
  }

  protected onTick(deltaMS: number): void {
    const dt = deltaMS / 1000;
    const shrinkAmount = this.shrinkSpeed * dt;

    if (this.currentWidth > Math.max(this.targetWidth, this.minWidth)) {
      this.currentWidth = Math.max(
        this.targetWidth,
        this.minWidth,
        this.currentWidth - shrinkAmount * 2
      );
      this.updateWallPositions();
      this.pushBlocksInside();
      eventBus.emit(GameEvents.CONTAINER_SHRUNK, {
        width: this.currentWidth,
        offsetX: this.containerOffsetX + (this.originalWidth - this.currentWidth) / 2,
      });
    }
  }

  private pushBlocksInside(): void {
    if (!this.physics.getAllBodies) return;
    const centerX = this.containerOffsetX + this.originalWidth / 2;
    const halfWidth = this.currentWidth / 2;
    const leftBound = centerX - halfWidth;
    const rightBound = centerX + halfWidth;

    const bodies = this.physics.getAllBodies();
    for (const body of bodies) {
      if (body.isStatic) continue;
      const radius = body.circleRadius || 20;
      const pos = body.position;

      if (pos.x - radius < leftBound) {
        Matter.Body.setPosition(body, { x: leftBound + radius, y: pos.y });
        Matter.Body.setVelocity(body, { x: Math.abs(body.velocity.x) * 0.5, y: body.velocity.y });
      } else if (pos.x + radius > rightBound) {
        Matter.Body.setPosition(body, { x: rightBound - radius, y: pos.y });
        Matter.Body.setVelocity(body, { x: -Math.abs(body.velocity.x) * 0.5, y: body.velocity.y });
      }
    }
  }

  private updateWallPositions(): void {
    const centerX = this.containerOffsetX + this.originalWidth / 2;
    const halfWidth = this.currentWidth / 2;
    const leftX = centerX - halfWidth;
    const rightX = centerX + halfWidth;

    if (this.leftWall) {
      Matter.Body.setPosition(this.leftWall, {
        x: leftX - 25,
        y: this.containerHeight / 2,
      });
    }
    if (this.rightWall) {
      Matter.Body.setPosition(this.rightWall, {
        x: rightX + 25,
        y: this.containerHeight / 2,
      });
    }

    if (this.leftWallGraphic) {
      this.leftWallGraphic.x = leftX - 3;
    }
    if (this.rightWallGraphic) {
      this.rightWallGraphic.x = rightX - 3;
    }
  }

  protected onDeactivate(): void {
    this.currentWidth = this.originalWidth;
    this.updateWallPositions();
    this.pushBlocksInside();
    this.removeWallGraphics();
  }

  private removeWallGraphics(): void {
    if (this.leftWallGraphic) {
      if (this.stageContainer && this.leftWallGraphic.parent) {
        this.stageContainer.removeChild(this.leftWallGraphic);
      }
      this.leftWallGraphic.destroy();
      this.leftWallGraphic = null;
    }
    if (this.rightWallGraphic) {
      if (this.stageContainer && this.rightWallGraphic.parent) {
        this.stageContainer.removeChild(this.rightWallGraphic);
      }
      this.rightWallGraphic.destroy();
      this.rightWallGraphic = null;
    }
  }

  getCurrentWidth(): number {
    return this.currentWidth;
  }

  getShrinkProgress(): number {
    const diff = this.originalWidth - this.targetWidth;
    if (diff === 0) return 0;
    return (this.originalWidth - this.currentWidth) / diff;
  }

  destroy(): void {
    this.removeWallGraphics();
    super.destroy();
  }
}
