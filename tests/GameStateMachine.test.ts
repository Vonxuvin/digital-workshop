import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameStateMachine } from '../src/core/GameStateMachine';

describe('GameStateMachine', () => {
  let sm: GameStateMachine;

  beforeEach(() => {
    sm = new GameStateMachine();
  });

  it('should start in menu state', () => {
    expect(sm.getCurrentState()).toBe('menu');
  });

  it('should transition from menu to playing', () => {
    sm.transition('playing');
    expect(sm.getCurrentState()).toBe('playing');
  });

  it('should not transition to same state', () => {
    sm.transition('menu');
    expect(sm.getCurrentState()).toBe('menu');
  });

  it('should track state history', () => {
    sm.transition('playing');
    expect(sm.getPreviousState()).toBe('menu');
  });

  it('should return null previous state initially', () => {
    expect(sm.getPreviousState()).toBeNull();
  });

  it('should validate transitions correctly', () => {
    expect(sm.canTransition('playing')).toBe(true);
    expect(sm.canTransition('paused')).toBe(false);
    expect(sm.canTransition('gameover')).toBe(false);
  });

  it('should validate playing transitions', () => {
    sm.transition('playing');
    expect(sm.canTransition('paused')).toBe(true);
    expect(sm.canTransition('gameover')).toBe(true);
    expect(sm.canTransition('levelComplete')).toBe(true);
    expect(sm.canTransition('menu')).toBe(false);
  });

  it('should validate paused transitions', () => {
    sm.transition('playing');
    sm.transition('paused');
    expect(sm.canTransition('playing')).toBe(true);
    expect(sm.canTransition('menu')).toBe(true);
  });

  it('should validate gameover transitions', () => {
    sm.transition('playing');
    sm.transition('gameover');
    expect(sm.canTransition('menu')).toBe(true);
    expect(sm.canTransition('playing')).toBe(true);
  });

  it('should validate levelComplete transitions', () => {
    sm.transition('playing');
    sm.transition('levelComplete');
    expect(sm.canTransition('menu')).toBe(true);
    expect(sm.canTransition('playing')).toBe(true);
  });

  it('should fire onEnter callback', () => {
    const callback = vi.fn();
    sm.onEnter('playing', callback);
    sm.transition('playing');
    expect(callback).toHaveBeenCalledWith('menu', 'playing');
  });

  it('should fire onAnyChange callback', () => {
    const callback = vi.fn();
    sm.onAnyChange(callback);
    sm.transition('playing');
    expect(callback).toHaveBeenCalledWith('menu', 'playing');
  });

  it('should reset to menu', () => {
    sm.transition('playing');
    sm.reset();
    expect(sm.getCurrentState()).toBe('menu');
    expect(sm.getPreviousState()).toBeNull();
  });

  describe('boot and loading states', () => {
    it('can start from boot state via constructor', () => {
      const bootSm = new GameStateMachine('boot');
      expect(bootSm.getCurrentState()).toBe('boot');
    });

    it('boot can only transition to loading', () => {
      const bootSm = new GameStateMachine('boot');
      expect(bootSm.canTransition('loading')).toBe(true);
      expect(bootSm.canTransition('menu')).toBe(false);
      expect(bootSm.canTransition('playing')).toBe(false);
      expect(bootSm.canTransition('paused')).toBe(false);
      expect(bootSm.canTransition('gameover')).toBe(false);
      expect(bootSm.canTransition('levelComplete')).toBe(false);
    });

    it('loading can only transition to menu', () => {
      const bootSm = new GameStateMachine('boot');
      bootSm.transition('loading');
      expect(bootSm.canTransition('menu')).toBe(true);
      expect(bootSm.canTransition('playing')).toBe(false);
      expect(bootSm.canTransition('boot')).toBe(false);
    });

    it('full boot flow: boot -> loading -> menu -> playing', () => {
      const bootSm = new GameStateMachine('boot');
      expect(bootSm.transition('loading')).toBe(true);
      expect(bootSm.getCurrentState()).toBe('loading');
      expect(bootSm.transition('menu')).toBe(true);
      expect(bootSm.getCurrentState()).toBe('menu');
      expect(bootSm.transition('playing')).toBe(true);
      expect(bootSm.getCurrentState()).toBe('playing');
    });

    it('boot cannot skip to menu', () => {
      const bootSm = new GameStateMachine('boot');
      expect(bootSm.transition('menu')).toBe(false);
      expect(bootSm.getCurrentState()).toBe('boot');
    });

    it('loading cannot skip to playing', () => {
      const bootSm = new GameStateMachine('boot');
      bootSm.transition('loading');
      expect(bootSm.transition('playing')).toBe(false);
      expect(bootSm.getCurrentState()).toBe('loading');
    });
  });
});
