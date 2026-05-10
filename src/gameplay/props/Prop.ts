export enum PropType {
  BOMB = 'bomb',
  RAINBOW = 'rainbow',
  FREEZE = 'freeze',
  SHRINK = 'shrink',
  LUCKY = 'lucky',
}

export interface PropConfig {
  id: string;
  type: PropType;
  name: string;
  description: string;
  icon: string;
  maxCount: number;
  cooldown: number;
  price: number;
}

export abstract class Prop {
  protected config: PropConfig;
  protected usedCount: number = 0;

  constructor(config: PropConfig) {
    this.config = config;
  }

  abstract use(target?: any): boolean;

  canUse(): boolean {
    return this.usedCount < this.config.maxCount && this.cooldownReady();
  }

  cooldownReady(): boolean {
    return true;
  }

  getConfig(): PropConfig {
    return this.config;
  }

  getRemainingCount(): number {
    return this.config.maxCount - this.usedCount;
  }

  reset(): void {
    this.usedCount = 0;
  }

  destroy(): void {
    this.config = {} as PropConfig;
  }
}
