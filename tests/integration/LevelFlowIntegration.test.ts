import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameStateMachine } from '../../src/core/GameStateMachine';
import { GameEventRouter } from '../../src/core/GameEventRouter';
import { EventBus, GameEvents, eventBus } from '../../src/utils/EventBus';
import { LevelLoader } from '../../src/core/LevelLoader';

function createMockGameScene() {
  const gameHUD = { updateTimer: vi.fn() };
  return {
    handleBlockMerged: vi.fn(),
    handleBombExplode: vi.fn(),
    handleFreezeActivated: vi.fn(),
    handleFreezeDeactivated: vi.fn(),
    handlePropTargetMode: vi.fn(),
    handleNextRainbowBlock: vi.fn(),
    handleRainbowConsumed: vi.fn(),
    handleShrinkActivate: vi.fn(),
    handleShrinkDeactivate: vi.fn(),
    handleLuckyActivate: vi.fn(),
    handleLuckyDeactivate: vi.fn(),
    getLevelSystem: vi.fn(() => ({ getConfig: () => ({ id: 1 }) })),
    getGameHUD: vi.fn(() => gameHUD),
    _gameHUD: gameHUD,
  };
}

function createMockSceneManager() {
  const sm = {
    failGame: vi.fn(),
    completeLevel: vi.fn(),
    showLevelSelect: vi.fn(),
    startLevel: vi.fn(),
    pauseGame: vi.fn(),
    resumeGame: vi.fn(),
    restartGame: vi.fn(),
    showMainMenu: vi.fn(),
    isPlaying: vi.fn(() => true),
  };
  return sm;
}

function createMockAudioManager() {
  return { play: vi.fn() };
}

function createMockSaveManager() {
  return { saveLevelProgress: vi.fn() };
}

function createMockLevelLoader() {
  return { loadLevel: vi.fn(() => Promise.resolve({ id: 1, name: 'Test' })) };
}

describe('Level Flow Integration Tests', () => {
  let router: GameEventRouter;
  let gameScene: ReturnType<typeof createMockGameScene>;
  let sceneManager: ReturnType<typeof createMockSceneManager>;
  let audioManager: ReturnType<typeof createMockAudioManager>;
  let saveManager: ReturnType<typeof createMockSaveManager>;
  let levelLoader: ReturnType<typeof createMockLevelLoader>;

  beforeEach(() => {
    gameScene = createMockGameScene();
    sceneManager = createMockSceneManager();
    audioManager = createMockAudioManager();
    saveManager = createMockSaveManager();
    levelLoader = createMockLevelLoader();

    router = new GameEventRouter(
      gameScene as any,
      sceneManager as any,
      audioManager as any,
      saveManager as any,
      levelLoader as any,
    );
    router.setup();
  });

  afterEach(() => {
    router.destroy();
  });

  describe('Complete game flow', () => {
    it('should handle start -> play -> complete flow', () => {
      eventBus.emit(GameEvents.UI_START_GAME);
      expect(sceneManager.showLevelSelect).toHaveBeenCalled();

      eventBus.emit(GameEvents.LEVEL_COMPLETED, { score: 100, levelId: 1 });
      expect(audioManager.play).toHaveBeenCalledWith('levelComplete');
      expect(sceneManager.completeLevel).toHaveBeenCalledWith(100, 1);
    });

    it('should handle start -> play -> game over flow', () => {
      eventBus.emit(GameEvents.GAME_OVER);
      expect(audioManager.play).toHaveBeenCalledWith('gameOver');
      expect(sceneManager.failGame).toHaveBeenCalled();
    });

    it('should handle start -> play -> timeout flow', () => {
      eventBus.emit(GameEvents.GAME_TIMEOUT);
      expect(sceneManager.failGame).toHaveBeenCalled();
    });

    it('should handle pause -> resume flow', () => {
      eventBus.emit(GameEvents.UI_PAUSE);
      expect(sceneManager.pauseGame).toHaveBeenCalled();

      eventBus.emit(GameEvents.UI_RESUME);
      expect(sceneManager.resumeGame).toHaveBeenCalled();
    });

    it('should handle restart flow', () => {
      eventBus.emit(GameEvents.UI_RESTART);
      expect(sceneManager.restartGame).toHaveBeenCalled();
    });

    it('should handle back to menu flow', () => {
      eventBus.emit(GameEvents.UI_BACK_TO_MENU);
      expect(sceneManager.showMainMenu).toHaveBeenCalled();
    });

    it('should handle level select flow', () => {
      eventBus.emit(GameEvents.UI_LEVEL_SELECT);
      expect(sceneManager.showLevelSelect).toHaveBeenCalled();
    });
  });

  describe('Prop event flow', () => {
    it('should handle bomb explode flow', () => {
      eventBus.emit(GameEvents.PROPS_BOMB_EXPLODE, { x: 100, y: 200, radius: 120 });
      expect(gameScene.handleBombExplode).toHaveBeenCalledWith({ x: 100, y: 200, radius: 120 });
      expect(audioManager.play).toHaveBeenCalledWith('explosion');
    });

    it('should handle freeze activate -> deactivate flow', () => {
      eventBus.emit(GameEvents.PROPS_FREEZE_ACTIVATED, { duration: 5000 });
      expect(gameScene.handleFreezeActivated).toHaveBeenCalledWith({ duration: 5000 });
      expect(audioManager.play).toHaveBeenCalledWith('freeze');

      eventBus.emit(GameEvents.PROPS_FREEZE_DEACTIVATED);
      expect(gameScene.handleFreezeDeactivated).toHaveBeenCalled();
    });

    it('should handle shrink activate -> deactivate flow', () => {
      eventBus.emit(GameEvents.PROPS_SHRINK_ACTIVATE, { factor: 0.5, duration: 5000 });
      expect(gameScene.handleShrinkActivate).toHaveBeenCalledWith({ factor: 0.5, duration: 5000 });

      eventBus.emit(GameEvents.PROPS_SHRINK_DEACTIVATE);
      expect(gameScene.handleShrinkDeactivate).toHaveBeenCalled();
    });

    it('should handle lucky activate -> deactivate flow', () => {
      eventBus.emit(GameEvents.PROPS_LUCKY_ACTIVATE, { multiplier: 2, remainingDrops: 5 });
      expect(gameScene.handleLuckyActivate).toHaveBeenCalledWith({ multiplier: 2, remainingDrops: 5 });

      eventBus.emit(GameEvents.PROPS_LUCKY_DEACTIVATE);
      expect(gameScene.handleLuckyDeactivate).toHaveBeenCalled();
    });
  });

  describe('Score and warning flow', () => {
    it('should play merge sound on high chain count', () => {
      eventBus.emit(GameEvents.SCORE_UPDATED, { totalScore: 100, earnedScore: 50, chainCount: 5 });
      expect(audioManager.play).toHaveBeenCalledWith('merge');
    });

    it('should not play merge sound on low chain count', () => {
      eventBus.emit(GameEvents.SCORE_UPDATED, { totalScore: 100, earnedScore: 50, chainCount: 2 });
      expect(audioManager.play).not.toHaveBeenCalledWith('merge');
    });

    it('should handle warning started', () => {
      eventBus.emit(GameEvents.WARNING_STARTED);
      expect(audioManager.play).toHaveBeenCalledWith('warning');
    });
  });

  describe('Event isolation', () => {
    it('should not receive events after destroy', () => {
      router.destroy();
      eventBus.emit(GameEvents.GAME_OVER);
      expect(sceneManager.failGame).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate event listener BUG in Game.ts', () => {
    it('BUG: registering two listeners for the same event causes double execution', () => {
      const bus = new EventBus();
      let executionCount = 0;

      bus.on('game:over', () => { executionCount++; });
      bus.on('game:over', () => { executionCount++; });

      bus.emit('game:over');

      expect(executionCount).toBe(2);
    });

    it('BUG: Game.ts registers game:over twice (setupGameEvents + setupUIEvents)', () => {
      const bus = new EventBus();
      const setupGameEventsHandler = vi.fn();
      const setupUIEventsHandler = vi.fn();

      bus.on('game:over', setupGameEventsHandler);
      bus.on('game:over', setupUIEventsHandler);

      bus.emit('game:over');

      expect(setupGameEventsHandler).toHaveBeenCalledTimes(1);
      expect(setupUIEventsHandler).toHaveBeenCalledTimes(1);

      const totalCalls = setupGameEventsHandler.mock.calls.length + setupUIEventsHandler.mock.calls.length;
      expect(totalCalls).toBe(2);
    });

    it('BUG: Game.ts registers level:completed twice (setupGameEvents + setupUIEvents)', () => {
      const bus = new EventBus();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('level:completed', handler1);
      bus.on('level:completed', handler2);

      bus.emit('level:completed', { levelId: 1, score: 100, time: 30 });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler1).toHaveBeenCalledWith({ levelId: 1, score: 100, time: 30 });
      expect(handler2).toHaveBeenCalledWith({ levelId: 1, score: 100, time: 30 });
    });

    it('BUG: duplicate game:over listeners cause both handlers to execute', () => {
      const sm = new GameStateMachine();
      const bus = new EventBus();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.on('game:over', () => { handler1(); sm.transition('gameover'); });
      bus.on('game:over', () => { handler2(); sm.transition('gameover'); });

      sm.transition('playing');
      bus.emit('game:over');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(sm.getCurrentState()).toBe('gameover');
    });
  });
});
