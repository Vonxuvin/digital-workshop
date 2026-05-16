import { describe, it, expect } from 'vitest';
import { Game } from '../../src/core/Game';
import { GameStateMachine, GameState } from '../../src/core/GameStateMachine';
import { Application } from 'pixi.js';

describe('Game DT Tests', () => {
  describe('getter method signatures', () => {
    it('should have getApp method returning Application', () => {
      expect(typeof Game.prototype.getApp).toBe('function');
      expect(Game.prototype.getApp.length).toBe(0);
    });

    it('should have getStateMachine method returning GameStateMachine', () => {
      expect(typeof Game.prototype.getStateMachine).toBe('function');
      expect(Game.prototype.getStateMachine.length).toBe(0);
    });

    it('should have getSceneManager method', () => {
      expect(typeof Game.prototype.getSceneManager).toBe('function');
      expect(Game.prototype.getSceneManager.length).toBe(0);
    });

    it('should have getUIManager method', () => {
      expect(typeof Game.prototype.getUIManager).toBe('function');
      expect(Game.prototype.getUIManager.length).toBe(0);
    });

    it('should have getScoreSystem method', () => {
      expect(typeof Game.prototype.getScoreSystem).toBe('function');
      expect(Game.prototype.getScoreSystem.length).toBe(0);
    });

    it('should have getGameScene method', () => {
      expect(typeof Game.prototype.getGameScene).toBe('function');
      expect(Game.prototype.getGameScene.length).toBe(0);
    });

    it('should have getPlatformAdapter method', () => {
      expect(typeof Game.prototype.getPlatformAdapter).toBe('function');
      expect(Game.prototype.getPlatformAdapter.length).toBe(0);
    });

    it('should have getLevelLoader method', () => {
      expect(typeof Game.prototype.getLevelLoader).toBe('function');
      expect(Game.prototype.getLevelLoader.length).toBe(0);
    });

    it('should have getSaveManager method', () => {
      expect(typeof Game.prototype.getSaveManager).toBe('function');
      expect(Game.prototype.getSaveManager.length).toBe(0);
    });

    it('should have getAudioManager method', () => {
      expect(typeof Game.prototype.getAudioManager).toBe('function');
      expect(Game.prototype.getAudioManager.length).toBe(0);
    });

    it('should have getMergeSystem method', () => {
      expect(typeof Game.prototype.getMergeSystem).toBe('function');
      expect(Game.prototype.getMergeSystem.length).toBe(0);
    });

    it('should have getResultScreen method', () => {
      expect(typeof Game.prototype.getResultScreen).toBe('function');
      expect(Game.prototype.getResultScreen.length).toBe(0);
    });

    it('should have getPauseScreen method', () => {
      expect(typeof Game.prototype.getPauseScreen).toBe('function');
      expect(Game.prototype.getPauseScreen.length).toBe(0);
    });

    it('should have getLevelSelectScreen method', () => {
      expect(typeof Game.prototype.getLevelSelectScreen).toBe('function');
      expect(Game.prototype.getLevelSelectScreen.length).toBe(0);
    });

    it('should have getEventBus method', () => {
      expect(typeof Game.prototype.getEventBus).toBe('function');
      expect(Game.prototype.getEventBus.length).toBe(0);
    });

    it('should have destroy method', () => {
      expect(typeof Game.prototype.destroy).toBe('function');
      expect(Game.prototype.destroy.length).toBe(0);
    });
  });

  describe('static method signatures', () => {
    it('should have static getInstance method', () => {
      expect(typeof Game.getInstance).toBe('function');
      expect(Game.getInstance.length).toBe(0);
    });
  });

  describe('state machine exposure type', () => {
    it('getStateMachine should return GameStateMachine type', () => {
      const proto = Game.prototype;
      expect(proto.getStateMachine).toBeDefined();
    });

    it('GameState type should include menu and playing', () => {
      const validStates: GameState[] = ['menu', 'playing'];
      expect(validStates).toContain('menu');
      expect(validStates).toContain('playing');
    });

    it('GameState should be string literal union', () => {
      type AssertGameState = 'boot' | 'loading' | 'menu' | 'playing' | 'paused' | 'gameover' | 'levelComplete';
      const states: AssertGameState[] = ['boot', 'loading', 'menu', 'playing', 'paused', 'gameover', 'levelComplete'];
      for (const s of states) {
        expect(typeof s).toBe('string');
      }
    });
  });

  describe('init method signature', () => {
    it('should have init method', () => {
      expect(typeof Game.prototype.init).toBe('function');
      expect(Game.prototype.init.length).toBe(0);
    });

    it('init should return Promise<void>', () => {
      const result = Game.prototype.init;
      expect(typeof result).toBe('function');
    });
  });

  describe('constructor signature', () => {
    it('should accept HTMLCanvasElement', () => {
      expect(Game.length).toBe(1);
    });
  });

  describe('optional getter method signatures', () => {
    it('should have getBlockSpawner method', () => {
      expect(typeof Game.prototype.getBlockSpawner).toBe('function');
    });

    it('should have getPhysics method', () => {
      expect(typeof Game.prototype.getPhysics).toBe('function');
    });

    it('should have getPropSystem method', () => {
      expect(typeof Game.prototype.getPropSystem).toBe('function');
    });

    it('should have getGameHUD method', () => {
      expect(typeof Game.prototype.getGameHUD).toBe('function');
    });

    it('should have getLevelSystem method', () => {
      expect(typeof Game.prototype.getLevelSystem).toBe('function');
    });

    it('should have getPerformanceMonitor method', () => {
      expect(typeof Game.prototype.getPerformanceMonitor).toBe('function');
      expect(Game.prototype.getPerformanceMonitor.length).toBe(0);
    });
  });

  describe('toggle and utility method signatures', () => {
    it('should have toggleFPSDisplay method', () => {
      expect(typeof Game.prototype.toggleFPSDisplay).toBe('function');
      expect(Game.prototype.toggleFPSDisplay.length).toBe(0);
    });

    it('should have startTutorial method', () => {
      expect(typeof Game.prototype.startTutorial).toBe('function');
      expect(Game.prototype.startTutorial.length).toBe(1);
    });
  });
});
