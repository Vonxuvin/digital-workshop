import { Container } from 'pixi.js';
import { MergeEffect } from '../ui/effects/MergeEffect';
import { ExplosionEffect } from '../ui/effects/ExplosionEffect';
import { FreezeEffect } from '../ui/effects/FreezeEffect';
import { IEffect } from '../ui/effects/IEffect';
import { GraphicsPool } from '../utils/GraphicsPool';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

const MAX_ACTIVE_EFFECTS = 20;
const MAX_TOTAL_PARTICLES_HIGH = 120;
const MAX_TOTAL_PARTICLES_MEDIUM = 60;
const MAX_TOTAL_PARTICLES_LOW = 30;

export class GameEffectManager {
  private stage: Container;
  private effects: IEffect[] = [];
  private freezeEffect: FreezeEffect | null = null;
  private _graphicsPool: GraphicsPool;
  private totalActiveParticles = 0;
  private performanceMonitor: PerformanceMonitor | null = null;

  constructor(stage: Container) {
    this.stage = stage;
    this._graphicsPool = new GraphicsPool(60);
    this._graphicsPool.setParent(stage);
  }

  get graphicsPool(): GraphicsPool {
    return this._graphicsPool;
  }

  setPerformanceMonitor(monitor: PerformanceMonitor): void {
    this.performanceMonitor = monitor;
  }

  private getMaxParticles(): number {
    if (!this.performanceMonitor) return MAX_TOTAL_PARTICLES_HIGH;
    switch (this.performanceMonitor.getQualityLevel()) {
      case 'high': return MAX_TOTAL_PARTICLES_HIGH;
      case 'medium': return MAX_TOTAL_PARTICLES_MEDIUM;
      case 'low': return MAX_TOTAL_PARTICLES_LOW;
      default: return MAX_TOTAL_PARTICLES_HIGH;
    }
  }

  canAddParticles(count: number): boolean {
    return this.totalActiveParticles + count <= this.getMaxParticles();
  }

  trackParticles(count: number): void {
    this.totalActiveParticles = Math.max(0, this.totalActiveParticles + count);
  }

  addMergeEffect(x: number, y: number, oldValue: number, newValue: number): void {
    this.cleanup();
    if (this.effects.length >= MAX_ACTIVE_EFFECTS) return;
    const particleCount = Math.min(newValue, 20);
    if (!this.canAddParticles(particleCount)) return;
    this.trackParticles(particleCount);
    const effect = new MergeEffect({
      x,
      y,
      oldNumber: oldValue,
      newNumber: newValue,
    }, undefined, this.graphicsPool);
    this.stage.addChild(effect);
    this.effects.push(effect);
  }

  addExplosionEffect(x: number, y: number, radius: number): void {
    this.cleanup();
    if (this.effects.length >= MAX_ACTIVE_EFFECTS) return;
    const particleCount = Math.min(Math.floor(radius / 5), 30);
    if (!this.canAddParticles(particleCount)) return;
    this.trackParticles(particleCount);
    const effect = new ExplosionEffect(x, y, radius, undefined, this.graphicsPool);
    this.stage.addChild(effect);
    this.effects.push(effect);
  }

  addFreezeEffect(width: number, height: number): void {
    this.removeFreezeEffect();
    this.freezeEffect = new FreezeEffect(width, height);
    this.stage.addChildAt(this.freezeEffect, 0);
    this.freezeEffect.playEntrance();
  }

  removeFreezeEffect(): void {
    if (this.freezeEffect) {
      this.freezeEffect.playExit();
      this.freezeEffect = null;
    }
  }

  cleanup(): void {
    this.effects = this.effects.filter(effect => {
      if (effect.destroyed) return false;
      if (effect.allComplete) return false;
      return true;
    });
    if (this.effects.length === 0) {
      this.totalActiveParticles = 0;
    }
  }

  clearAll(): void {
    this.effects.forEach(effect => effect.destroy());
    this.effects = [];
    this.totalActiveParticles = 0;
    if (this.freezeEffect) {
      this.freezeEffect.destroy();
      this.freezeEffect = null;
    }
    this.graphicsPool.releaseAll();
  }

  getEffects(): IEffect[] {
    const all = [...this.effects];
    if (this.freezeEffect) all.push(this.freezeEffect);
    return all;
  }

  destroy(): void {
    this.clearAll();
    this.graphicsPool.destroy();
  }
}
