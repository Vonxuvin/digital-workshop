import { Container } from 'pixi.js';
import { MergeEffect } from '../ui/effects/MergeEffect';
import { ExplosionEffect } from '../ui/effects/ExplosionEffect';
import { FreezeEffect } from '../ui/effects/FreezeEffect';
import { GraphicsPool } from '../utils/GraphicsPool';

export class GameEffectManager {
  private stage: Container;
  private effects: any[] = [];
  private freezeEffect: FreezeEffect | null = null;
  private _graphicsPool: GraphicsPool;

  constructor(stage: Container) {
    this.stage = stage;
    this._graphicsPool = new GraphicsPool(60);
    this._graphicsPool.setParent(stage);
  }

  get graphicsPool(): GraphicsPool {
    return this._graphicsPool;
  }

  addMergeEffect(x: number, y: number, oldValue: number, newValue: number): void {
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
      if ((effect as any).destroyed) return false;
      if ((effect as any).allComplete) return false;
      return true;
    });
  }

  clearAll(): void {
    this.effects.forEach(effect => effect.destroy());
    this.effects = [];
    if (this.freezeEffect) {
      this.freezeEffect.destroy();
      this.freezeEffect = null;
    }
    this.graphicsPool.releaseAll();
  }

  getEffects(): any[] {
    const all = [...this.effects];
    if (this.freezeEffect) all.push(this.freezeEffect);
    return all;
  }

  destroy(): void {
    this.clearAll();
    this.graphicsPool.destroy();
  }
}
