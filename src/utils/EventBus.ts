type EventCallback = (...args: any[]) => void;

export class EventBus {
  private events: Map<string, EventCallback[]> = new Map();
  private namespaces: Map<string, Set<string>> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  onInNamespace(namespace: string, event: string, callback: EventCallback): void {
    this.on(event, callback);
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Set());
    }
    this.namespaces.get(namespace)!.add(event);
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

  offNamespace(namespace: string): void {
    const events = this.namespaces.get(namespace);
    if (events) {
      for (const event of events) {
        this.events.delete(event);
      }
      this.namespaces.delete(namespace);
    }
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

  createNamespace(namespace: string): NamespacedEventBus {
    return new NamespacedEventBus(this, namespace);
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length ?? 0;
  }

  destroy(): void {
    this.events.clear();
    this.namespaces.clear();
  }
}

export class NamespacedEventBus {
  private bus: EventBus;
  private namespace: string;
  private registeredEvents: Set<string> = new Set();
  private callbacks: Map<string, EventCallback> = new Map();

  constructor(bus: EventBus, namespace: string) {
    this.bus = bus;
    this.namespace = namespace;
  }

  on(event: string, callback: EventCallback): void {
    this.bus.onInNamespace(this.namespace, event, callback);
    this.registeredEvents.add(event);
    this.callbacks.set(event, callback);
  }

  once(event: string, callback: EventCallback): void {
    const wrapper: EventCallback = (...args) => {
      this.registeredEvents.delete(event);
      this.callbacks.delete(event);
      this.bus.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  off(event: string): void {
    const cb = this.callbacks.get(event);
    if (cb) {
      this.bus.off(event, cb);
      this.registeredEvents.delete(event);
      this.callbacks.delete(event);
    }
  }

  emit(event: string, ...args: any[]): void {
    this.bus.emit(event, ...args);
  }

  offAll(): void {
    for (const [event, cb] of this.callbacks) {
      this.bus.off(event, cb);
    }
    this.registeredEvents.clear();
    this.callbacks.clear();
    this.bus.offNamespace(this.namespace);
  }
}

export const eventBus = new EventBus();
