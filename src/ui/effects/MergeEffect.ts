import * as PIXI from 'pixi.js';

export interface MergeEffectOptions {
  x: number;
  y: number;
  oldNumber: number;
  newNumber: number;
}

export class MergeEffect extends PIXI.Container {
  private centerX: number;
  private centerY: number;
  private onComplete: (() => void) | undefined;
  private animationId: number = 0;
  private startTime: number = 0;
  private rings: PIXI.Graphics[] = [];
  private stars: PIXI.Graphics[] = [];
  private particles: PIXI.Graphics[] = [];
  private flash!: PIXI.Graphics;
  private allComplete: boolean = false;

  constructor(options: MergeEffectOptions, onComplete?: () => void) {
    super();
    this.centerX = options.x;
    this.centerY = options.y;
    this.onComplete = onComplete;
    this.createEffect();
    this.playAnimation();
  }

  private createEffect(): void {
    const ring1 = new PIXI.Graphics();
    ring1.setStrokeStyle({ width: 3, color: 0xffd93d, alpha: 0.8 });
    ring1.circle(0, 0, 40);
    ring1.x = this.centerX;
    ring1.y = this.centerY;
    this.addChild(ring1);
    this.rings.push(ring1);

    const ring2 = new PIXI.Graphics();
    ring2.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.6 });
    ring2.circle(0, 0, 60);
    ring2.x = this.centerX;
    ring2.y = this.centerY;
    this.addChild(ring2);
    this.rings.push(ring2);

    const star1 = this.createStar(0xffd93d, 20);
    star1.x = this.centerX - 30;
    star1.y = this.centerY - 30;
    this.addChild(star1);
    this.stars.push(star1);

    const star2 = this.createStar(0xff6b6b, 15);
    star2.x = this.centerX + 35;
    star2.y = this.centerY - 25;
    this.addChild(star2);
    this.stars.push(star2);

    const star3 = this.createStar(0x4ecdc4, 18);
    star3.x = this.centerX - 25;
    star3.y = this.centerY + 35;
    this.addChild(star3);
    this.stars.push(star3);

    const star4 = this.createStar(0xffffff, 12);
    star4.x = this.centerX + 30;
    star4.y = this.centerY + 30;
    this.addChild(star4);
    this.stars.push(star4);

    this.flash = new PIXI.Graphics();
    this.flash.fill(0xffffff, 0.9);
    this.flash.circle(0, 0, 25);
    this.flash.x = this.centerX;
    this.flash.y = this.centerY;
    this.flash.scale.set(0);
    this.addChild(this.flash);

    const numParticles = 16;
    const colors = [0xffd93d, 0xff6b6b, 0x4ecdc4, 0xffffff];
    for (let i = 0; i < numParticles; i++) {
      const particle = new PIXI.Graphics();
      const angle = (i / numParticles) * Math.PI * 2;
      const color = colors[i % 4];
      
      particle.fill(color, 1);
      particle.circle(0, 0, 4 + Math.random() * 4);
      particle.x = this.centerX;
      particle.y = this.centerY;
      (particle as any).targetX = this.centerX + Math.cos(angle) * (60 + Math.random() * 40);
      (particle as any).targetY = this.centerY + Math.sin(angle) * (60 + Math.random() * 40);
      this.addChild(particle);
      this.particles.push(particle);
    }
  }

  private createStar(color: number, size: number): PIXI.Graphics {
    const star = new PIXI.Graphics();
    star.fill(color, 0.8);
    
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

  private playAnimation(): void {
    this.startTime = performance.now();
    this.animate();
  }

  private animate(): void {
    if (this.allComplete) return;
    
    const elapsed = (performance.now() - this.startTime) / 1000;

    if (elapsed < 0.3) {
      const progress = elapsed / 0.3;
      this.flash.scale.set(progress * 2);
      this.flash.alpha = 1 - progress;
    } else {
      this.flash.alpha = 0;
    }

    const ring1Progress = Math.min(elapsed / 0.5, 1);
    const ease1 = 1 - Math.pow(1 - ring1Progress, 2);
    const ring1 = this.rings[0];
    ring1.scale.set(1 + 0.8 * ease1);
    ring1.alpha = 1 - ease1;

    const ring2Progress = Math.min(Math.max(0, elapsed - 0.1) / 0.4, 1);
    const ease2 = 1 - Math.pow(1 - ring2Progress, 2);
    const ring2 = this.rings[1];
    ring2.scale.set(1 + 0.5 * ease2);
    ring2.alpha = 1 - ease2;

    let particlesDone = 0;
    this.particles.forEach((particle, i) => {
      const particleProgress = Math.min(Math.max(0, elapsed - i * 0.02) / 0.6, 1);
      const easeP = 1 - Math.pow(1 - particleProgress, 2);
      const targetX = (particle as any).targetX;
      const targetY = (particle as any).targetY;
      particle.x = this.centerX + (targetX - this.centerX) * easeP;
      particle.y = this.centerY + (targetY - this.centerY) * easeP;
      particle.alpha = 1 - easeP;
      particle.scale.set(1 - 0.7 * easeP);
      if (particleProgress >= 1) particlesDone++;
    });

    this.stars.forEach((star, i) => {
      const starProgress = Math.min(Math.max(0, elapsed - i * 0.05) / 0.5, 1);
      const easeS = 1 - Math.pow(1 - starProgress, 2);
      const targetX = this.centerX + (star.x - this.centerX) * easeS;
      const targetY = this.centerY + (star.y - this.centerY) * easeS;
      star.x = targetX;
      star.y = targetY;
      star.alpha = 1 - easeS;
      star.scale.set(1 - 0.5 * easeS);
    });

    const allDone = ring1Progress >= 1 && ring2Progress >= 1 && particlesDone === this.particles.length;
    
    if (allDone) {
      this.allComplete = true;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      this.animationComplete();
      return;
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private animationComplete(): void {
    if (this.onComplete) {
      this.onComplete();
    }
    this.destroy();
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    super.destroy({ children: true });
  }
}
