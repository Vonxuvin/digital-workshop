import { Container, Graphics } from 'pixi.js';
import { ParticleEffect } from './ParticleEffect';

export class MergeEffect extends Container {
  private particles: ParticleEffect | null = null;
  private ring: Graphics;
  private ringScale = 1;
  private ringAlpha = 1;

  constructor(x: number, y: number, color: number) {
    super();
    this.x = x;
    this.y = y;

    this.ring = new Graphics();
    this.ring.circle(0, 0, 20);
    this.ring.stroke({ width: 3, color, alpha: 0.8 });
    this.addChild(this.ring);

    this.particles = new ParticleEffect({
      x: 0,
      y: 0,
      color,
      count: 12,
      speed: 3,
      life: 30,
    });
    this.addChild(this.particles);
  }

  update(delta: number): boolean {
    this.ringScale += 0.05 * delta;
    this.ringAlpha -= 0.02 * delta;
    this.ring.scale.set(this.ringScale);
    this.ring.alpha = Math.max(0, this.ringAlpha);

    const particlesAlive = this.particles ? this.particles.update(delta) : false;

    return this.ringAlpha > 0 || particlesAlive;
  }

  destroy(): void {
    if (this.particles) {
      this.particles.destroy();
    }
    this.ring.destroy();
    super.destroy();
  }
}
