import { Prop, PropConfig } from './Prop';
import { eventBus } from '../../utils/EventBus';

export class ShrinkProp extends Prop {
  private lastUseTime: number = 0;
  private cooldownMs: number = 2000;
  private shrinkFactor: number = 0.5;

  constructor(config: PropConfig) {
    super(config);
  }

  use(target?: any): boolean {
    if (!this.canUse()) return false;

    this.usedCount++;
    this.lastUseTime = Date.now();

    eventBus.emit('props:shrink:activate', {
      factor: this.shrinkFactor,
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
