import { Prop, PropConfig } from './Prop';
import { eventBus, GameEvents } from '../../utils/EventBus';

export class RainbowProp extends Prop {
  private eventBus = eventBus;
  private lastUseTime: number = 0;
  private cooldownMs: number = 1000;
  private rainbowBlocksRemaining: number = 0;

  constructor(config: PropConfig) {
    super(config);
  }

  use(): boolean {
    if (!this.canUse()) return false;

    this.usedCount++;
    this.lastUseTime = Date.now();
    this.rainbowBlocksRemaining = 3;

    this.eventBus.emit(GameEvents.PROPS_RAINBOW_ACTIVATED, {
      remainingBlocks: this.rainbowBlocksRemaining,
    });

    this.eventBus.emit(GameEvents.GAMEPLAY_NEXT_BLOCK, {
      isRainbow: true,
      remaining: this.rainbowBlocksRemaining,
    });

    return true;
  }

  cooldownReady(): boolean {
    if (this.usedCount === 0) return true;
    return Date.now() - this.lastUseTime >= this.cooldownMs;
  }

  isActive(): boolean {
    return this.rainbowBlocksRemaining > 0;
  }

  consumeRainbowBlock(): void {
    this.rainbowBlocksRemaining--;
    this.eventBus.emit(GameEvents.PROPS_RAINBOW_CONSUMED, {
      remainingBlocks: this.rainbowBlocksRemaining,
    });

    if (this.rainbowBlocksRemaining <= 0) {
      this.eventBus.emit(GameEvents.PROPS_RAINBOW_DEACTIVATED);
    }
  }

  getActiveCount(): number {
    return this.rainbowBlocksRemaining;
  }

  destroy(): void {
    super.destroy();
  }
}
