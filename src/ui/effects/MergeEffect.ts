import * as PIXI from 'pixi.js';
import gsap from 'gsap';

export interface MergeEffectOptions {
  x: number;
  y: number;
  oldNumber: number;
  newNumber: number;
}

export class MergeEffect extends PIXI.Container {
  public allComplete: boolean = false;
  private timeline: gsap.core.Timeline | null = null;

  constructor(options: MergeEffectOptions, onComplete?: () => void) {
    super();
    this.createEffect(options, onComplete);
  }

  private createEffect(options: MergeEffectOptions, onComplete?: () => void): void {
    const { x: cx, y: cy } = options;

    const ring1 = new PIXI.Graphics();
    ring1.setStrokeStyle({ width: 3, color: 0xffd93d, alpha: 0.8 });
    ring1.circle(0, 0, 40);
    ring1.x = cx;
    ring1.y = cy;
    this.addChild(ring1);

    const ring2 = new PIXI.Graphics();
    ring2.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.6 });
    ring2.circle(0, 0, 60);
    ring2.x = cx;
    ring2.y = cy;
    this.addChild(ring2);

    const starPositions = [
      { x: cx - 30, y: cy - 30, color: 0xffd93d, size: 20 },
      { x: cx + 35, y: cy - 25, color: 0xff6b6b, size: 15 },
      { x: cx - 25, y: cy + 35, color: 0x4ecdc4, size: 18 },
      { x: cx + 30, y: cy + 30, color: 0xffffff, size: 12 },
    ];

    const stars: PIXI.Graphics[] = [];
    starPositions.forEach(sp => {
      const star = this.createStar(sp.color, sp.size);
      star.x = cx;
      star.y = cy;
      this.addChild(star);
      stars.push(star);
    });

    const flash = new PIXI.Graphics();
    flash.fill({ color: 0xffffff, alpha: 0.9 });
    flash.circle(0, 0, 25);
    flash.x = cx;
    flash.y = cy;
    flash.scale.set(0);
    this.addChild(flash);

    const numParticles = 16;
    const colors = [0xffd93d, 0xff6b6b, 0x4ecdc4, 0xffffff];
    const particles: PIXI.Graphics[] = [];
    for (let i = 0; i < numParticles; i++) {
      const particle = new PIXI.Graphics();
      const angle = (i / numParticles) * Math.PI * 2;
      const color = colors[i % 4];
      particle.fill({ color, alpha: 1 });
      particle.circle(0, 0, 4 + Math.random() * 4);
      particle.x = cx;
      particle.y = cy;
      this.addChild(particle);
      particles.push(particle);

      const targetX = cx + Math.cos(angle) * (60 + Math.random() * 40);
      const targetY = cy + Math.sin(angle) * (60 + Math.random() * 40);
      (particle as any)._targetX = targetX;
      (particle as any)._targetY = targetY;
    }

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.allComplete = true;
        if (onComplete) onComplete();
        this.destroy();
      },
    });

    this.timeline!.fromTo(flash.scale, { x: 0, y: 0 }, { x: 2, y: 2, duration: 0.3, ease: 'power2.out' }, 0);
    this.timeline!.to(flash, { alpha: 0, duration: 0.3, ease: 'power2.out' }, 0);

    this.timeline!.to(ring1.scale, { x: 1.8, y: 1.8, duration: 0.5, ease: 'power2.out' }, 0);
    this.timeline!.to(ring1, { alpha: 0, duration: 0.5, ease: 'power2.out' }, 0);

    this.timeline!.to(ring2.scale, { x: 1.5, y: 1.5, duration: 0.4, ease: 'power2.out' }, 0.1);
    this.timeline!.to(ring2, { alpha: 0, duration: 0.4, ease: 'power2.out' }, 0.1);

    particles.forEach((particle, i) => {
      const targetX = (particle as any)._targetX;
      const targetY = (particle as any)._targetY;
      this.timeline!.to(particle, { x: targetX, y: targetY, duration: 0.6, ease: 'power2.out' }, i * 0.02);
      this.timeline!.to(particle, { alpha: 0, duration: 0.6, ease: 'power2.out' }, i * 0.02);
      this.timeline!.to(particle.scale, { x: 0.3, y: 0.3, duration: 0.6, ease: 'power2.out' }, i * 0.02);
    });

    stars.forEach((star, i) => {
      const sp = starPositions[i];
      this.timeline!.to(star, { x: sp.x, y: sp.y, alpha: 0, duration: 0.5, ease: 'power2.out' }, i * 0.05);
      this.timeline!.to(star.scale, { x: 0.5, y: 0.5, duration: 0.5, ease: 'power2.out' }, i * 0.05);
    });
  }

  private createStar(color: number, size: number): PIXI.Graphics {
    const star = new PIXI.Graphics();
    star.fill({ color, alpha: 0.8 });
    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        star.moveTo(x, y);
      } else {
        star.lineTo(x, y);
      }
    }
    star.closePath();
    return star;
  }

  destroy(): void {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    super.destroy({ children: true });
  }
}
