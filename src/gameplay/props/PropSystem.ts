import { eventBus, GameEvents } from '../../utils/EventBus';
import { Prop, PropConfig, PropType } from './Prop';
import { BombProp } from './BombProp';
import { RainbowProp } from './RainbowProp';
import { FreezeProp } from './FreezeProp';
import { ShrinkProp } from './ShrinkProp';
import { LuckyProp } from './LuckyProp';
import { PhysicsManager } from '../../core/PhysicsManager';

interface PropTypeMap {
  [PropType.BOMB]: BombProp;
  [PropType.RAINBOW]: RainbowProp;
  [PropType.FREEZE]: FreezeProp;
  [PropType.SHRINK]: ShrinkProp;
  [PropType.LUCKY]: LuckyProp;
}

export class PropSystem {
  private static instance: PropSystem | null = null;
  private props: Map<PropType, Prop> = new Map();
  private propsConfig: Map<string, PropConfig> = new Map();
  private eventBus = eventBus;
  private isPaused: boolean = false;
  private physicsManager: PhysicsManager | null = null;

  constructor() {}

  setPhysicsManager(physicsManager: PhysicsManager): void {
    this.physicsManager = physicsManager;
    this.props.forEach((prop) => {
      if (prop instanceof FreezeProp) {
        prop.setPhysicsManager(physicsManager);
      }
    });
  }

  static setInstance(instance: PropSystem): void {
    PropSystem.instance = instance;
  }

  /** @deprecated 使用依赖注入代替，保留向后兼容 */
  static getInstance(): PropSystem {
    if (!PropSystem.instance) {
      PropSystem.instance = new PropSystem();
    }
    return PropSystem.instance;
  }

  async loadConfig(configData: any[]): Promise<void> {
    for (const config of configData) {
      this.propsConfig.set(config.type, config as PropConfig);
    }
  }

  initialize(props: { type: PropType; count: number }[]): void {
    this.props.clear();
    for (const prop of props) {
      const config = this.propsConfig.get(prop.type);
      if (config) {
        const propInstance = this.createPropInstance(prop.type, config);
        if (propInstance instanceof FreezeProp && this.physicsManager) {
          propInstance.setPhysicsManager(this.physicsManager);
        }
        this.props.set(prop.type, propInstance);
      }
    }
    this.eventBus.emit(GameEvents.PROPS_INITIALIZED, { props: this.getAllProps() });
  }

  private createPropInstance(type: PropType, config: PropConfig): Prop {
    switch (type) {
      case PropType.BOMB:
        return new BombProp(config);
      case PropType.RAINBOW:
        return new RainbowProp(config);
      case PropType.FREEZE:
        return new FreezeProp(config);
      case PropType.SHRINK:
        return new ShrinkProp(config);
      case PropType.LUCKY:
        return new LuckyProp(config);
      default:
        throw new Error(`Unknown prop type: ${type}`);
    }
  }

  useProp(type: PropType, target?: any): boolean {
    if (this.isPaused) return false;
    
    const prop = this.props.get(type);
    if (!prop || !prop.canUse()) {
      this.eventBus.emit(GameEvents.PROPS_USE_FAILED, { type, reason: 'notAvailable' });
      return false;
    }

    const success = prop.use(target);
    if (success) {
      this.eventBus.emit(GameEvents.PROPS_USED, { type, remaining: prop.getRemainingCount() });
    }
    return success;
  }

  getProp<T extends PropType>(type: T): PropTypeMap[T] | undefined {
    return this.props.get(type) as PropTypeMap[T] | undefined;
  }

  getAllProps(): { type: PropType; config: PropConfig; remaining: number }[] {
    const result: { type: PropType; config: PropConfig; remaining: number }[] = [];
    this.props.forEach((prop, type) => {
      result.push({
        type,
        config: prop.getConfig(),
        remaining: prop.getRemainingCount(),
      });
    });
    return result;
  }

  getPropCount(type: PropType): number {
    const prop = this.props.get(type);
    return prop ? prop.getRemainingCount() : 0;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  reset(): void {
    this.props.forEach(prop => prop.reset());
    this.eventBus.emit(GameEvents.PROPS_RESET);
  }

  destroy(): void {
    this.props.forEach(prop => prop.destroy());
    this.props.clear();
    this.propsConfig.clear();
  }
}
