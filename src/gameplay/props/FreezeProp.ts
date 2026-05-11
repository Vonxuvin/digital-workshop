import * as PIXI from 'pixi.js';
import { Prop, PropConfig } from './Prop';
import { eventBus } from '../../utils/EventBus';
import { PhysicsManager } from '../../core/PhysicsManager';

export class FreezeProp extends Prop {
  private eventBus = eventBus;
  private physicsManager: PhysicsManager | null = null;
  private lastUseTime: number = 0;
  private cooldownMs: number = 1000;
  private freezeDuration: number = 5000;
  private isFrozen: boolean = false;
  private remainingFreezeMs: number = 0;
  private tickerCallback: ((ticker: any) => void) | null = null;

  constructor(config: PropConfig) {
    super(config);
  }

  setPhysicsManager(physicsManager: PhysicsManager): void {
    this.physicsManager = physicsManager;
  }

  use(): boolean {
    if (!this.canUse()) return false;
    if (this.isFrozen) {
      this.extendFreeze();
      return true;
    }

    this.usedCount++;
    this.lastUseTime = Date.now();
    this.isFrozen = true;
    this.remainingFreezeMs = this.freezeDuration;

    if (this.physicsManager) {
      this.physicsManager.stop();
    }

    this.eventBus.emit('props:freeze:activated', {
      duration: this.freezeDuration,
    });

    this.startFreezeTimer();

    return true;
  }

  private startFreezeTimer(): void {
    this.stopFreezeTimer();
    this.tickerCallback = (ticker: any) => {
      this.remainingFreezeMs -= ticker.deltaMS;
      if (this.remainingFreezeMs <= 0) {
        this.unfreeze();
      }
    };
    PIXI.Ticker.shared.add(this.tickerCallback);
  }

  private stopFreezeTimer(): void {
    if (this.tickerCallback) {
      PIXI.Ticker.shared.remove(this.tickerCallback);
      this.tickerCallback = null;
    }
  }

  private extendFreeze(): void {
    this.remainingFreezeMs += this.freezeDuration;
    this.eventBus.emit('props:freeze:extended', {
      additionalDuration: this.freezeDuration,
    });
  }

  private unfreeze(): void {
    if (!this.isFrozen) return;

    this.isFrozen = false;
    this.remainingFreezeMs = 0;
    this.stopFreezeTimer();

    if (this.physicsManager) {
      this.physicsManager.start();
    }

    this.eventBus.emit('props:freeze:deactivated');
  }

  pause(): void {
    this.stopFreezeTimer();
  }

  resume(): void {
    if (this.isFrozen && this.remainingFreezeMs > 0) {
      this.startFreezeTimer();
    }
  }

  cooldownReady(): boolean {
    if (this.usedCount === 0) return true;
    return Date.now() - this.lastUseTime >= this.cooldownMs;
  }

  isCurrentlyFrozen(): boolean {
    return this.isFrozen;
  }

  getRemainingFreezeTime(): number {
    if (!this.isFrozen) return 0;
    return Math.max(0, this.remainingFreezeMs);
  }

  destroy(): void {
    if (this.isFrozen) {
      this.unfreeze();
    }
    this.physicsManager = null;
    super.destroy();
  }
}
