import { GameScene, BlockMergedData } from './GameScene';
import { SceneManager } from './SceneManager';
import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';
import { LevelLoader } from './LevelLoader';
import { PropType } from '../gameplay/props/Prop';
import { eventBus, NamespacedEventBus, GameEvents } from '../utils/EventBus';

export class GameEventRouter {
  private gameScene: GameScene;
  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  private saveManager: SaveManager;
  private levelLoader: LevelLoader;
  private ns: NamespacedEventBus;

  constructor(
    gameScene: GameScene,
    sceneManager: SceneManager,
    audioManager: AudioManager,
    saveManager: SaveManager,
    levelLoader: LevelLoader,
  ) {
    this.gameScene = gameScene;
    this.sceneManager = sceneManager;
    this.audioManager = audioManager;
    this.saveManager = saveManager;
    this.levelLoader = levelLoader;
    this.ns = eventBus.createNamespace('gameRouter');
  }

  setup(): void {
    this.ns.on(GameEvents.BLOCK_MERGED, this.handleBlockMerged.bind(this));
    this.ns.on(GameEvents.BLOCK_DROPPED, this.handleBlockDropped.bind(this));
    this.ns.on(GameEvents.GAME_OVER, this.handleGameOver.bind(this));
    this.ns.on(GameEvents.GAME_TIMEOUT, this.handleTimeout.bind(this));
    this.ns.on(GameEvents.LEVEL_COMPLETED, this.handleLevelCompleted.bind(this));
    this.ns.on(GameEvents.UI_START_GAME, this.handleStartGame.bind(this));
    this.ns.on(GameEvents.UI_SELECT_LEVEL, this.handleSelectLevel.bind(this));
    this.ns.on(GameEvents.UI_PAUSE, this.handlePause.bind(this));
    this.ns.on(GameEvents.UI_RESUME, this.handleResume.bind(this));
    this.ns.on(GameEvents.UI_RESTART, this.handleRestart.bind(this));
    this.ns.on(GameEvents.UI_BACK_TO_MENU, this.handleBackToMenu.bind(this));
    this.ns.on(GameEvents.UI_NEXT_LEVEL, this.handleNextLevel.bind(this));
    this.ns.on(GameEvents.UI_LEVEL_SELECT, this.handleLevelSelect.bind(this));
    this.ns.on(GameEvents.UI_REVIVE, this.handleRevive.bind(this));
    this.ns.on(GameEvents.PROPS_BOMB_EXPLODE, this.handleBombExplode.bind(this));
    this.ns.on(GameEvents.PROPS_FREEZE_ACTIVATED, this.handleFreezeActivated.bind(this));
    this.ns.on(GameEvents.PROPS_FREEZE_DEACTIVATED, this.handleFreezeDeactivated.bind(this));
    this.ns.on(GameEvents.UI_PROP_TARGET_MODE, this.handlePropTargetMode.bind(this));
    this.ns.on(GameEvents.GAMEPLAY_NEXT_BLOCK, this.handleNextRainbowBlock.bind(this));
    this.ns.on(GameEvents.PROPS_RAINBOW_CONSUMED, this.handleRainbowConsumed.bind(this));
    this.ns.on(GameEvents.PROPS_SHRINK_ACTIVATE, this.handleShrinkActivate.bind(this));
    this.ns.on(GameEvents.PROPS_SHRINK_DEACTIVATE, this.handleShrinkDeactivate.bind(this));
    this.ns.on(GameEvents.PROPS_LUCKY_ACTIVATE, this.handleLuckyActivate.bind(this));
    this.ns.on(GameEvents.PROPS_LUCKY_DEACTIVATE, this.handleLuckyDeactivate.bind(this));
    this.ns.on(GameEvents.LEVEL_TIME_UPDATE, this.handleLevelTimeUpdate.bind(this));
    this.ns.on(GameEvents.SCORE_UPDATED, this.handleScoreUpdated.bind(this));
    this.ns.on(GameEvents.WARNING_STARTED, this.handleWarningStarted.bind(this));
    this.ns.on(GameEvents.WARNING_ENDED, this.handleWarningEnded.bind(this));
  }

  private handleBlockMerged(data: BlockMergedData): void {
    this.audioManager.play('merge');
    this.gameScene.handleBlockMerged(data);
  }

  private handleBlockDropped(): void {
    this.audioManager.play('drop');
  }

  private handleGameOver(): void {
    this.audioManager.play('gameOver');
    this.sceneManager.failGame();
  }

  private handleTimeout(): void {
    this.sceneManager.failGame();
  }

  private handleLevelCompleted(data: { score: number; levelId: number }): void {
    this.audioManager.play('levelComplete');
    this.sceneManager.completeLevel(data.score, data.levelId);
  }

  private handleStartGame(): void {
    this.sceneManager.showLevelSelect();
  }

  private async handleSelectLevel(levelId: number): Promise<void> {
    const config = await this.levelLoader.loadLevel(levelId);
    if (config) {
      this.sceneManager.startLevel(config);
    }
  }

  private handlePause(): void {
    this.sceneManager.pauseGame();
  }

  private handleResume(): void {
    this.sceneManager.resumeGame();
  }

  private handleRestart(): void {
    this.sceneManager.restartGame();
  }

  private handleBackToMenu(): void {
    this.sceneManager.showMainMenu();
  }

  private async handleNextLevel(): Promise<void> {
    const currentId = this.gameScene.getLevelSystem()?.getConfig().id || 1;
    const nextId = currentId + 1;
    const config = await this.levelLoader.loadLevel(nextId);
    if (config) {
      this.sceneManager.startLevel(config);
    } else {
      this.sceneManager.showLevelSelect();
    }
  }

  private handleLevelSelect(): void {
    this.sceneManager.showLevelSelect();
  }

  private handleRevive(): void {
    this.sceneManager.reviveGame();
  }

  private handleBombExplode(data: { x: number; y: number; radius: number }): void {
    this.gameScene.handleBombExplode(data);
    this.audioManager.play('explosion');
  }

  private handleFreezeActivated(data: { duration: number; endTime: number }): void {
    this.gameScene.handleFreezeActivated(data);
    this.audioManager.play('freeze');
  }

  private handleFreezeDeactivated(): void {
    this.gameScene.handleFreezeDeactivated();
  }

  private handlePropTargetMode(data: { type?: PropType; enabled: boolean }): void {
    this.gameScene.handlePropTargetMode(data);
  }

  private handleNextRainbowBlock(data: { isRainbow: boolean; remaining: number }): void {
    this.gameScene.handleNextRainbowBlock(data);
  }

  private handleRainbowConsumed(data: { remainingBlocks: number }): void {
    this.gameScene.handleRainbowConsumed(data);
  }

  private handleShrinkActivate(data: { factor: number; duration: number }): void {
    this.gameScene.handleShrinkActivate(data);
    this.audioManager.play('shrink');
  }

  private handleShrinkDeactivate(): void {
    this.gameScene.handleShrinkDeactivate();
  }

  private handleLuckyActivate(data: { multiplier: number; remainingDrops: number }): void {
    this.gameScene.handleLuckyActivate(data);
  }

  private handleLuckyDeactivate(): void {
    this.gameScene.handleLuckyDeactivate();
  }

  private handleLevelTimeUpdate(seconds: number): void {
    this.gameScene.getGameHUD().updateTimer(seconds);
  }

  private handleScoreUpdated(data: { totalScore: number; earnedScore: number; chainCount: number }): void {
    if (data.chainCount >= 5) {
      this.audioManager.play('merge');
    }
  }

  private handleWarningStarted(): void {
    this.audioManager.play('warning');
  }

  private handleWarningEnded(): void {
  }

  destroy(): void {
    this.ns.offAll();
  }
}
