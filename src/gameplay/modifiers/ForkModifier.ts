import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export interface ForkConfig extends ModifierConfig {
  forkY: number;               // 分叉点Y坐标
  leftAngle: number;           // 左通道角度（度）
  rightAngle: number;          // 右通道角度（度）
  channelWidth: number;        // 通道宽度
}

export class ForkModifier extends ContainerModifier {
  private forkY: number;
  private leftAngle: number;
  private rightAngle: number;
  private channelWidth: number;
  private divider: Matter.Body | null = null;
  private leftWall: Matter.Body | null = null;
  private rightWall: Matter.Body | null = null;
  private dividerGraphic: Graphics | null = null;
  private leftWallGraphic: Graphics | null = null;
  private rightWallGraphic: Graphics | null = null;
  private containerWidth: number;
  private containerHeight: number;

  constructor(
    config: ForkConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number,
    stageContainer?: Container | null
  ) {
    super(config, physics, stageContainer);
    this.forkY = config.forkY;
    this.leftAngle = config.leftAngle;
    this.rightAngle = config.rightAngle;
    this.channelWidth = config.channelWidth;
    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;
  }

  getType(): 'fork' {
    return 'fork';
  }

  protected onActivate(): void {
    this.createForkStructure();
    console.log(`[ForkModifier] 激活分叉通道, forkY=${this.forkY}, leftAngle=${this.leftAngle}, rightAngle=${this.rightAngle}`);
  }

  private createForkStructure(): void {
    const dividerHeight = 20;
    const dividerLength = this.containerHeight - this.forkY;

    this.divider = this.physics.createRectangle(
      this.containerWidth / 2,
      this.forkY + dividerLength / 2,
      10,
      dividerLength,
      {
        isStatic: true,
        friction: 0.5,
        label: 'fork_divider',
      }
    );

    const leftWallLength = dividerLength / Math.cos((this.leftAngle * Math.PI) / 180);
    this.leftWall = this.physics.createRectangle(
      this.channelWidth / 2,
      this.forkY + dividerLength / 2,
      10,
      leftWallLength,
      {
        isStatic: true,
        friction: 0.5,
        label: 'fork_left_wall',
        angle: (this.leftAngle * Math.PI) / 180,
      }
    );

    const rightWallLength = dividerLength / Math.cos((this.rightAngle * Math.PI) / 180);
    this.rightWall = this.physics.createRectangle(
      this.containerWidth - this.channelWidth / 2,
      this.forkY + dividerLength / 2,
      10,
      rightWallLength,
      {
        isStatic: true,
        friction: 0.5,
        label: 'fork_right_wall',
        angle: (-this.rightAngle * Math.PI) / 180,
      }
    );

    this.createForkGraphics();
  }

  private createForkGraphics(): void {
    const dividerLength = this.containerHeight - this.forkY;

    this.dividerGraphic = new Graphics();
    this.dividerGraphic.rect(-5, 0, 10, dividerLength);
    this.dividerGraphic.fill({ color: 0xE74C3C });
    this.dividerGraphic.x = this.containerWidth / 2;
    this.dividerGraphic.y = this.forkY;

    const leftWallLength = dividerLength / Math.cos((this.leftAngle * Math.PI) / 180);
    this.leftWallGraphic = new Graphics();
    this.leftWallGraphic.rect(-5, 0, 10, leftWallLength);
    this.leftWallGraphic.fill({ color: 0x3498DB });
    this.leftWallGraphic.x = this.channelWidth / 2;
    this.leftWallGraphic.y = this.forkY;
    this.leftWallGraphic.rotation = (this.leftAngle * Math.PI) / 180;

    const rightWallLength = dividerLength / Math.cos((this.rightAngle * Math.PI) / 180);
    this.rightWallGraphic = new Graphics();
    this.rightWallGraphic.rect(-5, 0, 10, rightWallLength);
    this.rightWallGraphic.fill({ color: 0x3498DB });
    this.rightWallGraphic.x = this.containerWidth - this.channelWidth / 2;
    this.rightWallGraphic.y = this.forkY;
    this.rightWallGraphic.rotation = (-this.rightAngle * Math.PI) / 180;

    if (this.stageContainer) {
      this.stageContainer.addChild(this.dividerGraphic);
      this.stageContainer.addChild(this.leftWallGraphic);
      this.stageContainer.addChild(this.rightWallGraphic);
    }
  }

  protected onTick(): void {
    // 分叉通道为静态结构，无需每帧更新
  }

  protected onDeactivate(): void {
    this.removeForkStructure();
  }

  private removeForkStructure(): void {
    if (this.divider) {
      this.physics.removeBody(this.divider);
      this.divider = null;
    }
    if (this.leftWall) {
      this.physics.removeBody(this.leftWall);
      this.leftWall = null;
    }
    if (this.rightWall) {
      this.physics.removeBody(this.rightWall);
      this.rightWall = null;
    }

    if (this.dividerGraphic) {
      if (this.stageContainer && this.dividerGraphic.parent) {
        this.stageContainer.removeChild(this.dividerGraphic);
      }
      this.dividerGraphic.destroy();
      this.dividerGraphic = null;
    }
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

  destroy(): void {
    this.removeForkStructure();
    super.destroy();
  }
}
