type EventCallback = (...args: any[]) => void;

export const GameEvents = {
  BLOCK_MERGED: 'block:merged',
  BLOCK_DROPPED: 'block:dropped',
  GAME_OVER: 'game:over',
  GAME_TIMEOUT: 'game:timeout',
  LEVEL_COMPLETED: 'level:completed',
  LEVEL_TIME_UPDATE: 'level:timeUpdate',
  LEVEL_UNLOCKED: 'level:unlocked',
  LEVEL_PROGRESS_UPDATED: 'level:progress:updated',
  UI_START_GAME: 'ui:startGame',
  UI_SELECT_LEVEL: 'ui:selectLevel',
  UI_PAUSE: 'ui:pause',
  UI_RESUME: 'ui:resume',
  UI_RESTART: 'ui:restart',
  UI_BACK_TO_MENU: 'ui:backToMenu',
  UI_NEXT_LEVEL: 'ui:nextLevel',
  UI_LEVEL_SELECT: 'ui:levelSelect',
  UI_REVIVE: 'ui:revive',
  UI_PROP_TARGET_MODE: 'ui:propTargetMode',
  UI_SETTINGS: 'ui:settings',
  UI_SETTINGS_CLOSED: 'ui:settingsClosed',
  UI_BUTTON_CLICK: 'ui:buttonClick',
  PROPS_BOMB_EXPLODE: 'props:bomb:explode',
  PROPS_BOMB_REQUIRE_TARGET: 'props:bomb:requireTarget',
  PROPS_FREEZE_ACTIVATED: 'props:freeze:activated',
  PROPS_FREEZE_DEACTIVATED: 'props:freeze:deactivated',
  PROPS_FREEZE_EXTENDED: 'props:freeze:extended',
  PROPS_RAINBOW_ACTIVATED: 'props:rainbow:activated',
  PROPS_RAINBOW_CONSUMED: 'props:rainbow:consumed',
  PROPS_RAINBOW_DEACTIVATED: 'props:rainbow:deactivated',
  PROPS_SHRINK_ACTIVATE: 'props:shrink:activate',
  PROPS_SHRINK_DEACTIVATE: 'props:shrink:deactivate',
  PROPS_LUCKY_ACTIVATE: 'props:lucky:activate',
  PROPS_LUCKY_DEACTIVATE: 'props:lucky:deactivate',
  PROPS_LUCKY_DROP_CONSUMED: 'props:lucky:dropConsumed',
  PROPS_USED: 'props:used',
  PROPS_USE_FAILED: 'props:useFailed',
  PROPS_INITIALIZED: 'props:initialized',
  PROPS_RESET: 'props:reset',
  GAMEPLAY_NEXT_BLOCK: 'gameplay:nextBlock',
  OBSTACLE_CLEARED: 'obstacle:cleared',
  SCORE_UPDATED: 'score:updated',
  SCORE_CHAIN_ENDED: 'score:chainEnded',
  WARNING_STARTED: 'warning:started',
  WARNING_ENDED: 'warning:ended',
  TUTORIAL_COMPLETED: 'tutorial:completed',
  SAVE_LOADED: 'save:loaded',
  SAVE_SAVED: 'save:saved',
  SAVE_RESET: 'save:reset',
  SAVE_IMPORTED: 'save:imported',
  STARS_EARNED: 'stars:earned',
  COINS_CHANGED: 'coins:changed',
  DIAMONDS_CHANGED: 'diamonds:changed',
  SETTINGS_CHANGED: 'settings:changed',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  SKIN_UNLOCKED: 'skin:unlocked',
  TALENT_UNLOCKED: 'talent:unlocked',
  AUDIO_MUTE_CHANGED: 'audio:muteChanged',
} as const;

export type GameEvent = (typeof GameEvents)[keyof typeof GameEvents];

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
