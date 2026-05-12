import { GameScene, BlockMergedData } from './GameScene';
import { SceneManager } from './SceneManager';
import { AudioManager } from './AudioManager';
import { SaveManager } from './SaveManager';
import { LevelLoader } from './LevelLoader';
import { PropType } from '../gameplay/props/Prop';
import { eventBus } from '../utils/EventBus';

export class GameEventRouter {
  private gameScene: GameScene;
  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  private saveManager: SaveManager;
  private levelLoader: LevelLoader;

  private boundHandlers: Map<string, (...args: any[]) => void> = new Map();

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
  }

  setup(): void {
    this.registerHandler('block:merged', this.handleBlockMerged.bind(this));
    this.registerHandler('game:over', this.handleGameOver.bind(this));
    this.registerHandler('game:timeout', this.handleTimeout.bind(this));
    this.registerHandler('level:completed', this.handleLevelCompleted.bind(this));
    this.registerHandler('ui:startGame', this.handleStartGame.bind(this));
    this.registerHandler('ui:selectLevel', this.handleSelectLevel.bind(this));
    this.registerHandler('ui:pause', this.handlePause.bind(this));
    this.registerHandler('ui:resume', this.handleResume.bind(this));
    this.registerHandler('ui:restart', this.handleRestart.bind(this));
    this.registerHandler('ui:backToMenu', this.handleBackToMenu.bind(this));
    this.registerHandler('ui:nextLevel', this.handleNextLevel.bind(this));
    this.registerHandler('ui:levelSelect', this.handleLevelSelect.bind(this));
    this.registerHandler('ui:revive', this.handleRevive.bind(this));
    this.registerHandler('props:bomb:explode', this.handleBombExplode.bind(this));
    this.registerHandler('props:freeze:activated', this.handleFreezeActivated.bind(this));
    this.registerHandler('props:freeze:deactivated', this.handleFreezeDeactivated.bind(this));
    this.registerHandler('ui:propTargetMode', this.handlePropTargetMode.bind(this));
    this.registerHandler('gameplay:nextBlock', this.handleNextRainbowBlock.bind(this));
    this.registerHandler('props:rainbow:consumed', this.handleRainbowConsumed.bind(this));
    this.registerHandler('props:shrink:activate', this.handleShrinkActivate.bind(this));
    this.registerHandler('props:shrink:deactivate', this.handleShrinkDeactivate.bind(this));
    this.registerHandler('props:lucky:activate', this.handleLuckyActivate.bind(this));
    this.registerHandler('props:lucky:deactivate', this.handleLuckyDeactivate.bind(this));
    this.registerHandler('level:timeUpdate', this.handleLevelTimeUpdate.bind(this));
  }

  private registerHandler(event: string, handler: (...args: any[]) => void): void {
    this.boundHandlers.set(event, handler);
    eventBus.on(event, handler);
  }

  private handleBlockMerged(data: BlockMergedData): void {
    this.audioManager.play('merge');
    this.gameScene.handleBlockMerged(data);
  }

  private handleGameOver(): void {
    this.sceneManager.failGame();
  }

  private handleTimeout(): void {
    this.sceneManager.failGame();
  }

  private handleLevelCompleted(data: { score: number; levelId: number }): void {
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
    this.audioManager.play('freeze');
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

  destroy(): void {
    for (const [event, handler] of this.boundHandlers) {
      eventBus.off(event, handler);
    }
    this.boundHandlers.clear();
  }
}
