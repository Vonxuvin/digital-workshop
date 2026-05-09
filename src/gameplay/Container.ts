import { Container, Graphics } from 'pixi.js';
import { PhysicsManager } from '../core/PhysicsManager';

export class GameContainer extends Container {
  private walls: Graphics;
  private physics: PhysicsManager;
  private containerWidth: number;
  private containerHeight: number;

  constructor(physics: PhysicsManager, width: number, height: number) {
    super();
    this.physics = physics;
    this.containerWidth = width;
    this.containerHeight = height;
    this.walls = new Graphics();
    this.drawWalls();
    this.addChild(this.walls);
    this.createPhysicsBounds();
  }

  private drawWalls(): void {
    this.walls.clear();
    this.walls.rect(0, this.containerHeight - 50, this.containerWidth, 50);
    this.walls.fill(0x2d2d44);
    this.walls.rect(0, 0, 2, this.containerHeight);
    this.walls.fill(0x2d2d44);
    this.walls.rect(this.containerWidth - 2, 0, 2, this.containerHeight);
    this.walls.fill(0x2d2d44);
  }

  private createPhysicsBounds(): void {
    const groundY = this.containerHeight - 50;
    this.physics.createRectangle(this.containerWidth / 2, groundY + 25, this.containerWidth, 50);
    this.physics.createRectangle(-25, this.containerHeight / 2, 50, this.containerHeight);
    this.physics.createRectangle(this.containerWidth + 25, this.containerHeight / 2, 50, this.containerHeight);
  }

  resize(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
    this.drawWalls();
  }

  destroy(): void {
    this.walls.destroy();
    super.destroy();
  }
}
