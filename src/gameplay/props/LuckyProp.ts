import { Prop, PropConfig } from './Prop';
import { eventBus } from '../../utils/EventBus';

export class LuckyProp extends Prop {
  private lastUseTime: number = 0;
  private cooldownMs: number = 3000;
  private bonusMultiplier: number = 2;
  private luckyRemainingDrops: number = 0;
  private readonly luckyDropCount = 3;

  constructor(config: PropConfig) {
    super(config);
  }

  use(target?: any): boolean {
    if (!this.canUse()) return false;

    this.usedCount++;
    this.lastUseTime = Date.now();
    this.luckyRemainingDrops = this.luckyDropCount;

    eventBus.emit('props:lucky:activate', {
      multiplier: this.bonusMultiplier,
      remainingDrops: this.luckyRemainingDrops,
    });

    return true;
  }

  consumeLuckyDrop(): void {
    if (this.luckyRemainingDrops > 0) {
      this.luckyRemainingDrops--;
      eventBus.emit('props:lucky:dropConsumed', {
        remainingDrops: this.luckyRemainingDrops,
      });
      if (this.luckyRemainingDrops <= 0) {
        eventBus.emit('props:lucky:deactivate');
      }
    }
  }

  isLuckyActive(): boolean {
    return this.luckyRemainingDrops > 0;
  }

  getLuckyMultiplier(): number {
    return this.luckyRemainingDrops > 0 ? this.bonusMultiplier : 1;
  }

  cooldownReady(): boolean {
    if (this.usedCount === 0) return true;
    return Date.now() - this.lastUseTime >= this.cooldownMs;
  }

  destroy(): void {
    super.destroy();
  }
}
