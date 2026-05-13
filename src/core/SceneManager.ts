import { UIManager, Screen } from '../ui/UIManager';
import { GameStateMachine, GameState } from './GameStateMachine';
import { GameScene } from './GameScene';
import { LevelConfig } from '../gameplay/LevelSystem';
import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';
import { ResultScreen, ResultData } from '../ui/screens/ResultScreen';
import { LevelSelectScreen } from '../ui/screens/LevelSelectScreen';
import { LevelLoader } from './LevelLoader';

export class SceneManager {
  private uiManager: UIManager;
  private stateMachine: GameStateMachine;
  private gameScene: GameScene;
  private audioManager: AudioManager;
  private saveManager: SaveManager;
  private resultScreen: ResultScreen;
  private levelSelectScreen: LevelSelectScreen;
  private levelLoader: LevelLoader;

  constructor(
    uiManager: UIManager,
    stateMachine: GameStateMachine,
    gameScene: GameScene,
    audioManager: AudioManager,
    saveManager: SaveManager,
    resultScreen: ResultScreen,
    levelSelectScreen: LevelSelectScreen,
    levelLoader: LevelLoader,
  ) {
    this.uiManager = uiManager;
    this.stateMachine = stateMachine;
    this.gameScene = gameScene;
    this.audioManager = audioManager;
    this.saveManager = saveManager;
    this.resultScreen = resultScreen;
    this.levelSelectScreen = levelSelectScreen;
    this.levelLoader = levelLoader;
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

  startLevel(config: LevelConfig): void {
    this.uiManager.hideCurrentScreen();
    this.gameScene.loadLevel(config);
    this.stateMachine.transition('playing');
  }

  startLevelById(levelId: number): void {
    const config = this.levelLoader.getLevelConfig(levelId);
    if (config) {
      this.startLevel(config);
    }
  }

  pauseGame(): void {
    if (this.stateMachine.canTransition('paused')) {
      this.stateMachine.transition('paused');
      this.gameScene.pause();
      this.uiManager.showScreen('pause');
    }
  }

  resumeGame(): void {
    if (this.stateMachine.canTransition('playing')) {
      this.stateMachine.transition('playing');
      this.uiManager.hideCurrentScreen();
      this.gameScene.resume();
    }
  }

  restartGame(): void {
    this.uiManager.hideCurrentScreen();
    this.gameScene.restartLevel();
    this.stateMachine.transition('playing');
  }

  failGame(): void {
    if (!this.stateMachine.transition('gameover')) return;
    this.gameScene.getLevelSystem()?.stopTimer();
    this.gameScene.stopPhysics();
    this.gameScene.clearEverything();
    this.gameScene.getModifierManager().pauseAll();
    this.gameScene.getPropEffectHandler().pause();
    this.audioManager.play('gameover');
    const levelId = this.gameScene.getLevelSystem()?.getConfig().id || 1;
    const playTime = Math.floor((Date.now() - this.gameScene.getGameStartTime()) / 1000);
    this.saveManager.updateLevelProgress(levelId, this.gameScene.getScoreSystem().getScore(), playTime, 0, false);
    this.resultScreen.setResult({
      isWin: false,
      score: this.gameScene.getScoreSystem().getScore(),
      stars: 0,
      levelId,
    });
    this.uiManager.showScreen('result');
  }

  completeLevel(score: number, levelId: number): void {
    this.stateMachine.transition('levelComplete');
    this.gameScene.stopPhysics();
    this.gameScene.getGameHUD().skipAnimation();
    this.gameScene.clearEverything();
    this.audioManager.play('levelComplete');
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
    });
    this.uiManager.showScreen('result');
  }

  reviveGame(): void {
    this.uiManager.hideCurrentScreen();
    this.gameScene.handleRevive();
    this.stateMachine.transition('playing');
  }

  nextLevel(): void {
    const currentId = this.gameScene.getLevelSystem()?.getConfig().id || 1;
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
