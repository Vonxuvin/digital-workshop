import { logger } from '../utils/Logger';
import { Application } from 'pixi.js';
import { PhysicsManager } from './PhysicsManager';
import { ScoreSystem } from '../gameplay/ScoreSystem';
import { LevelSystem, LevelConfig } from '../gameplay/LevelSystem';
import { WarningLine } from '../ui/components/WarningLine';
import { Block } from '../gameplay/Block';
import { BlockPreview } from '../gameplay/BlockPreview';
import { BlockSpawner } from '../gameplay/BlockSpawner';
import { MergeSystem } from '../gameplay/MergeSystem';
import { GameHUD } from '../ui/hud/GameHUD';
import { GameEffectManager } from './GameEffectManager';
import { ModifierManager } from '../gameplay/modifiers/ModifierManager';
import { PropSystem } from '../gameplay/props/PropSystem';
import { PropEffectHandler } from './PropEffectHandler';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { ContainerRenderer } from './ContainerRenderer';
import { TutorialManager } from './TutorialManager';
import { TimeManager } from '../utils/TimeManager';

export interface BlockMergedData {
  newValue: number;
  position: { x: number; y: number };
  chainCount: number;
  newBlock: Block;
  destroyedBlocks: Block[];
}

export class GameScene {
  private app: Application;
  private physics: PhysicsManager;
  private preview: BlockPreview;
  private mergeSystem: MergeSystem;
  private blockSpawner!: BlockSpawner;
  private effectManager!: GameEffectManager;
  private groundY: number;
  private scoreSystem: ScoreSystem;
  private levelSystem: LevelSystem | null = null;
  private currentLevelConfig: LevelConfig | null = null;
  private gameHUD: GameHUD;
  private modifierManager: ModifierManager;
  private propSystem: PropSystem;
  private propEffectHandler!: PropEffectHandler;
  private performanceMonitor: PerformanceMonitor;
  private containerRenderer: ContainerRenderer;
  private physicsAccumulator = 0;
  private gameStartTime: number = 0;
  private containerWidth: number = 0;
  private containerHeight: number = 0;
  private containerOffsetX: number = 0;
  private warningLineData: Array<{ y: number; radius: number; speed: number }> = [];
  private tutorialManager: TutorialManager | null = null;
  private timeManager: TimeManager;

  constructor(
    app: Application,
    physics: PhysicsManager,
    mergeSystem: MergeSystem,
    scoreSystem: ScoreSystem,
    preview: BlockPreview,
    gameHUD: GameHUD,
    modifierManager: ModifierManager,
    propSystem: PropSystem,
    performanceMonitor: PerformanceMonitor,
    tutorialManager?: TutorialManager,
  ) {
    this.app = app;
    this.physics = physics;
    this.mergeSystem = mergeSystem;
    this.scoreSystem = scoreSystem;
    this.preview = preview;
    this.gameHUD = gameHUD;
    this.modifierManager = modifierManager;
    this.propSystem = propSystem;
    this.performanceMonitor = performanceMonitor;
    this.containerRenderer = new ContainerRenderer(app, physics);
    this.groundY = 550;
    this.tutorialManager = tutorialManager || null;
    this.timeManager = TimeManager.getInstance();
  }

  init(): void {
    this.propSystem.setPhysicsManager(this.physics);
    this.blockSpawner = new BlockSpawner(this.physics, this.mergeSystem, this.propSystem, this.app.stage);
    this.blockSpawner.setOnBlockDropped((block) => {
      if (this.propEffectHandler.isShrinkActive()) {
        this.propEffectHandler.applyShrinkToBlock(block);
      }
    });
    this.mergeSystem.setBlockPool(this.blockSpawner.getBlockPool());
    this.effectManager = new GameEffectManager(this.app.stage);
    this.effectManager.setPerformanceMonitor(this.performanceMonitor);
    this.propEffectHandler = new PropEffectHandler(
      this.blockSpawner,
      this.mergeSystem,
      this.physics,
      this.effectManager,
      this.propSystem,
      this.gameHUD,
      this.preview,
    );
  }

  setupContainer(): void {
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    this.containerRenderer.setup(
      this.currentLevelConfig,
      screenW,
      screenH,
      this.preview,
      this.blockSpawner,
      this.propEffectHandler,
      this.scoreSystem,
    );

    this.containerWidth = this.containerRenderer.getContainerWidth();
    this.containerHeight = this.containerRenderer.getContainerHeight();
    this.containerOffsetX = this.containerRenderer.getContainerOffsetX();
    this.groundY = this.containerRenderer.getGroundY();
    this.propEffectHandler.setContainerBounds(this.containerOffsetX, this.containerWidth);
  }

  rebuildPhysicsWalls(): void {
    this.containerRenderer.rebuildPhysicsWalls();
  }

  handleResize(): void {
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    this.containerRenderer.handleResize(
      this.currentLevelConfig,
      screenW,
      screenH,
      this.preview,
      this.blockSpawner,
      this.gameHUD,
    );

    this.containerWidth = this.containerRenderer.getContainerWidth();
    this.containerHeight = this.containerRenderer.getContainerHeight();
    this.containerOffsetX = this.containerRenderer.getContainerOffsetX();
    this.groundY = this.containerRenderer.getGroundY();
  }

  loadLevel(config: LevelConfig): void {
    if (this.levelSystem) {
      this.levelSystem.destroy();
    }
    this.levelSystem = new LevelSystem(config);
    this.currentLevelConfig = config;
    this.propEffectHandler.setLevelSystem(this.levelSystem);
    this.blockSpawner.setLevelConfig(config);
    this.gameHUD.updateLevel(config.id, config.name);
    this.setupContainer();
    this.resetGame();
    this.gameStartTime = Date.now();

    this.modifierManager.setContainerSize(this.containerWidth, this.containerHeight, this.containerOffsetX);
    this.modifierManager.setStageContainer(this.app.stage);
    if (config.modifiers && config.modifiers.length > 0) {
      logger.info('GameScene', `加载 ${config.modifiers.length} 个变形器`);
      this.modifierManager.loadFromLevelConfig(config.modifiers);
    }

    this.physics.start();
    this.levelSystem?.start();
    this.drawContainerWalls();
    this.blockSpawner.spawnObstacles(config.obstacles, this.containerWidth, this.groundY, this.containerOffsetX);
    this.startAutoSpawn();
    this.modifierManager.startAll();
    if (this.levelSystem) {
      this.gameHUD.setObjectiveProgress(this.levelSystem.getProgress());
    }
    this.gameHUD.updatePropButtons();

    if (this.tutorialManager) {
      this.tutorialManager.startTutorial(config.id, this.app.screen.width, this.app.screen.height);
    }
  }

  resetGame(): void {
    this.clearEverything();
    this.scoreSystem.reset();
    this.gameHUD.reset();
    this.containerRenderer.getWarningLine()?.reset();
    this.containerRenderer.getWarningLine()?.setDisabled(false);
    this.levelSystem?.reset();
    this.propEffectHandler.reset();
    this.blockSpawner.reset();
    this.modifierManager.stopAll();
    this.modifierManager.clearAll();
    this.rebuildPhysicsWalls();
    this.drawContainerWalls();
  }

  restartLevel(): void {
    if (!this.currentLevelConfig) return;
    this.setupContainer();
    this.resetGame();
    this.propSystem.reset();
    this.propEffectHandler.initializeProps();
    this.physics.start();
    this.levelSystem?.start();
    this.drawContainerWalls();
    this.blockSpawner.spawnObstacles(this.currentLevelConfig!.obstacles, this.containerWidth, this.groundY, this.containerOffsetX);
    this.startAutoSpawn();
    if (this.currentLevelConfig?.modifiers) {
      this.modifierManager.setContainerSize(this.containerWidth, this.containerHeight, this.containerOffsetX);
      this.modifierManager.setStageContainer(this.app.stage);
      this.modifierManager.loadFromLevelConfig(this.currentLevelConfig.modifiers);
      this.modifierManager.startAll();
    }
    if (this.levelSystem) {
      this.gameHUD.setObjectiveProgress(this.levelSystem.getProgress());
    }
  }

  pause(): void {
    this.physics.stop();
    this.levelSystem?.pause();
    this.modifierManager.pauseAll();
    this.propEffectHandler.pause();
    this.blockSpawner.pause();
    this.preview.hide();
    this.preview.hideNextPreview();
    this.propEffectHandler.clearBombTargetMode();
    this.timeManager.pause();
  }

  resume(): void {
    this.propEffectHandler.resume();
    this.levelSystem?.resume();
    this.modifierManager.resumeAll();
    this.blockSpawner.resume();
    this.preview.showNextPreview();
    this.timeManager.resume();
  }

  stopPhysics(): void {
    this.physics.stop();
  }

  startPhysics(): void {
    this.physics.start();
  }

  clearEverything(): void {
    this.blockSpawner.clearBlocks();
    this.blockSpawner.clearObstacles();
    this.blockSpawner.stopAutoSpawn();
    this.preview.hide();
    this.preview.deactivateNextPreview();
    this.effectManager.clearAll();
  }

  clearContainerWalls(): void {
    this.containerRenderer.clearContainerWalls();
  }

  handleBlockMerged(data: BlockMergedData): void {
    for (const destroyed of data.destroyedBlocks) {
      this.blockSpawner.removeBlock(destroyed);
    }

    this.app.stage.addChild(data.newBlock);
    this.blockSpawner.addBlock(data.newBlock);

    this.effectManager.addMergeEffect(data.position.x, data.position.y, data.newValue / 2, data.newValue);
  }

  handleBombExplode(data: { x: number; y: number; radius: number }): void {
    this.propEffectHandler.handleBombExplode(data);
  }

  handleFreezeActivated(data: { duration: number }): void {
    this.propEffectHandler.handleFreezeActivated(data);
    this.containerRenderer.getWarningLine()?.setFrozen(true);
  }

  handleFreezeDeactivated(): void {
    this.propEffectHandler.handleFreezeDeactivated();
    this.containerRenderer.getWarningLine()?.setFrozen(false);
  }

  handleShrinkActivate(data: { factor: number; duration: number }): void {
    this.propEffectHandler.handleShrinkActivate(data);
  }

  handleShrinkDeactivate(): void {
    this.propEffectHandler.handleShrinkDeactivate();
  }

  handleLuckyActivate(data: { multiplier: number; remainingDrops: number }): void {
    this.propEffectHandler.handleLuckyActivate(data);
  }

  handleLuckyDeactivate(): void {
    this.propEffectHandler.handleLuckyDeactivate();
  }

  handlePropTargetMode(data: { type?: import('../gameplay/props/Prop').PropType; enabled: boolean }): void {
    this.propEffectHandler.handlePropTargetMode(data);
  }

  handleNextRainbowBlock(data: { isRainbow: boolean; remaining: number }): void {
    this.propEffectHandler.handleNextRainbowBlock(data);
  }

  handleRainbowConsumed(data: { remainingBlocks: number }): void {
    this.propEffectHandler.handleRainbowConsumed(data);
  }

  handleRevive(): void {
    this.propEffectHandler.handleRevive(this.groundY, this.modifierManager);
  }

  initializeProps(): void {
    this.propEffectHandler.initializeProps();
  }

  getBombTargetMode(): boolean {
    return this.propEffectHandler.getBombTargetMode();
  }

  usePropAtPosition(x: number, y: number): void {
    this.gameHUD.usePropAtPosition(x, y);
  }

  update(deltaMS: number, isPlaying: boolean): void {
    this.performanceMonitor.tick();

    if (!isPlaying) return;

    this.physicsAccumulator += deltaMS;
    this.physicsAccumulator = this.physics.fixedUpdate(this.physicsAccumulator);

    this.blockSpawner.update(deltaMS);
    this.levelSystem?.update(deltaMS);

    this.blockSpawner.cleanupOutOfBounds(this.app.screen.height);
    this.blockSpawner.syncAllBlocks(false);

    this.gameHUD.update(deltaMS / 16.67);
    if (this.levelSystem) {
      this.gameHUD.setObjectiveProgress(this.levelSystem.getProgress());
    }

    const warningLine = this.containerRenderer.getWarningLine();
    if (warningLine) {
      if (this.levelSystem && this.levelSystem.isLevelCompleted()) {
        warningLine.setDisabled(true);
      }
      const blocks = this.blockSpawner.getBlocks();
      this.warningLineData.length = blocks.length;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (!this.warningLineData[i]) {
          this.warningLineData[i] = { y: 0, radius: 0, speed: 0 };
        }
        const d = this.warningLineData[i];
        d.y = b.y;
        d.radius = b.getConfig().radius;
        d.speed = Math.sqrt(b.body.velocity.x ** 2 + b.body.velocity.y ** 2);
      }
      warningLine.update(this.warningLineData, deltaMS);
    }

    this.effectManager.cleanup();

    const rotateModifier = this.modifierManager.getModifier('rotate') as any;
    if (rotateModifier && rotateModifier.getCurrentAngle) {
      const angleDeg = rotateModifier.getCurrentAngle();
      const angleRad = (angleDeg * Math.PI) / 180;
      this.preview.setGravityAngle(angleRad);
    } else {
      this.preview.setGravityAngle(0);
    }

    const shrinkModifier = this.modifierManager.getModifier('shrink') as any;
    if (shrinkModifier && shrinkModifier.isActive && shrinkModifier.isActive()) {
      const shrinkWidth = shrinkModifier.getCurrentWidth();
      const shrinkOffsetX = this.containerOffsetX + (this.containerWidth - shrinkWidth) / 2;
      this.preview.setBounds(shrinkOffsetX, shrinkOffsetX + shrinkWidth);
      const warningLine = this.containerRenderer.getWarningLine();
      if (warningLine) {
        warningLine.setContainerWidth(shrinkWidth);
      }
    } else {
      this.preview.setBounds(this.containerOffsetX, this.containerOffsetX + this.containerWidth);
      const warningLine = this.containerRenderer.getWarningLine();
      if (warningLine) {
        warningLine.setContainerWidth(this.containerWidth);
      }
    }
  }

  calculateStars(score: number, levelId: number): number {
    const config = this.levelSystem?.getConfig();
    if (config?.rewards?.stars && config.rewards.stars.length >= 3) {
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
    return 0;
  }

  private drawContainerWalls(): void {
    this.containerRenderer.drawContainerWalls();
  }

  private startAutoSpawn(): void {
    const interval = this.currentLevelConfig?.spawn.spawnInterval;
    if (!interval || interval <= 0) return;
    this.blockSpawner.startAutoSpawn(interval * 1000, 80);
  }

  dropBlockWithShrinkCheck(x: number, y: number, value: number): void {
    this.blockSpawner.dropBlock(x, y, value);
  }

  getContainerOffsetX(): number { return this.containerOffsetX; }
  getContainerWidth(): number { return this.containerWidth; }
  getContainerHeight(): number { return this.containerHeight; }
  getGroundY(): number { return this.groundY; }
  getApp(): Application { return this.app; }
  getPhysics(): PhysicsManager { return this.physics; }
  getBlockSpawner(): BlockSpawner { return this.blockSpawner; }
  getScoreSystem(): ScoreSystem { return this.scoreSystem; }
  getLevelSystem(): LevelSystem | null { return this.levelSystem; }
  getCurrentLevelConfig(): LevelConfig | null { return this.currentLevelConfig; }
  getGameHUD(): GameHUD { return this.gameHUD; }
  getPreview(): BlockPreview { return this.preview; }
  getWarningLine(): WarningLine | null { return this.containerRenderer.getWarningLine(); }
  getGameStartTime(): number { return this.gameStartTime; }
  getPerformanceMonitor(): PerformanceMonitor { return this.performanceMonitor; }
  getEffectManager(): GameEffectManager { return this.effectManager; }
  getPropSystem(): PropSystem { return this.propSystem; }
  getModifierManager(): ModifierManager { return this.modifierManager; }
  getPropEffectHandler(): PropEffectHandler { return this.propEffectHandler; }

  getShrinkModifier(): import('../gameplay/modifiers/ShrinkModifier').ShrinkModifier | undefined {
    return this.modifierManager.getModifier('shrink') as import('../gameplay/modifiers/ShrinkModifier').ShrinkModifier | undefined;
  }

  getContainer(): { width: number; height: number } {
    return { width: this.containerWidth, height: this.containerHeight };
  }

  checkWarningLine(): boolean {
    const warningLine = this.containerRenderer.getWarningLine();
    if (!warningLine) return false;
    const blocks = this.blockSpawner.getBlocks();
    return blocks.some(b => {
      if (b.y <= (warningLine?.y ?? Infinity)) {
        const body = b.body;
        if (body && Math.abs(body.velocity.y) < 1) {
          return true;
        }
      }
      return false;
    });
  }

  setWarningLineVisible(visible: boolean): void {
    const warningLine = this.containerRenderer.getWarningLine();
    if (warningLine) {
      warningLine.visible = visible;
    }
  }

  setHUDVisible(visible: boolean): void {
    this.gameHUD.visible = visible;
  }

  addPreviewToStage(): void {
    this.app.stage.addChild(this.preview);
  }

  addHUDToStage(): void {
    this.gameHUD.visible = false;
    this.app.stage.addChild(this.gameHUD);
  }

  destroy(): void {
    this.blockSpawner.clearBlocks();
    this.blockSpawner.clearObstacles();
    this.blockSpawner.stopAutoSpawn();
    this.effectManager.destroy();
    this.propEffectHandler.reset();
    this.levelSystem?.destroy();
    this.containerRenderer.destroy();
    this.warningLineData.length = 0;
    this.physics.stop();
  }
}
