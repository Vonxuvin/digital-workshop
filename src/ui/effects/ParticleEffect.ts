import { Container, Graphics } from 'pixi.js';

export interface ParticleConfig {
  x: number;
  y: number;
  color: number;
  count: number;
  speed: number;
  life: number;
}

export class ParticleEffect extends Container {
  private particles: Array<{
    graphics: Graphics;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
  }> = [];

  constructor(config: ParticleConfig) {
    super();
    this.createParticles(config);
  }

  private createParticles(config: ParticleConfig): void {
    for (let i = 0; i < config.count; i++) {
      const particle = new Graphics();
      particle.circle(0, 0, 2 + Math.random() * 4);
      particle.fill(config.color);

      const angle = (Math.PI * 2 * i) / config.count + Math.random() * 0.5;
      const speed = config.speed * (0.5 + Math.random() * 0.5);

      this.particles.push({
        graphics: particle,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: config.life,
        maxLife: config.life,
      });

      particle.x = config.x;
      particle.y = config.y;
      this.addChild(particle);
    }
  }

  update(delta: number): boolean {
    let alive = false;

    this.particles.forEach(p => {
      if (p.life > 0) {
        p.life -= delta;
        p.graphics.x += p.vx * delta;
        p.graphics.y += p.vy * delta;
        p.graphics.alpha = p.life / p.maxLife;
        alive = true;
      } else {
        p.graphics.visible = false;
      }
    });

    return alive;
  }

  destroy(): void {
    this.particles.forEach(p => p.graphics.destroy());
    this.particles = [];
    super.destroy();
  }
}
