import { EventBus, eventBus } from '../../utils/EventBus';
import { ContainerModifier, ModifierConfig, ModifierType } from './ContainerModifier';
import { PaddleModifier, PaddleConfig } from './PaddleModifier';
import { RotateModifier, RotateConfig } from './RotateModifier';
import { ShrinkModifier, ShrinkConfig } from './ShrinkModifier';
import { ForkModifier, ForkConfig } from './ForkModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export class ModifierManager {
  private static instance: ModifierManager;
  private modifiers: Map<ModifierType, ContainerModifier> = new Map();
  private physics: PhysicsManager;
  private eventBus: EventBus;
  private containerWidth: number = 0;
  private containerHeight: number = 0;
  private isPaused: boolean = false;

  private constructor(physics: PhysicsManager) {
    this.physics = physics;
    this.eventBus = eventBus;
  }

  static getInstance(physics?: PhysicsManager): ModifierManager {
    if (!ModifierManager.instance) {
      if (!physics) {
        throw new Error('[ModifierManager] 首次初始化需要提供 PhysicsManager');
      }
      ModifierManager.instance = new ModifierManager(physics);
    }
    return ModifierManager.instance;
  }

  static resetInstance(): void {
    ModifierManager.instance = null as any;
  }

  setContainerSize(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
  }

  createModifier(config: ModifierConfig): ContainerModifier | null {
    if (!this.containerWidth || !this.containerHeight) {
      console.error('[ModifierManager] 容器尺寸未设置');
      return null;
    }

    let modifier: ContainerModifier;

    switch (config.type) {
      case 'paddle':
        modifier = new PaddleModifier(
          config as PaddleConfig,
          this.physics,
          this.containerWidth,
          this.containerHeight
        );
        break;
      case 'rotate':
        modifier = new RotateModifier(
          config as RotateConfig,
          this.physics,
          this.containerWidth,
          this.containerHeight
        );
        break;
      case 'shrink':
        modifier = new ShrinkModifier(
          config as ShrinkConfig,
          this.physics,
          this.containerWidth,
          this.containerHeight,
          this.containerHeight - 50
        );
        break;
      case 'fork':
        modifier = new ForkModifier(
          config as ForkConfig,
          this.physics,
          this.containerWidth,
          this.containerHeight
        );
        break;
      default:
        console.warn(`[ModifierManager] 不支持的变形类型: ${config.type}`);
        return null;
    }

    this.modifiers.set(config.type, modifier);
    return modifier;
  }

  loadFromLevelConfig(modifiersConfig: ModifierConfig[]): void {
    this.clearAll();
    for (const config of modifiersConfig) {
      if (config.enabled) {
        this.createModifier(config);
      }
    }
  }

  startAll(): void {
    this.modifiers.forEach(modifier => {
      if (!modifier.isActive()) {
        modifier.start();
      }
    });
  }

  stopAll(): void {
    this.modifiers.forEach(modifier => {
      modifier.deactivate();
    });
  }

  pauseAll(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.modifiers.forEach(modifier => modifier.pause());
  }

  resumeAll(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.modifiers.forEach(modifier => modifier.resume());
  }

  getModifier(type: ModifierType): ContainerModifier | undefined {
    return this.modifiers.get(type);
  }

  getAllModifiers(): ContainerModifier[] {
    return Array.from(this.modifiers.values());
  }

  clearAll(): void {
    this.modifiers.forEach(modifier => modifier.destroy());
    this.modifiers.clear();
  }

  destroy(): void {
    this.clearAll();
    ModifierManager.instance = null as any;
  }
}
