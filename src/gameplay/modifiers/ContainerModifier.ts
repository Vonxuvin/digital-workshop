import Matter from 'matter-js';
import { Container } from 'pixi.js';
import { PhysicsManager } from '../../core/PhysicsManager';

export type ModifierType = 'paddle' | 'rotate' | 'shrink' | 'fork';

export interface ModifierConfig {
  type: ModifierType;
  enabled: boolean;
  triggerInterval?: number;    // 触发间隔（秒）
  duration?: number;           // 持续时间（秒）
  startDelay?: number;         // 首次触发延迟（秒）
}

export interface ModifierState {
  isActive: boolean;
  progress: number;            // 0-1
  elapsedTime: number;         // 已运行时间（毫秒）
  remainingTime: number;       // 剩余时间（毫秒）
}

export abstract class ContainerModifier {
  protected config: ModifierConfig;
  protected state: ModifierState;
  protected physics: PhysicsManager;
  protected timer: ReturnType<typeof setInterval> | null = null;
  protected startDelayTimer: ReturnType<typeof setTimeout> | null = null;
  protected stageContainer: Container | null = null;
  protected containerBodies: Matter.Body[] = [];

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
      this.startDelayTimer = setTimeout(() => {
        this.activate();
      }, this.config.startDelay * 1000);
    } else {
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
      this.timer = setInterval(() => {
        this.tick();
      }, 16);
    } else if (this.config.duration && this.config.duration > 0) {
      this.timer = setInterval(() => {
        this.tick();
      }, 16);
    }
  }

  protected abstract onActivate(): void;

  protected tick(): void {
    if (!this.state.isActive) return;
    this.state.elapsedTime += 16;
    if (this.config.duration && this.config.duration > 0) {
      this.state.remainingTime = Math.max(0, this.config.duration * 1000 - this.state.elapsedTime);
      this.state.progress = Math.min(1, this.state.elapsedTime / (this.config.duration * 1000));
      if (this.state.remainingTime <= 0) {
        this.deactivate();
      }
    }
    this.onTick();
  }

  protected abstract onTick(): void;

  deactivate(): void {
    if (!this.state.isActive) return;
    this.state.isActive = false;
    this.state.progress = 0;
    this.onDeactivate();
    this.clearTimers();
  }

  protected abstract onDeactivate(): void;

  pause(): void {
    this.clearTimers();
  }

  resume(): void {
    if (this.state.isActive) {
      this.timer = setInterval(() => {
        this.tick();
      }, 16);
    }
  }

  getState(): ModifierState {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  private clearTimers(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.startDelayTimer) {
      clearTimeout(this.startDelayTimer);
      this.startDelayTimer = null;
    }
  }

  destroy(): void {
    this.deactivate();
    this.clearTimers();
  }
}
