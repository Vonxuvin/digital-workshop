import { Container, Graphics } from 'pixi.js';
import Matter from 'matter-js';

export class PhysicsEntity extends Container {
  public body: Matter.Body;
  private graphics: Graphics;
  private syncEnabled = true;

  constructor(body: Matter.Body, color: number, radius: number) {
    super();
    this.body = body;

    this.graphics = new Graphics();
    this.graphics.circle(0, 0, radius);
    this.graphics.fill(color);

    this.addChild(this.graphics);

    this.syncFromBody();
  }

  syncFromBody(): void {
    if (!this.syncEnabled) return;
    this.x = this.body.position.x;
    this.y = this.body.position.y;
    this.rotation = this.body.angle;
  }

  setSyncEnabled(enabled: boolean): void {
    this.syncEnabled = enabled;
  }

  destroy(): void {
    this.graphics.destroy();
    super.destroy();
  }
}
