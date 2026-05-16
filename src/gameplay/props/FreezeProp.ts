import { Prop, PropConfig } from './Prop';
import { eventBus, GameEvents } from '../../utils/EventBus';
import { PhysicsManager } from '../../core/PhysicsManager';
import { AnimationManager } from '../../utils/AnimationManager';

export class FreezeProp extends Prop {
  private eventBus = eventBus;
  private physicsManager: PhysicsManager | null = null;
  private lastUseTime: number = 0;
  private cooldownMs: number = 1000;
  private freezeDuration: number = 5000;
  private isFrozen: boolean = false;
  private remainingFreezeMs: number = 0;
  private freezeTimerId: string | null = null;

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

    this.eventBus.emit(GameEvents.PROPS_FREEZE_ACTIVATED, {
      duration: this.freezeDuration,
    });

    this.startFreezeTimer();

    return true;
  }

  private startFreezeTimer(): void {
    this.stopFreezeTimer();
    this.freezeTimerId = AnimationManager.getInstance().register((deltaMS) => {
      this.remainingFreezeMs -= deltaMS;
      if (this.remainingFreezeMs <= 0) {
        this.unfreeze();
      }
    }, `freeze_${this.config.id}`);
  }

  private stopFreezeTimer(): void {
    if (this.freezeTimerId) {
      AnimationManager.getInstance().unregister(this.freezeTimerId);
      this.freezeTimerId = null;
    }
  }

  private extendFreeze(): void {
    this.remainingFreezeMs += this.freezeDuration;
    this.eventBus.emit(GameEvents.PROPS_FREEZE_EXTENDED, {
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

    this.eventBus.emit(GameEvents.PROPS_FREEZE_DEACTIVATED);
  }

  pause(): void {
    if (this.freezeTimerId) {
      AnimationManager.getInstance().pause(this.freezeTimerId);
    }
  }

  resume(): void {
    if (this.isFrozen && this.remainingFreezeMs > 0 && this.freezeTimerId) {
      AnimationManager.getInstance().resume(this.freezeTimerId);
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
