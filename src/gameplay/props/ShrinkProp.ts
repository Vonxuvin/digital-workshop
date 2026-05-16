import { Prop, PropConfig } from './Prop';
import { eventBus, GameEvents } from '../../utils/EventBus';
import { AnimationManager } from '../../utils/AnimationManager';

export class ShrinkProp extends Prop {
  private lastUseTime: number = 0;
  private cooldownMs: number = 2000;
  private shrinkFactor: number = 0.5;
  private shrinkDuration: number = 8000;
  private isActive: boolean = false;
  private remainingMs: number = 0;
  private shrinkTimerId: string | null = null;

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

    eventBus.emit(GameEvents.PROPS_SHRINK_ACTIVATE, {
      factor: this.shrinkFactor,
      duration: this.shrinkDuration,
    });

    return true;
  }

  private startShrinkTimer(): void {
    this.stopShrinkTimer();
    this.shrinkTimerId = AnimationManager.getInstance().register((deltaMS) => {
      this.remainingMs -= deltaMS;
      if (this.remainingMs <= 0) {
        this.deactivate();
      }
    }, `shrink_${this.config.id}`);
  }

  private stopShrinkTimer(): void {
    if (this.shrinkTimerId) {
      AnimationManager.getInstance().unregister(this.shrinkTimerId);
      this.shrinkTimerId = null;
    }
  }

  private deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.remainingMs = 0;
    this.stopShrinkTimer();
    eventBus.emit(GameEvents.PROPS_SHRINK_DEACTIVATE);
  }

  pause(): void {
    if (this.shrinkTimerId) {
      AnimationManager.getInstance().pause(this.shrinkTimerId);
    }
  }

  resume(): void {
    if (this.isActive && this.remainingMs > 0 && this.shrinkTimerId) {
      AnimationManager.getInstance().resume(this.shrinkTimerId);
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
