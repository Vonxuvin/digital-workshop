import { BlockSpawner } from '../gameplay/BlockSpawner';
import { MergeSystem } from '../gameplay/MergeSystem';
import { PhysicsManager } from './PhysicsManager';
import { GameEffectManager } from './GameEffectManager';
import { PropSystem } from '../gameplay/props/PropSystem';
import { PropType } from '../gameplay/props/Prop';
import { FreezeProp } from '../gameplay/props/FreezeProp';
import { ShrinkProp } from '../gameplay/props/ShrinkProp';
import { BombProp } from '../gameplay/props/BombProp';
import { WarningLine } from '../ui/components/WarningLine';
import { LevelSystem } from '../gameplay/LevelSystem';
import { GameHUD } from '../ui/hud/GameHUD';
import { BlockPreview } from '../gameplay/BlockPreview';
import Matter from 'matter-js';

export class PropEffectHandler {
  private blockSpawner: BlockSpawner;
  private mergeSystem: MergeSystem;
  private physics: PhysicsManager;
  private effectManager: GameEffectManager;
  private propSystem: PropSystem;
  private gameHUD: GameHUD;
  private preview: BlockPreview;
  private warningLine: WarningLine | null = null;
  private levelSystem: LevelSystem | null = null;
  private bombTargetMode = false;
  private shrinkActive = false;
  private shrinkFactor = 1;
  private originalBodyVertices: Map<string, Matter.Vector[]> = new Map();

  constructor(
    blockSpawner: BlockSpawner,
    mergeSystem: MergeSystem,
    physics: PhysicsManager,
    effectManager: GameEffectManager,
    propSystem: PropSystem,
    gameHUD: GameHUD,
    preview: BlockPreview,
  ) {
    this.blockSpawner = blockSpawner;
    this.mergeSystem = mergeSystem;
    this.physics = physics;
    this.effectManager = effectManager;
    this.propSystem = propSystem;
    this.gameHUD = gameHUD;
    this.preview = preview;
  }

  setWarningLine(warningLine: WarningLine | null): void {
    this.warningLine = warningLine;
  }

  setLevelSystem(levelSystem: LevelSystem | null): void {
    this.levelSystem = levelSystem;
  }

  handleBombExplode(data: { x: number; y: number; radius: number }): void {
    const bombProp = this.propSystem.getProp(PropType.BOMB) as BombProp;
    if (!bombProp) {
      console.error('[PropEffectHandler] BombProp 未找到');
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
    this.effectManager.addFreezeEffect(
      this.warningLine?.parent?.width ?? 800,
      this.warningLine?.parent?.height ?? 600,
    );
  }

  handleFreezeDeactivated(): void {
    this.effectManager.removeFreezeEffect();
  }

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

  handleRevive(groundY: number, modifierManager: { resumeAll: () => void }): void {
    const warningY = this.warningLine ? this.warningLine.y : groundY * 0.8;
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
    modifierManager.resumeAll();
  }

  initializeProps(): void {
    this.propSystem.initialize([
      { type: PropType.BOMB, count: 3 },
      { type: PropType.RAINBOW, count: 3 },
      { type: PropType.FREEZE, count: 3 },
      { type: PropType.SHRINK, count: 2 },
      { type: PropType.LUCKY, count: 2 },
    ]);
    const freezeProp = this.propSystem.getProp(PropType.FREEZE) as FreezeProp;
    if (freezeProp) {
      freezeProp.setPhysicsManager(this.physics);
    }
  }

  getBombTargetMode(): boolean {
    return this.bombTargetMode;
  }

  reset(): void {
    this.bombTargetMode = false;
    this.shrinkActive = false;
    this.shrinkFactor = 1;
    this.originalBodyVertices.clear();
    this.effectManager.removeFreezeEffect();
  }

  pause(): void {
    const freezeProp = this.propSystem.getProp(PropType.FREEZE) as FreezeProp;
    if (freezeProp) {
      freezeProp.pause();
    }
    const shrinkProp = this.propSystem.getProp(PropType.SHRINK) as ShrinkProp;
    if (shrinkProp) {
      shrinkProp.pause();
    }
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
  }
}
