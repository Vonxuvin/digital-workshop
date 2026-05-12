import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

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

  constructor(
    config: ShrinkConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number,
    groundY: number,
    stageContainer?: Container | null
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
  }

  getType(): 'shrink' {
    return 'shrink';
  }

  protected onActivate(): void {
    this.findWalls();
    this.createWallGraphics();
    console.log(`[ShrinkModifier] 激活收缩容器, targetWidth=${this.targetWidth}, minWidth=${this.minWidth}`);
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
    }
  }

  private updateWallPositions(): void {
    const centerX = this.originalWidth / 2;
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
    return (this.originalWidth - this.currentWidth) / (this.originalWidth - this.targetWidth);
  }

  destroy(): void {
    this.removeWallGraphics();
    super.destroy();
  }
}
