import { Prop, PropConfig } from './Prop';
import { eventBus } from '../../utils/EventBus';

export class LuckyProp extends Prop {
  private lastUseTime: number = 0;
  private cooldownMs: number = 3000;
  private bonusMultiplier: number = 2;

  constructor(config: PropConfig) {
    super(config);
  }

  use(target?: any): boolean {
    if (!this.canUse()) return false;

    this.usedCount++;
    this.lastUseTime = Date.now();

    eventBus.emit('props:lucky:activate', {
      multiplier: this.bonusMultiplier,
    });

    return true;
  }

  cooldownReady(): boolean {
    if (this.usedCount === 0) return true;
    return Date.now() - this.lastUseTime >= this.cooldownMs;
  }

  destroy(): void {
    super.destroy();
  }
}
