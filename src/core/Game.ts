import { Application, Graphics } from 'pixi.js';
import Matter from 'matter-js';
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

interface BlockMergedData {
  newValue: number;
  position: { x: number; y: number };
  chainCount: number;
  newBlock: Block;
  destroyedBlocks: Block[];
}

export class Game {
  private app: Application;
  private physics: PhysicsManager;
  private input: InputManager;
  private preview: BlockPreview;
  private mergeSystem: MergeSystem;
  private blocks: Block[] = [];
  private obstacleBlocks: Block[] = [];
  private currentValue: number = 1;
  private canDrop = true;
  private dropCooldown = 500;
  private autoSpawnTimer: ReturnType<typeof setInterval> | null = null;
  private groundY: number;
  private scoreSystem: ScoreSystem;
  private stateMachine: GameStateMachine;
  private levelSystem: LevelSystem | null = null;
  private currentLevelConfig: LevelConfig | null = null;
  private warningLine: WarningLine | null = null;
  private containerWalls: Graphics | null = null;
  private uiManager: UIManager;
  private gameHUD: GameHUD;
  private resultScreen: ResultScreen;
  private levelSelectScreen: LevelSelectScreen;
  private pauseScreen: PauseScreen;
  private audioManager: AudioManager;
  private effects: MergeEffect[] = [];
  private onBlockMergedBound: (data: BlockMergedData) => void;
  private onGameOverBound: () => void;
  private onTimeoutBound: () => void;
  private onLevelCompletedBound: (data: { score: number; levelId: number }) => void;
  private onStartGameBound: () => void;
  private onSelectLevelBound: (levelId: number) => void;
  private onPauseBound: () => void;
  private onResumeBound: () => void;
  private onRestartBound: () => void;
  private onBackToMenuBound: () => void;
  private onNextLevelBound: () => void;
  private onLevelSelectBound: () => void;

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
    this.onGameOverBound = this.handleGameOver.bind(this);
    this.onTimeoutBound = this.handleTimeout.bind(this);
    this.onLevelCompletedBound = this.handleLevelCompleted.bind(this);
    this.onStartGameBound = this.handleStartGame.bind(this);
    this.onSelectLevelBound = this.handleSelectLevel.bind(this);
    this.onPauseBound = this.handlePause.bind(this);
    this.onResumeBound = this.handleResume.bind(this);
    this.onRestartBound = this.handleRestart.bind(this);
    this.onBackToMenuBound = this.handleBackToMenu.bind(this);
    this.onNextLevelBound = this.handleNextLevel.bind(this);
    this.onLevelSelectBound = this.handleLevelSelect.bind(this);
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
    eventBus.on('game:over', this.onGameOverBound);
    eventBus.on('game:timeout', this.onTimeoutBound);
    eventBus.on('level:completed', this.onLevelCompletedBound);
    eventBus.on('ui:startGame', this.onStartGameBound);
    eventBus.on('ui:selectLevel', this.onSelectLevelBound);
    eventBus.on('ui:pause', this.onPauseBound);
    eventBus.on('ui:resume', this.onResumeBound);
    eventBus.on('ui:restart', this.onRestartBound);
    eventBus.on('ui:backToMenu', this.onBackToMenuBound);
    eventBus.on('ui:nextLevel', this.onNextLevelBound);
    eventBus.on('ui:levelSelect', this.onLevelSelectBound);
  }

  private handleBlockMerged(data: BlockMergedData): void {
    this.audioManager.play('merge');

    for (const destroyed of data.destroyedBlocks) {
      const idx = this.blocks.indexOf(destroyed);
      if (idx !== -1) {
        this.blocks.splice(idx, 1);
      }
    }

    this.app.stage.addChild(data.newBlock);
    this.blocks.push(data.newBlock);

    const config = BLOCK_CONFIGS[data.newValue] || BLOCK_CONFIGS[1];
    const effect = new MergeEffect(data.position.x, data.position.y, config.color);
    this.app.stage.addChild(effect);
    this.effects.push(effect);
  }

  private handleGameOver(): void {
    this.failGame();
  }

  private handleTimeout(): void {
    this.failGame();
  }

  private failGame(): void {
    this.levelSystem?.stopTimer();
    if (!this.stateMachine.transition('gameover')) return;
    this.physics.stop();
    this.clearEverything();
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
    this.gameHUD.skipAnimation();
    this.clearEverything();
    this.audioManager.play('levelComplete');
    const stars = this.calculateStars(data.score, data.levelId);
    this.levelSelectScreen.updateLevelProgress(data.levelId, stars);
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

  private loadLevel(config: LevelConfig): void {
    if (this.levelSystem) {
      this.levelSystem.destroy();
    }
    this.levelSystem = new LevelSystem(config);
    this.currentLevelConfig = config;
    this.drawContainerWalls();
    this.gameHUD.updateLevel(config.id, config.name);
    this.uiManager.hideCurrentScreen();
    this.stateMachine.transition('playing');
    this.startGame();
  }

  private handlePause(): void {
    if (this.stateMachine.canTransition('paused')) {
      this.stateMachine.transition('paused');
      this.physics.stop();
      this.levelSystem?.pause();
      this.preview.hide();
      this.uiManager.showScreen('pause');
    }
  }

  private handleResume(): void {
    if (this.stateMachine.canTransition('playing')) {
      this.stateMachine.transition('playing');
      this.uiManager.hideCurrentScreen();
      this.physics.start();
      this.levelSystem?.resume();
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
    this.clearEverything();
    this.uiManager.hideCurrentScreen();
    this.uiManager.showScreen('mainMenu');
    this.stateMachine.transition('menu');
  }

  private async handleNextLevel(): Promise<void> {
    const currentId = this.levelSystem?.getConfig().id || 1;
    const nextId = currentId + 1;
    this.uiManager.hideCurrentScreen();
    this.resetGame();
    const levelLoader = LevelLoader.getInstance();
    const config = await levelLoader.loadLevel(nextId);
    if (config) {
      this.loadLevel(config);
    } else {
      this.uiManager.showScreen('levelSelect');
      this.stateMachine.transition('menu');
    }
  }

  private handleLevelSelect(): void {
    this.physics.stop();
    this.clearEverything();
    this.uiManager.hideCurrentScreen();
    this.uiManager.showScreen('levelSelect');
    this.stateMachine.transition('menu');
  }

  private startGame(): void {
    this.resetGame();
    this.physics.start();
    this.levelSystem?.start();
    this.spawnObstacles();
    this.startAutoSpawn();
  }

  private spawnObstacles(): void {
    const obstacles = this.currentLevelConfig?.obstacles;
    if (!obstacles) return;

    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const groundY = h - 50;
    const xCenter = w / 2;

    // 把障碍物放在地面上，从左到右排列
    const positions = [
      { x: xCenter - 120, y: groundY },
      { x: xCenter - 60, y: groundY },
      { x: xCenter, y: groundY },
      { x: xCenter + 60, y: groundY },
      { x: xCenter + 120, y: groundY },
    ];

    obstacles.forEach((obs, i) => {
      const config = BLOCK_CONFIGS[obs.value] || BLOCK_CONFIGS[1];
      const pos = positions[i % positions.length];
      const adjustedY = pos.y - config.radius; // 让障碍物刚好"坐"在地面上

      const body = this.physics.createCircle(pos.x, adjustedY, config.radius, {
        isStatic: true,
      });
      body.label = `obstacle_${pos.x}_${adjustedY}`;
      const block = new Block(body, obs.value);
      this.app.stage.addChild(block);
      this.obstacleBlocks.push(block);
      this.mergeSystem.registerObstacle(block);
    });
    console.log(`[Game] 生成 ${obstacles.length} 个障碍物`);
  }

  private startAutoSpawn(): void {
    this.stopAutoSpawn();
    const interval = this.currentLevelConfig?.spawnInterval;
    if (!interval || interval <= 0) return;

    this.autoSpawnTimer = window.setInterval(() => {
      if (this.stateMachine.getCurrentState() !== 'playing') return;
      const w = this.app.screen.width;
      const x = 50 + Math.random() * (w - 100);
      const value = this.getRandomValue();
      this.dropBlock(x, 80, value);
    }, interval * 1000);
    console.log(`[Game] 自动生成间隔: ${interval}秒`);
  }

  private stopAutoSpawn(): void {
    if (this.autoSpawnTimer) {
      clearInterval(this.autoSpawnTimer);
      this.autoSpawnTimer = null;
    }
  }

  private resetGame(): void {
    this.clearEverything();
    this.scoreSystem.reset();
    this.gameHUD.reset();
    this.warningLine?.reset();
    this.levelSystem?.reset();
  }

  private clearEverything(): void {
    this.clearBlocks();
    this.clearObstacles();
    this.stopAutoSpawn();
    this.preview.hide();
    this.effects.forEach(effect => effect.destroy());
    this.effects = [];
    this.clearContainerWalls();
  }

  private clearBlocks(): void {
    this.blocks.forEach(block => {
      if (!block.isDestroyed) {
        this.mergeSystem.unregisterBlock(block);
        this.physics.removeBody(block.body);
        block.destroy();
      }
    });
    this.blocks = [];
  }

  private clearObstacles(): void {
    this.obstacleBlocks.forEach(block => {
      if (!block.isDestroyed) {
        this.physics.removeBody(block.body);
        block.destroy();
      }
    });
    this.obstacleBlocks = [];
  }

  private drawContainerWalls(): void {
    this.clearContainerWalls();
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.containerWalls = new Graphics();
    this.containerWalls.rect(0, this.groundY, w, 50);
    this.containerWalls.fill(0x2d2d44);
    this.containerWalls.rect(0, 0, 6, h);
    this.containerWalls.fill(0x4a4a6a);
    this.containerWalls.rect(w - 6, 0, 6, h);
    this.containerWalls.fill(0x4a4a6a);
    this.containerWalls.stroke({ width: 2, color: 0x6a6a8a });
    this.containerWalls.moveTo(0, 0);
    this.containerWalls.lineTo(0, h);
    this.containerWalls.moveTo(6, 0);
    this.containerWalls.lineTo(6, h);
    this.containerWalls.moveTo(w - 6, 0);
    this.containerWalls.lineTo(w - 6, h);
    this.containerWalls.moveTo(w, 0);
    this.containerWalls.lineTo(w, h);
    this.containerWalls.moveTo(0, this.groundY);
    this.containerWalls.lineTo(w, this.groundY);
    this.app.stage.addChild(this.containerWalls);
  }

  private clearContainerWalls(): void {
    if (this.containerWalls) {
      this.app.stage.removeChild(this.containerWalls);
      this.containerWalls.destroy();
      this.containerWalls = null;
    }
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
    console.log(`[Game] 投放方块 ${value}, 下一个: ${this.currentValue}`);
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

    this.blocks.forEach(block => {
      block.syncFromBody();
      if (block.body.isSleeping) {
        Matter.Sleeping.set(block.body, false);
      }
    });

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
    eventBus.off('game:over', this.onGameOverBound);
    eventBus.off('game:timeout', this.onTimeoutBound);
    eventBus.off('level:completed', this.onLevelCompletedBound);
    eventBus.off('ui:startGame', this.onStartGameBound);
    eventBus.off('ui:selectLevel', this.onSelectLevelBound);
    eventBus.off('ui:pause', this.onPauseBound);
    eventBus.off('ui:resume', this.onResumeBound);
    eventBus.off('ui:restart', this.onRestartBound);
    eventBus.off('ui:backToMenu', this.onBackToMenuBound);
    eventBus.off('ui:nextLevel', this.onNextLevelBound);
    eventBus.off('ui:levelSelect', this.onLevelSelectBound);
    this.scoreSystem.destroy();
    this.levelSystem?.destroy();
    this.input.destroy();
    this.physics.stop();
  }
}
