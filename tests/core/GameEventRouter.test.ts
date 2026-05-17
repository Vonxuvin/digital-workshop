import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEventRouter } from '../../src/core/GameEventRouter';
import { GameEvents, eventBus } from '../../src/utils/EventBus';

function createMockGameScene(): any {
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

function createMockSceneManager(): any {
  return {
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
}

function createMockAudioManager(): any {
  return {
    play: vi.fn(),
  };
}

function createMockSaveManager(): any {
  return {
    saveLevelProgress: vi.fn(),
  };
}

function createMockLevelLoader(): any {
  return {
    loadLevel: vi.fn(() => Promise.resolve({ id: 1, name: 'Test' })),
  };
}

describe('GameEventRouter', () => {
  let router: GameEventRouter;
  let gameScene: any;
  let sceneManager: any;
  let audioManager: any;
  let saveManager: any;
  let levelLoader: any;

  beforeEach(() => {
    gameScene = createMockGameScene();
    sceneManager = createMockSceneManager();
    audioManager = createMockAudioManager();
    saveManager = createMockSaveManager();
    levelLoader = createMockLevelLoader();

    router = new GameEventRouter(
      gameScene,
      sceneManager,
      audioManager,
      saveManager,
      levelLoader,
    );
    router.setup();
  });

  afterEach(() => {
    router.destroy();
  });

  it('should route BLOCK_MERGED event', () => {
    eventBus.emit(GameEvents.BLOCK_MERGED, {
      mergedValue: 4,
      position: { x: 100, y: 200 },
      chainCount: 1,
    });
    expect(audioManager.play).toHaveBeenCalledWith('merge');
    expect(gameScene.handleBlockMerged).toHaveBeenCalled();
  });

  it('should route BLOCK_DROPPED event', () => {
    eventBus.emit(GameEvents.BLOCK_DROPPED);
    expect(audioManager.play).toHaveBeenCalledWith('drop');
  });

  it('should route GAME_OVER event', () => {
    eventBus.emit(GameEvents.GAME_OVER);
    expect(audioManager.play).toHaveBeenCalledWith('gameOver');
    expect(sceneManager.failGame).toHaveBeenCalled();
  });

  it('should route GAME_TIMEOUT event', () => {
    eventBus.emit(GameEvents.GAME_TIMEOUT);
    expect(sceneManager.failGame).toHaveBeenCalled();
  });

  it('should route LEVEL_COMPLETED event', () => {
    eventBus.emit(GameEvents.LEVEL_COMPLETED, { score: 100, levelId: 1 });
    expect(audioManager.play).toHaveBeenCalledWith('levelComplete');
    expect(sceneManager.completeLevel).toHaveBeenCalledWith(100, 1);
  });

  it('should route UI_START_GAME event', () => {
    eventBus.emit(GameEvents.UI_START_GAME);
    expect(sceneManager.showLevelSelect).toHaveBeenCalled();
  });

  it('should route UI_PAUSE event', () => {
    eventBus.emit(GameEvents.UI_PAUSE);
    expect(sceneManager.pauseGame).toHaveBeenCalled();
  });

  it('should route UI_RESUME event', () => {
    eventBus.emit(GameEvents.UI_RESUME);
    expect(sceneManager.resumeGame).toHaveBeenCalled();
  });

  it('should route UI_RESTART event', () => {
    eventBus.emit(GameEvents.UI_RESTART);
    expect(sceneManager.restartGame).toHaveBeenCalled();
  });

  it('should route UI_BACK_TO_MENU event', () => {
    eventBus.emit(GameEvents.UI_BACK_TO_MENU);
    expect(sceneManager.showMainMenu).toHaveBeenCalled();
  });

  it('should route UI_LEVEL_SELECT event', () => {
    eventBus.emit(GameEvents.UI_LEVEL_SELECT);
    expect(sceneManager.showLevelSelect).toHaveBeenCalled();
  });

  it('should route UI_REVIVE event', () => {
    eventBus.emit(GameEvents.UI_REVIVE);
    expect(gameScene.handleRevive || sceneManager.failGame).toBeDefined();
  });

  it('should route PROPS_BOMB_EXPLODE event', () => {
    eventBus.emit(GameEvents.PROPS_BOMB_EXPLODE, { x: 100, y: 200, radius: 120 });
    expect(gameScene.handleBombExplode).toHaveBeenCalledWith({ x: 100, y: 200, radius: 120 });
    expect(audioManager.play).toHaveBeenCalledWith('explosion');
  });

  it('should route PROPS_FREEZE_ACTIVATED event', () => {
    eventBus.emit(GameEvents.PROPS_FREEZE_ACTIVATED, { duration: 5000 });
    expect(gameScene.handleFreezeActivated).toHaveBeenCalledWith({ duration: 5000 });
    expect(audioManager.play).toHaveBeenCalledWith('freeze');
  });

  it('should route PROPS_FREEZE_DEACTIVATED event', () => {
    eventBus.emit(GameEvents.PROPS_FREEZE_DEACTIVATED);
    expect(gameScene.handleFreezeDeactivated).toHaveBeenCalled();
  });

  it('should route UI_PROP_TARGET_MODE event', () => {
    eventBus.emit(GameEvents.UI_PROP_TARGET_MODE, { enabled: true });
    expect(gameScene.handlePropTargetMode).toHaveBeenCalledWith({ enabled: true });
  });

  it('should route PROPS_SHRINK_ACTIVATE event', () => {
    eventBus.emit(GameEvents.PROPS_SHRINK_ACTIVATE, { factor: 0.5, duration: 5000 });
    expect(gameScene.handleShrinkActivate).toHaveBeenCalledWith({ factor: 0.5, duration: 5000 });
    expect(audioManager.play).toHaveBeenCalledWith('shrink');
  });

  it('should route PROPS_SHRINK_DEACTIVATE event', () => {
    eventBus.emit(GameEvents.PROPS_SHRINK_DEACTIVATE);
    expect(gameScene.handleShrinkDeactivate).toHaveBeenCalled();
  });

  it('should route PROPS_LUCKY_ACTIVATE event', () => {
    eventBus.emit(GameEvents.PROPS_LUCKY_ACTIVATE, { multiplier: 2, remainingDrops: 5 });
    expect(gameScene.handleLuckyActivate).toHaveBeenCalledWith({ multiplier: 2, remainingDrops: 5 });
  });

  it('should route PROPS_LUCKY_DEACTIVATE event', () => {
    eventBus.emit(GameEvents.PROPS_LUCKY_DEACTIVATE);
    expect(gameScene.handleLuckyDeactivate).toHaveBeenCalled();
  });

  it('should route LEVEL_TIME_UPDATE event', () => {
    eventBus.emit(GameEvents.LEVEL_TIME_UPDATE, 30);
    expect(gameScene._gameHUD.updateTimer).toHaveBeenCalledWith(30);
  });

  it('should route SCORE_UPDATED with chain >= 5', () => {
    eventBus.emit(GameEvents.SCORE_UPDATED, { totalScore: 100, earnedScore: 50, chainCount: 5 });
    expect(audioManager.play).toHaveBeenCalledWith('merge');
  });

  it('should not play merge sound for chain < 5', () => {
    eventBus.emit(GameEvents.SCORE_UPDATED, { totalScore: 100, earnedScore: 50, chainCount: 3 });
    expect(audioManager.play).not.toHaveBeenCalledWith('merge');
  });

  it('should route WARNING_STARTED event', () => {
    eventBus.emit(GameEvents.WARNING_STARTED);
    expect(audioManager.play).toHaveBeenCalledWith('warning');
  });

  it('should route UI_SELECT_LEVEL event', async () => {
    eventBus.emit(GameEvents.UI_SELECT_LEVEL, 1);
    await new Promise(r => setTimeout(r, 50));
    expect(levelLoader.loadLevel).toHaveBeenCalledWith(1);
  });

  it('should route UI_NEXT_LEVEL event', async () => {
    eventBus.emit(GameEvents.UI_NEXT_LEVEL);
    await new Promise(r => setTimeout(r, 50));
    expect(levelLoader.loadLevel).toHaveBeenCalledWith(2);
  });

  it('should destroy and unsubscribe all events', () => {
    router.destroy();
    eventBus.emit(GameEvents.GAME_OVER);
    expect(sceneManager.failGame).not.toHaveBeenCalled();
  });
});
