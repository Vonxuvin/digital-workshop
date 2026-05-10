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
  private freezeEndTime: number = 0;

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
    this.freezeEndTime = Date.now() + this.freezeDuration;

    if (this.physicsManager) {
      this.physicsManager.stop();
    }

    this.eventBus.emit('props:freeze:activated', {
      duration: this.freezeDuration,
      endTime: this.freezeEndTime,
    });

    this.scheduleUnfreeze();

    return true;
  }

  private extendFreeze(): void {
    this.freezeEndTime = Date.now() + this.freezeDuration;
    this.eventBus.emit('props:freeze:extended', {
      additionalDuration: this.freezeDuration,
      endTime: this.freezeEndTime,
    });
  }

  private scheduleUnfreeze(): void {
    setTimeout(() => {
      this.unfreeze();
    }, this.freezeDuration);
  }

  private unfreeze(): void {
    if (!this.isFrozen) return;

    this.isFrozen = false;

    if (this.physicsManager) {
      this.physicsManager.start();
    }

    this.eventBus.emit('props:freeze:deactivated');
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
    return Math.max(0, this.freezeEndTime - Date.now());
  }

  destroy(): void {
    if (this.isFrozen) {
      this.unfreeze();
    }
    this.physicsManager = null;
    super.destroy();
  }
}
