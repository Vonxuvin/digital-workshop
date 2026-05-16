import { UIManager, Screen } from '../ui/UIManager';
import { GameStateMachine, GameState } from './GameStateMachine';
import { GameScene } from './GameScene';
import { LevelConfig } from '../gameplay/LevelSystem';
import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';
import { ResultScreen, ResultData } from '../ui/screens/ResultScreen';
import { LevelSelectScreen } from '../ui/screens/LevelSelectScreen';
import { LevelLoader } from './LevelLoader';
import { AdManager } from './AdManager';

export class SceneManager {
  private static readonly MAX_LEVEL_SEARCH = 50;

  private uiManager: UIManager;
  private stateMachine: GameStateMachine;
  private gameScene: GameScene;
  private audioManager: AudioManager;
  private saveManager: SaveManager;
  private resultScreen: ResultScreen;
  private levelSelectScreen: LevelSelectScreen;
  private levelLoader: LevelLoader;
  private adManager: AdManager;

  constructor(
    uiManager: UIManager,
    stateMachine: GameStateMachine,
    gameScene: GameScene,
    audioManager: AudioManager,
    saveManager: SaveManager,
    resultScreen: ResultScreen,
    levelSelectScreen: LevelSelectScreen,
    levelLoader: LevelLoader,
    adManager: AdManager,
  ) {
    this.uiManager = uiManager;
    this.stateMachine = stateMachine;
    this.gameScene = gameScene;
    this.audioManager = audioManager;
    this.saveManager = saveManager;
    this.resultScreen = resultScreen;
    this.levelSelectScreen = levelSelectScreen;
    this.levelLoader = levelLoader;
    this.adManager = adManager;
  }

  registerScreens(screens: { name: string; screen: Screen }[]): void {
    for (const { name, screen } of screens) {
      this.uiManager.registerScreen(name, screen);
    }
  }

  transitionToMenu(): void {
    this.stateMachine.transition('menu');
    this.uiManager.showScreen('mainMenu');
  }

  showMainMenu(): void {
    this.gameScene.stopPhysics();
    this.gameScene.clearEverything();
    this.gameScene.clearContainerWalls();
    this.uiManager.hideCurrentScreen();
    this.uiManager.showScreen('mainMenu');
    this.stateMachine.transition('menu');
  }

  showLevelSelect(): void {
    this.gameScene.stopPhysics();
    this.gameScene.clearEverything();
    this.gameScene.clearContainerWalls();
    this.uiManager.hideCurrentScreen();
    this.uiManager.showScreen('levelSelect');
    this.stateMachine.transition('menu');
  }

  startLevel(config: LevelConfig): boolean {
    if (!this.gameScene) {
      console.warn('[SceneManager] startLevel: gameScene未初始化(WebGL降级模式)');
      return false;
    }
    this.uiManager.hideCurrentScreen();
    this.gameScene.loadLevel(config);
    this.stateMachine.transition('playing');
    return true;
  }

  startLevelById(levelId: number): boolean {
    const config = this.levelLoader.getLevelConfig(levelId);
    if (config) {
      return this.startLevel(config);
    }
    console.warn(`[SceneManager] startLevelById(${levelId}): 关卡配置未找到`);
    return false;
  }

  startGame(): boolean {
    const firstUnlocked = this.findFirstUnlockedLevel();
    const config = this.levelLoader.getLevelConfig(firstUnlocked);
    if (config) {
      return this.startLevel(config);
    }
    console.warn(`[SceneManager] startGame: 关卡配置未找到 (firstUnlocked=${firstUnlocked})`);
    return false;
  }

  private findFirstUnlockedLevel(): number {
    for (let id = 1; id <= SceneManager.MAX_LEVEL_SEARCH; id++) {
      const progress = this.saveManager.getLevelProgress(id);
      if (progress.unlocked && !progress.completed) return id;
    }
    return 1;
  }

  pauseGame(): void {
    if (this.stateMachine.canTransition('paused')) {
      this.stateMachine.transition('paused');
      this.uiManager.showScreen('pause');
      try {
        this.gameScene.pause();
      } catch (error) { console.error('[SceneManager] pauseGame: gameScene.pause() failed', error); }
    }
  }

  resumeGame(): void {
    if (this.stateMachine.canTransition('playing')) {
      this.stateMachine.transition('playing');
      this.uiManager.hideCurrentScreen();
      try {
        this.gameScene.resume();
      } catch (error) { console.error('[SceneManager] resumeGame: gameScene.resume() failed', error); }
    }
  }

  restartGame(): void {
    this.uiManager.hideCurrentScreen();
    this.stateMachine.transition('playing');
    try {
      this.gameScene.restartLevel();
    } catch (error) { console.error('[SceneManager] restartGame: gameScene.restartLevel() failed', error); }
  }

  failGame(): void {
    if (!this.stateMachine.transition('gameover')) return;
    try {
      this.gameScene.getLevelSystem()?.stopTimer();
      this.gameScene.stopPhysics();
      this.gameScene.clearEverything();
      this.gameScene.getModifierManager().pauseAll();
      this.gameScene.getPropEffectHandler().pause();
    } catch (error) { console.error('[SceneManager] failGame: cleanup operations failed', error); }
    this.audioManager.play('gameover');
    try {
      const levelId = this.gameScene.getLevelSystem()?.getConfig().id || 1;
      const playTime = Math.floor((Date.now() - this.gameScene.getGameStartTime()) / 1000);
      const score = this.gameScene.getScoreSystem().getScore();
      this.saveManager.updateLevelProgress(levelId, score, playTime, 0, false);
      this.resultScreen.setResult({
        isWin: false,
        score,
        stars: 0,
        levelId,
        playTime,
      });
    } catch (error) { console.error('[SceneManager] failGame: save result failed', error); }
    this.uiManager.showScreen('result');
  }

  completeLevel(score: number, levelId: number): void {
    this.stateMachine.transition('levelComplete');
    try {
      this.gameScene.stopPhysics();
      this.gameScene.getGameHUD().skipAnimation();
      this.gameScene.clearEverything();
    } catch (error) { console.error('[SceneManager] completeLevel: cleanup operations failed', error); }
    this.audioManager.play('levelComplete');
    try {
      const stars = this.gameScene.calculateStars(score, levelId);
      const playTime = Math.floor((Date.now() - this.gameScene.getGameStartTime()) / 1000);
      const bestScore = this.saveManager.getLevelProgress(levelId).highScore || 0;
      this.saveManager.updateLevelProgress(levelId, score, playTime, stars, true);
      const highestMerge = this.gameScene.getLevelSystem()?.getHighestMergeValue() ?? 0;
      const longestCombo = this.gameScene.getScoreSystem().getMaxChainCount();
      this.saveManager.updateStatistics(highestMerge, longestCombo, playTime);
      this.levelSelectScreen.updateLevelProgress(levelId, stars);
      this.resultScreen.setResult({
        isWin: true,
        score,
        stars,
        levelId,
        playTime,
        bestScore: bestScore > score ? bestScore : undefined,
        maxCombo: longestCombo,
        mergedCount: highestMerge,
      });
    } catch (error) { console.error('[SceneManager] completeLevel: save result failed', error); }
    this.uiManager.showScreen('result');
  }

  async reviveGame(): Promise<void> {
    const watched = await this.adManager.showRewardedVideo();
    if (!watched) {
      return;
    }
    this.uiManager.hideCurrentScreen();
    try {
      this.gameScene.handleRevive();
    } catch (error) { console.error('[SceneManager] reviveGame: handleRevive() failed', error); }
    this.stateMachine.transition('playing');
  }

  nextLevel(): void {
    let currentId = 1;
    try {
      currentId = this.gameScene.getLevelSystem()?.getConfig().id || 1;
    } catch (error) { console.error('[SceneManager] nextLevel: getLevelSystem config failed', error); }
    const nextId = currentId + 1;
    const config = this.levelLoader.getLevelConfig(nextId);
    if (config) {
      this.startLevel(config);
    } else {
      this.showLevelSelect();
    }
  }

  getCurrentState(): GameState {
    return this.stateMachine.getCurrentState();
  }

  isPlaying(): boolean {
    return this.stateMachine.getCurrentState() === 'playing';
  }

  getStateMachine(): GameStateMachine {
    return this.stateMachine;
  }
}
