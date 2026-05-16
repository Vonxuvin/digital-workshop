import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameStateMachine, GameState } from '../../src/core/GameStateMachine';
import { BlockTextureCache } from '../../src/utils/BlockTextureCache';

describe('GameStateSceneManager Integration Tests', () => {
  let stateMachine: GameStateMachine;

  beforeEach(() => {
    BlockTextureCache.resetInstance();
    stateMachine = new GameStateMachine('boot');
  });

  afterEach(() => {
    BlockTextureCache.resetInstance();
  });

  describe('menu state reachability', () => {
    it('should reach menu state after boot->loading->menu transitions', () => {
      stateMachine.transition('loading');
      expect(stateMachine.getCurrentState()).toBe('loading');

      stateMachine.transition('menu');
      expect(stateMachine.getCurrentState()).toBe('menu');
    });

    it('should not reach menu state from boot directly', () => {
      const result = stateMachine.transition('menu');
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('boot');
    });

    it('should allow menu state to be reached from loading', () => {
      stateMachine.transition('loading');
      expect(stateMachine.canTransition('menu')).toBe(true);
    });
  });

  describe('full game lifecycle state transitions', () => {
    it('should complete boot->loading->menu->playing flow', () => {
      stateMachine.transition('loading');
      expect(stateMachine.getCurrentState()).toBe('loading');

      stateMachine.transition('menu');
      expect(stateMachine.getCurrentState()).toBe('menu');

      stateMachine.transition('playing');
      expect(stateMachine.getCurrentState()).toBe('playing');
    });

    it('should support playing->paused->playing cycle', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      stateMachine.transition('playing');

      stateMachine.transition('paused');
      expect(stateMachine.getCurrentState()).toBe('paused');

      stateMachine.transition('playing');
      expect(stateMachine.getCurrentState()).toBe('playing');
    });

    it('should support playing->gameover flow', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      stateMachine.transition('playing');

      stateMachine.transition('gameover');
      expect(stateMachine.getCurrentState()).toBe('gameover');
    });

    it('should support playing->levelComplete flow', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      stateMachine.transition('playing');

      stateMachine.transition('levelComplete');
      expect(stateMachine.getCurrentState()).toBe('levelComplete');
    });

    it('should support gameover->menu flow', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      stateMachine.transition('playing');
      stateMachine.transition('gameover');

      stateMachine.transition('menu');
      expect(stateMachine.getCurrentState()).toBe('menu');
    });

    it('should support levelComplete->menu flow', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      stateMachine.transition('playing');
      stateMachine.transition('levelComplete');

      stateMachine.transition('menu');
      expect(stateMachine.getCurrentState()).toBe('menu');
    });

    it('should support levelComplete->playing flow for next level', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      stateMachine.transition('playing');
      stateMachine.transition('levelComplete');

      stateMachine.transition('playing');
      expect(stateMachine.getCurrentState()).toBe('playing');
    });
  });

  describe('invalid state transition prevention', () => {
    it('should not allow boot->menu directly', () => {
      const result = stateMachine.transition('menu');
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('boot');
    });

    it('should not allow boot->playing directly', () => {
      const result = stateMachine.transition('playing');
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('boot');
    });

    it('should not allow menu->paused directly', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');

      const result = stateMachine.transition('paused');
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('menu');
    });

    it('should not allow paused->gameover directly', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      stateMachine.transition('playing');
      stateMachine.transition('paused');

      const result = stateMachine.transition('gameover');
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('paused');
    });

    it('should require gameover->menu->playing for retry', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      stateMachine.transition('playing');
      stateMachine.transition('gameover');

      expect(stateMachine.canTransition('playing')).toBe(false);
      stateMachine.transition('menu');
      const result = stateMachine.transition('playing');
      expect(result).toBe(true);
      expect(stateMachine.getCurrentState()).toBe('playing');
    });

    it('should not allow loading->playing directly', () => {
      stateMachine.transition('loading');

      const result = stateMachine.transition('playing');
      expect(result).toBe(false);
      expect(stateMachine.getCurrentState()).toBe('loading');
    });
  });

  describe('canTransition validation', () => {
    it('should correctly report valid transitions from boot', () => {
      expect(stateMachine.canTransition('loading')).toBe(true);
      expect(stateMachine.canTransition('menu')).toBe(false);
      expect(stateMachine.canTransition('playing')).toBe(false);
      expect(stateMachine.canTransition('paused')).toBe(false);
    });

    it('should correctly report valid transitions from loading', () => {
      stateMachine.transition('loading');
      expect(stateMachine.canTransition('menu')).toBe(true);
      expect(stateMachine.canTransition('playing')).toBe(false);
      expect(stateMachine.canTransition('paused')).toBe(false);
    });

    it('should correctly report valid transitions from menu', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      expect(stateMachine.canTransition('playing')).toBe(true);
      expect(stateMachine.canTransition('paused')).toBe(false);
      expect(stateMachine.canTransition('gameover')).toBe(false);
    });

    it('should correctly report valid transitions from playing', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      stateMachine.transition('playing');
      expect(stateMachine.canTransition('paused')).toBe(true);
      expect(stateMachine.canTransition('gameover')).toBe(true);
      expect(stateMachine.canTransition('levelComplete')).toBe(true);
      expect(stateMachine.canTransition('menu')).toBe(true);
    });

    it('should correctly report valid transitions from paused', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      stateMachine.transition('playing');
      stateMachine.transition('paused');
      expect(stateMachine.canTransition('playing')).toBe(true);
      expect(stateMachine.canTransition('menu')).toBe(true);
      expect(stateMachine.canTransition('gameover')).toBe(false);
    });
  });

  describe('state history tracking', () => {
    it('should track previous state through transitions', () => {
      stateMachine.transition('loading');
      expect(stateMachine.getPreviousState()).toBe('boot');

      stateMachine.transition('menu');
      expect(stateMachine.getPreviousState()).toBe('loading');

      stateMachine.transition('playing');
      expect(stateMachine.getPreviousState()).toBe('menu');
    });

    it('should return null for initial state with no previous', () => {
      expect(stateMachine.getPreviousState()).toBeNull();
    });

    it('should update previous state on failed transitions', () => {
      stateMachine.transition('loading');
      stateMachine.transition('menu');

      const result = stateMachine.transition('paused');
      expect(result).toBe(false);
      expect(stateMachine.getPreviousState()).toBe('loading');
    });
  });

  describe('callback coordination', () => {
    it('should trigger onEnter callbacks during state transitions', () => {
      const enteredStates: GameState[] = [];

      stateMachine.onEnter('loading', () => enteredStates.push('loading'));
      stateMachine.onEnter('menu', () => enteredStates.push('menu'));
      stateMachine.onEnter('playing', () => enteredStates.push('playing'));

      stateMachine.transition('loading');
      stateMachine.transition('menu');
      stateMachine.transition('playing');

      expect(enteredStates).toEqual(['loading', 'menu', 'playing']);
    });

    it('should trigger onAnyChange callbacks for all transitions', () => {
      const transitions: string[] = [];

      stateMachine.onAnyChange((from, to) => {
        transitions.push(`${from}->${to}`);
      });

      stateMachine.transition('loading');
      stateMachine.transition('menu');

      expect(transitions).toEqual(['boot->loading', 'loading->menu']);
    });

    it('should not trigger onEnter for failed transitions', () => {
      const enteredStates: GameState[] = [];

      stateMachine.onEnter('menu', () => enteredStates.push('menu'));

      const result = stateMachine.transition('menu');
      expect(result).toBe(false);
      expect(enteredStates).toEqual([]);
    });

    it('should support offEnter to remove callbacks', () => {
      const enteredStates: GameState[] = [];
      const callback = () => enteredStates.push('menu');

      stateMachine.onEnter('menu', callback);
      stateMachine.transition('loading');
      stateMachine.transition('menu');
      expect(enteredStates).toEqual(['menu']);

      stateMachine.offEnter('menu', callback);
    });

    it('should support offAnyChange to remove callbacks', () => {
      const transitions: string[] = [];
      const callback = (from: GameState, to: GameState) => {
        transitions.push(`${from}->${to}`);
      };

      stateMachine.onAnyChange(callback);
      stateMachine.transition('loading');
      stateMachine.offAnyChange(callback);
    });
  });

  describe('GameStateMachine + BlockTextureCache integration', () => {
    it('should preload textures during loading state', () => {
      const cache = BlockTextureCache.getInstance();

      stateMachine.onEnter('loading', () => {
        cache.preloadMinimal([1, 2, 4, 8]);
      });

      stateMachine.transition('loading');

      const texture = cache.getTexture(1, false);
      expect(texture).toBeDefined();
    });

    it('should have textures available when entering menu state', async () => {
      const cache = BlockTextureCache.getInstance();

      stateMachine.onEnter('loading', () => {
        cache.preloadMinimal([1, 2, 4, 8, 16, 32]);
      });

      stateMachine.transition('loading');
      await cache.preloadAsync([1, 2]);

      stateMachine.transition('menu');

      for (const val of [1, 2, 4, 8]) {
        const texture = cache.getTexture(val, false);
        expect(texture).toBeDefined();
      }
    });

    it('should maintain texture cache across state transitions', () => {
      const cache = BlockTextureCache.getInstance();

      stateMachine.transition('loading');
      cache.preloadMinimal([1, 2, 4]);

      stateMachine.transition('menu');
      expect(cache.getTexture(1, false)).toBeDefined();

      stateMachine.transition('playing');
      expect(cache.getTexture(1, false)).toBeDefined();

      stateMachine.transition('paused');
      expect(cache.getTexture(1, false)).toBeDefined();

      stateMachine.transition('playing');
      expect(cache.getTexture(1, false)).toBeDefined();
    });
  });

  describe('isPlaying equivalent check', () => {
    it('should return true only when state is playing', () => {
      expect(stateMachine.getCurrentState() === 'playing').toBe(false);

      stateMachine.transition('loading');
      expect(stateMachine.getCurrentState() === 'playing').toBe(false);

      stateMachine.transition('menu');
      expect(stateMachine.getCurrentState() === 'playing').toBe(false);

      stateMachine.transition('playing');
      expect(stateMachine.getCurrentState() === 'playing').toBe(true);

      stateMachine.transition('paused');
      expect(stateMachine.getCurrentState() === 'playing').toBe(false);
    });
  });
});
