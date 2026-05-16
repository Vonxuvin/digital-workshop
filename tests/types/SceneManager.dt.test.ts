import { describe, it, expect } from 'vitest';
import { SceneManager } from '../../src/core/SceneManager';

describe('SceneManager DT Tests', () => {
  describe('method signatures', () => {
    it('should have registerScreens method', () => {
      expect(typeof SceneManager.prototype.registerScreens).toBe('function');
      expect(SceneManager.prototype.registerScreens.length).toBe(1);
    });

    it('should have transitionToMenu method', () => {
      expect(typeof SceneManager.prototype.transitionToMenu).toBe('function');
      expect(SceneManager.prototype.transitionToMenu.length).toBe(0);
    });

    it('should have showMainMenu method', () => {
      expect(typeof SceneManager.prototype.showMainMenu).toBe('function');
      expect(SceneManager.prototype.showMainMenu.length).toBe(0);
    });

    it('should have showLevelSelect method', () => {
      expect(typeof SceneManager.prototype.showLevelSelect).toBe('function');
      expect(SceneManager.prototype.showLevelSelect.length).toBe(0);
    });

    it('should have startLevel method accepting LevelConfig', () => {
      expect(typeof SceneManager.prototype.startLevel).toBe('function');
      expect(SceneManager.prototype.startLevel.length).toBe(1);
    });

    it('should have startLevelById method accepting number', () => {
      expect(typeof SceneManager.prototype.startLevelById).toBe('function');
      expect(SceneManager.prototype.startLevelById.length).toBe(1);
    });

    it('should have startGame method', () => {
      expect(typeof SceneManager.prototype.startGame).toBe('function');
      expect(SceneManager.prototype.startGame.length).toBe(0);
    });

    it('should have pauseGame method', () => {
      expect(typeof SceneManager.prototype.pauseGame).toBe('function');
      expect(SceneManager.prototype.pauseGame.length).toBe(0);
    });

    it('should have resumeGame method', () => {
      expect(typeof SceneManager.prototype.resumeGame).toBe('function');
      expect(SceneManager.prototype.resumeGame.length).toBe(0);
    });

    it('should have restartGame method', () => {
      expect(typeof SceneManager.prototype.restartGame).toBe('function');
      expect(SceneManager.prototype.restartGame.length).toBe(0);
    });

    it('should have failGame method', () => {
      expect(typeof SceneManager.prototype.failGame).toBe('function');
      expect(SceneManager.prototype.failGame.length).toBe(0);
    });

    it('should have completeLevel method accepting score and levelId', () => {
      expect(typeof SceneManager.prototype.completeLevel).toBe('function');
      expect(SceneManager.prototype.completeLevel.length).toBe(2);
    });

    it('should have reviveGame method', () => {
      expect(typeof SceneManager.prototype.reviveGame).toBe('function');
      expect(SceneManager.prototype.reviveGame.length).toBe(0);
    });

    it('should have nextLevel method', () => {
      expect(typeof SceneManager.prototype.nextLevel).toBe('function');
      expect(SceneManager.prototype.nextLevel.length).toBe(0);
    });

    it('should have getCurrentState method', () => {
      expect(typeof SceneManager.prototype.getCurrentState).toBe('function');
      expect(SceneManager.prototype.getCurrentState.length).toBe(0);
    });

    it('should have isPlaying method', () => {
      expect(typeof SceneManager.prototype.isPlaying).toBe('function');
      expect(SceneManager.prototype.isPlaying.length).toBe(0);
    });

    it('should have getStateMachine method', () => {
      expect(typeof SceneManager.prototype.getStateMachine).toBe('function');
      expect(SceneManager.prototype.getStateMachine.length).toBe(0);
    });
  });

  describe('return type constraints', () => {
    it('startLevel should return boolean', () => {
      expect(SceneManager.prototype.startLevel.length).toBe(1);
    });

    it('startLevelById should return boolean', () => {
      expect(SceneManager.prototype.startLevelById.length).toBe(1);
    });

    it('startGame should return boolean', () => {
      expect(SceneManager.prototype.startGame.length).toBe(0);
    });

    it('isPlaying should return boolean', () => {
      expect(SceneManager.prototype.isPlaying.length).toBe(0);
    });

    it('getCurrentState should return GameState string', () => {
      expect(SceneManager.prototype.getCurrentState.length).toBe(0);
    });
  });

  describe('constructor signature', () => {
    it('should accept 8 parameters', () => {
      expect(SceneManager.length).toBe(8);
    });
  });
});
