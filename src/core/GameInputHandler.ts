import { InputManager } from './InputManager';
import { GameScene } from './GameScene';
import { SceneManager } from './SceneManager';
import { GameStateMachine } from './GameStateMachine';
import { GameHUD } from '../ui/hud/GameHUD';
import { Application } from 'pixi.js';

export class GameInputHandler {
  private static readonly KEYBOARD_DROP_Y = 100;
  private static readonly CONTAINER_OFFSET_DROP_Y = 80;
  private static readonly NO_OFFSET_DROP_Y = 60;
  private static readonly MIN_DROP_Y = 60;
  private static readonly DEFAULT_CONTAINER_HALF = 300;
  private static readonly TOUCH_OFFSET_RATIO = 0.05;
  private static readonly DEFAULT_SCREEN_HEIGHT = 600;

  private app: Application;
  private input: InputManager;
  private gameScene: GameScene;
  private sceneManager: SceneManager;
  private stateMachine: GameStateMachine;
  private gameHUD: GameHUD;
  private canvas: HTMLCanvasElement;
  private boundKeydown: ((e: KeyboardEvent) => void) | null = null;
  private touchStartedInContainer: boolean = false;

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

  private isInsideContainerX(x: number): boolean {
    const left = this.gameScene.getContainerOffsetX();
    const right = left + this.gameScene.getContainerWidth();
    return x >= left && x <= right;
  }

  private isAboveContainerGround(y: number): boolean {
    const groundY = this.gameScene.getGroundY();
    return y < groundY;
  }

  private isTouchInValidDropZone(x: number, y: number): boolean {
    return this.isInsideContainerX(x) && this.isAboveContainerGround(y);
  }

  private isInTargetMode(): boolean {
    return this.gameScene.getBombTargetMode() || this.gameHUD.isPropTargetMode;
  }

  setup(): void {
    this.syncInputScale();

    this.input.onDown((state) => {
      if (!this.sceneManager.isPlaying()) return;
      if (this.isInTargetMode()) {
        this.gameHUD.showCrosshair(state.position.x, state.position.y);
        return;
      }
      if (!this.gameScene.getBlockSpawner().getCanDrop()) return;
      this.touchStartedInContainer = this.isTouchInValidDropZone(state.position.x, state.position.y);
      if (!this.touchStartedInContainer) return;
      const dropY = this.calculateDropY(state.position.y);
      this.gameScene.getPreview().show(this.gameScene.getBlockSpawner().getCurrentValue(), state.position.x, dropY);
    });

    this.input.onMove((state) => {
      if (state.isDown && this.isInTargetMode() && this.sceneManager.isPlaying()) {
        this.gameHUD.updateCrosshair(state.position.x, state.position.y);
        return;
      }
      if (state.isDown && this.touchStartedInContainer && this.sceneManager.isPlaying() && !this.isInTargetMode()) {
        this.gameScene.getPreview().updatePosition(state.position.x);
      }
    });

    this.input.onUp(() => {
      this.touchStartedInContainer = false;
      if (this.gameHUD.consumePropButtonClick()) return;
      if (this.isInTargetMode() && this.sceneManager.isPlaying()) {
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
          const dropY = this.calculateDropY(GameInputHandler.KEYBOARD_DROP_Y);
          this.gameScene.dropBlockWithShrinkCheck(centerX, dropY, this.gameScene.getBlockSpawner().getCurrentValue());
          this.gameScene.getBlockSpawner().startCooldown();
          this.gameScene.getPreview().setNextValue(this.gameScene.getBlockSpawner().getCurrentValue());
        }
      }
    };
    window.addEventListener('keydown', this.boundKeydown);
  }

  private calculateDropY(touchY: number): number {
    const touchOffsetY = this.getTouchOffsetY();
    const offset = this.gameScene.getContainerOffsetX() > 0 ? GameInputHandler.CONTAINER_OFFSET_DROP_Y : GameInputHandler.NO_OFFSET_DROP_Y;
    const maxDropY = this.gameScene.getContainerHeight() > 0
      ? this.gameScene.getContainerHeight() * 0.5
      : GameInputHandler.DEFAULT_CONTAINER_HALF;
    return Math.max(GameInputHandler.MIN_DROP_Y, Math.min(touchY - touchOffsetY, maxDropY));
  }

  private getTouchOffsetY(): number {
    const dpr = window.devicePixelRatio || 1;
    const screenHeight = this.app.screen.height || GameInputHandler.DEFAULT_SCREEN_HEIGHT;
    return Math.round(screenHeight * GameInputHandler.TOUCH_OFFSET_RATIO * dpr);
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