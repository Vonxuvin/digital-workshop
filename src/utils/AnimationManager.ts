import { Ticker } from 'pixi.js';

export type AnimationCallback = (deltaMS: number) => void;

interface AnimationEntry {
  id: string;
  callback: AnimationCallback;
  active: boolean;
}

interface TimerEntry {
  id: string;
  callback: () => void;
  remainingMs: number;
  active: boolean;
  repeat: boolean;
}

export class AnimationManager {
  private static instance: AnimationManager | null = null;
  private entries: Map<string, AnimationEntry> = new Map();
  private timers: Map<string, TimerEntry> = new Map();
  private idCounter = 0;

  constructor() {}

  static setInstance(instance: AnimationManager): void {
    AnimationManager.instance = instance;
  }

  static getInstance(): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    return AnimationManager.instance;
  }

  static resetInstance(): void {
    if (AnimationManager.instance) {
      AnimationManager.instance.destroy();
    }
    AnimationManager.instance = null;
  }

  register(callback: AnimationCallback, id?: string): string {
    const entryId = id || `anim_${++this.idCounter}`;
    this.entries.set(entryId, { id: entryId, callback, active: true });
    return entryId;
  }

  registerOnce(callback: AnimationCallback, id?: string): string {
    const entryId = id || `anim_once_${++this.idCounter}`;
    const wrappedCallback: AnimationCallback = (deltaMS) => {
      this.entries.delete(entryId);
      callback(deltaMS);
    };
    this.entries.set(entryId, { id: entryId, callback: wrappedCallback, active: true });
    return entryId;
  }

  unregister(id: string): void {
    this.entries.delete(id);
  }

  pause(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.active = false;
    }
    const timer = this.timers.get(id);
    if (timer) {
      timer.active = false;
    }
  }

  resume(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.active = true;
    }
    const timer = this.timers.get(id);
    if (timer) {
      timer.active = true;
    }
  }

  pauseAll(): void {
    for (const entry of this.entries.values()) {
      entry.active = false;
    }
    for (const timer of this.timers.values()) {
      timer.active = false;
    }
  }

  resumeAll(): void {
    for (const entry of this.entries.values()) {
      entry.active = true;
    }
    for (const timer of this.timers.values()) {
      timer.active = true;
    }
  }

  setTimeout(callback: () => void, delayMs: number, id?: string): string {
    const timerId = id || `timer_${++this.idCounter}`;
    this.timers.set(timerId, {
      id: timerId,
      callback,
      remainingMs: delayMs,
      active: true,
      repeat: false,
    });
    return timerId;
  }

  setInterval(callback: () => void, intervalMs: number, id?: string): string {
    const timerId = id || `interval_${++this.idCounter}`;
    this.timers.set(timerId, {
      id: timerId,
      callback,
      remainingMs: intervalMs,
      active: true,
      repeat: true,
    });
    return timerId;
  }

  clearTimeout(id: string): void {
    this.timers.delete(id);
  }

  clearInterval(id: string): void {
    this.timers.delete(id);
  }

  update(deltaMS: number): void {
    for (const entry of this.entries.values()) {
      if (entry.active) {
        entry.callback(deltaMS);
      }
    }

    const expiredTimers: string[] = [];
    for (const timer of this.timers.values()) {
      if (!timer.active) continue;
      timer.remainingMs -= deltaMS;
      if (timer.remainingMs <= 0) {
        timer.callback();
        if (timer.repeat) {
          timer.remainingMs += Math.abs(timer.remainingMs);
        } else {
          expiredTimers.push(timer.id);
        }
      }
    }
    for (const id of expiredTimers) {
      this.timers.delete(id);
    }
  }

  getEntryCount(): number {
    return this.entries.size;
  }

  getActiveCount(): number {
    let count = 0;
    for (const entry of this.entries.values()) {
      if (entry.active) count++;
    }
    return count;
  }

  getTimerCount(): number {
    return this.timers.size;
  }

  destroy(): void {
    this.entries.clear();
    this.timers.clear();
  }
}
