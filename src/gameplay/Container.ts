import { Container, Graphics } from 'pixi.js';
import Matter from 'matter-js';
import { PhysicsManager } from '../core/PhysicsManager';

export class GameContainer extends Container {
  private walls: Graphics;
  private physics: PhysicsManager;
  private containerWidth: number;
  private containerHeight: number;
  private physicsBodies: Matter.Body[] = [];

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
    this.walls.fill({ color: 0x2d2d44 });
    this.walls.rect(-2, 0, 2, this.containerHeight);
    this.walls.fill({ color: 0x2d2d44 });
    this.walls.rect(this.containerWidth, 0, 2, this.containerHeight);
    this.walls.fill({ color: 0x2d2d44 });
  }

  private createPhysicsBounds(): void {
    const groundY = this.containerHeight - 50;
    const ground = this.physics.createRectangle(this.containerWidth / 2, groundY + 25, this.containerWidth, 50);
    ground.label = 'ground';
    const leftWall = this.physics.createRectangle(-25, this.containerHeight / 2, 50, this.containerHeight);
    leftWall.label = 'wall_left';
    const rightWall = this.physics.createRectangle(this.containerWidth + 25, this.containerHeight / 2, 50, this.containerHeight);
    rightWall.label = 'wall_right';
    this.physicsBodies = [ground, leftWall, rightWall];
  }

  rebuildPhysicsBounds(): void {
    for (const body of this.physicsBodies) {
      this.physics.removeBody(body);
    }
    this.physicsBodies = [];
    this.createPhysicsBounds();
  }

  resize(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
    this.drawWalls();
    this.rebuildPhysicsBounds();
  }

  destroy(): void {
    for (const body of this.physicsBodies) {
      this.physics.removeBody(body);
    }
    this.physicsBodies = [];
    this.walls.destroy();
    super.destroy();
  }
}
