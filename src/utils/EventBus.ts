type EventCallback = (...args: any[]) => void;

export class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  once(event: string, callback: EventCallback): void {
    const wrapper: EventCallback = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  offAll(event: string): void {
    this.events.delete(event);
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const snapshot = [...callbacks];
      for (const cb of snapshot) {
        try {
          cb(...args);
        } catch (error) {
          console.error(`[EventBus] 事件 "${event}" 回调执行出错:`, error);
        }
      }
    }
  }
}

export const eventBus = new EventBus();
