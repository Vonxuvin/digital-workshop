import { logger } from '../utils/Logger';
export type GameState = 'boot' | 'loading' | 'menu' | 'playing' | 'paused' | 'gameover' | 'levelComplete';

type StateCallback = (from: GameState, to: GameState) => void;

const MAX_HISTORY_SIZE = 100;

const VALID_TRANSITIONS: Record<GameState, GameState[]> = {
  'boot': ['loading', 'menu'],
  'loading': ['menu'],
  'menu': ['playing'],
  'playing': ['paused', 'gameover', 'levelComplete', 'menu'],
  'paused': ['playing', 'menu'],
  'gameover': ['menu', 'playing', 'loading'],
  'levelComplete': ['menu', 'playing'],
};

export class GameStateMachine {
  private currentState: GameState;
  private readonly initialState: GameState;
  private stateHistory: GameState[] = [];
  private listeners: Map<GameState, StateCallback[]> = new Map();
  private globalListeners: StateCallback[] = [];

  constructor(initialState: GameState = 'menu') {
    this.currentState = initialState;
    this.initialState = initialState;
  }

  onEnter(state: GameState, callback: StateCallback): void {
    if (!this.listeners.has(state)) {
      this.listeners.set(state, []);
    }
    this.listeners.get(state)!.push(callback);
  }

  offEnter(state: GameState, callback: StateCallback): void {
    const callbacks = this.listeners.get(state);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  onAnyChange(callback: StateCallback): void {
    this.globalListeners.push(callback);
  }

  offAnyChange(callback: StateCallback): void {
    const index = this.globalListeners.indexOf(callback);
    if (index > -1) this.globalListeners.splice(index, 1);
  }

  transition(to: GameState): boolean {
    const from = this.currentState;
    if (from === to) return false;
    if (!this.canTransition(to)) {
      logger.warn('StateMachine', `非法状态转换: ${from} -> ${to}`);
      return false;
    }

    this.stateHistory.push(from);
    if (this.stateHistory.length > MAX_HISTORY_SIZE) {
      this.stateHistory.shift();
    }
    this.currentState = to;

    this.globalListeners.forEach(cb => {
      try {
        cb(from, to);
      } catch (error) {
        logger.error('StateMachine', '全局监听器执行出错:', error);
      }
    });

    const stateListeners = this.listeners.get(to) || [];
    stateListeners.forEach(cb => {
      try {
        cb(from, to);
      } catch (error) {
        logger.error('StateMachine', `状态监听器(${to})执行出错:`, error);
      }
    });

    logger.info('StateMachine', `${from} -> ${to}`);
    return true;
  }

  getCurrentState(): GameState {
    return this.currentState;
  }

  getPreviousState(): GameState | null {
    return this.stateHistory.length > 0
      ? this.stateHistory[this.stateHistory.length - 1]
      : null;
  }

  canTransition(to: GameState): boolean {
    return VALID_TRANSITIONS[this.currentState]?.includes(to) || false;
  }

  reset(): void {
    this.currentState = this.initialState;
    this.stateHistory = [];
  }
}
