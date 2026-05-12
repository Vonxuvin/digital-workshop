import { Ticker } from 'pixi.js';

export type AnimationCallback = (deltaMS: number) => void;

interface AnimationEntry {
  id: string;
  callback: AnimationCallback;
  active: boolean;
}

export class AnimationManager {
  private static instance: AnimationManager | null = null;
  private entries: Map<string, AnimationEntry> = new Map();
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

  unregister(id: string): void {
    this.entries.delete(id);
  }

  pause(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.active = false;
    }
  }

  resume(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.active = true;
    }
  }

  pauseAll(): void {
    for (const entry of this.entries.values()) {
      entry.active = false;
    }
  }

  resumeAll(): void {
    for (const entry of this.entries.values()) {
      entry.active = true;
    }
  }

  update(deltaMS: number): void {
    for (const entry of this.entries.values()) {
      if (entry.active) {
        entry.callback(deltaMS);
      }
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

  destroy(): void {
    this.entries.clear();
  }
}
