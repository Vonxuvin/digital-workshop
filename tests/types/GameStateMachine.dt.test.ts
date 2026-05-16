import { describe, it, expect } from 'vitest';
import { GameStateMachine, GameState } from '../../src/core/GameStateMachine';

describe('GameStateMachine DT Tests', () => {
  describe('GameState type constraints', () => {
    it('should accept all valid state values', () => {
      const validStates: GameState[] = ['boot', 'loading', 'menu', 'playing', 'paused', 'gameover', 'levelComplete'];
      for (const state of validStates) {
        const sm = new GameStateMachine(state);
        expect(sm.getCurrentState()).toBe(state);
      }
    });

    it('should have loading state in valid states', () => {
      const sm = new GameStateMachine('boot');
      expect(sm.canTransition('loading')).toBe(true);
    });
  });

  describe('method signatures', () => {
    it('should have transition method accepting GameState', () => {
      const sm = new GameStateMachine('boot');
      expect(typeof sm.transition).toBe('function');
    });

    it('should have getCurrentState returning GameState', () => {
      const sm = new GameStateMachine('boot');
      const state = sm.getCurrentState();
      expect(typeof state).toBe('string');
    });

    it('should have canTransition method accepting GameState', () => {
      const sm = new GameStateMachine('boot');
      expect(typeof sm.canTransition).toBe('function');
    });

    it('should have onEnter method accepting GameState and callback', () => {
      const sm = new GameStateMachine('boot');
      expect(typeof sm.onEnter).toBe('function');
    });

    it('should have offEnter method accepting GameState and callback', () => {
      const sm = new GameStateMachine('boot');
      expect(typeof sm.offEnter).toBe('function');
    });

    it('should have onAnyChange method accepting callback', () => {
      const sm = new GameStateMachine('boot');
      expect(typeof sm.onAnyChange).toBe('function');
    });

    it('should have offAnyChange method accepting callback', () => {
      const sm = new GameStateMachine('boot');
      expect(typeof sm.offAnyChange).toBe('function');
    });
  });

  describe('return types', () => {
    it('getCurrentState should return string type', () => {
      const sm = new GameStateMachine('boot');
      const state = sm.getCurrentState();
      expect(typeof state).toBe('string');
    });

    it('canTransition should return boolean type', () => {
      const sm = new GameStateMachine('boot');
      const result = sm.canTransition('loading');
      expect(typeof result).toBe('boolean');
    });

    it('transition should return boolean', () => {
      const sm = new GameStateMachine('boot');
      const result = sm.transition('loading');
      expect(typeof result).toBe('boolean');
      expect(result).toBe(true);
    });
  });

  describe('loading state transition types', () => {
    it('boot -> loading should be valid', () => {
      const sm = new GameStateMachine('boot');
      expect(sm.canTransition('loading')).toBe(true);
      sm.transition('loading');
      expect(sm.getCurrentState()).toBe('loading');
    });

    it('loading -> menu should be valid', () => {
      const sm = new GameStateMachine('loading');
      expect(sm.canTransition('menu')).toBe(true);
      sm.transition('menu');
      expect(sm.getCurrentState()).toBe('menu');
    });

    it('boot -> menu should not be valid (must go through loading)', () => {
      const sm = new GameStateMachine('boot');
      expect(sm.canTransition('menu')).toBe(false);
    });
  });

  describe('callback type constraints', () => {
    it('onAnyChange callback should receive (from: GameState, to: GameState)', () => {
      const sm = new GameStateMachine('boot');
      let receivedFrom: GameState | undefined;
      let receivedTo: GameState | undefined;
      sm.onAnyChange((from, to) => {
        receivedFrom = from;
        receivedTo = to;
      });
      sm.transition('loading');
      expect(typeof receivedFrom).toBe('string');
      expect(typeof receivedTo).toBe('string');
      expect(receivedFrom).toBe('boot');
      expect(receivedTo).toBe('loading');
    });

    it('onEnter callback should receive (from: GameState, to: GameState)', () => {
      const sm = new GameStateMachine('boot');
      let receivedFrom: GameState | undefined;
      let receivedTo: GameState | undefined;
      sm.onEnter('loading', (from, to) => {
        receivedFrom = from;
        receivedTo = to;
      });
      sm.transition('loading');
      expect(typeof receivedFrom).toBe('string');
      expect(typeof receivedTo).toBe('string');
    });
  });

  describe('state history type', () => {
    it('getPreviousState should return GameState or null', () => {
      const sm = new GameStateMachine('boot');
      expect(sm.getPreviousState()).toBeNull();
      sm.transition('loading');
      const prev = sm.getPreviousState();
      expect(prev === null || typeof prev === 'string').toBe(true);
      expect(prev).toBe('boot');
    });
  });
});
