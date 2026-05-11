import { Container } from 'pixi.js';
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
  private stageContainer: Container | null = null;

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

  setStageContainer(container: Container): void {
    this.stageContainer = container;
  }

  createModifier(config: ModifierConfig): ContainerModifier | null {
    if (!this.containerWidth || !this.containerHeight) {
      console.error('[ModifierManager] 容器尺寸未设置');
      return null;
    }

    if (this.modifiers.has(config.type)) {
      console.warn(`[ModifierManager] 类型 ${config.type} 的修饰器已存在，将替换`);
      const existing = this.modifiers.get(config.type)!;
      existing.destroy();
    }

    let modifier: ContainerModifier;

    switch (config.type) {
      case 'paddle':
        modifier = new PaddleModifier(
          config as PaddleConfig,
          this.physics,
          this.containerWidth,
          this.containerHeight,
          this.stageContainer
        );
        break;
      case 'rotate':
        modifier = new RotateModifier(
          config as RotateConfig,
          this.physics,
          this.containerWidth,
          this.containerHeight,
          this.stageContainer
        );
        break;
      case 'shrink':
        modifier = new ShrinkModifier(
          config as ShrinkConfig,
          this.physics,
          this.containerWidth,
          this.containerHeight,
          this.containerHeight - 50,
          this.stageContainer
        );
        break;
      case 'fork':
        modifier = new ForkModifier(
          config as ForkConfig,
          this.physics,
          this.containerWidth,
          this.containerHeight,
          this.stageContainer
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
