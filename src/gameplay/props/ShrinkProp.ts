import * as PIXI from 'pixi.js';
import { Prop, PropConfig } from './Prop';
import { eventBus } from '../../utils/EventBus';

export class ShrinkProp extends Prop {
  private lastUseTime: number = 0;
  private cooldownMs: number = 2000;
  private shrinkFactor: number = 0.5;
  private shrinkDuration: number = 8000;
  private isActive: boolean = false;
  private remainingMs: number = 0;
  private tickerCallback: ((ticker: any) => void) | null = null;

  constructor(config: PropConfig) {
    super(config);
  }

  use(target?: any): boolean {
    if (!this.canUse()) return false;

    this.usedCount++;
    this.lastUseTime = Date.now();

    if (this.isActive) {
      this.remainingMs = this.shrinkDuration;
    } else {
      this.isActive = true;
      this.remainingMs = this.shrinkDuration;
      this.startShrinkTimer();
    }

    eventBus.emit('props:shrink:activate', {
      factor: this.shrinkFactor,
      duration: this.shrinkDuration,
    });

    return true;
  }

  private startShrinkTimer(): void {
    this.stopShrinkTimer();
    this.tickerCallback = (ticker: any) => {
      this.remainingMs -= ticker.deltaMS;
      if (this.remainingMs <= 0) {
        this.deactivate();
      }
    };
    PIXI.Ticker.shared.add(this.tickerCallback);
  }

  private stopShrinkTimer(): void {
    if (this.tickerCallback) {
      PIXI.Ticker.shared.remove(this.tickerCallback);
      this.tickerCallback = null;
    }
  }

  private deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.remainingMs = 0;
    this.stopShrinkTimer();
    eventBus.emit('props:shrink:deactivate');
  }

  pause(): void {
    this.stopShrinkTimer();
  }

  resume(): void {
    if (this.isActive && this.remainingMs > 0) {
      this.startShrinkTimer();
    }
  }

  isShrinkActive(): boolean {
    return this.isActive;
  }

  cooldownReady(): boolean {
    if (this.usedCount === 0) return true;
    return Date.now() - this.lastUseTime >= this.cooldownMs;
  }

  destroy(): void {
    this.stopShrinkTimer();
    super.destroy();
  }
}
