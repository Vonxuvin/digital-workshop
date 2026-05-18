import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SceneManager } from '../../src/core/SceneManager';
import { UIManager } from '../../src/ui/UIManager';
import { GameStateMachine } from '../../src/core/GameStateMachine';
import { GameScene } from '../../src/core/GameScene';
import { AudioManager } from '../../src/core/AudioManager';
import { SaveManager } from '../../src/core/SaveManager';
import { ResultScreen } from '../../src/ui/screens/ResultScreen';
import { LevelSelectScreen } from '../../src/ui/screens/LevelSelectScreen';
import { LevelLoader } from '../../src/core/LevelLoader';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { ScoreSystem } from '../../src/gameplay/ScoreSystem';
import { AdManager } from '../../src/core/AdManager';

describe('SceneManager', () => {
  let sceneManager: SceneManager;
  let mockUIManager: UIManager;
  let mockStateMachine: GameStateMachine;
  let mockGameScene: GameScene;
  let mockAudioManager: AudioManager;
  let mockSaveManager: SaveManager;
  let mockResultScreen: ResultScreen;
  let mockLevelSelectScreen: LevelSelectScreen;
  let mockLevelLoader: LevelLoader;
  let mockLevelSystem: LevelSystem;
  let mockScoreSystem: ScoreSystem;
  let mockAdManager: AdManager;

  beforeEach(() => {
    vi.useFakeTimers();

    mockUIManager = {
      registerScreen: vi.fn(),
      showScreen: vi.fn(),
      hideCurrentScreen: vi.fn(),
    } as unknown as UIManager;

    mockStateMachine = {
      transition: vi.fn().mockReturnValue(true),
      canTransition: vi.fn().mockReturnValue(true),
      getCurrentState: vi.fn().mockReturnValue('playing'),
    } as unknown as GameStateMachine;

    mockLevelSystem = {
      getConfig: vi.fn().mockReturnValue({ id: 1, name: 'Test' }),
      getHighestMergeValue: vi.fn().mockReturnValue(64),
      stopTimer: vi.fn(),
      isLevelCompleted: vi.fn().mockReturnValue(false),
      getProgress: vi.fn().mockReturnValue(0.5),
    } as unknown as LevelSystem;

    mockScoreSystem = {
      getScore: vi.fn().mockReturnValue(1500),
      getMaxChainCount: vi.fn().mockReturnValue(5),
    } as unknown as ScoreSystem;

    mockGameScene = {
      loadLevel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      restartLevel: vi.fn(),
      stopPhysics: vi.fn(),
      clearEverything: vi.fn(),
      clearContainerWalls: vi.fn(),
      getLevelSystem: vi.fn().mockReturnValue(mockLevelSystem),
      getScoreSystem: vi.fn().mockReturnValue(mockScoreSystem),
      getGameHUD: vi.fn().mockReturnValue({ skipAnimation: vi.fn() }),
      getModifierManager: vi.fn().mockReturnValue({ pauseAll: vi.fn() }),
      getPropEffectHandler: vi.fn().mockReturnValue({ pause: vi.fn() }),
      calculateStars: vi.fn().mockReturnValue(3),
      getGameStartTime: vi.fn().mockReturnValue(Date.now() - 60000),
      handleRevive: vi.fn(),
      showLevelObjective: vi.fn(),
    } as unknown as GameScene;

    mockAudioManager = {
      play: vi.fn(),
    } as unknown as AudioManager;

    mockSaveManager = {
      getLevelProgress: vi.fn().mockReturnValue({ unlocked: true, completed: false, highScore: 0 }),
      updateLevelProgress: vi.fn(),
      updateStatistics: vi.fn(),
    } as unknown as SaveManager;

    mockResultScreen = {
      setResult: vi.fn(),
    } as unknown as ResultScreen;

    mockLevelSelectScreen = {
      updateLevelProgress: vi.fn(),
    } as unknown as LevelSelectScreen;

    mockLevelLoader = {
      getLevelConfig: vi.fn().mockReturnValue({
        id: 1,
        name: 'Test Level',
        objective: { type: 'score', target: 1000 },
        container: { width: 400, height: 600, shape: 'rectangle' as const },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [500, 800, 1000] as [number, number, number] },
      } as LevelConfig),
    } as unknown as LevelLoader;

    mockAdManager = {
      showRewardedVideo: vi.fn().mockResolvedValue(true),
    } as unknown as AdManager;

    sceneManager = new SceneManager(
      mockUIManager,
      mockStateMachine,
      mockGameScene,
      mockAudioManager,
      mockSaveManager,
      mockResultScreen,
      mockLevelSelectScreen,
      mockLevelLoader,
      mockAdManager,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create without error', () => {
    expect(sceneManager).toBeDefined();
  });

  it('should return playing state correctly', () => {
    expect(sceneManager.isPlaying()).toBe(true);
  });

  it('should return not playing when state is not playing', () => {
    (mockStateMachine.getCurrentState as any).mockReturnValue('menu');
    expect(sceneManager.isPlaying()).toBe(false);
  });

  it('should return current state', () => {
    expect(sceneManager.getCurrentState()).toBe('playing');
  });

  it('should return state machine', () => {
    expect(sceneManager.getStateMachine()).toBe(mockStateMachine);
  });

  it('should register screens', () => {
    const screens = [
      { name: 'mainMenu', screen: {} as any },
      { name: 'levelSelect', screen: {} as any },
    ];
    sceneManager.registerScreens(screens);
    expect(mockUIManager.registerScreen).toHaveBeenCalledWith('mainMenu', screens[0].screen);
    expect(mockUIManager.registerScreen).toHaveBeenCalledWith('levelSelect', screens[1].screen);
  });

  describe('transitionToMenu', () => {
    it('should transition to menu state', () => {
      sceneManager.transitionToMenu();
      expect(mockStateMachine.transition).toHaveBeenCalledWith('menu');
    });

    it('should show main menu screen', () => {
      sceneManager.transitionToMenu();
      expect(mockUIManager.showScreen).toHaveBeenCalledWith('mainMenu');
    });
  });

  describe('showMainMenu', () => {
    it('should stop physics', () => {
      sceneManager.showMainMenu();
      expect(mockGameScene.stopPhysics).toHaveBeenCalled();
    });

    it('should clear everything', () => {
      sceneManager.showMainMenu();
      expect(mockGameScene.clearEverything).toHaveBeenCalled();
    });

    it('should clear container walls', () => {
      sceneManager.showMainMenu();
      expect(mockGameScene.clearContainerWalls).toHaveBeenCalled();
    });

    it('should hide current screen', () => {
      sceneManager.showMainMenu();
      expect(mockUIManager.hideCurrentScreen).toHaveBeenCalled();
    });

    it('should show main menu screen', () => {
      sceneManager.showMainMenu();
      expect(mockUIManager.showScreen).toHaveBeenCalledWith('mainMenu');
    });

    it('should transition to menu state', () => {
      sceneManager.showMainMenu();
      expect(mockStateMachine.transition).toHaveBeenCalledWith('menu');
    });
  });

  describe('showLevelSelect', () => {
    it('should stop physics', () => {
      sceneManager.showLevelSelect();
      expect(mockGameScene.stopPhysics).toHaveBeenCalled();
    });

    it('should clear everything', () => {
      sceneManager.showLevelSelect();
      expect(mockGameScene.clearEverything).toHaveBeenCalled();
    });

    it('should clear container walls', () => {
      sceneManager.showLevelSelect();
      expect(mockGameScene.clearContainerWalls).toHaveBeenCalled();
    });

    it('should hide current screen', () => {
      sceneManager.showLevelSelect();
      expect(mockUIManager.hideCurrentScreen).toHaveBeenCalled();
    });

    it('should show level select screen', () => {
      sceneManager.showLevelSelect();
      expect(mockUIManager.showScreen).toHaveBeenCalledWith('levelSelect');
    });

    it('should transition to menu state', () => {
      sceneManager.showLevelSelect();
      expect(mockStateMachine.transition).toHaveBeenCalledWith('menu');
    });
  });

  describe('startLevel', () => {
    const levelConfig: LevelConfig = {
      id: 1,
      name: 'Test Level',
      objective: { type: 'score', target: 1000 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [500, 800, 1000] },
    };

    it('should hide current screen', () => {
      sceneManager.startLevel(levelConfig);
      expect(mockUIManager.hideCurrentScreen).toHaveBeenCalled();
    });

    it('should load level config', () => {
      sceneManager.startLevel(levelConfig);
      expect(mockGameScene.loadLevel).toHaveBeenCalledWith(levelConfig);
    });

    it('should show level objective', () => {
      sceneManager.startLevel(levelConfig);
      expect(mockGameScene.showLevelObjective).toHaveBeenCalledWith(levelConfig);
    });

    it('should transition to playing state', () => {
      sceneManager.startLevel(levelConfig);
      expect(mockStateMachine.transition).toHaveBeenCalledWith('playing');
    });

    it('should return true when gameScene exists', () => {
      expect(sceneManager.startLevel(levelConfig)).toBe(true);
    });

    it('should return false when gameScene is null', () => {
      (sceneManager as any).gameScene = null;
      expect(sceneManager.startLevel(levelConfig)).toBe(false);
    });
  });

  describe('startLevelById', () => {
    it('should start level when config found', () => {
      const result = sceneManager.startLevelById(1);
      expect(result).toBe(true);
      expect(mockGameScene.loadLevel).toHaveBeenCalled();
    });

    it('should return false when config not found', () => {
      (mockLevelLoader.getLevelConfig as any).mockReturnValue(null);
      const result = sceneManager.startLevelById(999);
      expect(result).toBe(false);
    });
  });

  describe('startGame', () => {
    it('should start first unlocked level', () => {
      const result = sceneManager.startGame();
      expect(result).toBe(true);
      expect(mockGameScene.loadLevel).toHaveBeenCalled();
    });

    it('should find first unlocked incomplete level', () => {
      (mockSaveManager.getLevelProgress as any).mockImplementation((id: number) => {
        if (id <= 3) return { unlocked: true, completed: true, highScore: 1000 };
        if (id === 4) return { unlocked: true, completed: false, highScore: 0 };
        return { unlocked: false, completed: false, highScore: 0 };
      });
      sceneManager.startGame();
      expect(mockLevelLoader.getLevelConfig).toHaveBeenCalledWith(4);
    });

    it('should default to level 1 when all unlocked levels are completed', () => {
      (mockSaveManager.getLevelProgress as any).mockReturnValue({ unlocked: true, completed: true, highScore: 1000 });
      sceneManager.startGame();
      expect(mockLevelLoader.getLevelConfig).toHaveBeenCalledWith(1);
    });

    it('should return false when no config found', () => {
      (mockLevelLoader.getLevelConfig as any).mockReturnValue(null);
      const result = sceneManager.startGame();
      expect(result).toBe(false);
    });
  });

  describe('pauseGame', () => {
    it('should transition to paused state when can transition', () => {
      sceneManager.pauseGame();
      expect(mockStateMachine.transition).toHaveBeenCalledWith('paused');
    });

    it('should show pause screen', () => {
      sceneManager.pauseGame();
      expect(mockUIManager.showScreen).toHaveBeenCalledWith('pause');
    });

    it('should pause game scene', () => {
      sceneManager.pauseGame();
      expect(mockGameScene.pause).toHaveBeenCalled();
    });

    it('should not transition when cannot transition', () => {
      (mockStateMachine.canTransition as any).mockReturnValue(false);
      sceneManager.pauseGame();
      expect(mockStateMachine.transition).not.toHaveBeenCalled();
    });

    it('should handle pause error gracefully', () => {
      (mockGameScene.pause as any).mockImplementation(() => { throw new Error('pause error'); });
      expect(() => sceneManager.pauseGame()).not.toThrow();
    });
  });

  describe('resumeGame', () => {
    it('should transition to playing state when can transition', () => {
      sceneManager.resumeGame();
      expect(mockStateMachine.transition).toHaveBeenCalledWith('playing');
    });

    it('should hide current screen', () => {
      sceneManager.resumeGame();
      expect(mockUIManager.hideCurrentScreen).toHaveBeenCalled();
    });

    it('should resume game scene', () => {
      sceneManager.resumeGame();
      expect(mockGameScene.resume).toHaveBeenCalled();
    });

    it('should not transition when cannot transition', () => {
      (mockStateMachine.canTransition as any).mockReturnValue(false);
      sceneManager.resumeGame();
      expect(mockStateMachine.transition).not.toHaveBeenCalled();
    });

    it('should handle resume error gracefully', () => {
      (mockGameScene.resume as any).mockImplementation(() => { throw new Error('resume error'); });
      expect(() => sceneManager.resumeGame()).not.toThrow();
    });
  });

  describe('restartGame', () => {
    it('should hide current screen', () => {
      sceneManager.restartGame();
      expect(mockUIManager.hideCurrentScreen).toHaveBeenCalled();
    });

    it('should transition to playing state', () => {
      sceneManager.restartGame();
      expect(mockStateMachine.transition).toHaveBeenCalledWith('playing');
    });

    it('should restart level on game scene', () => {
      sceneManager.restartGame();
      expect(mockGameScene.restartLevel).toHaveBeenCalled();
    });

    it('should handle restart error gracefully', () => {
      (mockGameScene.restartLevel as any).mockImplementation(() => { throw new Error('restart error'); });
      expect(() => sceneManager.restartGame()).not.toThrow();
    });
  });

  describe('completeLevel', () => {
    it('should call updateStatistics with correct values from GameScene', () => {
      sceneManager.completeLevel(1500, 1);
      expect(mockSaveManager.updateStatistics).toHaveBeenCalledWith(64, 5, expect.any(Number));
    });

    it('should call updateLevelProgress with correct parameters', () => {
      sceneManager.completeLevel(1500, 1);
      expect(mockSaveManager.updateLevelProgress).toHaveBeenCalledWith(
        1, 1500, expect.any(Number), 3, true
      );
    });

    it('should call updateStatistics with highestMerge from LevelSystem', () => {
      (mockLevelSystem.getHighestMergeValue as any).mockReturnValue(128);
      sceneManager.completeLevel(2000, 1);
      expect(mockSaveManager.updateStatistics).toHaveBeenCalledWith(128, 5, expect.any(Number));
    });

    it('should call updateStatistics with maxChainCount from ScoreSystem', () => {
      (mockScoreSystem.getMaxChainCount as any).mockReturnValue(10);
      sceneManager.completeLevel(2000, 1);
      expect(mockSaveManager.updateStatistics).toHaveBeenCalledWith(64, 10, expect.any(Number));
    });

    it('should handle null LevelSystem gracefully', () => {
      (mockGameScene.getLevelSystem as any).mockReturnValue(null);
      expect(() => sceneManager.completeLevel(1500, 1)).not.toThrow();
      expect(mockSaveManager.updateStatistics).toHaveBeenCalledWith(0, 5, expect.any(Number));
    });

    it('should transition to levelComplete state', () => {
      sceneManager.completeLevel(1500, 1);
      expect(mockStateMachine.transition).toHaveBeenCalledWith('levelComplete');
    });

    it('should play levelComplete sound', () => {
      sceneManager.completeLevel(1500, 1);
      expect(mockAudioManager.play).toHaveBeenCalledWith('levelComplete');
    });

    it('should update level select screen progress', () => {
      sceneManager.completeLevel(1500, 1);
      expect(mockLevelSelectScreen.updateLevelProgress).toHaveBeenCalledWith(1, 3);
    });

    it('should set result screen data', () => {
      sceneManager.completeLevel(1500, 1);
      expect(mockResultScreen.setResult).toHaveBeenCalledWith(
        expect.objectContaining({
          isWin: true,
          score: 1500,
          stars: 3,
          levelId: 1,
        })
      );
    });

    it('should include bestScore when previous high score is higher', () => {
      (mockSaveManager.getLevelProgress as any).mockReturnValue({ unlocked: true, completed: false, highScore: 2000 });
      sceneManager.completeLevel(1500, 1);
      expect(mockResultScreen.setResult).toHaveBeenCalledWith(
        expect.objectContaining({ bestScore: 2000 })
      );
    });

    it('should not include bestScore when current score is higher', () => {
      (mockSaveManager.getLevelProgress as any).mockReturnValue({ unlocked: true, completed: false, highScore: 500 });
      sceneManager.completeLevel(1500, 1);
      const resultData = (mockResultScreen.setResult as any).mock.calls[0][0];
      expect(resultData.bestScore).toBeUndefined();
    });

    it('should handle scene errors gracefully', () => {
      (mockGameScene.stopPhysics as any).mockImplementation(() => { throw new Error('scene error'); });
      expect(() => sceneManager.completeLevel(1500, 1)).not.toThrow();
    });

    it('should handle save errors gracefully', () => {
      (mockSaveManager.updateLevelProgress as any).mockImplementation(() => { throw new Error('save error'); });
      expect(() => sceneManager.completeLevel(1500, 1)).not.toThrow();
    });

    it('should include maxCombo and mergedCount in result', () => {
      sceneManager.completeLevel(1500, 1);
      expect(mockResultScreen.setResult).toHaveBeenCalledWith(
        expect.objectContaining({
          maxCombo: 5,
          mergedCount: 64,
        })
      );
    });
  });

  describe('failGame', () => {
    it('should call updateLevelProgress with completed=false', () => {
      sceneManager.failGame();
      expect(mockSaveManager.updateLevelProgress).toHaveBeenCalledWith(
        1, 1500, expect.any(Number), 0, false
      );
    });

    it('should play gameover sound', () => {
      sceneManager.failGame();
      expect(mockAudioManager.play).toHaveBeenCalledWith('gameover');
    });

    it('should transition to gameover state', () => {
      sceneManager.failGame();
      expect(mockStateMachine.transition).toHaveBeenCalledWith('gameover');
    });

    it('should stop level timer', () => {
      sceneManager.failGame();
      expect(mockLevelSystem.stopTimer).toHaveBeenCalled();
    });

    it('should stop physics', () => {
      sceneManager.failGame();
      expect(mockGameScene.stopPhysics).toHaveBeenCalled();
    });

    it('should clear everything', () => {
      sceneManager.failGame();
      expect(mockGameScene.clearEverything).toHaveBeenCalled();
    });

    it('should pause all modifiers', () => {
      sceneManager.failGame();
      expect(mockGameScene.getModifierManager().pauseAll).toHaveBeenCalled();
    });

    it('should pause prop effect handler', () => {
      sceneManager.failGame();
      expect(mockGameScene.getPropEffectHandler().pause).toHaveBeenCalled();
    });

    it('should show result screen', () => {
      sceneManager.failGame();
      expect(mockUIManager.showScreen).toHaveBeenCalledWith('result');
    });

    it('should set result screen with isWin false', () => {
      sceneManager.failGame();
      expect(mockResultScreen.setResult).toHaveBeenCalledWith(
        expect.objectContaining({ isWin: false, stars: 0 })
      );
    });

    it('should not transition if state machine rejects', () => {
      (mockStateMachine.transition as any).mockReturnValue(false);
      sceneManager.failGame();
      expect(mockAudioManager.play).not.toHaveBeenCalled();
    });

    it('should handle null level system gracefully', () => {
      (mockGameScene.getLevelSystem as any).mockReturnValue(null);
      expect(() => sceneManager.failGame()).not.toThrow();
    });

    it('should handle scene errors gracefully', () => {
      (mockGameScene.stopPhysics as any).mockImplementation(() => { throw new Error('stop error'); });
      expect(() => sceneManager.failGame()).not.toThrow();
    });

    it('should handle save errors gracefully', () => {
      (mockSaveManager.updateLevelProgress as any).mockImplementation(() => { throw new Error('save error'); });
      expect(() => sceneManager.failGame()).not.toThrow();
    });
  });

  describe('reviveGame', () => {
    it('should hide current screen when ad watched', async () => {
      await sceneManager.reviveGame();
      expect(mockUIManager.hideCurrentScreen).toHaveBeenCalled();
    });

    it('should handle revive on game scene', async () => {
      await sceneManager.reviveGame();
      expect(mockGameScene.handleRevive).toHaveBeenCalled();
    });

    it('should transition to playing state', async () => {
      await sceneManager.reviveGame();
      expect(mockStateMachine.transition).toHaveBeenCalledWith('playing');
    });

    it('should not revive when ad not watched', async () => {
      (mockAdManager.showRewardedVideo as any).mockResolvedValue(false);
      await sceneManager.reviveGame();
      expect(mockGameScene.handleRevive).not.toHaveBeenCalled();
      expect(mockStateMachine.transition).not.toHaveBeenCalledWith('playing');
    });

    it('should handle revive error gracefully', async () => {
      (mockGameScene.handleRevive as any).mockImplementation(() => { throw new Error('revive error'); });
      await expect(sceneManager.reviveGame()).resolves.not.toThrow();
    });
  });

  describe('nextLevel', () => {
    it('should start next level when config exists', () => {
      (mockLevelLoader.getLevelConfig as any).mockImplementation((id: number) => {
        if (id === 1) return { id: 1, name: 'Level 1' };
        if (id === 2) return { id: 2, name: 'Level 2' };
        return null;
      });
      sceneManager.nextLevel();
      expect(mockGameScene.loadLevel).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
    });

    it('should show level select when next level config not found', () => {
      (mockLevelLoader.getLevelConfig as any).mockReturnValue(null);
      sceneManager.nextLevel();
      expect(mockGameScene.stopPhysics).toHaveBeenCalled();
      expect(mockUIManager.showScreen).toHaveBeenCalledWith('levelSelect');
    });

    it('should handle error getting current level id', () => {
      (mockGameScene.getLevelSystem as any).mockImplementation(() => { throw new Error('level error'); });
      (mockLevelLoader.getLevelConfig as any).mockReturnValue(null);
      sceneManager.nextLevel();
      expect(mockUIManager.showScreen).toHaveBeenCalledWith('levelSelect');
    });

    it('should default to level 1 when level system throws', () => {
      (mockGameScene.getLevelSystem as any).mockImplementation(() => { throw new Error('level error'); });
      (mockLevelLoader.getLevelConfig as any).mockImplementation((id: number) => {
        if (id === 2) return { id: 2, name: 'Level 2' };
        return null;
      });
      sceneManager.nextLevel();
      expect(mockLevelLoader.getLevelConfig).toHaveBeenCalledWith(2);
    });
  });
});
