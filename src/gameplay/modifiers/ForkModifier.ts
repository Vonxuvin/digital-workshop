import Matter from 'matter-js';
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
  private containerWidth: number;
  private containerHeight: number;

  constructor(
    config: ForkConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number
  ) {
    super(config, physics);
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
  }

  private createForkStructure(): void {
    const dividerHeight = 20;
    const dividerLength = this.containerHeight - this.forkY;

    // 中央分隔器
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

    // 左通道斜墙
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

    // 右通道斜墙
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
  }

  destroy(): void {
    super.destroy();
    this.removeForkStructure();
  }
}
