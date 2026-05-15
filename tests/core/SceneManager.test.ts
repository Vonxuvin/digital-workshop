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

    sceneManager = new SceneManager(
      mockUIManager,
      mockStateMachine,
      mockGameScene,
      mockAudioManager,
      mockSaveManager,
      mockResultScreen,
      mockLevelSelectScreen,
      mockLevelLoader,
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
  });
});