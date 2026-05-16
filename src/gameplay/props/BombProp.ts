import { Prop, PropConfig, PropTarget } from './Prop';
import { eventBus, GameEvents } from '../../utils/EventBus';
import { Block } from '../Block';

export class BombProp extends Prop {
  private eventBus = eventBus;
  private lastUseTime: number = 0;
  private cooldownMs: number = 1000;
  private radius: number = 120;

  constructor(config: PropConfig) {
    super(config);
  }

  use(target?: PropTarget): boolean {
    if (!this.canUse()) return false;
    
    if (!target) {
      this.eventBus.emit(GameEvents.PROPS_BOMB_REQUIRE_TARGET);
      return false;
    }

    this.usedCount++;
    this.lastUseTime = Date.now();
    
    this.eventBus.emit(GameEvents.PROPS_BOMB_EXPLODE, {
      x: target.x,
      y: target.y,
      radius: this.radius,
    });

    return true;
  }

  cooldownReady(): boolean {
    if (this.usedCount === 0) return true;
    return Date.now() - this.lastUseTime >= this.cooldownMs;
  }

  getAffectedBlocks(allBlocks: Block[], targetX: number, targetY: number): Block[] {
    return allBlocks.filter(block => {
      const dx = block.x - targetX;
      const dy = block.y - targetY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= this.radius;
    });
  }

  destroy(): void {
    super.destroy();
  }
}
