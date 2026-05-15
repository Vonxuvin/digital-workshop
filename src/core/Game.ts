import 'pixi.js/browser';
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
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import { GameHUD } from '../ui/hud/GameHUD';
import { createPlatformAdapter } from '../platform/PlatformFactory';
import { PlatformAdapter } from '../platform/PlatformAdapter';
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
import { TutorialOverlay } from '../ui/TutorialOverlay';
import { TutorialManager } from './TutorialManager';
import { TimeManager } from '../utils/TimeManager';
import { eventBus } from '../utils/EventBus';
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
  private settingsScreen: SettingsScreen;
  private uiManager!: UIManager;
  private gameScene!: GameScene;
  private sceneManager!: SceneManager;
  private eventRouter!: GameEventRouter;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private fpsDisplayEnabled = false;
  private fpsDisplay: Text | null = null;
  private boundHandleResize: (() => void) | null = null;
  private boundUpdate: (() => void) | null = null;
  private boundKeydown: ((e: KeyboardEvent) => void) | null = null;
  private static readonly TOUCH_OFFSET_Y = 30;
  private tutorialOverlay!: TutorialOverlay;
  private tutorialManager!: TutorialManager;
  private platform!: PlatformAdapter;

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
      const systemInfo = await platform.getSystemInfo();

      await this.saveManager.init();
      this.saveManager.startAutoSave();

      const dpr = systemInfo.pixelRatio || (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;

      const initOptions: any = {
        canvas: this.canvas,
        backgroundColor: 0x1a1a2e,
        antialias: true,
        resolution: dpr,
        autoDensity: true,
        preference: 'webgl',
        failIfMajorPerformanceCaveat: false,
      };
      if (typeof window !== 'undefined') {
        initOptions.resizeTo = window;
      }

      try {
        await this.app.init(initOptions);
      } catch (initErr: any) {
        if (initErr?.message?.includes('CanvasRenderer is not yet implemented') ||
            initErr?.message?.includes('No available renderer')) {
          console.warn('[Game] WebGL/WebGPU 渲染器初始化失败，这是沙盒环境的已知限制');
          console.warn('[Game] 游戏将在降级模式下运行');
          if (this.stateMachine.getCurrentState() === 'boot') {
            this.stateMachine.transition('loading');
          }
          this.stateMachine.transition('menu');
          try {
            if (!this.uiManager) {
              this.uiManager = new UIManager(this.app);
            }
            this.uiManager.showScreen('mainMenu');
          } catch (_) {}
          try {
            if (!this.sceneManager) {
              this.setupUI();
            }
          } catch (_) {}
          return;
        }
        throw initErr;
      }

      this.tutorialOverlay = new TutorialOverlay();
      this.tutorialManager = new TutorialManager(this.tutorialOverlay, this.saveManager);
      this.app.stage.addChild(this.tutorialOverlay);

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

      this.uiManager = new UIManager(this.app);

      const textureCache = BlockTextureCache.getInstance();
      textureCache.setApp(this.app);
      textureCache.preload([1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]);
      this.gameHUD.layout(this.app.screen.width, this.app.screen.height);

      this.stateMachine.transition('loading');

      try {
        await this.audioManager.init();
      } catch (audioErr) {
        console.warn('[Game] 音频初始化失败，游戏将以静音模式运行:', audioErr);
      }

      try {
        await this.loadLevelConfig();
      } catch (configErr) {
        console.warn('[Game] 关卡配置加载失败，使用默认配置:', configErr);
      }

      try {
        await this.levelLoader.discoverAndLoadAllLevels();
      } catch (levelErr) {
        console.warn('[Game] 关卡数据预加载失败:', levelErr);
      }

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

      this.boundUpdate = this.update.bind(this);
      this.app.ticker.add(this.boundUpdate);

      this.performanceMonitor.start();

      this.boundHandleResize = this.handleResize.bind(this);
      window.addEventListener('resize', this.boundHandleResize);

      this.setupKeyboard();

      this.stateMachine.transition('menu');
      this.uiManager.showScreen('mainMenu');

      console.log('[Game] 初始化完成');
    } catch (err) {
      console.error('[Game] 初始化失败:', err);
      console.error('[Game] 错误详情:', JSON.stringify(err, null, 2));
      console.error('[Game] 错误堆栈:', (err as Error)?.stack);
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
      } catch (_) {}
      try {
        if (!this.sceneManager) {
          this.setupUI();
        }
      } catch (_) {}
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
    );
    this.sceneManager.registerScreens([
      { name: 'mainMenu', screen: mainMenu },
      { name: 'levelSelect', screen: this.levelSelectScreen },
      { name: 'result', screen: this.resultScreen },
      { name: 'pause', screen: this.pauseScreen },
      { name: 'settings', screen: this.settingsScreen },
    ]);
  }

  private setupInput(): void {
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

  private setupKeyboard(): void {
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
    return Math.max(60, Math.min(touchY - Game.TOUCH_OFFSET_Y, maxDropY));
  }

  private syncInputScale(): void {
    const rect = this.canvas.getBoundingClientRect();
    const rendererWidth = this.app.screen.width;
    const rendererHeight = this.app.screen.height;
    if (rect.width > 0 && rect.height > 0) {
      this.input.setScale(rendererWidth / rect.width, rendererHeight / rect.height);
    }
  }

  private async loadLevelConfig(): Promise<void> {
    try {
      if (propsData && (propsData as any).props) {
        await this.propSystem.loadConfig((propsData as any).props);
        return;
      }
    } catch (e) {
      console.warn('[Game] 静态导入道具配置失败，尝试fetch加载:', e);
    }

    try {
      const response = await fetch('/src/data/props/props.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      await this.propSystem.loadConfig(data.props || []);
    } catch (e) {
      console.warn('[Game] 加载道具配置失败，使用默认配置:', e);
      await this.propSystem.loadConfig([
        { id: 'prop_bomb', type: PropType.BOMB, name: '炸弹', description: '销毁指定区域内所有方块', icon: 'bomb', maxCount: 3, cooldown: 1000, price: 50 },
        { id: 'prop_rainbow', type: PropType.RAINBOW, name: '彩虹方块', description: '可与任意数字合成', icon: 'rainbow', maxCount: 3, cooldown: 1000, price: 80 },
        { id: 'prop_freeze', type: PropType.FREEZE, name: '冻结', description: '暂停物理模拟5秒', icon: 'freeze', maxCount: 3, cooldown: 1000, price: 60 },
        { id: 'prop_shrink', type: PropType.SHRINK, name: '缩小射线', description: '将所有方块缩小30%', icon: 'shrink', maxCount: 2, cooldown: 2000, price: 100 },
        { id: 'prop_lucky', type: PropType.LUCKY, name: '幸运投放', description: '接下来3次投放必出高数字', icon: 'lucky', maxCount: 2, cooldown: 2000, price: 120 },
      ]);
    }
  }

  private handleResize(): void {
    if (typeof window === 'undefined') return;
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.app.renderer.resize(window.innerWidth, window.innerHeight);
      this.gameScene.handleResize();
      this.uiManager.handleResize(this.app.screen.width, this.app.screen.height);
      this.syncInputScale();
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

  getBlockSpawner() { return this.gameScene.getBlockSpawner(); }
  getPhysics() { return this.gameScene.getPhysics(); }
  getMergeSystem(): MergeSystem { return this.mergeSystem; }
  getPlatformAdapter(): PlatformAdapter { return this.platform; }
  getPerformanceMonitor(): PerformanceMonitor { return this.performanceMonitor; }
  getLevelLoader(): LevelLoader { return this.levelLoader; }
  getSaveManager(): SaveManager { return this.saveManager; }
  getAudioManager(): AudioManager { return this.audioManager; }
  getPropSystem() { return this.gameScene.getPropSystem(); }
  getUIManager(): UIManager { return this.uiManager; }
  getGameHUD() { return this.gameScene.getGameHUD(); }
  getLevelSystem() { return this.gameScene.getLevelSystem(); }
  getResultScreen(): ResultScreen { return this.resultScreen; }
  getPauseScreen(): PauseScreen { return this.pauseScreen; }
  getLevelSelectScreen(): LevelSelectScreen { return this.levelSelectScreen; }
  getEventBus() { return eventBus; }

  destroy(): void {
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
    if (this.boundKeydown) {
      window.removeEventListener('keydown', this.boundKeydown);
      this.boundKeydown = null;
    }
    this.eventRouter.destroy();
    this.gameScene.destroy();
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
    this.tutorialManager.destroy();
    this.tutorialOverlay.destroy();
    if (this.fpsDisplay) {
      this.fpsDisplay.destroy();
      this.fpsDisplay = null;
    }
    BlockTextureCache.resetInstance();
    AnimationManager.resetInstance();
    TimeManager.resetInstance();
    Game.instance = null;
  }
}
