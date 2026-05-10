import * as PIXI from 'pixi.js';

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
  private completedCount: number = 0;
  private animationId: number = 0;
  private startTime: number = 0;

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
        particle.fill(defaultColor, 0.9);
        particle.circle(0, 0, 3 + Math.random() * 3);
        break;
      case 'confetti':
        const colors = [0xff6b6b, 0xffd93d, 0x4ecdc4, 0x9b59b6, 0x3498db];
        particle.fill(colors[Math.floor(Math.random() * colors.length)]);
        particle.rect(-3, -6, 6, 12);
        break;
      case 'smoke':
        particle.fill(0x888888, 0.3);
        particle.circle(0, 0, 10 + Math.random() * 10);
        break;
      case 'bubble':
        particle.setStrokeStyle({ width: 1, color: defaultColor, alpha: 0.5 });
        particle.fill(defaultColor, 0.1);
        particle.circle(0, 0, 5 + Math.random() * 8);
        break;
    }

    return particle;
  }

  private playAnimation(type: ParticleType): void {
    this.particles.forEach((p, i) => {
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

    this.startTime = performance.now();
    this.animate();
  }

  private animate(): void {
    const elapsed = (performance.now() - this.startTime) / 1000;
    let allComplete = true;

    this.particles.forEach(p => {
      const particleElapsed = elapsed - p.delay;
      if (particleElapsed < 0) {
        allComplete = false;
        return;
      }

      const progress = Math.min(particleElapsed / p.duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 2);

      p.graphics.x = p.startX + (p.targetX - p.startX) * easeProgress;
      p.graphics.y = p.startY + (p.targetY - p.startY) * easeProgress;
      p.graphics.alpha = 1 - easeProgress;
      const scale = 1 - 0.8 * easeProgress;
      p.graphics.scale.set(scale);
      
      if (p.rotationSpeed !== 0) {
        p.graphics.rotation = p.rotationSpeed * easeProgress;
      }

      if (progress < 1) allComplete = false;
    });

    if (allComplete) {
      this.finishAnimation();
      return;
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private finishAnimation(): void {
    this.completedCount++;
    if (this.completedCount >= this.particles.length) {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      if (this.onComplete) {
        this.onComplete();
      }
      this.destroy();
    }
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particles.forEach(p => p.graphics.destroy());
    this.particles = [];
    this.removeChildren();
    super.destroy({ children: true });
  }
}
