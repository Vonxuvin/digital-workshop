import * as PIXI from 'pixi.js';
import gsap from 'gsap';

export type ParticleType = 'sparkle' | 'confetti' | 'smoke' | 'bubble';

export interface ParticleConfig {
  type: ParticleType;
  x: number;
  y: number;
  count: number;
  color?: number;
  onComplete?: () => void;
}

interface AnimatedParticle {
  graphics: PIXI.Graphics;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  delay: number;
  duration: number;
  rotationSpeed: number;
}

export class ParticleEffect extends PIXI.Container {
  private particles: AnimatedParticle[] = [];
  private onComplete: (() => void) | undefined;
  private timeline: gsap.core.Timeline | null = null;

  constructor(config: ParticleConfig) {
    super();
    this.onComplete = config.onComplete;
    this.createParticles(config);
    this.playAnimation(config.type);
  }

  private createParticles(config: ParticleConfig): void {
    for (let i = 0; i < config.count; i++) {
      const particle = this.createParticle(config.type, config.color);
      particle.x = config.x + (Math.random() - 0.5) * 20;
      particle.y = config.y + (Math.random() - 0.5) * 20;
      this.addChild(particle);

      const animParticle: AnimatedParticle = {
        graphics: particle,
        startX: particle.x,
        startY: particle.y,
        targetX: particle.x,
        targetY: particle.y,
        delay: i * 0.05,
        duration: 0.8,
        rotationSpeed: 0,
      };
      this.particles.push(animParticle);
    }
  }

  private createParticle(type: ParticleType, color?: number): PIXI.Graphics {
    const particle = new PIXI.Graphics();
    const defaultColor = color || 0xffd93d;

    switch (type) {
      case 'sparkle':
        particle.fill({ color: defaultColor, alpha: 0.9 });
        particle.circle(0, 0, 3 + Math.random() * 3);
        break;
      case 'confetti':
        const colors = [0xff6b6b, 0xffd93d, 0x4ecdc4, 0x9b59b6, 0x3498db];
        particle.fill({ color: colors[Math.floor(Math.random() * colors.length)] });
        particle.rect(-3, -6, 6, 12);
        break;
      case 'smoke':
        particle.fill({ color: 0x888888, alpha: 0.3 });
        particle.circle(0, 0, 10 + Math.random() * 10);
        break;
      case 'bubble':
        particle.setStrokeStyle({ width: 1, color: defaultColor, alpha: 0.5 });
        particle.fill({ color: defaultColor, alpha: 0.1 });
        particle.circle(0, 0, 5 + Math.random() * 8);
        break;
    }

    return particle;
  }

  private playAnimation(type: ParticleType): void {
    this.particles.forEach((p) => {
      const startX = p.startX;
      const startY = p.startY;

      switch (type) {
        case 'sparkle':
          p.targetX = startX;
          p.targetY = startY - 30 - Math.random() * 50;
          p.duration = 0.8;
          break;
        case 'confetti':
          p.targetX = startX + (Math.random() - 0.5) * 150;
          p.targetY = startY + 100 + Math.random() * 100;
          p.duration = 1.2;
          p.rotationSpeed = Math.PI * 4 * (Math.random() > 0.5 ? 1 : -1);
          break;
        case 'smoke':
          p.targetX = startX + (Math.random() - 0.5) * 30;
          p.targetY = startY - 60;
          p.duration = 1.5;
          break;
        case 'bubble':
          p.targetX = startX + (Math.random() - 0.5) * 40;
          p.targetY = startY - 40 - Math.random() * 30;
          p.duration = 1;
          break;
      }
    });

    this.timeline = gsap.timeline({
      onComplete: () => {
        if (this.onComplete) {
          this.onComplete();
        }
        this.destroy();
      },
    });

    this.particles.forEach((p) => {
      const g = p.graphics;
      this.timeline!.to(g, {
        x: p.targetX,
        y: p.targetY,
        alpha: 0,
        duration: p.duration,
        delay: p.delay,
        ease: 'power2.out',
      }, 0);
      this.timeline!.to(g.scale, {
        x: 0.2,
        y: 0.2,
        duration: p.duration,
        delay: p.delay,
        ease: 'power2.out',
      }, 0);
      if (p.rotationSpeed !== 0) {
        this.timeline!.to(g, {
          rotation: p.rotationSpeed,
          duration: p.duration,
          delay: p.delay,
          ease: 'none',
        }, 0);
      }
    });
  }

  destroy(): void {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    this.particles.forEach(p => p.graphics.destroy());
    this.particles = [];
    this.removeChildren();
    super.destroy({ children: true });
  }
}
