import { Application } from 'pixi.js';
import { PhysicsManager } from './PhysicsManager';
import { InputManager } from './InputManager';
import { ScoreSystem } from '../gameplay/ScoreSystem';
import { GameStateMachine } from './GameStateMachine';
import { LevelSystem, LevelConfig } from '../gameplay/LevelSystem';
import { LevelLoader } from './LevelLoader';
import { AudioManager } from './AudioManager';
import { WarningLine } from '../ui/components/WarningLine';
import { MergeEffect } from '../ui/effects/MergeEffect';
import { Block, BLOCK_CONFIGS } from '../gameplay/Block';
import { BlockPreview } from '../gameplay/BlockPreview';
import { MergeSystem } from '../gameplay/MergeSystem';
import { UIManager } from '../ui/UIManager';
import { MainMenuScreen } from '../ui/screens/MainMenuScreen';
import { ResultScreen } from '../ui/screens/ResultScreen';
import { LevelSelectScreen } from '../ui/screens/LevelSelectScreen';
import { PauseScreen } from '../ui/screens/PauseScreen';
import { GameHUD } from '../ui/hud/GameHUD';
import { createPlatformAdapter } from '../platform/PlatformFactory';
import { eventBus } from '../utils/EventBus';

export class Game {
  private app: Application;
  private physics: PhysicsManager;
  private input: InputManager;
  private preview: BlockPreview;
  private mergeSystem: MergeSystem;
  private blocks: Block[] = [];
  private currentValue: number = 1;
  private canDrop = true;
  private dropCooldown = 500;
  private groundY: number;
  private scoreSystem: ScoreSystem;
  private stateMachine: GameStateMachine;
  private levelSystem: LevelSystem | null = null;
  private currentLevelConfig: LevelConfig | null = null;
  private warningLine: WarningLine | null = null;
  private uiManager: UIManager;
  private gameHUD: GameHUD;
  private resultScreen: ResultScreen;
  private levelSelectScreen: LevelSelectScreen;
  private pauseScreen: PauseScreen;
  private audioManager: AudioManager;
  private effects: MergeEffect[] = [];
  private onBlockMergedBound: (data: { newValue: number; position: { x: number; y: number } }) => void;
  private onBlocksDestroyedBound: (data: { blocks: Block[] }) => void;
  private onGameOverBound: () => void;
  private onLevelCompletedBound: (data: { score: number; levelId: number }) => void;
  private onStartGameBound: () => void;
  private onSelectLevelBound: (levelId: number) => void;
  private onPauseBound: () => void;
  private onResumeBound: () => void;
  private onRestartBound: () => void;
  private onBackToMenuBound: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.app = new Application();
    this.physics = new PhysicsManager();
    this.preview = new BlockPreview();
    this.input = new InputManager(canvas);
    this.mergeSystem = new MergeSystem(this.physics);
    this.scoreSystem = new ScoreSystem();
    this.stateMachine = new GameStateMachine();
    this.uiManager = new UIManager(this.app);
    this.gameHUD = new GameHUD();
    this.resultScreen = new ResultScreen();
    this.levelSelectScreen = new LevelSelectScreen();
    this.pauseScreen = new PauseScreen();
    this.audioManager = AudioManager.getInstance();
    this.groundY = window.innerHeight - 50;

    this.onBlockMergedBound = this.handleBlockMerged.bind(this);
    this.onBlocksDestroyedBound = this.handleBlocksDestroyed.bind(this);
    this.onGameOverBound = this.handleGameOver.bind(this);
    this.onLevelCompletedBound = this.handleLevelCompleted.bind(this);
    this.onStartGameBound = this.handleStartGame.bind(this);
    this.onSelectLevelBound = this.handleSelectLevel.bind(this);
    this.onPauseBound = this.handlePause.bind(this);
    this.onResumeBound = this.handleResume.bind(this);
    this.onRestartBound = this.handleRestart.bind(this);
    this.onBackToMenuBound = this.handleBackToMenu.bind(this);
  }

  async init(): Promise<void> {
    const platform = createPlatformAdapter();
    await platform.init();
    const systemInfo = await platform.getSystemInfo();

    await this.app.init({
      canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
      resizeTo: window,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: systemInfo.pixelRatio || 1,
      autoDensity: true,
    });

    await this.audioManager.init();

    this.setupContainer();
    this.setupUI();
    this.setupInput();
    this.setupEventListeners();
    this.app.stage.addChild(this.preview);
    this.app.stage.addChild(this.gameHUD);

    this.stateMachine.onAnyChange((from, to) => {
      console.log(`[Game] 状态变化: ${from} -> ${to}`);
    });

    this.app.ticker.add(this.update.bind(this));
    this.physics.start();

    this.uiManager.showScreen('mainMenu');

    console.log('[Game] 初始化完成');
  }

  private setupContainer(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.groundY = h - 50;

    this.physics.createRectangle(w / 2, this.groundY + 25, w, 50);
    this.physics.createRectangle(-25, h / 2, 50, h);
    this.physics.createRectangle(w + 25, h / 2, 50, h);

    this.warningLine = new WarningLine(h, w);
    this.warningLine.y = h * 0.2;
    this.app.stage.addChild(this.warningLine);
  }

  private setupUI(): void {
    const mainMenu = new MainMenuScreen();
    this.uiManager.registerScreen('mainMenu', mainMenu);
    this.uiManager.registerScreen('levelSelect', this.levelSelectScreen);
    this.uiManager.registerScreen('result', this.resultScreen);
    this.uiManager.registerScreen('pause', this.pauseScreen);
  }

  private setupInput(): void {
    const dropY = 80;

    this.input.onDown((state) => {
      if (!this.canDrop || this.stateMachine.getCurrentState() !== 'playing') return;
      this.preview.show(this.currentValue, state.position.x, dropY);
    });

    this.input.onMove((state) => {
      if (state.isDown && this.preview.visible && this.stateMachine.getCurrentState() === 'playing') {
        this.preview.updatePosition(state.position.x);
      }
    });

    this.input.onUp(() => {
      if (this.preview.visible && this.canDrop && this.stateMachine.getCurrentState() === 'playing') {
        this.dropBlock(this.preview.getTargetX(), dropY, this.currentValue);
        this.preview.hide();
        this.startCooldown();
      }
    });
  }

  private setupEventListeners(): void {
    eventBus.on('block:merged', this.onBlockMergedBound);
    eventBus.on('blocks:destroyed', this.onBlocksDestroyedBound);
    eventBus.on('game:over', this.onGameOverBound);
    eventBus.on('level:completed', this.onLevelCompletedBound);
    eventBus.on('ui:startGame', this.onStartGameBound);
    eventBus.on('ui:selectLevel', this.onSelectLevelBound);
    eventBus.on('ui:pause', this.onPauseBound);
    eventBus.on('ui:resume', this.onResumeBound);
    eventBus.on('ui:restart', this.onRestartBound);
    eventBus.on('ui:backToMenu', this.onBackToMenuBound);
  }

  private handleBlockMerged(data: { newValue: number; position: { x: number; y: number } }): void {
    this.audioManager.play('merge');
    const config = BLOCK_CONFIGS[data.newValue] || BLOCK_CONFIGS[1];
    const effect = new MergeEffect(data.position.x, data.position.y, config.color);
    this.app.stage.addChild(effect);
    this.effects.push(effect);
  }

  private handleBlocksDestroyed(data: { blocks: Block[] }): void {
    this.blocks = this.blocks.filter(block => !data.blocks.includes(block));
  }

  private handleGameOver(): void {
    this.stateMachine.transition('gameover');
    this.physics.stop();
    this.audioManager.play('gameover');
    this.resultScreen.setResult({
      isWin: false,
      score: this.scoreSystem.getCurrentScore(),
      stars: 0,
      levelId: this.levelSystem?.getConfig().id || 1,
    });
    this.uiManager.showScreen('result');
  }

  private handleLevelCompleted(data: { score: number; levelId: number }): void {
    this.stateMachine.transition('levelComplete');
    this.physics.stop();
    this.audioManager.play('levelComplete');
    const stars = this.calculateStars(data.score, data.levelId);
    this.resultScreen.setResult({
      isWin: true,
      score: data.score,
      stars,
      levelId: data.levelId,
    });
    this.uiManager.showScreen('result');
  }

  private calculateStars(score: number, levelId: number): number {
    const config = this.levelSystem?.getConfig();
    if (config?.rewards?.stars) {
      const thresholds = config.rewards.stars;
      if (score >= thresholds[2]) return 3;
      if (score >= thresholds[1]) return 2;
      if (score >= thresholds[0]) return 1;
    }
    if (score >= 1000) return 3;
    if (score >= 500) return 2;
    if (score >= 100) return 1;
    return 1;
  }

  private handleStartGame(): void {
    this.uiManager.showScreen('levelSelect');
  }

  private async handleSelectLevel(levelId: number): Promise<void> {
    const levelLoader = LevelLoader.getInstance();
    const config = await levelLoader.loadLevel(levelId);
    if (config) {
      this.loadLevel(config);
    }
  }

  private loadLevel(config: ReturnType<LevelSystem['getConfig']>): void {
    if (this.levelSystem) {
      this.levelSystem.destroy();
    }
    this.levelSystem = new LevelSystem(config);
    this.currentLevelConfig = config;
    this.gameHUD.updateLevel(config.id, config.name);
    this.uiManager.hideCurrentScreen();
    this.stateMachine.transition('playing');
    this.startGame();
  }

  private handlePause(): void {
    if (this.stateMachine.canTransition('paused')) {
      this.stateMachine.transition('paused');
      this.physics.stop();
      this.uiManager.showScreen('pause');
    }
  }

  private handleResume(): void {
    if (this.stateMachine.canTransition('playing')) {
      this.stateMachine.transition('playing');
      this.uiManager.hideCurrentScreen();
      this.physics.start();
    }
  }

  private handleRestart(): void {
    this.uiManager.hideCurrentScreen();
    this.resetGame();
    this.stateMachine.transition('playing');
    this.startGame();
    this.physics.start();
  }

  private handleBackToMenu(): void {
    this.physics.stop();
    this.uiManager.hideCurrentScreen();
    this.uiManager.showScreen('mainMenu');
    this.stateMachine.transition('menu');
  }

  private startGame(): void {
    this.resetGame();
    this.physics.start();
    this.levelSystem?.start();
  }

  private resetGame(): void {
    this.blocks.forEach(block => {
      this.physics.removeBody(block.body);
      block.destroy();
    });
    this.blocks = [];

    this.effects.forEach(effect => effect.destroy());
    this.effects = [];

    this.scoreSystem.reset();
    this.gameHUD.reset();
    this.warningLine?.reset();
    this.levelSystem?.reset();
  }

  private dropBlock(x: number, y: number, value: number): void {
    const config = BLOCK_CONFIGS[value] || BLOCK_CONFIGS[1];
    const body = this.physics.createCircle(x, y, config.radius, {
      density: config.mass * 0.001,
    });
    const block = new Block(body, value);
    this.app.stage.addChild(block);
    this.blocks.push(block);
    this.mergeSystem.registerBlock(block);

    this.currentValue = this.getRandomValue();
    console.log(`[Game] 投放方块 ${value}，下一个: ${this.currentValue}`);
  }

  private getRandomValue(): number {
    const availableNumbers = this.currentLevelConfig?.availableNumbers || [1, 2, 4];
    const weights: number[] = [];
    for (const num of availableNumbers) {
      const w = Math.max(1, Math.floor(8 / num));
      for (let i = 0; i < w; i++) {
        weights.push(num);
      }
    }
    return weights[Math.floor(Math.random() * weights.length)];
  }

  private startCooldown(): void {
    this.canDrop = false;
    setTimeout(() => {
      this.canDrop = true;
    }, this.dropCooldown);
  }

  private update(): void {
    if (this.stateMachine.getCurrentState() !== 'playing') return;

    this.blocks = this.blocks.filter(block => {
      if (block.isDestroyed) return false;
      if (block.y > this.app.screen.height + 100) {
        this.mergeSystem.unregisterBlock(block);
        this.physics.removeBody(block.body);
        block.destroy();
        return false;
      }
      return true;
    });

    this.blocks.forEach(block => block.syncFromBody());
    this.gameHUD.update(this.app.ticker.deltaMS / 16.67);

    if (this.warningLine) {
      this.warningLine.update(
        this.blocks.map(b => ({ y: b.y, radius: b.getConfig().radius })),
        this.app.ticker.deltaMS / 16.67
      );
    }

    this.effects = this.effects.filter(effect => {
      const alive = effect.update(this.app.ticker.deltaMS / 16.67);
      if (!alive) {
        effect.destroy();
        return false;
      }
      return true;
    });
  }

  getApp(): Application {
    return this.app;
  }

  getStateMachine(): GameStateMachine {
    return this.stateMachine;
  }

  getScoreSystem(): ScoreSystem {
    return this.scoreSystem;
  }

  getLevelSystem(): LevelSystem | null {
    return this.levelSystem;
  }

  destroy(): void {
    eventBus.off('block:merged', this.onBlockMergedBound);
    eventBus.off('blocks:destroyed', this.onBlocksDestroyedBound);
    eventBus.off('game:over', this.onGameOverBound);
    eventBus.off('level:completed', this.onLevelCompletedBound);
    eventBus.off('ui:startGame', this.onStartGameBound);
    eventBus.off('ui:selectLevel', this.onSelectLevelBound);
    eventBus.off('ui:pause', this.onPauseBound);
    eventBus.off('ui:resume', this.onResumeBound);
    eventBus.off('ui:restart', this.onRestartBound);
    eventBus.off('ui:backToMenu', this.onBackToMenuBound);
    this.scoreSystem.destroy();
    this.levelSystem?.destroy();
    this.input.destroy();
    this.physics.stop();
  }
}
