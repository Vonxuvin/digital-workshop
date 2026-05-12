import { UIManager, Screen } from '../ui/UIManager';
import { GameStateMachine, GameState } from './GameStateMachine';
import { GameScene } from './GameScene';
import { LevelConfig } from '../gameplay/LevelSystem';
import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';
import { ResultScreen, ResultData } from '../ui/screens/ResultScreen';
import { LevelSelectScreen } from '../ui/screens/LevelSelectScreen';

export class SceneManager {
  private uiManager: UIManager;
  private stateMachine: GameStateMachine;
  private gameScene: GameScene;
  private audioManager: AudioManager;
  private saveManager: SaveManager;
  private resultScreen: ResultScreen;
  private levelSelectScreen: LevelSelectScreen;

  constructor(
    uiManager: UIManager,
    stateMachine: GameStateMachine,
    gameScene: GameScene,
    audioManager: AudioManager,
    saveManager: SaveManager,
    resultScreen: ResultScreen,
    levelSelectScreen: LevelSelectScreen,
  ) {
    this.uiManager = uiManager;
    this.stateMachine = stateMachine;
    this.gameScene = gameScene;
    this.audioManager = audioManager;
    this.saveManager = saveManager;
    this.resultScreen = resultScreen;
    this.levelSelectScreen = levelSelectScreen;
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
    this.gameScene.getLevelSystem()?.forceComplete();
    if (!this.stateMachine.transition('gameover')) return;
    this.gameScene.stopPhysics();
    this.gameScene.clearEverything();
    this.audioManager.play('gameover');
    const levelId = this.gameScene.getLevelSystem()?.getConfig().id || 1;
    const playTime = Math.floor((Date.now() - this.gameScene.getGameStartTime()) / 1000);
    this.saveManager.updateLevelProgress(levelId, this.gameScene.getScoreSystem().getCurrentScore(), playTime, 0, false);
    this.resultScreen.setResult({
      isWin: false,
      score: this.gameScene.getScoreSystem().getCurrentScore(),
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
    this.saveManager.updateLevelProgress(levelId, score, playTime, stars, true);
    this.saveManager.updateStatistics(0, 0, playTime);
    this.levelSelectScreen.updateLevelProgress(levelId, stars);
    this.resultScreen.setResult({
      isWin: true,
      score,
      stars,
      levelId,
    });
    this.uiManager.showScreen('result');
  }

  reviveGame(): void {
    this.uiManager.hideCurrentScreen();
    this.gameScene.handleRevive();
    this.stateMachine.transition('playing');
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
