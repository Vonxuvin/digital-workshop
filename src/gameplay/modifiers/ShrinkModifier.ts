import Matter from 'matter-js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export interface ShrinkConfig extends ModifierConfig {
  targetWidth: number;         // 目标宽度（像素）
  shrinkSpeed: number;         // 收缩速度（像素/秒）
  minWidth: number;            // 最小宽度限制
}

export class ShrinkModifier extends ContainerModifier {
  private targetWidth: number;
  private shrinkSpeed: number;
  private minWidth: number;
  private originalWidth: number;
  private currentWidth: number;
  private leftWall: Matter.Body | null = null;
  private rightWall: Matter.Body | null = null;
  private containerHeight: number;
  private groundY: number;

  constructor(
    config: ShrinkConfig,
    physics: PhysicsManager,
    originalWidth: number,
    containerHeight: number,
    groundY: number
  ) {
    super(config, physics);
    this.targetWidth = config.targetWidth;
    this.shrinkSpeed = config.shrinkSpeed;
    this.minWidth = config.minWidth;
    this.originalWidth = originalWidth;
    this.currentWidth = originalWidth;
    this.containerHeight = containerHeight;
    this.groundY = groundY;
  }

  getType(): 'shrink' {
    return 'shrink';
  }

  protected onActivate(): void {
    this.findWalls();
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

  protected onTick(): void {
    const dt = 0.016;
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
  }

  protected onDeactivate(): void {
    this.currentWidth = this.originalWidth;
    this.updateWallPositions();
  }

  getCurrentWidth(): number {
    return this.currentWidth;
  }

  getShrinkProgress(): number {
    return (this.originalWidth - this.currentWidth) / (this.originalWidth - this.targetWidth);
  }
}
