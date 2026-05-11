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
  protected _destroyed: boolean = false;

  constructor(config: PropConfig) {
    this.config = config;
  }

  abstract use(target?: any): boolean;

  canUse(): boolean {
    if (this._destroyed) return false;
    return this.usedCount < this.config.maxCount && this.cooldownReady();
  }

  cooldownReady(): boolean {
    return true;
  }

  getConfig(): PropConfig {
    return this.config;
  }

  getRemainingCount(): number {
    if (this._destroyed) return 0;
    return this.config.maxCount - this.usedCount;
  }

  reset(): void {
    if (this._destroyed) return;
    this.usedCount = 0;
  }

  get isDestroyed(): boolean {
    return this._destroyed;
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
  }
}
