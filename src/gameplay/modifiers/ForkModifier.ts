import { logger } from '../../utils/Logger';
import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export interface ForkConfig extends ModifierConfig {
  forkY: number;
  leftAngle: number;
  rightAngle: number;
  channelWidth: number;
}

export class ForkModifier extends ContainerModifier {
  private forkY: number;
  private leftAngle: number;
  private rightAngle: number;
  private channelWidth: number;
  private divider: Matter.Body | null = null;
  private leftWall: Matter.Body | null = null;
  private rightWall: Matter.Body | null = null;
  private leftChannelWall: Matter.Body | null = null;
  private rightChannelWall: Matter.Body | null = null;
  private dividerGraphic: Graphics | null = null;
  private leftWallGraphic: Graphics | null = null;
  private rightWallGraphic: Graphics | null = null;
  private leftChannelWallGraphic: Graphics | null = null;
  private rightChannelWallGraphic: Graphics | null = null;
  private containerWidth: number;
  private containerHeight: number;
  private containerOffsetX: number;

  constructor(
    config: ForkConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number,
    stageContainer?: Container | null,
    containerOffsetX: number = 0
  ) {
    super(config, physics, stageContainer);
    this.forkY = config.forkY;
    this.leftAngle = config.leftAngle;
    this.rightAngle = config.rightAngle;
    this.channelWidth = config.channelWidth;
    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;
    this.containerOffsetX = containerOffsetX;
  }

  getType(): 'fork' {
    return 'fork';
  }

  protected onActivate(): void {
    this.createForkStructure();
    logger.info('ForkModifier', `激活分叉通道, forkY=${this.forkY}, leftAngle=${this.leftAngle}, rightAngle=${this.rightAngle}, channelWidth=${this.channelWidth}`);
  }

  private createForkStructure(): void {
    const wallThickness = 10;
    const halfWidth = this.containerWidth / 2;
    const offsetX = this.containerOffsetX;

    const dividerHeight = this.containerHeight - this.forkY;
    this.divider = this.physics.createRectangle(
      offsetX + halfWidth,
      this.forkY + dividerHeight / 2,
      wallThickness,
      dividerHeight,
      { isStatic: true, friction: 0.5, label: 'fork_divider' }
    );

    const leftAngleRad = (this.leftAngle * Math.PI) / 180;
    const rightAngleRad = (this.rightAngle * Math.PI) / 180;
    const leftDisplacement = halfWidth - this.channelWidth;
    const rightDisplacement = halfWidth - this.channelWidth;

    if (this.leftAngle > 0 && leftDisplacement > 0) {
      const leftFunnelHeight = leftDisplacement / Math.tan(leftAngleRad);
      const leftWallLength = leftDisplacement / Math.sin(leftAngleRad);

      this.leftWall = this.physics.createRectangle(
        offsetX + leftDisplacement / 2,
        this.forkY + leftFunnelHeight / 2,
        wallThickness,
        leftWallLength,
        {
          isStatic: true,
          friction: 0.5,
          label: 'fork_left_wall',
          angle: -leftAngleRad,
        }
      );

      const leftChannelHeight = this.containerHeight - this.forkY - leftFunnelHeight;
      if (leftChannelHeight > 5) {
        this.leftChannelWall = this.physics.createRectangle(
          offsetX + halfWidth - this.channelWidth,
          this.forkY + leftFunnelHeight + leftChannelHeight / 2,
          wallThickness,
          leftChannelHeight,
          { isStatic: true, friction: 0.5, label: 'fork_left_channel_wall' }
        );
      }
    }

    if (this.rightAngle > 0 && rightDisplacement > 0) {
      const rightFunnelHeight = rightDisplacement / Math.tan(rightAngleRad);
      const rightWallLength = rightDisplacement / Math.sin(rightAngleRad);

      this.rightWall = this.physics.createRectangle(
        offsetX + this.containerWidth - rightDisplacement / 2,
        this.forkY + rightFunnelHeight / 2,
        wallThickness,
        rightWallLength,
        {
          isStatic: true,
          friction: 0.5,
          label: 'fork_right_wall',
          angle: rightAngleRad,
        }
      );

      const rightChannelHeight = this.containerHeight - this.forkY - rightFunnelHeight;
      if (rightChannelHeight > 5) {
        this.rightChannelWall = this.physics.createRectangle(
          offsetX + halfWidth + this.channelWidth,
          this.forkY + rightFunnelHeight + rightChannelHeight / 2,
          wallThickness,
          rightChannelHeight,
          { isStatic: true, friction: 0.5, label: 'fork_right_channel_wall' }
        );
      }
    }

    this.createForkGraphics();
  }

  private createForkGraphics(): void {
    const wallThickness = 10;
    const halfWidth = this.containerWidth / 2;
    const offsetX = this.containerOffsetX;
    const leftAngleRad = (this.leftAngle * Math.PI) / 180;
    const rightAngleRad = (this.rightAngle * Math.PI) / 180;
    const leftDisplacement = halfWidth - this.channelWidth;
    const rightDisplacement = halfWidth - this.channelWidth;

    const dividerHeight = this.containerHeight - this.forkY;
    this.dividerGraphic = new Graphics();
    this.dividerGraphic.rect(-wallThickness / 2, -dividerHeight / 2, wallThickness, dividerHeight);
    this.dividerGraphic.fill({ color: 0xE74C3C });
    this.dividerGraphic.x = offsetX + halfWidth;
    this.dividerGraphic.y = this.forkY + dividerHeight / 2;

    if (this.leftWall) {
      const leftFunnelHeight = leftDisplacement / Math.tan(leftAngleRad);
      const leftWallLength = leftDisplacement / Math.sin(leftAngleRad);

      this.leftWallGraphic = new Graphics();
      this.leftWallGraphic.rect(-wallThickness / 2, -leftWallLength / 2, wallThickness, leftWallLength);
      this.leftWallGraphic.fill({ color: 0x3498DB });
      this.leftWallGraphic.x = offsetX + leftDisplacement / 2;
      this.leftWallGraphic.y = this.forkY + leftFunnelHeight / 2;
      this.leftWallGraphic.rotation = -leftAngleRad;
    }

    if (this.rightWall) {
      const rightFunnelHeight = rightDisplacement / Math.tan(rightAngleRad);
      const rightWallLength = rightDisplacement / Math.sin(rightAngleRad);

      this.rightWallGraphic = new Graphics();
      this.rightWallGraphic.rect(-wallThickness / 2, -rightWallLength / 2, wallThickness, rightWallLength);
      this.rightWallGraphic.fill({ color: 0x3498DB });
      this.rightWallGraphic.x = offsetX + this.containerWidth - rightDisplacement / 2;
      this.rightWallGraphic.y = this.forkY + rightFunnelHeight / 2;
      this.rightWallGraphic.rotation = rightAngleRad;
    }

    if (this.leftChannelWall) {
      const leftFunnelHeight = leftDisplacement / Math.tan(leftAngleRad);
      const leftChannelHeight = this.containerHeight - this.forkY - leftFunnelHeight;

      this.leftChannelWallGraphic = new Graphics();
      this.leftChannelWallGraphic.rect(-wallThickness / 2, -leftChannelHeight / 2, wallThickness, leftChannelHeight);
      this.leftChannelWallGraphic.fill({ color: 0x27AE60 });
      this.leftChannelWallGraphic.x = offsetX + halfWidth - this.channelWidth;
      this.leftChannelWallGraphic.y = this.forkY + leftFunnelHeight + leftChannelHeight / 2;
    }

    if (this.rightChannelWall) {
      const rightFunnelHeight = rightDisplacement / Math.tan(rightAngleRad);
      const rightChannelHeight = this.containerHeight - this.forkY - rightFunnelHeight;

      this.rightChannelWallGraphic = new Graphics();
      this.rightChannelWallGraphic.rect(-wallThickness / 2, -rightChannelHeight / 2, wallThickness, rightChannelHeight);
      this.rightChannelWallGraphic.fill({ color: 0x27AE60 });
      this.rightChannelWallGraphic.x = offsetX + halfWidth + this.channelWidth;
      this.rightChannelWallGraphic.y = this.forkY + rightFunnelHeight + rightChannelHeight / 2;
    }

    if (this.stageContainer) {
      if (this.dividerGraphic) this.stageContainer.addChild(this.dividerGraphic);
      if (this.leftWallGraphic) this.stageContainer.addChild(this.leftWallGraphic);
      if (this.rightWallGraphic) this.stageContainer.addChild(this.rightWallGraphic);
      if (this.leftChannelWallGraphic) this.stageContainer.addChild(this.leftChannelWallGraphic);
      if (this.rightChannelWallGraphic) this.stageContainer.addChild(this.rightChannelWallGraphic);
    }
  }

  protected onTick(_deltaMS: number): void {
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
    if (this.leftChannelWall) {
      this.physics.removeBody(this.leftChannelWall);
      this.leftChannelWall = null;
    }
    if (this.rightChannelWall) {
      this.physics.removeBody(this.rightChannelWall);
      this.rightChannelWall = null;
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
    if (this.leftChannelWallGraphic) {
      if (this.stageContainer && this.leftChannelWallGraphic.parent) {
        this.stageContainer.removeChild(this.leftChannelWallGraphic);
      }
      this.leftChannelWallGraphic.destroy();
      this.leftChannelWallGraphic = null;
    }
    if (this.rightChannelWallGraphic) {
      if (this.stageContainer && this.rightChannelWallGraphic.parent) {
        this.stageContainer.removeChild(this.rightChannelWallGraphic);
      }
      this.rightChannelWallGraphic.destroy();
      this.rightChannelWallGraphic = null;
    }
  }

  destroy(): void {
    this.removeForkStructure();
    super.destroy();
  }
}
