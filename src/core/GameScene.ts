import { Application, Graphics } from 'pixi.js';
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
import { PropType } from '../gameplay/props/Prop';
import { FreezeProp } from '../gameplay/props/FreezeProp';
import { ShrinkProp } from '../gameplay/props/ShrinkProp';
import { BombProp } from '../gameplay/props/BombProp';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import Matter from 'matter-js';

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
  private warningLine: WarningLine | null = null;
  private containerWalls: Graphics | null = null;
  private physicsWalls: Matter.Body[] = [];
  private gameHUD: GameHUD;
  private modifierManager: ModifierManager;
  private propSystem: PropSystem;
  private performanceMonitor: PerformanceMonitor;
  private physicsAccumulator = 0;
  private bombTargetMode = false;
  private gameStartTime: number = 0;
  private containerWidth: number = 0;
  private containerHeight: number = 0;
  private containerOffsetX: number = 0;

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
    this.groundY = window.innerHeight - 50;
  }

  init(): void {
    this.blockSpawner = new BlockSpawner(this.physics, this.mergeSystem, this.propSystem, this.app.stage);
    this.effectManager = new GameEffectManager(this.app.stage);
  }

  setupContainer(): void {
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    if (this.currentLevelConfig) {
      this.containerWidth = Math.min(this.currentLevelConfig.container.width, screenW);
      this.containerHeight = Math.min(this.currentLevelConfig.container.height, screenH);
    } else {
      this.containerWidth = screenW;
      this.containerHeight = screenH;
    }
    this.containerOffsetX = (screenW - this.containerWidth) / 2;
    this.groundY = this.containerHeight - 50;

    this.rebuildPhysicsWalls();

    if (this.warningLine) {
      this.app.stage.removeChild(this.warningLine);
      this.warningLine.destroy();
    }
    this.warningLine = new WarningLine(this.containerHeight, this.containerWidth);
    this.warningLine.x = this.containerOffsetX;
    this.warningLine.y = this.groundY * 0.8;
    this.warningLine.visible = false;
    this.app.stage.addChild(this.warningLine);
    this.preview.setGroundY(this.groundY);
  }

  rebuildPhysicsWalls(): void {
    for (const wall of this.physicsWalls) {
      this.physics.removeBody(wall);
    }
    this.physicsWalls = [];

    const w = this.containerWidth || this.app.screen.width;
    const h = this.containerHeight || this.app.screen.height;
    const offsetX = this.containerOffsetX || 0;

    const ground = this.physics.createRectangle(offsetX + w / 2, this.groundY + 25, w, 50);
    ground.label = 'ground';
    const leftWall = this.physics.createRectangle(offsetX - 22, h / 2, 50, h);
    leftWall.label = 'wall_left';
    const rightWall = this.physics.createRectangle(offsetX + w + 22, h / 2, 50, h);
    rightWall.label = 'wall_right';

    this.physicsWalls = [ground, leftWall, rightWall];
  }

  handleResize(): void {
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    if (this.currentLevelConfig) {
      this.containerWidth = Math.min(this.currentLevelConfig.container.width, screenW);
      this.containerHeight = Math.min(this.currentLevelConfig.container.height, screenH);
    } else {
      this.containerWidth = screenW;
      this.containerHeight = screenH;
    }
    this.containerOffsetX = (screenW - this.containerWidth) / 2;
    this.groundY = this.containerHeight - 50;

    if (this.warningLine) {
      this.warningLine.y = this.groundY * 0.8;
    }
    if (this.gameHUD) {
      this.gameHUD.layout(screenW, screenH);
    }
  }

  loadLevel(config: LevelConfig): void {
    if (this.levelSystem) {
      this.levelSystem.destroy();
    }
    this.levelSystem = new LevelSystem(config);
    this.currentLevelConfig = config;
    this.blockSpawner.setLevelConfig(config);
    this.gameHUD.updateLevel(config.id, config.name);
    this.setupContainer();
    this.resetGame();
    this.gameStartTime = Date.now();

    this.modifierManager.setContainerSize(this.containerWidth, this.containerHeight);
    this.modifierManager.setStageContainer(this.app.stage);
    if (config.modifiers && config.modifiers.length > 0) {
      console.log(`[GameScene] 加载 ${config.modifiers.length} 个变形器`);
      this.modifierManager.loadFromLevelConfig(config.modifiers);
    }

    this.physics.start();
    this.levelSystem?.start();
    this.drawContainerWalls();
    this.blockSpawner.spawnObstacles(config.obstacles, this.containerWidth, this.groundY);
    this.startAutoSpawn();
    this.modifierManager.startAll();
    if (this.levelSystem) {
      this.gameHUD.setObjectiveProgress(this.levelSystem.getProgress());
    }
    this.gameHUD.updatePropButtons();
  }

  resetGame(): void {
    this.clearEverything();
    this.scoreSystem.reset();
    this.gameHUD.reset();
    this.warningLine?.reset();
    this.warningLine?.setDisabled(false);
    this.levelSystem?.reset();
    this.bombTargetMode = false;
    this.shrinkActive = false;
    this.shrinkFactor = 1;
    this.originalBodyVertices.clear();
    this.blockSpawner.reset();
    this.effectManager.removeFreezeEffect();
    this.modifierManager.stopAll();
    this.modifierManager.clearAll();
    this.rebuildPhysicsWalls();
    this.drawContainerWalls();
  }

  restartLevel(): void {
    this.setupContainer();
    this.resetGame();
    this.propSystem.reset();
    this.initializeProps();
    this.physics.start();
    this.levelSystem?.start();
    this.drawContainerWalls();
    this.blockSpawner.spawnObstacles(this.currentLevelConfig!.obstacles, this.containerWidth, this.groundY);
    this.startAutoSpawn();
    if (this.currentLevelConfig?.modifiers) {
      this.modifierManager.setContainerSize(this.containerWidth, this.containerHeight);
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
    const freezeProp = this.propSystem.getProp(PropType.FREEZE) as FreezeProp;
    if (freezeProp) {
      freezeProp.pause();
    }
    const shrinkProp = this.propSystem.getProp(PropType.SHRINK) as ShrinkProp;
    if (shrinkProp) {
      shrinkProp.pause();
    }
    this.preview.hide();
  }

  resume(): void {
    const freezeProp = this.propSystem.getProp(PropType.FREEZE) as FreezeProp;
    const isFrozen = freezeProp?.isCurrentlyFrozen() ?? false;
    if (!isFrozen) {
      this.physics.start();
    }
    if (freezeProp) {
      freezeProp.resume();
    }
    const shrinkProp = this.propSystem.getProp(PropType.SHRINK) as ShrinkProp;
    if (shrinkProp) {
      shrinkProp.resume();
    }
    this.levelSystem?.resume();
    this.modifierManager.resumeAll();
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
    this.effectManager.clearAll();
  }

  clearContainerWalls(): void {
    if (this.containerWalls) {
      this.app.stage.removeChild(this.containerWalls);
      this.containerWalls.destroy();
      this.containerWalls = null;
    }
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
    const bombProp = this.propSystem.getProp(PropType.BOMB) as BombProp;
    if (!bombProp) {
      console.error('[GameScene] BombProp 未找到');
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

    if (this.levelSystem) {
      this.gameHUD.setObjectiveProgress(this.levelSystem.getProgress());
    }
  }

  handleFreezeActivated(data: { duration: number; endTime: number }): void {
    this.effectManager.addFreezeEffect(this.app.screen.width, this.app.screen.height);
  }

  handleFreezeDeactivated(): void {
    this.effectManager.removeFreezeEffect();
  }

  private shrinkActive: boolean = false;
  private shrinkFactor: number = 1;
  private originalBodyVertices: Map<string, Matter.Vector[]> = new Map();

  handleShrinkActivate(data: { factor: number; duration: number }): void {
    if (this.shrinkActive) {
      this.handleShrinkDeactivate();
    }
    this.shrinkActive = true;
    this.shrinkFactor = data.factor;
    const blocks = this.blockSpawner.getBlocks();
    for (const block of blocks) {
      this.originalBodyVertices.set(block.body.label, block.body.vertices.map(v => ({ x: v.x, y: v.y })));
      block.scale.set(data.factor);
      Matter.Body.scale(block.body, data.factor, data.factor);
    }
  }

  handleShrinkDeactivate(): void {
    if (!this.shrinkActive) return;
    this.shrinkActive = false;
    const blocks = this.blockSpawner.getBlocks();
    for (const block of blocks) {
      const original = this.originalBodyVertices.get(block.body.label);
      if (original) {
        const centre = {
          x: (original[0].x + original[2].x) / 2,
          y: (original[0].y + original[2].y) / 2,
        };
        Matter.Body.setVertices(block.body, original);
        Matter.Body.setPosition(block.body, centre);
        Matter.Body.setAngle(block.body, block.body.angle);
      }
      block.scale.set(1);
    }
    this.originalBodyVertices.clear();
    this.shrinkFactor = 1;
  }

  handleLuckyActivate(data: { multiplier: number; remainingDrops: number }): void {
    this.blockSpawner.setLuckyMode(true, data.multiplier);
  }

  handleLuckyDeactivate(): void {
    this.blockSpawner.setLuckyMode(false, 1);
  }

  handlePropTargetMode(data: { type?: PropType; enabled: boolean }): void {
    this.bombTargetMode = data.enabled === true;
    if (this.bombTargetMode) {
      this.preview.hide();
    }
  }

  handleNextRainbowBlock(data: { isRainbow: boolean; remaining: number }): void {
    if (data.isRainbow) {
      this.blockSpawner.setRainbowRemaining(data.remaining);
    }
  }

  handleRainbowConsumed(data: { remainingBlocks: number }): void {
    this.blockSpawner.setRainbowRemaining(data.remainingBlocks);
  }

  handleRevive(): void {
    const warningY = this.warningLine ? this.warningLine.y : this.groundY * 0.8;
    const blocks = this.blockSpawner.getBlocks();
    const blocksToRemove = blocks.filter(b => b.y < warningY);
    for (const block of blocksToRemove) {
      this.blockSpawner.removeBlock(block);
      this.mergeSystem.unregisterBlock(block);
      this.physics.removeBody(block.body);
      block.destroy();
    }
    this.warningLine?.reset();
    this.physics.start();
    this.levelSystem?.resume();
    this.modifierManager.resumeAll();
  }

  initializeProps(): void {
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

  getBombTargetMode(): boolean {
    return this.bombTargetMode;
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
    this.blockSpawner.syncAllBlocks();

    this.gameHUD.update(deltaMS / 16.67);
    if (this.levelSystem) {
      this.gameHUD.setObjectiveProgress(this.levelSystem.getProgress());
    }

    if (this.warningLine) {
      if (this.levelSystem && this.levelSystem.isLevelCompleted()) {
        this.warningLine.setDisabled(true);
      }
      this.warningLine.update(
        this.blockSpawner.getBlocks().map(b => ({
          y: b.y,
          radius: b.getConfig().radius,
          speed: Math.sqrt(b.body.velocity.x ** 2 + b.body.velocity.y ** 2),
        })),
        deltaMS
      );
    }

    this.effectManager.cleanup();
  }

  calculateStars(score: number, levelId: number): number {
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
    return 0;
  }

  private drawContainerWalls(): void {
    this.clearContainerWalls();
    const w = this.containerWidth || this.app.screen.width;
    const offsetX = this.containerOffsetX || 0;

    this.containerWalls = new Graphics();
    this.containerWalls.rect(offsetX, this.groundY, w, 50);
    this.containerWalls.fill({ color: 0x2d2d44 });
    this.containerWalls.rect(offsetX, 0, 6, this.groundY);
    this.containerWalls.fill({ color: 0x4a4a6a });
    this.containerWalls.rect(offsetX + w - 6, 0, 6, this.groundY);
    this.containerWalls.fill({ color: 0x4a4a6a });
    this.containerWalls.moveTo(offsetX, 0);
    this.containerWalls.lineTo(offsetX, this.groundY);
    this.containerWalls.stroke({ width: 2, color: 0x6a6a8a });
    this.containerWalls.moveTo(offsetX + 6, 0);
    this.containerWalls.lineTo(offsetX + 6, this.groundY);
    this.containerWalls.stroke({ width: 1, color: 0x5a5a7a });
    this.containerWalls.moveTo(offsetX + w - 6, 0);
    this.containerWalls.lineTo(offsetX + w - 6, this.groundY);
    this.containerWalls.stroke({ width: 1, color: 0x5a5a7a });
    this.containerWalls.moveTo(offsetX + w, 0);
    this.containerWalls.lineTo(offsetX + w, this.groundY);
    this.containerWalls.stroke({ width: 2, color: 0x6a6a8a });
    this.containerWalls.moveTo(offsetX, this.groundY);
    this.containerWalls.lineTo(offsetX + w, this.groundY);
    this.containerWalls.stroke({ width: 2, color: 0x6a6a8a });
    this.app.stage.addChild(this.containerWalls);
  }

  private startAutoSpawn(): void {
    const interval = this.currentLevelConfig?.spawn.spawnInterval;
    if (!interval || interval <= 0) return;
    this.blockSpawner.startAutoSpawn(interval * 1000, 80);
  }

  getApp(): Application { return this.app; }
  getPhysics(): PhysicsManager { return this.physics; }
  getBlockSpawner(): BlockSpawner { return this.blockSpawner; }
  getScoreSystem(): ScoreSystem { return this.scoreSystem; }
  getLevelSystem(): LevelSystem | null { return this.levelSystem; }
  getCurrentLevelConfig(): LevelConfig | null { return this.currentLevelConfig; }
  getGameHUD(): GameHUD { return this.gameHUD; }
  getPreview(): BlockPreview { return this.preview; }
  getWarningLine(): WarningLine | null { return this.warningLine; }
  getGameStartTime(): number { return this.gameStartTime; }
  getPerformanceMonitor(): PerformanceMonitor { return this.performanceMonitor; }
  getEffectManager(): GameEffectManager { return this.effectManager; }
  getPropSystem(): PropSystem { return this.propSystem; }
  getModifierManager(): ModifierManager { return this.modifierManager; }

  setWarningLineVisible(visible: boolean): void {
    if (this.warningLine) {
      this.warningLine.visible = visible;
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
    this.scoreSystem.destroy();
    this.levelSystem?.destroy();
    this.physics.stop();
    this.effectManager.destroy();
  }
}
