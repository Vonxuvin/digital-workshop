import { logger } from '../../utils/Logger';
import Matter from 'matter-js';
import * as PIXI from 'pixi.js';
import { Container, Graphics } from 'pixi.js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export interface RotateConfig extends ModifierConfig {
  rotationSpeed: number;
  maxAngle: number;
  oscillate: boolean;
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
  private wallGraphics: Graphics | null = null;

  private prevAngle: number = 0;

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
    this.createVisualWalls();
    this.createRotationIndicator();
    logger.info('RotateModifier', `激活旋转容器, maxAngle=${this.maxAngle}, oscillate=${this.oscillate}, bodies=${this.containerBodies.length}, center=(${this.centerX.toFixed(0)}, ${this.centerY.toFixed(0)})`);
  }

  protected showWarning(): void {
    if (!this.stageContainer) return;

    this.warningContainer = new Container();

    const ring = new Graphics();
    ring.circle(0, 0, 50);
    ring.stroke({ width: 2, color: 0xFFD93D, alpha: 0.4 });

    const arrow = new Graphics();
    arrow.moveTo(0, -55);
    arrow.lineTo(-12, -40);
    arrow.moveTo(0, -55);
    arrow.lineTo(12, -40);
    arrow.moveTo(0, -55);
    arrow.lineTo(0, 55);
    arrow.stroke({ width: 3, color: 0xFFD93D, alpha: 0.5 });

    ring.x = this.centerX;
    ring.y = this.centerY;
    arrow.x = this.centerX;
    arrow.y = this.centerY;

    const warningText = new PIXI.Text({
      text: '容器即将旋转',
      style: {
        fontSize: 14,
        fill: 0xFFD93D,
        fontFamily: 'Arial',
      },
    });
    warningText.anchor.set(0.5);
    warningText.x = this.centerX;
    warningText.y = this.centerY - 65;

    this.warningContainer.addChild(ring);
    this.warningContainer.addChild(arrow);
    this.warningContainer.addChild(warningText);
    this.stageContainer.addChild(this.warningContainer);
  }

  protected updateWarning(_deltaMS: number): void {
    if (!this.warningContainer || this.warningContainer.children.length < 2) return;
    const ring = this.warningContainer.children[0] as Graphics;
    const pulse = 0.2 + 0.3 * Math.sin(Date.now() * 0.005);
    ring.alpha = pulse;
  }

  private createVisualWalls(): void {
    this.wallGraphics = new Graphics();

    const groundBody = this.containerBodies.find(b => b.label === 'ground');
    const leftBody = this.containerBodies.find(b => b.label === 'wall_left');
    const rightBody = this.containerBodies.find(b => b.label === 'wall_right');

    if (groundBody) {
      const w = groundBody.bounds.max.x - groundBody.bounds.min.x;
      const h = groundBody.bounds.max.y - groundBody.bounds.min.y;
      this.wallGraphics.rect(groundBody.position.x - w / 2, groundBody.position.y - h / 2, w, h);
      this.wallGraphics.fill({ color: 0x2d2d44 });
    }
    if (leftBody) {
      const w = leftBody.bounds.max.x - leftBody.bounds.min.x;
      const h = leftBody.bounds.max.y - leftBody.bounds.min.y;
      this.wallGraphics.rect(leftBody.position.x - w / 2, leftBody.position.y - h / 2, w, h);
      this.wallGraphics.fill({ color: 0x4a4a6a });
    }
    if (rightBody) {
      const w = rightBody.bounds.max.x - rightBody.bounds.min.x;
      const h = rightBody.bounds.max.y - rightBody.bounds.min.y;
      this.wallGraphics.rect(rightBody.position.x - w / 2, rightBody.position.y - h / 2, w, h);
      this.wallGraphics.fill({ color: 0x4a4a6a });
    }

    this.wallGraphics.pivot.set(this.centerX, this.centerY);
    this.wallGraphics.x = this.centerX;
    this.wallGraphics.y = this.centerY;

    if (this.stageContainer) {
      this.stageContainer.addChild(this.wallGraphics);
    }
  }

  private updateVisualWalls(): void {
    if (!this.wallGraphics) return;
    this.wallGraphics.rotation = (this.currentAngle * Math.PI) / 180;
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

  protected onTick(deltaMS: number): void {
    const dt = deltaMS / 1000;
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
    this.updateVisualWalls();
  }

  private updateIndicator(): void {
    if (this.rotationIndicator) {
      this.rotationIndicator.rotation = (this.currentAngle * Math.PI) / 180;
    }
  }

  private applyRotation(): void {
    const angleRad = (this.currentAngle * Math.PI) / 180;
    const prevAngleRad = (this.prevAngle * Math.PI) / 180;

    for (const body of this.containerBodies) {
      const originalPos = this.originalPositions.get(body.id);
      if (!originalPos) continue;

      const dx = originalPos.x - this.centerX;
      const dy = originalPos.y - this.centerY;

      const newX = this.centerX + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
      const newY = this.centerY + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

      const prevX = this.centerX + dx * Math.cos(prevAngleRad) - dy * Math.sin(prevAngleRad);
      const prevY = this.centerY + dx * Math.sin(prevAngleRad) + dy * Math.cos(prevAngleRad);

      Matter.Body.setPosition(body, { x: newX, y: newY });
      Matter.Body.setAngle(body, angleRad);
      Matter.Body.setVelocity(body, {
        x: (newX - prevX) * 0.1,
        y: (newY - prevY) * 0.1,
      });

      if (body.isSleeping) {
        Matter.Sleeping.set(body, false);
      }
    }

    this.prevAngle = this.currentAngle;
  }

  private updateGravity(): void {
    const angleRad = (this.currentAngle * Math.PI) / 180;
    const gravityX = Math.sin(angleRad) * 1.0;
    const gravityY = Math.cos(angleRad) * 1.0;
    this.physics.setGravity(gravityX, gravityY);
  }

  protected onDeactivate(): void {
    this.physics.setGravity(0, 1.0);
    this.currentAngle = 0;
    this.prevAngle = 0;
    this.direction = 1;

    for (const body of this.containerBodies) {
      const originalPos = this.originalPositions.get(body.id);
      if (originalPos) {
        Matter.Body.setPosition(body, originalPos);
        Matter.Body.setAngle(body, 0);
      }
    }

    if (this.wallGraphics) {
      if (this.stageContainer && this.wallGraphics.parent) {
        this.stageContainer.removeChild(this.wallGraphics);
      }
      this.wallGraphics.destroy();
      this.wallGraphics = null;
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
