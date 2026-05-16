import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { GraphicsPool } from '../../utils/GraphicsPool';
import { TimeManager } from '../../utils/TimeManager';
import { IEffect } from './IEffect';

export class ExplosionEffect extends PIXI.Container implements IEffect {
  public allComplete: boolean = false;
  private timeline: gsap.core.Timeline | null = null;
  private pooledObjects: PIXI.Graphics[] = [];
  private graphicsPool: GraphicsPool | null;

  constructor(centerX: number, centerY: number, radius: number, onComplete?: () => void, graphicsPool?: GraphicsPool) {
    super();
    this.graphicsPool = graphicsPool || null;
    this.createEffect(centerX, centerY, radius, onComplete);
  }

  private acquireGraphics(): PIXI.Graphics {
    if (this.graphicsPool) {
      const g = this.graphicsPool.acquire();
      this.pooledObjects.push(g);
      return g;
    }
    const g = new PIXI.Graphics();
    this.pooledObjects.push(g);
    return g;
  }

  private createEffect(cx: number, cy: number, radius: number, onComplete?: () => void): void {
    const numRings = 3;
    const numParticles = 12;

    const rings: PIXI.Graphics[] = [];
    for (let i = 0; i < numRings; i++) {
      const ring = this.acquireGraphics();
      const ringRadius = (radius / numRings) * (i + 1);
      const alpha = 1 - i * 0.2;
      ring.circle(0, 0, ringRadius);
      ring.fill({ color: 0xff6b6b, alpha });
      ring.x = cx;
      ring.y = cy;
      this.addChild(ring);
      rings.push(ring);
    }

    const particles: PIXI.Graphics[] = [];
    for (let i = 0; i < numParticles; i++) {
      const particle = this.acquireGraphics();
      const angle = (i / numParticles) * Math.PI * 2;
      const distance = radius * 0.8;
      particle.fill({ color: 0xffd93d, alpha: 1 });
      particle.circle(0, 0, 8);
      particle.x = cx;
      particle.y = cy;
      this.addChild(particle);
      particles.push(particle);

      const targetX = cx + Math.cos(angle) * distance;
      const targetY = cy + Math.sin(angle) * distance;
      (particle as any)._targetX = targetX;
      (particle as any)._targetY = targetY;
    }

    const flash = this.acquireGraphics();
    flash.fill({ color: 0xffffff, alpha: 0.8 });
    flash.circle(0, 0, 30);
    flash.x = cx;
    flash.y = cy;
    this.addChild(flash);

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.allComplete = true;
        if (onComplete) onComplete();
        this.destroy();
      },
    });

    TimeManager.getInstance().getGameTimeline().add(this.timeline, TimeManager.getInstance().getGameTimeline().time());

    this.timeline!.to(flash, { alpha: 0, duration: 0.3, ease: 'power2.out' }, 0);
    this.timeline!.to(flash.scale, { x: 3, y: 3, duration: 0.3, ease: 'power2.out' }, 0);

    rings.forEach((ring, i) => {
      this.timeline!.to(ring, { alpha: 0, duration: 0.4, ease: 'power2.out' }, i * 0.05);
      this.timeline!.to(ring.scale, { x: 1.5, y: 1.5, duration: 0.4, ease: 'power2.out' }, i * 0.05);
    });

    particles.forEach((particle, i) => {
      const targetX = (particle as any)._targetX;
      const targetY = (particle as any)._targetY;
      this.timeline!.to(particle, { x: targetX, y: targetY, alpha: 0, duration: 0.6, ease: 'power2.out' }, i * 0.02);
      this.timeline!.to(particle.scale, { x: 0.5, y: 0.5, duration: 0.6, ease: 'power2.out' }, i * 0.02);
    });
  }

  destroy(): void {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
    if (this.graphicsPool) {
      for (const g of this.pooledObjects) {
        if (g.parent) {
          g.parent.removeChild(g);
        }
        this.graphicsPool.release(g);
      }
    }
    this.pooledObjects = [];
    super.destroy({ children: !this.graphicsPool });
  }
}
