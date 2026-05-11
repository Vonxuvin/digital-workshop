import * as PIXI from 'pixi.js';

export class ExplosionEffect extends PIXI.Container {
  private centerX: number;
  private centerY: number;
  private radius: number;
  private onComplete: (() => void) | undefined;
  private rings: PIXI.Graphics[] = [];
  private particles: PIXI.Graphics[] = [];
  private flash!: PIXI.Graphics;
  private startTime: number = 0;
  public allComplete: boolean = false;
  private tickerCallback: ((ticker: any) => void) | null = null;
  private readonly DURATION = 0.8;

  constructor(centerX: number, centerY: number, radius: number, onComplete?: () => void) {
    super();
    this.centerX = centerX;
    this.centerY = centerY;
    this.radius = radius;
    this.onComplete = onComplete;
    this.createEffect();
    this.playAnimation();
  }

  private createEffect(): void {
    const numRings = 3;
    const numParticles = 12;

    for (let i = 0; i < numRings; i++) {
      const ring = new PIXI.Graphics();
      const ringRadius = (this.radius / numRings) * (i + 1);
      const alpha = 1 - (i * 0.2);

      ring.fill({ color: 0xff6b6b, alpha });
      ring.circle(0, 0, ringRadius);
      ring.x = this.centerX;
      ring.y = this.centerY;
      (ring as any).delay = i * 0.05;
      (ring as any).duration = 0.4;
      (ring as any).maxScale = 1.5;
      this.addChild(ring);
      this.rings.push(ring);
    }

    for (let i = 0; i < numParticles; i++) {
      const particle = new PIXI.Graphics();
      const angle = (i / numParticles) * Math.PI * 2;
      const distance = this.radius * 0.8;

      particle.fill({ color: 0xffd93d, alpha: 1 });
      particle.circle(0, 0, 8);
      particle.x = this.centerX;
      particle.y = this.centerY;
      (particle as any).targetX = this.centerX + Math.cos(angle) * distance;
      (particle as any).targetY = this.centerY + Math.sin(angle) * distance;
      (particle as any).delay = i * 0.02;
      (particle as any).duration = 0.6;
      this.addChild(particle);
      this.particles.push(particle);
    }

    this.flash = new PIXI.Graphics();
    this.flash.fill({ color: 0xffffff, alpha: 0.8 });
    this.flash.circle(0, 0, 30);
    this.flash.x = this.centerX;
    this.flash.y = this.centerY;
    this.addChild(this.flash);
  }

  private playAnimation(): void {
    this.startTime = performance.now();
    this.tickerCallback = () => this.animate();
    PIXI.Ticker.shared.add(this.tickerCallback);
  }

  private animate(): void {
    if (this.allComplete) return;

    const elapsed = (performance.now() - this.startTime) / 1000;
    let allComplete = true;

    this.rings.forEach((ring) => {
      const ringElapsed = elapsed - (ring as any).delay;
      if (ringElapsed < 0) {
        allComplete = false;
        return;
      }
      const progress = Math.min(ringElapsed / (ring as any).duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 2);
      ring.alpha = 1 - easeProgress;
      const scale = 1 + ((ring as any).maxScale - 1) * easeProgress;
      ring.scale.set(scale);
      if (progress < 1) allComplete = false;
    });

    this.particles.forEach((particle) => {
      const particleElapsed = elapsed - (particle as any).delay;
      if (particleElapsed < 0) {
        allComplete = false;
        return;
      }
      const progress = Math.min(particleElapsed / (particle as any).duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 2);

      const startX = this.centerX;
      const startY = this.centerY;
      const targetX = (particle as any).targetX;
      const targetY = (particle as any).targetY;

      particle.x = startX + (targetX - startX) * easeProgress;
      particle.y = startY + (targetY - startY) * easeProgress;
      particle.alpha = 1 - easeProgress;
      particle.scale.set(1 - easeProgress * 0.5);

      if (progress < 1) allComplete = false;
    });

    if (elapsed < 0.3) {
      const flashProgress = elapsed / 0.3;
      const easeFlash = 1 - Math.pow(1 - flashProgress, 2);
      this.flash.alpha = 0.8 * (1 - easeFlash);
      const flashScale = 1 + 2 * easeFlash;
      this.flash.scale.set(flashScale);
    } else {
      this.flash.alpha = 0;
    }

    if (allComplete && elapsed >= this.DURATION) {
      this.allComplete = true;
      this.animationComplete();
    }
  }

  private animationComplete(): void {
    this.detachTicker();
    if (this.onComplete) {
      this.onComplete();
    }
    this.destroy();
  }

  private detachTicker(): void {
    if (this.tickerCallback) {
      PIXI.Ticker.shared.remove(this.tickerCallback);
      this.tickerCallback = null;
    }
  }

  destroy(): void {
    this.detachTicker();
    super.destroy({ children: true });
  }
}
