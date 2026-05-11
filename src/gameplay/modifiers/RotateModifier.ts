import Matter from 'matter-js';
import { Container, Graphics } from 'pixi.js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export interface RotateConfig extends ModifierConfig {
  rotationSpeed: number;       // 旋转速度（度/秒）
  maxAngle: number;            // 最大旋转角度（度）
  oscillate: boolean;          // 是否摆动（true: 来回摆动，false: 持续旋转）
}

export class RotateModifier extends ContainerModifier {
  private rotationSpeed: number;
  private maxAngle: number;
  private oscillate: boolean;
  private currentAngle: number = 0;
  private targetAngle: number = 0;
  private direction: number = 1;
  private originalPositions: Map<number, { x: number; y: number }> = new Map();
  private centerX: number;
  private centerY: number;
  private rotationIndicator: Graphics | null = null;

  constructor(
    config: RotateConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number,
    stageContainer?: Container | null
  ) {
    super(config, physics, stageContainer);
    this.rotationSpeed = config.rotationSpeed;
    this.maxAngle = config.maxAngle;
    this.oscillate = config.oscillate;
    this.centerX = containerWidth / 2;
    this.centerY = containerHeight / 2;
  }

  getType(): 'rotate' {
    return 'rotate';
  }

  protected onActivate(): void {
    this.collectContainerBodies();
    this.originalPositions.clear();
    for (const body of this.containerBodies) {
      this.originalPositions.set(body.id, { x: body.position.x, y: body.position.y });
    }
    this.targetAngle = this.maxAngle;
    this.direction = 1;
    this.createRotationIndicator();
    console.log(`[RotateModifier] 激活旋转容器, maxAngle=${this.maxAngle}, oscillate=${this.oscillate}`);
  }

  private createRotationIndicator(): void {
    this.rotationIndicator = new Graphics();
    const radius = 30;
    this.rotationIndicator.circle(0, 0, radius);
    this.rotationIndicator.stroke({ width: 3, color: 0xFFD93D });
    this.rotationIndicator.moveTo(0, -radius);
    this.rotationIndicator.lineTo(0, radius);
    this.rotationIndicator.moveTo(-radius, 0);
    this.rotationIndicator.lineTo(radius, 0);
    this.rotationIndicator.x = this.centerX;
    this.rotationIndicator.y = this.centerY;

    if (this.stageContainer) {
      this.stageContainer.addChild(this.rotationIndicator);
    }
  }

  protected onTick(): void {
    const dt = 0.016;
    const angleChange = this.rotationSpeed * dt * this.direction;
    this.currentAngle += angleChange;

    if (this.oscillate) {
      if (Math.abs(this.currentAngle) >= this.maxAngle) {
        this.currentAngle = this.maxAngle * Math.sign(this.currentAngle);
        this.direction *= -1;
      }
    }

    this.applyRotation();
    this.updateGravity();
    this.updateIndicator();
  }

  private updateIndicator(): void {
    if (this.rotationIndicator) {
      this.rotationIndicator.rotation = (this.currentAngle * Math.PI) / 180;
    }
  }

  private applyRotation(): void {
    const angleRad = (this.currentAngle * Math.PI) / 180;

    for (const body of this.containerBodies) {
      const originalPos = this.originalPositions.get(body.id);
      if (!originalPos) continue;

      const dx = originalPos.x - this.centerX;
      const dy = originalPos.y - this.centerY;

      const newX = this.centerX + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
      const newY = this.centerY + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

      Matter.Body.setPosition(body, { x: newX, y: newY });
      Matter.Body.setAngle(body, angleRad);
    }
  }

  private updateGravity(): void {
    const angleRad = (this.currentAngle * Math.PI) / 180;
    const gravityX = Math.sin(angleRad);
    const gravityY = Math.cos(angleRad);
    this.physics.setGravity(gravityX, gravityY);
  }

  protected onDeactivate(): void {
    this.physics.setGravity(0, 1);
    this.currentAngle = 0;
    this.direction = 1;

    for (const body of this.containerBodies) {
      const originalPos = this.originalPositions.get(body.id);
      if (originalPos) {
        Matter.Body.setPosition(body, originalPos);
        Matter.Body.setAngle(body, 0);
      }
    }

    if (this.rotationIndicator) {
      if (this.stageContainer && this.rotationIndicator.parent) {
        this.stageContainer.removeChild(this.rotationIndicator);
      }
      this.rotationIndicator.destroy();
      this.rotationIndicator = null;
    }
  }

  getCurrentAngle(): number {
    return this.currentAngle;
  }

  destroy(): void {
    this.onDeactivate();
    super.destroy();
  }
}
