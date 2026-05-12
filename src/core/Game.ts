import { Application, Text } from 'pixi.js';
import { PhysicsManager } from './PhysicsManager';
import { InputManager } from './InputManager';
import { ScoreSystem } from '../gameplay/ScoreSystem';
import { GameStateMachine } from './GameStateMachine';
import { AudioManager } from './AudioManager';
import { BlockPreview } from '../gameplay/BlockPreview';
import { MergeSystem } from '../gameplay/MergeSystem';
import { UIManager } from '../ui/UIManager';
import { MainMenuScreen } from '../ui/screens/MainMenuScreen';
import { ResultScreen } from '../ui/screens/ResultScreen';
import { LevelSelectScreen } from '../ui/screens/LevelSelectScreen';
import { PauseScreen } from '../ui/screens/PauseScreen';
import { GameHUD } from '../ui/hud/GameHUD';
import { createPlatformAdapter } from '../platform/PlatformFactory';
import { AnimationManager } from '../utils/AnimationManager';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { PropSystem } from '../gameplay/props/PropSystem';
import { PropType } from '../gameplay/props/Prop';
import { ModifierManager } from '../gameplay/modifiers/ModifierManager';
import { SaveManager } from './SaveManager';
import { LevelLoader } from './LevelLoader';
import { BlockTextureCache } from '../utils/BlockTextureCache';
import { GameScene } from './GameScene';
import { GameEventRouter } from './GameEventRouter';
import { SceneManager } from './SceneManager';
import propsData from '../data/props/props.json';

export class Game {
  private static instance: Game | null = null;
  private app: Application;
  private canvas: HTMLCanvasElement;
  private physics: PhysicsManager;
  private input: InputManager;
  private mergeSystem: MergeSystem;
  private scoreSystem: ScoreSystem;
  private stateMachine: GameStateMachine;
  private audioManager: AudioManager;
  private propSystem: PropSystem;
  private saveManager: SaveManager;
  private levelLoader: LevelLoader;
  private modifierManager: ModifierManager;
  private preview: BlockPreview;
  private performanceMonitor: PerformanceMonitor;
  private gameHUD: GameHUD;
  private resultScreen: ResultScreen;
  private levelSelectScreen: LevelSelectScreen;
  private pauseScreen: PauseScreen;
  private uiManager!: UIManager;
  private gameScene!: GameScene;
  private sceneManager!: SceneManager;
  private eventRouter!: GameEventRouter;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private fpsDisplayEnabled = false;
  private fpsDisplay: Text | null = null;

  constructor(canvas: HTMLCanvasElement) {
    Game.instance = this;
    this.canvas = canvas;

    this.app = new Application();
    this.physics = new PhysicsManager();
    this.modifierManager = new ModifierManager(this.physics);
    this.saveManager = new SaveManager();
    this.levelLoader = new LevelLoader();
    this.preview = new BlockPreview();
    this.input = new InputManager(canvas);
    this.mergeSystem = new MergeSystem(this.physics);
    this.scoreSystem = new ScoreSystem();
    this.stateMachine = new GameStateMachine('boot');
    this.audioManager = new AudioManager();
    this.propSystem = new PropSystem();
    this.performanceMonitor = new PerformanceMonitor();
    this.resultScreen = new ResultScreen();
    this.levelSelectScreen = new LevelSelectScreen(this.saveManager, this.levelLoader);
    this.pauseScreen = new PauseScreen();
    this.gameHUD = new GameHUD(this.propSystem);

    AudioManager.setInstance(this.audioManager);
    SaveManager.setInstance(this.saveManager);
    LevelLoader.setInstance(this.levelLoader);
    PropSystem.setInstance(this.propSystem);
    ModifierManager.setInstance(this.modifierManager);
  }

  static getInstance(): Game {
    if (!Game.instance) {
      throw new Error('[Game] 实例尚未创建，请先调用 new Game(canvas)');
    }
    return Game.instance;
  }

  async init(): Promise<void> {
    const platform = createPlatformAdapter();
    await platform.init();
    const systemInfo = await platform.getSystemInfo();

    await this.saveManager.init();
    this.saveManager.startAutoSave();

    const dpr = systemInfo.pixelRatio || window.devicePixelRatio || 1;

    await this.app.init({
      canvas: this.canvas,
      resizeTo: window,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: dpr,
      autoDensity: true,
    });

    this.gameScene = new GameScene(
      this.app,
      this.physics,
      this.mergeSystem,
      this.scoreSystem,
      this.preview,
      this.gameHUD,
      this.modifierManager,
      this.propSystem,
      this.performanceMonitor,
    );
    this.gameScene.init();

    this.uiManager = new UIManager(this.app);

    const textureCache = BlockTextureCache.getInstance();
    textureCache.setApp(this.app);
    textureCache.preload([1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]);
    this.gameHUD.layout(this.app.screen.width, this.app.screen.height);

    this.stateMachine.transition('loading');

    await this.audioManager.init();
    await this.loadLevelConfig();
    this.gameScene.initializeProps();
    this.gameScene.setupContainer();
    this.setupUI();
    this.setupInput();
    this.gameScene.addPreviewToStage();
    this.gameScene.addHUDToStage();

    this.eventRouter = new GameEventRouter(
      this.gameScene,
      this.sceneManager,
      this.audioManager,
      this.saveManager,
      this.levelLoader,
    );
    this.eventRouter.setup();

    this.setupFPSDisplay();

    this.stateMachine.onAnyChange((from, to) => {
      console.log(`[Game] 状态变化: ${from} -> ${to}`);
      const isPlaying = to === 'playing';
      this.gameScene.setHUDVisible(isPlaying);
      this.gameScene.setWarningLineVisible(isPlaying);
    });

    this.app.ticker.add(this.update.bind(this));

    this.performanceMonitor.start();

    window.addEventListener('resize', this.handleResize.bind(this));

    this.stateMachine.transition('menu');
    this.uiManager.showScreen('mainMenu');

    console.log('[Game] 初始化完成');
  }

  private setupUI(): void {
    const mainMenu = new MainMenuScreen(this.audioManager);
    this.sceneManager = new SceneManager(
      this.uiManager,
      this.stateMachine,
      this.gameScene,
      this.audioManager,
      this.saveManager,
      this.resultScreen,
      this.levelSelectScreen,
    );
    this.sceneManager.registerScreens([
      { name: 'mainMenu', screen: mainMenu },
      { name: 'levelSelect', screen: this.levelSelectScreen },
      { name: 'result', screen: this.resultScreen },
      { name: 'pause', screen: this.pauseScreen },
    ]);
  }

  private setupInput(): void {
    const dropY = 80;

    this.input.onDown((state) => {
      if (!this.gameScene.getBlockSpawner().getCanDrop() || !this.sceneManager.isPlaying()) return;
      if (this.gameScene.getBombTargetMode()) return;
      this.gameScene.getPreview().show(this.gameScene.getBlockSpawner().getCurrentValue(), state.position.x, dropY);
    });

    this.input.onMove((state) => {
      if (state.isDown && this.gameScene.getPreview().visible && this.sceneManager.isPlaying() && !this.gameScene.getBombTargetMode()) {
        this.gameScene.getPreview().updatePosition(state.position.x);
      }
    });

    this.input.onUp(() => {
      if (this.gameScene.getBombTargetMode() && this.sceneManager.isPlaying()) {
        const pos = this.input.getState().position;
        this.gameScene.usePropAtPosition(pos.x, pos.y);
        return;
      }
      if (this.gameScene.getPreview().visible && this.gameScene.getBlockSpawner().getCanDrop() && this.sceneManager.isPlaying()) {
        this.gameScene.getBlockSpawner().dropBlock(this.gameScene.getPreview().getTargetX(), dropY, this.gameScene.getBlockSpawner().getCurrentValue());
        this.gameScene.getPreview().hide();
        this.gameScene.getBlockSpawner().startCooldown();
      }
    });
  }

  private async loadLevelConfig(): Promise<void> {
    try {
      if (propsData && (propsData as any).props) {
        await this.propSystem.loadConfig((propsData as any).props);
        return;
      }
    } catch {}

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

  private handleResize(): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      this.gameScene.handleResize();
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

  private update(): void {
    const deltaMS = this.app.ticker.deltaMS;

    if (this.fpsDisplayEnabled && this.fpsDisplay) {
      this.fpsDisplay.text = `FPS: ${this.performanceMonitor.getFPS()}`;
    }

    AnimationManager.getInstance().update(deltaMS);
    this.gameScene.update(deltaMS, this.sceneManager.isPlaying());
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

  getGameScene(): GameScene {
    return this.gameScene;
  }

  getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  destroy(): void {
    this.eventRouter.destroy();
    this.gameScene.destroy();
    this.input.destroy();
    this.physics.stop();
  }
}
