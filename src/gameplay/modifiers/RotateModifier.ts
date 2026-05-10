import Matter from 'matter-js';
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
  private containerBodies: Matter.Body[] = [];
  private originalPositions: Map<number, { x: number; y: number }> = new Map();
  private centerX: number;
  private centerY: number;

  constructor(
    config: RotateConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number
  ) {
    super(config, physics);
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
    this.targetAngle = this.maxAngle;
    this.direction = 1;
  }

  private collectContainerBodies(): void {
    const engine = this.physics.getEngine();
    const bodies = Matter.Composite.allBodies(engine.world);
    this.containerBodies = bodies.filter(body =>
      body.label?.includes('wall') ||
      body.label?.includes('ground') ||
      body.isStatic
    );

    this.originalPositions.clear();
    for (const body of this.containerBodies) {
      this.originalPositions.set(body.id, { x: body.position.x, y: body.position.y });
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
  }

  getCurrentAngle(): number {
    return this.currentAngle;
  }
}
