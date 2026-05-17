import 'pixi.js/browser';
import { Application, Text } from 'pixi.js';
import { PhysicsManager } from './PhysicsManager';
import { InputManager } from './InputManager';
import { ScoreSystem } from '../gameplay/ScoreSystem';
import { GameStateMachine, GameState } from './GameStateMachine';
import { AudioManager } from './AudioManager';
import { BlockPreview } from '../gameplay/BlockPreview';
import { MergeSystem } from '../gameplay/MergeSystem';
import { UIManager } from '../ui/UIManager';
import { MainMenuScreen } from '../ui/screens/MainMenuScreen';
import { LoadingScreen } from '../ui/screens/LoadingScreen';
import { ResultScreen } from '../ui/screens/ResultScreen';
import { LevelSelectScreen } from '../ui/screens/LevelSelectScreen';
import { PauseScreen } from '../ui/screens/PauseScreen';
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import { GameHUD } from '../ui/hud/GameHUD';
import { createPlatformAdapter } from '../platform/PlatformFactory';
import { PlatformAdapter } from '../platform/PlatformAdapter';
import { AnimationManager } from '../utils/AnimationManager';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { PropSystem } from '../gameplay/props/PropSystem';
import { ModifierManager } from '../gameplay/modifiers/ModifierManager';
import { SaveManager } from './SaveManager';
import { LevelLoader } from './LevelLoader';
import { AdManager } from './AdManager';
import { BlockTextureCache } from '../utils/BlockTextureCache';
import { GameScene } from './GameScene';
import { GameEventRouter } from './GameEventRouter';
import { SceneManager } from './SceneManager';
import { logger } from '../utils/Logger';
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { TutorialManager } from './TutorialManager';
import { TimeManager } from '../utils/TimeManager';
import { GameInputHandler } from './GameInputHandler';
import { PropsConfigLoader } from './PropsConfigLoader';
import { eventBus } from '../utils/EventBus';

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
  private settingsScreen: SettingsScreen;
  private uiManager!: UIManager;
  private gameScene!: GameScene;
  private sceneManager!: SceneManager;
  private eventRouter!: GameEventRouter;
  private gameInputHandler!: GameInputHandler;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private fpsDisplayEnabled = false;
  private fpsDisplay: Text | null = null;
  private boundHandleResize: (() => void) | null = null;
  private boundUpdate: (() => void) | null = null;
  private boundStateChange: ((from: GameState, to: GameState) => void) | null = null;
  private tutorialOverlay!: TutorialOverlay;
  private tutorialManager!: TutorialManager;
  private platform!: PlatformAdapter;
  private adManager!: AdManager;
  private loadingScreen: LoadingScreen | null = null;
  private gameSceneInitialized = false;

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
    this.mergeSystem.setScoreSystem(this.scoreSystem);
    this.stateMachine = new GameStateMachine('boot');
    this.audioManager = new AudioManager();
    this.propSystem = new PropSystem();
    this.performanceMonitor = new PerformanceMonitor();
    TimeManager.setInstance(new TimeManager());
    this.resultScreen = new ResultScreen();
    this.resultScreen.setCallbacks(
      () => this.sceneManager.nextLevel(),
      () => this.sceneManager.restartGame(),
      () => this.sceneManager.showMainMenu(),
      () => this.sceneManager.reviveGame(),
    );
    this.levelSelectScreen = new LevelSelectScreen(
      () => this.sceneManager.showMainMenu(),
      (levelId) => this.sceneManager.startLevelById(levelId),
      this.saveManager,
      this.levelLoader,
    );
    this.pauseScreen = new PauseScreen();
    this.settingsScreen = new SettingsScreen();
    this.gameHUD = new GameHUD(this.propSystem);
  }

  static getInstance(): Game {
    if (!Game.instance) {
      throw new Error('[Game] 实例尚未创建，请先调用 new Game(canvas)');
    }
    return Game.instance;
  }

  async init(): Promise<void> {
    try {
      const platform = createPlatformAdapter();
      await platform.init();
      this.platform = platform;
      this.adManager = new AdManager(platform);
      const systemInfo = await platform.getSystemInfo();

      await this.saveManager.init();
      this.saveManager.startAutoSave();

      const dpr = systemInfo.pixelRatio || (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;

      const initOptions: Partial<import('pixi.js').ApplicationOptions> = {
        canvas: this.canvas,
        backgroundColor: 0x1a1a2e,
        antialias: true,
        resolution: dpr,
        autoDensity: true,
        preference: 'webgl',
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: true,
      };
      if (typeof window !== 'undefined') {
        initOptions.resizeTo = window;
      }

      try {
        const INIT_TIMEOUT = 15000;
        const initPromise = this.app.init(initOptions);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('WebGL初始化超时')), INIT_TIMEOUT);
        });
        await Promise.race([initPromise, timeoutPromise]);
      } catch (initErr: unknown) {
        const errMsg = initErr instanceof Error ? initErr.message : String(initErr);
        if (errMsg?.includes('CanvasRenderer is not yet implemented') ||
            errMsg?.includes('No available renderer') ||
            errMsg?.includes('WebGL初始化超时')) {
          logger.warn('Game', 'WebGL/WebGPU 渲染器初始化失败，这是沙盒环境的已知限制');
          logger.warn('Game', '游戏将在降级模式下运行');
          if (this.stateMachine.getCurrentState() === 'boot') {
            this.stateMachine.transition('loading');
          }
          this.stateMachine.transition('menu');
          try {
            if (!this.uiManager) {
              this.uiManager = new UIManager(this.app);
            }
            this.uiManager.showScreen('mainMenu');
          } catch (e) { logger.warn('Game', '降级模式UI初始化失败:', e); }
          try {
            if (!this.sceneManager) {
              this.setupUI();
            }
          } catch (e) { logger.warn('Game', '降级模式场景初始化失败:', e); }
          return;
        }
        throw initErr;
      }

      this.uiManager = new UIManager(this.app);

      this.loadingScreen = new LoadingScreen();
      this.uiManager.registerScreen('loading', this.loadingScreen);
      this.stateMachine.transition('loading');
      this.uiManager.showScreen('loading');

      this.tutorialOverlay = new TutorialOverlay();
      this.tutorialManager = new TutorialManager(this.tutorialOverlay, this.saveManager);
      this.app.stage.addChild(this.tutorialOverlay);

      const textureCache = BlockTextureCache.getInstance();
      textureCache.setApp(this.app);
      textureCache.preloadMinimal([1, 2, 4, 8]);

      this.loadingScreen.updateProgress(0.2);

      await Promise.all([
        this.audioManager.init().catch((audioErr) => {
          logger.warn('Game', '音频初始化失败，游戏将以静音模式运行:', audioErr);
        }),
        PropsConfigLoader.load(this.propSystem).catch((configErr) => {
          logger.warn('Game', '关卡配置加载失败，使用默认配置:', configErr);
        }),
        this.levelLoader.discoverAndLoadAllLevels().catch((levelErr) => {
          logger.warn('Game', '关卡数据预加载失败:', levelErr);
        }),
      ]);

      this.loadingScreen.updateProgress(0.4);

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
        this.tutorialManager,
      );
      this.gameScene.init();
      this.gameSceneInitialized = true;

      this.gameHUD.layout(this.app.screen.width, this.app.screen.height);

      this.loadingScreen.updateProgress(0.6);

      this.gameScene.initializeProps();
      this.gameScene.setupContainer();
      this.setupUI();
      this.gameInputHandler = new GameInputHandler(
        this.app,
        this.input,
        this.gameScene,
        this.sceneManager,
        this.stateMachine,
        this.gameHUD,
        this.canvas,
      );
      this.gameInputHandler.setup();
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

      this.boundStateChange = (from, to) => {
        logger.info('Game', `状态变化: ${from} -> ${to}`);
        const isPlaying = to === 'playing';
        this.gameScene.setHUDVisible(isPlaying);
        this.gameScene.setWarningLineVisible(isPlaying);
      };
      this.stateMachine.onAnyChange(this.boundStateChange);

      this.boundUpdate = this.update.bind(this);
      this.app.ticker.add(this.boundUpdate);

      this.performanceMonitor.start();

      this.boundHandleResize = this.handleResize.bind(this);
      window.addEventListener('resize', this.boundHandleResize);

      this.gameInputHandler.setupKeyboard();

      this.loadingScreen.updateProgress(0.8);

      textureCache.preloadAsync([16, 32, 64, 128, 256, 512, 1024, 2048], (loaded, total) => {
        const textureProgress = 0.8 + (loaded / total) * 0.2;
        this.loadingScreen?.updateProgress(textureProgress);
      }).catch(() => {});

      this.stateMachine.transition('menu');
      this.uiManager.showScreen('mainMenu');

      logger.info('Game', '初始化完成');
    } catch (err) {
      logger.error('Game', '初始化失败:', err);
      logger.error('Game', '错误详情:', JSON.stringify(err, null, 2));
      logger.error('Game', '错误堆栈:', (err as Error)?.stack);
      const currentState = this.stateMachine.getCurrentState();
      if (currentState === 'boot') {
        this.stateMachine.transition('loading');
      }
      this.stateMachine.transition('menu');
      try {
        if (!this.uiManager) {
          this.uiManager = new UIManager(this.app);
        }
        this.uiManager.showScreen('mainMenu');
      } catch (e) { logger.warn('Game', '错误恢复UI初始化失败:', e); }
      try {
        if (!this.sceneManager) {
          this.setupUI();
        }
      } catch (e) { logger.warn('Game', '错误恢复场景初始化失败:', e); }
    }
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
      this.levelLoader,
      this.adManager,
    );
    this.sceneManager.registerScreens([
      { name: 'mainMenu', screen: mainMenu },
      { name: 'levelSelect', screen: this.levelSelectScreen },
      { name: 'result', screen: this.resultScreen },
      { name: 'pause', screen: this.pauseScreen },
      { name: 'settings', screen: this.settingsScreen },
    ]);
  }

  private handleResize(): void {
    if (typeof window === 'undefined') return;
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      this.gameScene.handleResize();
      this.uiManager.handleResize(this.app.screen.width, this.app.screen.height);
      this.gameInputHandler.syncInputScale();
      this.gameHUD.layout(this.app.screen.width, this.app.screen.height);
      this.tutorialManager.resize(this.app.screen.width, this.app.screen.height);
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

  startTutorial(levelId: number): void {
    this.tutorialManager.startTutorial(levelId, this.app.screen.width, this.app.screen.height);
  }

  getTutorialManager(): TutorialManager {
    return this.tutorialManager;
  }

  private update(): void {
    const deltaMS = this.app.ticker.deltaMS;

    if (this.fpsDisplayEnabled && this.fpsDisplay) {
      this.fpsDisplay.text = `FPS: ${this.performanceMonitor.getFPS()}`;
    }

    AnimationManager.getInstance().update(deltaMS);
    this.scoreSystem.update(deltaMS);
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

  getBlockSpawner() { return this.gameScene?.getBlockSpawner(); }
  getPhysics() { return this.gameScene?.getPhysics(); }
  getMergeSystem(): MergeSystem { return this.mergeSystem; }
  getPlatformAdapter(): PlatformAdapter { return this.platform; }
  getAdManager(): AdManager { return this.adManager; }
  getPerformanceMonitor(): PerformanceMonitor { return this.performanceMonitor; }
  getLevelLoader(): LevelLoader { return this.levelLoader; }
  getSaveManager(): SaveManager { return this.saveManager; }
  getAudioManager(): AudioManager { return this.audioManager; }
  getPropSystem() { return this.gameScene?.getPropSystem(); }
  getUIManager(): UIManager { return this.uiManager; }
  getGameHUD() { return this.gameScene?.getGameHUD(); }
  getLevelSystem() { return this.gameScene?.getLevelSystem(); }
  getResultScreen(): ResultScreen { return this.resultScreen; }
  getPauseScreen(): PauseScreen { return this.pauseScreen; }
  getLevelSelectScreen(): LevelSelectScreen { return this.levelSelectScreen; }
  getEventBus() { return eventBus; }

  destroy(): void {
    if (this.boundStateChange) {
      this.stateMachine.offAnyChange(this.boundStateChange);
      this.boundStateChange = null;
    }
    if (this.boundHandleResize) {
      window.removeEventListener('resize', this.boundHandleResize);
      this.boundHandleResize = null;
    }
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    if (this.boundUpdate) {
      this.app.ticker.remove(this.boundUpdate);
      this.boundUpdate = null;
    }
    if (this.gameInputHandler) {
      this.gameInputHandler.destroy();
    }
    if (this.gameSceneInitialized) {
      this.eventRouter.destroy();
      this.gameScene.destroy();
    }
    this.uiManager.destroy();
    this.input.destroy();
    this.mergeSystem.destroy();
    this.physics.destroy();
    this.scoreSystem.destroy();
    this.audioManager.destroy();
    this.saveManager.destroy();
    this.propSystem.destroy();
    this.modifierManager.destroy();
    this.levelLoader.destroy();
    this.preview.destroy();
    this.gameHUD.destroy();
    this.resultScreen.destroy();
    this.levelSelectScreen.destroy();
    this.pauseScreen.destroy();
    if (this.tutorialManager) {
      this.tutorialManager.destroy();
    }
    if (this.tutorialOverlay) {
      this.tutorialOverlay.destroy();
    }
    if (this.fpsDisplay) {
      this.fpsDisplay.destroy();
      this.fpsDisplay = null;
    }
    this.loadingScreen = null;
    this.gameSceneInitialized = false;
    BlockTextureCache.resetInstance();
    AnimationManager.resetInstance();
    TimeManager.resetInstance();
    Game.instance = null;
  }
}
