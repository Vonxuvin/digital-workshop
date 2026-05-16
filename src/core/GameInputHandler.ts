import { InputManager } from './InputManager';
import { GameScene } from './GameScene';
import { SceneManager } from './SceneManager';
import { GameStateMachine } from './GameStateMachine';
import { GameHUD } from '../ui/hud/GameHUD';
import { Application } from 'pixi.js';

export class GameInputHandler {
  private app: Application;
  private input: InputManager;
  private gameScene: GameScene;
  private sceneManager: SceneManager;
  private stateMachine: GameStateMachine;
  private gameHUD: GameHUD;
  private canvas: HTMLCanvasElement;
  private boundKeydown: ((e: KeyboardEvent) => void) | null = null;
  private static readonly TOUCH_OFFSET_Y = 30;

  constructor(
    app: Application,
    input: InputManager,
    gameScene: GameScene,
    sceneManager: SceneManager,
    stateMachine: GameStateMachine,
    gameHUD: GameHUD,
    canvas: HTMLCanvasElement,
  ) {
    this.app = app;
    this.input = input;
    this.gameScene = gameScene;
    this.sceneManager = sceneManager;
    this.stateMachine = stateMachine;
    this.gameHUD = gameHUD;
    this.canvas = canvas;
  }

  setup(): void {
    this.syncInputScale();

    this.input.onDown((state) => {
      if (!this.gameScene.getBlockSpawner().getCanDrop() || !this.sceneManager.isPlaying()) return;
      if (this.gameScene.getBombTargetMode()) {
        this.gameHUD.showCrosshair(state.position.x, state.position.y);
        return;
      }
      const dropY = this.calculateDropY(state.position.y);
      this.gameScene.getPreview().show(this.gameScene.getBlockSpawner().getCurrentValue(), state.position.x, dropY);
    });

    this.input.onMove((state) => {
      if (state.isDown && this.gameScene.getBombTargetMode() && this.sceneManager.isPlaying()) {
        this.gameHUD.updateCrosshair(state.position.x, state.position.y);
        return;
      }
      if (state.isDown && this.gameScene.getPreview().visible && this.sceneManager.isPlaying() && !this.gameScene.getBombTargetMode()) {
        this.gameScene.getPreview().updatePosition(state.position.x);
      }
    });

    this.input.onUp(() => {
      if (this.gameScene.getBombTargetMode() && this.sceneManager.isPlaying()) {
        const pos = this.input.getState().position;
        this.gameScene.usePropAtPosition(pos.x, pos.y);
        this.gameHUD.hideCrosshair();
        return;
      }
      if (this.gameScene.getPreview().visible && this.gameScene.getBlockSpawner().getCanDrop() && this.sceneManager.isPlaying()) {
        const targetX = this.gameScene.getPreview().getTargetX();
        const dropY = this.gameScene.getPreview().y;
        this.gameScene.dropBlockWithShrinkCheck(targetX, dropY, this.gameScene.getBlockSpawner().getCurrentValue());
        this.gameScene.getPreview().hide();
        this.gameScene.getBlockSpawner().startCooldown();
        this.gameScene.getPreview().setNextValue(this.gameScene.getBlockSpawner().getCurrentValue());
      }
    });
  }

  setupKeyboard(): void {
    this.boundKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const currentState = this.stateMachine.getCurrentState();
        if (currentState === 'playing') {
          this.sceneManager.pauseGame();
        } else if (currentState === 'paused') {
          this.sceneManager.resumeGame();
        }
      } else if (e.key === ' ') {
        const currentState = this.stateMachine.getCurrentState();
        if (currentState === 'playing' && this.gameScene.getBlockSpawner().getCanDrop()) {
          const centerX = this.app.screen.width / 2;
          const dropY = this.calculateDropY(100);
          this.gameScene.dropBlockWithShrinkCheck(centerX, dropY, this.gameScene.getBlockSpawner().getCurrentValue());
          this.gameScene.getBlockSpawner().startCooldown();
          this.gameScene.getPreview().setNextValue(this.gameScene.getBlockSpawner().getCurrentValue());
        }
      }
    };
    window.addEventListener('keydown', this.boundKeydown);
  }

  private calculateDropY(touchY: number): number {
    const offset = this.gameScene.getContainerOffsetX() > 0 ? 80 : 60;
    const maxDropY = this.gameScene.getContainerHeight() > 0
      ? this.gameScene.getContainerHeight() * 0.5
      : 300;
    return Math.max(60, Math.min(touchY - GameInputHandler.TOUCH_OFFSET_Y, maxDropY));
  }

  syncInputScale(): void {
    const rect = this.canvas.getBoundingClientRect();
    const rendererWidth = this.app.screen.width;
    const rendererHeight = this.app.screen.height;
    if (rect.width > 0 && rect.height > 0) {
      this.input.setScale(rendererWidth / rect.width, rendererHeight / rect.height);
    }
  }

  destroy(): void {
    if (this.boundKeydown) {
      window.removeEventListener('keydown', this.boundKeydown);
      this.boundKeydown = null;
    }
  }
}