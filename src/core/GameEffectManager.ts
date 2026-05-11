import { Container } from 'pixi.js';
import { MergeEffect } from '../ui/effects/MergeEffect';
import { ExplosionEffect } from '../ui/effects/ExplosionEffect';
import { FreezeEffect } from '../ui/effects/FreezeEffect';

export class GameEffectManager {
  private stage: Container;
  private effects: any[] = [];
  private freezeEffect: FreezeEffect | null = null;

  constructor(stage: Container) {
    this.stage = stage;
  }

  addMergeEffect(x: number, y: number, oldValue: number, newValue: number): void {
    const effect = new MergeEffect({
      x,
      y,
      oldNumber: oldValue,
      newNumber: newValue,
    });
    this.stage.addChild(effect);
    this.effects.push(effect);
  }

  addExplosionEffect(x: number, y: number, radius: number): void {
    const effect = new ExplosionEffect(x, y, radius);
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
      if (effect.isDestroyed || effect.allComplete) return false;
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
  }

  getEffects(): any[] {
    return this.effects;
  }
}
