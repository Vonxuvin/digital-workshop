import Matter from 'matter-js';
import * as PIXI from 'pixi.js';
import { Container } from 'pixi.js';
import { PhysicsManager } from '../../core/PhysicsManager';
import { AnimationManager } from '../../utils/AnimationManager';

export type ModifierType = 'paddle' | 'rotate' | 'shrink' | 'fork';

export interface ModifierConfig {
  type: ModifierType;
  enabled: boolean;
  triggerInterval?: number;
  duration?: number;
  startDelay?: number;
}

export interface ModifierState {
  isActive: boolean;
  progress: number;
  elapsedTime: number;
  remainingTime: number;
}

export abstract class ContainerModifier {
  protected config: ModifierConfig;
  protected state: ModifierState;
  protected physics: PhysicsManager;
  protected animationId: string | null = null;
  protected stageContainer: Container | null = null;
  protected containerBodies: Matter.Body[] = [];
  private startDelayRemaining: number = 0;
  private startDelayAnimationId: string | null = null;

  protected collectContainerBodies(): void {
    this.containerBodies = this.physics.getContainerBodies();
  }

  constructor(config: ModifierConfig, physics: PhysicsManager, stageContainer?: Container | null) {
    this.config = config;
    this.physics = physics;
    this.stageContainer = stageContainer || null;
    this.state = {
      isActive: false,
      progress: 0,
      elapsedTime: 0,
      remainingTime: 0,
    };
  }

  abstract getType(): ModifierType;

  start(): void {
    if (this.config.startDelay && this.config.startDelay > 0) {
      this.startDelayRemaining = this.config.startDelay * 1000;
      this.startDelayAnimationId = AnimationManager.getInstance().register(
        (deltaMS) => this.tickStartDelay(deltaMS),
        `modifier_delay_${this.config.type}_${Date.now()}`
      );
    } else {
      this.activate();
    }
  }

  private tickStartDelay(deltaMS: number): void {
    this.startDelayRemaining -= deltaMS;
    if (this.startDelayRemaining <= 0) {
      if (this.startDelayAnimationId) {
        AnimationManager.getInstance().unregister(this.startDelayAnimationId);
        this.startDelayAnimationId = null;
      }
      this.activate();
    }
  }

  protected activate(): void {
    if (this.state.isActive) return;
    this.state.isActive = true;
    this.state.elapsedTime = 0;
    this.state.remainingTime = (this.config.duration || 0) * 1000;
    this.onActivate();

    if (this.config.triggerInterval && this.config.triggerInterval > 0) {
      this.animationId = AnimationManager.getInstance().register(
        (deltaMS) => this.tick(deltaMS),
        `modifier_${this.config.type}_${Date.now()}`
      );
    } else if (this.config.duration && this.config.duration > 0) {
      this.animationId = AnimationManager.getInstance().register(
        (deltaMS) => this.tick(deltaMS),
        `modifier_${this.config.type}_${Date.now()}`
      );
    }
  }

  protected abstract onActivate(): void;

  protected tick(deltaMS: number): void {
    if (!this.state.isActive) return;
    this.state.elapsedTime += deltaMS;
    if (this.config.duration && this.config.duration > 0) {
      this.state.remainingTime = Math.max(0, this.config.duration * 1000 - this.state.elapsedTime);
      this.state.progress = Math.min(1, this.state.elapsedTime / (this.config.duration * 1000));
      if (this.state.remainingTime <= 0) {
        this.deactivate();
      }
    }
    this.onTick(deltaMS);
  }

  protected abstract onTick(deltaMS: number): void;

  deactivate(): void {
    if (!this.state.isActive) return;
    this.state.isActive = false;
    this.state.progress = 0;
    this.onDeactivate();
    this.clearTimers();
  }

  protected abstract onDeactivate(): void;

  pause(): void {
    if (this.animationId) {
      AnimationManager.getInstance().pause(this.animationId);
    }
  }

  resume(): void {
    if (this.animationId) {
      AnimationManager.getInstance().resume(this.animationId);
    }
  }

  getState(): ModifierState {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  private clearTimers(): void {
    if (this.animationId) {
      AnimationManager.getInstance().unregister(this.animationId);
      this.animationId = null;
    }
    if (this.startDelayAnimationId) {
      AnimationManager.getInstance().unregister(this.startDelayAnimationId);
      this.startDelayAnimationId = null;
    }
  }

  destroy(): void {
    this.deactivate();
    this.clearTimers();
  }
}
