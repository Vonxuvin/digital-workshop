export type GameState = 'menu' | 'playing' | 'paused' | 'gameover' | 'levelComplete';

type StateCallback = (from: GameState, to: GameState) => void;

export class GameStateMachine {
  private currentState: GameState = 'menu';
  private stateHistory: GameState[] = [];
  private listeners: Map<GameState, StateCallback[]> = new Map();
  private globalListeners: StateCallback[] = [];

  onEnter(state: GameState, callback: StateCallback): void {
    if (!this.listeners.has(state)) {
      this.listeners.set(state, []);
    }
    this.listeners.get(state)!.push(callback);
  }

  onAnyChange(callback: StateCallback): void {
    this.globalListeners.push(callback);
  }

  transition(to: GameState): void {
    const from = this.currentState;
    if (from === to) return;

    this.stateHistory.push(from);
    this.currentState = to;

    this.globalListeners.forEach(cb => cb(from, to));

    const stateListeners = this.listeners.get(to) || [];
    stateListeners.forEach(cb => cb(from, to));

    console.log(`[StateMachine] ${from} -> ${to}`);
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
    const validTransitions: Record<GameState, GameState[]> = {
      'menu': ['playing'],
      'playing': ['paused', 'gameover', 'levelComplete'],
      'paused': ['playing', 'menu'],
      'gameover': ['menu', 'playing'],
      'levelComplete': ['menu', 'playing'],
    };
    return validTransitions[this.currentState]?.includes(to) || false;
  }

  reset(): void {
    this.currentState = 'menu';
    this.stateHistory = [];
  }
}
