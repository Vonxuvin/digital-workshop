import { Application } from 'pixi.js';
import { PhysicsManager } from './PhysicsManager';
import { InputManager } from './InputManager';
import { ScoreSystem } from '../gameplay/ScoreSystem';
import { GameStateMachine } from './GameStateMachine';
import { LevelSystem } from '../gameplay/LevelSystem';
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
  private warningLine: WarningLine | null = null;
  private uiManager: UIManager;
  private gameHUD: GameHUD;
  private resultScreen: ResultScreen;
  private levelSelectScreen: LevelSelectScreen;
  private audioManager: AudioManager;
  private effects: MergeEffect[] = [];

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
    this.audioManager = AudioManager.getInstance();
    this.groundY = window.innerHeight - 50;
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
    this.setupLevel();
    this.setupInput();
    this.setupMergeListener();
    this.setupGameEvents();
    this.setupUIEvents();
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

    this.warningLine = new WarningLine(h);
    this.warningLine.y = h * 0.2;
    this.app.stage.addChild(this.warningLine);
  }

  private setupUI(): void {
    const mainMenu = new MainMenuScreen();
    this.uiManager.registerScreen('mainMenu', mainMenu);
    this.uiManager.registerScreen('levelSelect', this.levelSelectScreen);
    this.uiManager.registerScreen('result', this.resultScreen);
  }

  private setupLevel(): void {
    const levelConfig = {
      id: 1,
      name: '新手教学',
      objective: {
        type: 'score' as const,
        target: 500,
      },
      containerWidth: this.app.screen.width,
      containerHeight: this.app.screen.height,
      availableNumbers: [1, 2, 4],
    };

    this.levelSystem = new LevelSystem(levelConfig);
    this.levelSystem.start();
    this.gameHUD.updateLevel(levelConfig.id, levelConfig.name);
  }

  private setupInput(): void {
    const dropY = 80;

    this.input.onDown((state) => {
      if (!this.canDrop) return;
      this.preview.show(this.currentValue, state.position.x, dropY);
    });

    this.input.onMove((state) => {
      if (state.isDown && this.preview.visible) {
        this.preview.updatePosition(state.position.x);
      }
    });

    this.input.onUp(() => {
      if (this.preview.visible && this.canDrop) {
        this.dropBlock(this.preview.getTargetX(), dropY, this.currentValue);
        this.preview.hide();
        this.startCooldown();
      }
    });
  }

  private setupMergeListener(): void {
    eventBus.on('block:merged', (data: { newValue: number; position: { x: number; y: number } }) => {
      this.audioManager.play('merge');

      const config = BLOCK_CONFIGS[data.newValue] || BLOCK_CONFIGS[1];
      const effect = new MergeEffect(data.position.x, data.position.y, config.color);
      this.app.stage.addChild(effect);
      this.effects.push(effect);
    });

    eventBus.on('blocks:destroyed', (data: { blocks: Block[] }) => {
      this.blocks = this.blocks.filter(block => !data.blocks.includes(block));
    });
  }

  private setupGameEvents(): void {
    eventBus.on('game:over', () => {
      this.stateMachine.transition('gameover');
      this.physics.stop();
      this.audioManager.play('gameover');
    });

    eventBus.on('level:completed', () => {
      this.stateMachine.transition('levelComplete');
      this.physics.stop();
      this.audioManager.play('levelComplete');
    });
  }

  private setupUIEvents(): void {
    eventBus.on('ui:startGame', () => {
      this.uiManager.showScreen('levelSelect');
    });

    eventBus.on('ui:selectLevel', async (levelId: number) => {
      const levelLoader = LevelLoader.getInstance();
      const config = await levelLoader.loadLevel(levelId);
      if (config) {
        this.levelSystem = new LevelSystem(config);
        this.gameHUD.updateLevel(config.id, config.name);
        this.uiManager.hideCurrentScreen();
        this.stateMachine.transition('playing');
        this.startGame();
      }
    });

    eventBus.on('ui:pause', () => {
      this.stateMachine.transition('paused');
    });

    eventBus.on('ui:restart', () => {
      this.uiManager.hideCurrentScreen();
      this.resetGame();
      this.stateMachine.transition('playing');
      this.startGame();
    });

    eventBus.on('ui:backToMenu', () => {
      this.uiManager.hideCurrentScreen();
      this.uiManager.showScreen('mainMenu');
      this.stateMachine.transition('menu');
    });

    eventBus.on('game:over', () => {
      this.resultScreen.setResult({
        isWin: false,
        score: this.scoreSystem.getCurrentScore(),
        stars: 0,
        levelId: this.levelSystem?.getConfig().id || 1,
      });
      this.uiManager.showScreen('result');
    });

    eventBus.on('level:completed', (data: { score: number; levelId: number }) => {
      this.resultScreen.setResult({
        isWin: true,
        score: data.score,
        stars: 3,
        levelId: data.levelId,
      });
      this.uiManager.showScreen('result');
    });
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
    const values = [1, 1, 1, 1, 2, 2, 2, 4, 4, 8];
    return values[Math.floor(Math.random() * values.length)];
  }

  private startCooldown(): void {
    this.canDrop = false;
    setTimeout(() => {
      this.canDrop = true;
    }, this.dropCooldown);
  }

  private update(): void {
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
}
