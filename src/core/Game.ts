
import { Application, Graphics, Text } from 'pixi.js';
import { PhysicsManager } from './PhysicsManager';
import { InputManager } from './InputManager';
import { ScoreSystem } from '../gameplay/ScoreSystem';
import { GameStateMachine } from './GameStateMachine';
import { LevelSystem, LevelConfig } from '../gameplay/LevelSystem';
import { LevelLoader } from './LevelLoader';
import { AudioManager } from './AudioManager';
import { WarningLine } from '../ui/components/WarningLine';
import { Block } from '../gameplay/Block';
import { BlockPreview } from '../gameplay/BlockPreview';
import { BlockSpawner } from '../gameplay/BlockSpawner';
import { MergeSystem } from '../gameplay/MergeSystem';
import { UIManager } from '../ui/UIManager';
import { MainMenuScreen } from '../ui/screens/MainMenuScreen';
import { ResultScreen } from '../ui/screens/ResultScreen';
import { LevelSelectScreen } from '../ui/screens/LevelSelectScreen';
import { PauseScreen } from '../ui/screens/PauseScreen';
import { GameHUD } from '../ui/hud/GameHUD';
import { GameEffectManager } from './GameEffectManager';
import { createPlatformAdapter } from '../platform/PlatformFactory';
import { eventBus } from '../utils/EventBus';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { PropSystem } from '../gameplay/props/PropSystem';
import { PropType } from '../gameplay/props/Prop';
import { FreezeProp } from '../gameplay/props/FreezeProp';
import { BombProp } from '../gameplay/props/BombProp';
import { RainbowProp } from '../gameplay/props/RainbowProp';
import { ModifierManager } from '../gameplay/modifiers/ModifierManager';
import { SaveManager } from './SaveManager';
import Matter from 'matter-js';

interface BlockMergedData {
  newValue: number;
  position: { x: number; y: number };
  chainCount: number;
  newBlock: Block;
  destroyedBlocks: Block[];
}

export class Game {
  private static instance: Game | null = null;
  private app: Application;
  private physics: PhysicsManager;
  private input: InputManager;
  private preview: BlockPreview;
  private mergeSystem: MergeSystem;
  private blockSpawner: BlockSpawner;
  private effectManager: GameEffectManager;
  private groundY: number;
  private scoreSystem: ScoreSystem;
  private stateMachine: GameStateMachine;
  private levelSystem: LevelSystem | null = null;
  private currentLevelConfig: LevelConfig | null = null;
  private warningLine: WarningLine | null = null;
  private containerWalls: Graphics | null = null;
  private physicsWalls: Matter.Body[] = [];
  private uiManager: UIManager;
  private gameHUD: GameHUD;
  private resultScreen: ResultScreen;
  private levelSelectScreen: LevelSelectScreen;
  private pauseScreen: PauseScreen;
  private audioManager: AudioManager;
  private propSystem: PropSystem;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private performanceMonitor: PerformanceMonitor;
  private physicsAccumulator = 0;
  private fpsDisplayEnabled = false;
  private fpsDisplay: Text | null = null;
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
  private onBombExplodeBound: (data: { x: number; y: number; radius: number }) => void;
  private onFreezeActivatedBound: (data: { duration: number; endTime: number }) => void;
  private onFreezeDeactivatedBound: () => void;
  private onPropTargetModeBound: (data: { type?: PropType; enabled: boolean }) => void;
  private onNextRainbowBlockBound: (data: { isRainbow: boolean; remaining: number }) => void;
  private onRainbowConsumedBound: (data: { remainingBlocks: number }) => void;
  private bombTargetMode = false;
  private modifierManager: ModifierManager;
  private saveManager: SaveManager;
  private gameStartTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    Game.instance = this;
    this.app = new Application();
    this.physics = new PhysicsManager();
    this.modifierManager = ModifierManager.getInstance(this.physics);
    this.saveManager = SaveManager.getInstance();
    this.saveManager.startAutoSave();
    this.preview = new BlockPreview();
    this.input = new InputManager(canvas);
    this.mergeSystem = new MergeSystem(this.physics);
    this.blockSpawner = new BlockSpawner(this.physics, this.mergeSystem, PropSystem.getInstance(), this.app.stage);
    this.effectManager = new GameEffectManager(this.app.stage);
    this.scoreSystem = new ScoreSystem();
    this.stateMachine = new GameStateMachine('boot');
    this.uiManager = new UIManager(this.app);
    this.resultScreen = new ResultScreen();
    this.levelSelectScreen = new LevelSelectScreen();
    this.pauseScreen = new PauseScreen();
    this.audioManager = AudioManager.getInstance();
    this.propSystem = PropSystem.getInstance();
    this.gameHUD = new GameHUD(this.propSystem);
    this.gameHUD.layout(this.app.screen.width, this.app.screen.height);
    this.performanceMonitor = new PerformanceMonitor();
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
    this.onBombExplodeBound = this.handleBombExplode.bind(this);
    this.onFreezeActivatedBound = this.handleFreezeActivated.bind(this);
    this.onFreezeDeactivatedBound = this.handleFreezeDeactivated.bind(this);
    this.onPropTargetModeBound = this.handlePropTargetMode.bind(this);
    this.onNextRainbowBlockBound = this.handleNextRainbowBlock.bind(this);
    this.onRainbowConsumedBound = this.handleRainbowConsumed.bind(this);
  }

  static getInstance(): Game {
    if (!Game.instance) {
      throw new Error('[Game] 实例尚未创建，请先调用 Game.create()');
    }
    return Game.instance;
  }

  static create(canvas: HTMLCanvasElement): Game {
    if (Game.instance) {
      return Game.instance;
    }
    return new Game(canvas);
  }

  async init(): Promise<void> {
    const platform = createPlatformAdapter();
    await platform.init();
    const systemInfo = await platform.getSystemInfo();

    await this.saveManager.init();

    const dpr = systemInfo.pixelRatio || window.devicePixelRatio || 1;

    await this.app.init({
      canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
      resizeTo: window,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: dpr,
      autoDensity: true,
    });

    this.stateMachine.transition('loading');

    await this.audioManager.init();
    await this.loadLevelConfig();
    this.initializeProps();
    this.setupContainer();
    this.setupUI();
    this.setupInput();
    this.setupEventListeners();
    this.app.stage.addChild(this.preview);
    this.gameHUD.visible = false;
    this.app.stage.addChild(this.gameHUD);

    this.setupFPSDisplay();

    this.stateMachine.onAnyChange((from, to) => {
      console.log(`[Game] 状态变化: ${from} -> ${to}`);
      const isPlaying = to === 'playing';
      this.gameHUD.visible = isPlaying;
      if (this.warningLine) {
        this.warningLine.visible = isPlaying;
      }
    });

    this.app.ticker.add(this.update.bind(this));

    this.performanceMonitor.start();

    window.addEventListener('resize', this.handleResize.bind(this));

    this.stateMachine.transition('menu');
    this.uiManager.showScreen('mainMenu');

    console.log('[Game] 初始化完成');
  }

  private setupContainer(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.groundY = h - 50;

    this.rebuildPhysicsWalls();

    this.warningLine = new WarningLine(h, w);
    this.warningLine.y = this.groundY * 0.2;
    this.warningLine.visible = false;
    this.app.stage.addChild(this.warningLine);
  }

  private rebuildPhysicsWalls(): void {
    for (const wall of this.physicsWalls) {
      this.physics.removeBody(wall);
    }
    this.physicsWalls = [];

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    const ground = this.physics.createRectangle(w / 2, this.groundY + 25, w, 50);
    ground.label = 'ground';
    const leftWall = this.physics.createRectangle(-22, h / 2, 50, h);
    leftWall.label = 'wall_left';
    const rightWall = this.physics.createRectangle(w + 22, h / 2, 50, h);
    rightWall.label = 'wall_right';

    this.physicsWalls = [ground, leftWall, rightWall];
  }

  private handleResize(): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      this.groundY = window.innerHeight - 50;
      if (this.warningLine) {
        this.warningLine.y = this.groundY * 0.2;
      }
      if (this.gameHUD) {
        this.gameHUD.layout(this.app.screen.width, this.app.screen.height);
      }
    }, 300);
  }

  private setupFPSDisplay(): void {
    this.fpsDisplay = new Text({
      text: 'FPS: 60',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0x00ff00,
      },
    });
    this.fpsDisplay.x = 10;
    this.fpsDisplay.y = 10;
    this.fpsDisplay.visible = this.fpsDisplayEnabled;
    this.app.stage.addChild(this.fpsDisplay);
  }

  toggleFPSDisplay(): void {
    this.fpsDisplayEnabled = !this.fpsDisplayEnabled;
    if (this.fpsDisplay) {
      this.fpsDisplay.visible = this.fpsDisplayEnabled;
    }
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
      if (!this.blockSpawner.getCanDrop() || this.stateMachine.getCurrentState() !== 'playing') return;
      if (this.bombTargetMode) return;
      this.preview.show(this.blockSpawner.getCurrentValue(), state.position.x, dropY);
    });

    this.input.onMove((state) => {
      if (state.isDown && this.preview.visible && this.stateMachine.getCurrentState() === 'playing' && !this.bombTargetMode) {
        this.preview.updatePosition(state.position.x);
      }
    });

    this.input.onUp(() => {
      if (this.bombTargetMode && this.stateMachine.getCurrentState() === 'playing') {
        const pos = this.input.getState().position;
        this.gameHUD.usePropAtPosition(pos.x, pos.y);
        return;
      }
      if (this.preview.visible && this.blockSpawner.getCanDrop() && this.stateMachine.getCurrentState() === 'playing') {
        this.blockSpawner.dropBlock(this.preview.getTargetX(), dropY, this.blockSpawner.getCurrentValue());
        this.preview.hide();
        this.blockSpawner.startCooldown();
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
    eventBus.on('props:bomb:explode', this.onBombExplodeBound);
    eventBus.on('props:freeze:activated', this.onFreezeActivatedBound);
    eventBus.on('props:freeze:deactivated', this.onFreezeDeactivatedBound);
    eventBus.on('ui:propTargetMode', this.onPropTargetModeBound);
    eventBus.on('gameplay:nextBlock', this.onNextRainbowBlockBound);
    eventBus.on('props:rainbow:consumed', this.onRainbowConsumedBound);
  }

  private handleBlockMerged(data: BlockMergedData): void {
    this.audioManager.play('merge');

    for (const destroyed of data.destroyedBlocks) {
      this.blockSpawner.removeBlock(destroyed);
    }

    this.app.stage.addChild(data.newBlock);
    this.blockSpawner.addBlock(data.newBlock);

    this.effectManager.addMergeEffect(data.position.x, data.position.y, data.newValue / 2, data.newValue);
  }

  private handleLevelCompleted(data: { score: number; levelId: number }): void {
    this.stateMachine.transition('levelComplete');
    this.physics.stop();
    this.gameHUD.skipAnimation();
    this.clearEverything();
    this.audioManager.play('levelComplete');
    const stars = this.calculateStars(data.score, data.levelId);
    const playTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
    this.saveManager.updateLevelProgress(data.levelId, data.score, playTime, stars, true);
    this.saveManager.updateStatistics(0, 0, playTime);
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

    if (config?.objective.type === 'target_merge') {
      const target = config.objective.target;
      if (score >= target * 30) return 3;
      if (score >= target * 20) return 2;
      if (score >= target * 10) return 1;
    }

    if (score >= 1000) return 3;
    if (score >= 500) return 2;
    if (score >= 100) return 1;
    return 1;
  }

  private handleGameOver(): void {
    this.failGame();
  }

  private handleTimeout(): void {
    this.failGame();
  }

  private failGame(): void {
    this.levelSystem?.forceComplete();
    if (!this.stateMachine.transition('gameover')) return;
    this.physics.stop();
    this.clearEverything();
    this.audioManager.play('gameover');
    const levelId = this.levelSystem?.getConfig().id || 1;
    const playTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
    this.saveManager.updateLevelProgress(levelId, this.scoreSystem.getCurrentScore(), playTime, 0, false);
    this.resultScreen.setResult({
      isWin: false,
      score: this.scoreSystem.getCurrentScore(),
      stars: 0,
      levelId,
    });
    this.uiManager.showScreen('result');
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

  private async loadLevelConfig(): Promise<void> {
    try {
      const response = await fetch('/src/data/props/props.json');
      const data = await response.json();
      await this.propSystem.loadConfig(data.props || []);
    } catch (e) {
      console.warn('[Game] 加载道具配置失败，使用默认配置');
      await this.propSystem.loadConfig([
        { id: 'prop_bomb', type: PropType.BOMB, name: '炸弹', description: '销毁指定区域内所有方块', icon: 'bomb', maxCount: 3, cooldown: 1000, price: 50 },
        { id: 'prop_rainbow', type: PropType.RAINBOW, name: '彩虹方块', description: '可与任意数字合成', icon: 'rainbow', maxCount: 3, cooldown: 1000, price: 80 },
        { id: 'prop_freeze', type: PropType.FREEZE, name: '冻结', description: '暂停物理模拟5秒', icon: 'freeze', maxCount: 3, cooldown: 1000, price: 60 },
      ]);
    }
  }

  private initializeProps(): void {
    this.propSystem.initialize([
      { type: PropType.BOMB, count: 3 },
      { type: PropType.RAINBOW, count: 3 },
      { type: PropType.FREEZE, count: 3 },
    ]);
    const freezeProp = this.propSystem.getProp(PropType.FREEZE) as FreezeProp;
    if (freezeProp) {
      freezeProp.setPhysicsManager(this.physics);
    }
  }

  private loadLevel(config: LevelConfig): void {
    if (this.levelSystem) {
      this.levelSystem.destroy();
    }
    this.levelSystem = new LevelSystem(config);
    this.currentLevelConfig = config;
    this.blockSpawner.setLevelConfig(config);
    this.gameHUD.updateLevel(config.id, config.name);
    this.uiManager.hideCurrentScreen();
    this.resetGame();
    this.gameStartTime = Date.now();
    
    // 初始化容器变形器
    this.modifierManager.setContainerSize(this.app.screen.width, this.app.screen.height);
    this.modifierManager.setStageContainer(this.app.stage);
    if (config.modifiers && config.modifiers.length > 0) {
      console.log(`[Game] 加载 ${config.modifiers.length} 个变形器`);
      this.modifierManager.loadFromLevelConfig(config.modifiers);
    }
    
    this.physics.start();
    this.levelSystem?.start();
    this.drawContainerWalls();
    this.blockSpawner.spawnObstacles(config.obstacles, this.app.screen.width, this.groundY);
    this.startAutoSpawn();
    this.modifierManager.startAll();
    if (this.levelSystem) {
      this.gameHUD.setObjectiveProgress(this.levelSystem.getProgress());
    }
    this.gameHUD.updatePropButtons();
    this.stateMachine.transition('playing');
  }

  private handlePause(): void {
    if (this.stateMachine.canTransition('paused')) {
      this.stateMachine.transition('paused');
      this.physics.stop();
      this.levelSystem?.pause();
      this.modifierManager.pauseAll();
      this.blockSpawner.stopAutoSpawn();
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
      this.modifierManager.resumeAll();
      this.startAutoSpawn();
    }
  }

  private handleRestart(): void {
    this.uiManager.hideCurrentScreen();
    this.resetGame();
    this.propSystem.reset();
    this.initializeProps();
    this.physics.start();
    this.levelSystem?.start();
    this.drawContainerWalls();
    this.blockSpawner.spawnObstacles(this.currentLevelConfig!.obstacles, this.app.screen.width, this.groundY);
    this.startAutoSpawn();
    // 重新加载和启动变形器
    if (this.currentLevelConfig?.modifiers) {
      this.modifierManager.setContainerSize(this.app.screen.width, this.app.screen.height);
      this.modifierManager.setStageContainer(this.app.stage);
      this.modifierManager.loadFromLevelConfig(this.currentLevelConfig.modifiers);
      this.modifierManager.startAll();
    }
    if (this.levelSystem) {
      this.gameHUD.setObjectiveProgress(this.levelSystem.getProgress());
    }
    this.stateMachine.transition('playing');
  }

  private handleBackToMenu(): void {
    this.physics.stop();
    this.clearEverything();
    this.clearContainerWalls();
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
    this.clearContainerWalls();
    this.uiManager.hideCurrentScreen();
    this.uiManager.showScreen('levelSelect');
    this.stateMachine.transition('menu');
  }

  private handleBombExplode(data: { x: number; y: number; radius: number }): void {
    console.log('[Game] handleBombExplode 被调用', data);
    const bombProp = this.propSystem.getProp(PropType.BOMB) as BombProp;
    if (!bombProp) {
      console.error('[Game] BombProp 未找到');
      return;
    }

    const affectedBlocks = bombProp.getAffectedBlocks(this.blockSpawner.getBlocks(), data.x, data.y);
    for (const block of affectedBlocks) {
      this.blockSpawner.removeBlock(block);
      this.mergeSystem.unregisterBlock(block);
      this.physics.removeBody(block.body);
      block.destroy();
    }

    this.effectManager.addExplosionEffect(data.x, data.y, data.radius);

    this.audioManager.play('explosion');

    if (this.levelSystem) {
      this.gameHUD.setObjectiveProgress(this.levelSystem.getProgress());
    }
  }

  private handleFreezeActivated(data: { duration: number; endTime: number }): void {
    this.effectManager.addFreezeEffect(this.app.screen.width, this.app.screen.height);
    this.audioManager.play('freeze');
  }

  private handleFreezeDeactivated(): void {
    this.effectManager.removeFreezeEffect();
  }

  private handlePropTargetMode(data: { type?: PropType; enabled: boolean }): void {
    this.bombTargetMode = data.enabled === true;
    if (this.bombTargetMode) {
      this.preview.hide();
    }
  }

  private handleNextRainbowBlock(data: { isRainbow: boolean; remaining: number }): void {
    if (data.isRainbow) {
      this.blockSpawner.setRainbowRemaining(data.remaining);
    }
  }

  private handleRainbowConsumed(data: { remainingBlocks: number }): void {
    this.blockSpawner.setRainbowRemaining(data.remainingBlocks);
  }

  private spawnObstacles(): void {
    this.blockSpawner.spawnObstacles(
      this.currentLevelConfig?.obstacles ?? undefined,
      this.app.screen.width,
      this.groundY
    );
  }

  private startAutoSpawn(): void {
    const interval = this.currentLevelConfig?.spawn.spawnInterval;
    if (!interval || interval <= 0) return;
    this.blockSpawner.startAutoSpawn(interval * 1000, 80);
  }

  private stopAutoSpawn(): void {
    this.blockSpawner.stopAutoSpawn();
  }

  private resetGame(): void {
    this.clearEverything();
    this.scoreSystem.reset();
    this.gameHUD.reset();
    this.warningLine?.reset();
    this.levelSystem?.reset();
    this.bombTargetMode = false;
    this.blockSpawner.reset();
    this.effectManager.removeFreezeEffect();
    this.modifierManager.stopAll();
    this.modifierManager.clearAll();
    this.rebuildPhysicsWalls();
    this.drawContainerWalls();
  }

  private clearEverything(): void {
    this.blockSpawner.clearBlocks();
    this.blockSpawner.clearObstacles();
    this.blockSpawner.stopAutoSpawn();
    this.preview.hide();
    this.effectManager.clearAll();
  }

  private clearBlocks(): void {
    this.blockSpawner.clearBlocks();
  }

  private clearObstacles(): void {
    this.blockSpawner.clearObstacles();
  }

  private drawContainerWalls(): void {
    this.clearContainerWalls();
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.containerWalls = new Graphics();
    this.containerWalls.rect(0, this.groundY, w, 50);
    this.containerWalls.fill({ color: 0x2d2d44 });
    this.containerWalls.rect(0, 0, 6, this.groundY);
    this.containerWalls.fill({ color: 0x4a4a6a });
    this.containerWalls.rect(w - 6, 0, 6, this.groundY);
    this.containerWalls.fill({ color: 0x4a4a6a });
    this.containerWalls.moveTo(0, 0);
    this.containerWalls.lineTo(0, this.groundY);
    this.containerWalls.stroke({ width: 2, color: 0x6a6a8a });
    this.containerWalls.moveTo(6, 0);
    this.containerWalls.lineTo(6, this.groundY);
    this.containerWalls.stroke({ width: 1, color: 0x5a5a7a });
    this.containerWalls.moveTo(w - 6, 0);
    this.containerWalls.lineTo(w - 6, this.groundY);
    this.containerWalls.stroke({ width: 1, color: 0x5a5a7a });
    this.containerWalls.moveTo(w, 0);
    this.containerWalls.lineTo(w, this.groundY);
    this.containerWalls.stroke({ width: 2, color: 0x6a6a8a });
    this.containerWalls.moveTo(0, this.groundY);
    this.containerWalls.lineTo(w, this.groundY);
    this.containerWalls.stroke({ width: 2, color: 0x6a6a8a });
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
    this.blockSpawner.dropBlock(x, y, value);
  }

  private getRandomValue(): number {
    return this.blockSpawner.getRandomValue();
  }

  private startCooldown(): void {
    this.blockSpawner.startCooldown();
  }

  private update(): void {
    this.performanceMonitor.tick();

    if (this.fpsDisplayEnabled && this.fpsDisplay) {
      this.fpsDisplay.text = `FPS: ${this.performanceMonitor.getFPS()}`;
    }

    if (this.stateMachine.getCurrentState() !== 'playing') return;

    this.physicsAccumulator += this.app.ticker.deltaMS;
    this.physicsAccumulator = this.physics.fixedUpdate(this.physicsAccumulator);

    this.blockSpawner.cleanupOutOfBounds(this.app.screen.height);

    this.blockSpawner.syncAllBlocks();

    this.gameHUD.update(this.app.ticker.deltaMS / 16.67);
    if (this.levelSystem) {
      this.gameHUD.setObjectiveProgress(this.levelSystem.getProgress());
    }

    if (this.warningLine) {
      this.warningLine.update(
        this.blockSpawner.getBlocks().map(b => ({
          y: b.y,
          radius: b.getConfig().radius,
          speed: Math.sqrt(b.body.velocity.x ** 2 + b.body.velocity.y ** 2),
        })),
        this.app.ticker.deltaMS
      );
    }

    this.effectManager.cleanup();
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
    eventBus.off('props:bomb:explode', this.onBombExplodeBound);
    eventBus.off('props:freeze:activated', this.onFreezeActivatedBound);
    eventBus.off('props:freeze:deactivated', this.onFreezeDeactivatedBound);
    eventBus.off('ui:propTargetMode', this.onPropTargetModeBound);
    eventBus.off('gameplay:nextBlock', this.onNextRainbowBlockBound);
    eventBus.off('props:rainbow:consumed', this.onRainbowConsumedBound);
    this.scoreSystem.destroy();
    this.levelSystem?.destroy();
    this.input.destroy();
    this.physics.stop();
  }
}
