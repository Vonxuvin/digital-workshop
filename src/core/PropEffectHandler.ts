import { logger } from '../utils/Logger';
import { BlockSpawner } from '../gameplay/BlockSpawner';
import { Block } from '../gameplay/Block';
import { MergeSystem } from '../gameplay/MergeSystem';
import { PhysicsManager } from './PhysicsManager';
import { GameEffectManager } from './GameEffectManager';
import { PropSystem } from '../gameplay/props/PropSystem';
import { PropType } from '../gameplay/props/Prop';
import { ScoreSystem } from '../gameplay/ScoreSystem';
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
  private scoreSystem: ScoreSystem | null = null;
  private warningLine: WarningLine | null = null;
  private levelSystem: LevelSystem | null = null;
  private bombTargetMode = false;
  private shrinkActive = false;
  private shrinkFactor = 1;
  private containerOffsetX: number = 0;
  private containerWidth: number = 800;
  private groundY: number = 0;
  private originalBodyData: Map<string, { originalCircleRadius: number | undefined; currentScale: number }> = new Map();

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

  setScoreSystem(scoreSystem: ScoreSystem | null): void {
    this.scoreSystem = scoreSystem;
  }

  setContainerBounds(offsetX: number, width: number): void {
    this.containerOffsetX = offsetX;
    this.containerWidth = width;
  }

  setGroundY(groundY: number): void {
    this.groundY = groundY;
  }

  handleBombExplode(data: { x: number; y: number; radius: number }): void {
    const bombProp = this.propSystem.getProp(PropType.BOMB);
    if (!bombProp) {
      logger.error('PropEffectHandler', 'BombProp 未找到');
      return;
    }

    const leftBound = this.containerOffsetX;
    const rightBound = this.containerOffsetX + this.containerWidth;
    let effectiveRadius = data.radius;
    if (data.x - effectiveRadius < leftBound) {
      effectiveRadius = data.x - leftBound;
    }
    if (data.x + effectiveRadius > rightBound) {
      effectiveRadius = rightBound - data.x;
    }
    effectiveRadius = Math.max(0, effectiveRadius);

    const affectedBlocks = bombProp.getAffectedBlocks(this.blockSpawner.getBlocks(), data.x, data.y);
    for (const block of affectedBlocks) {
      if (block.isDestroyed) continue;
      if (block.x < leftBound || block.x > rightBound) continue;
      this.blockSpawner.removeBlock(block);
      this.mergeSystem.unregisterBlock(block);
      this.physics.removeBody(block.body);
      block.destroy();
    }

    this.effectManager.addExplosionEffect(data.x, data.y, effectiveRadius);

    if (this.levelSystem) {
      this.gameHUD.updateObjectiveProgress(this.levelSystem.getCurrentProgressValue());
    }
  }

  handleFreezeActivated(data: { duration: number }): void {
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
    const processedBodies: Matter.Body[] = [];
    for (const block of blocks) {
      if (block.isDestroyed || !block.body) continue;
      const originalRadius = block.body.circleRadius || 0;
      const bottomY = block.body.position.y + originalRadius;
      this.originalBodyData.set(block.body.label, {
        originalCircleRadius: block.body.circleRadius,
        currentScale: data.factor,
      });
      block.scale.set(data.factor);
      Matter.Body.scale(block.body, data.factor, data.factor);
      const newRadius = block.body.circleRadius || 0;
      const snappedY = this.snapToGroundIfNear(bottomY, newRadius);
      Matter.Body.setPosition(block.body, {
        x: block.body.position.x,
        y: snappedY,
      });
      Matter.Sleeping.set(block.body, false);
      processedBodies.push(block.body);
    }
    this.resolveBlockOverlaps(processedBodies);
  }

  handleShrinkDeactivate(): void {
    if (!this.shrinkActive) return;
    this.shrinkActive = false;
    const blocks = this.blockSpawner.getBlocks();
    const processedBodies: Matter.Body[] = [];
    for (const block of blocks) {
      if (block.isDestroyed || !block.body) continue;
      const currentRadius = block.body.circleRadius || 0;
      const bottomY = block.body.position.y + currentRadius;
      const original = this.originalBodyData.get(block.body.label);
      if (original) {
        const inverseScale = 1 / original.currentScale;
        Matter.Body.scale(block.body, inverseScale, inverseScale);
        if (original.originalCircleRadius !== undefined) {
          block.body.circleRadius = original.originalCircleRadius;
        }
      } else {
        const inverseScale = 1 / this.shrinkFactor;
        Matter.Body.scale(block.body, inverseScale, inverseScale);
      }
      const newRadius = block.body.circleRadius || 0;
      const snappedY = this.snapToGroundIfNear(bottomY, newRadius);
      Matter.Body.setPosition(block.body, {
        x: block.body.position.x,
        y: snappedY,
      });
      Matter.Sleeping.set(block.body, false);
      block.scale.set(1);
      processedBodies.push(block.body);
    }
    this.resolveBlockOverlaps(processedBodies);
    this.originalBodyData.clear();
    this.shrinkFactor = 1;
  }

  handleLuckyActivate(data: { multiplier: number; remainingDrops: number }): void {
    this.blockSpawner.setLuckyMode(true, data.multiplier);
    if (this.scoreSystem) {
      this.scoreSystem.setLuckyMultiplier(data.multiplier);
    }
  }

  handleLuckyDeactivate(): void {
    this.blockSpawner.setLuckyMode(false, 1);
    if (this.scoreSystem) {
      this.scoreSystem.setLuckyMultiplier(1);
    }
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
    const blocksToRemove = blocks.filter(b => !b.isDestroyed && b.y < warningY);
    for (const block of blocksToRemove) {
      this.blockSpawner.removeBlock(block);
      this.mergeSystem.unregisterBlock(block);
      this.physics.removeBody(block.body);
      block.destroy();
    }
    this.warningLine?.reset();
    this.warningLine?.setDisabled(false);
    this.physics.start();
    this.levelSystem?.resumeTimer();
    this.levelSystem?.applyTimerPenalty(10);
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
    const freezeProp = this.propSystem.getProp(PropType.FREEZE);
    if (freezeProp) {
      freezeProp.setPhysicsManager(this.physics);
    }
  }

  getBombTargetMode(): boolean {
    return this.bombTargetMode;
  }

  isShrinkActive(): boolean {
    return this.shrinkActive;
  }

  getShrinkFactor(): number {
    return this.shrinkFactor;
  }

  applyShrinkToBlock(block: Block): void {
    if (!this.shrinkActive || block.isDestroyed || !block.body) return;
    const factor = this.shrinkFactor;
    const originalRadius = block.body.circleRadius || 0;
    const bottomY = block.body.position.y + originalRadius;
    this.originalBodyData.set(block.body.label, {
      originalCircleRadius: block.body.circleRadius,
      currentScale: factor,
    });
    block.scale.set(factor);
    Matter.Body.scale(block.body, factor, factor);
    const newRadius = block.body.circleRadius || 0;
    const snappedY = this.snapToGroundIfNear(bottomY, newRadius);
    Matter.Body.setPosition(block.body, {
      x: block.body.position.x,
      y: snappedY,
    });
    Matter.Sleeping.set(block.body, false);
    const existingBodies = this.blockSpawner.getBlocks()
      .filter(b => !b.isDestroyed && b.body && b.body !== block.body)
      .map(b => b.body);
    this.resolveBlockOverlaps([...existingBodies, block.body]);
  }

  clearBombTargetMode(): void {
    this.bombTargetMode = false;
  }

  private readonly GROUND_SNAP_THRESHOLD = 15;

  private snapToGroundIfNear(bottomY: number, radius: number): number {
    if (this.groundY <= 0) {
      return bottomY - radius;
    }
    const distanceToGround = Math.abs(bottomY - this.groundY);
    if (distanceToGround < this.GROUND_SNAP_THRESHOLD) {
      return this.groundY - radius;
    }
    return bottomY - radius;
  }

  private resolveBlockOverlaps(bodies: Matter.Body[]): void {
    if (bodies.length === 0) return;

    const activeBodies = bodies.filter(b => !b.isStatic && (b.circleRadius || 0) > 0);
    if (activeBodies.length === 0) return;

    const items = activeBodies.map(b => ({
      body: b,
      radius: b.circleRadius || 0,
      x: b.position.x,
      y: b.position.y,
      bottom: b.position.y + (b.circleRadius || 0),
    }));

    items.sort((a, b) => a.bottom - b.bottom);

    const resolved: typeof items = [];

    for (const item of items) {
      let adjustedY = item.y;

      if (this.groundY > 0) {
        const bottomAfterAdjust = adjustedY + item.radius;
        if (bottomAfterAdjust > this.groundY) {
          adjustedY = this.groundY - item.radius;
        }
      }

      for (const lower of resolved) {
        const dx = item.x - lower.x;
        const dy = adjustedY - lower.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = item.radius + lower.radius;

        if (distance < minDistance) {
          if (distance < 0.001) {
            adjustedY = lower.y + minDistance;
          } else {
            const overlap = minDistance - distance;
            const ny = dy / distance;
            adjustedY += Math.abs(ny) > 0.01 ? overlap * Math.sign(ny) : overlap;
          }
        }
      }

      if (this.groundY > 0) {
        const bottomAfterAdjust = adjustedY + item.radius;
        if (bottomAfterAdjust > this.groundY) {
          adjustedY = this.groundY - item.radius;
        }
      }

      if (Math.abs(adjustedY - item.y) > 0.01) {
        Matter.Body.setPosition(item.body, { x: item.x, y: adjustedY });
        item.y = adjustedY;
        item.bottom = adjustedY + item.radius;
      }

      resolved.push(item);
    }
  }

  reset(): void {
    this.bombTargetMode = false;
    this.shrinkActive = false;
    this.shrinkFactor = 1;
    this.originalBodyData.clear();
    this.effectManager.removeFreezeEffect();
  }

  pause(): void {
    const freezeProp = this.propSystem.getProp(PropType.FREEZE);
    if (freezeProp) {
      freezeProp.pause();
    }
    const shrinkProp = this.propSystem.getProp(PropType.SHRINK);
    if (shrinkProp) {
      shrinkProp.pause();
    }
  }

  resume(): void {
    const freezeProp = this.propSystem.getProp(PropType.FREEZE);
    const isFrozen = freezeProp?.isCurrentlyFrozen() ?? false;
    if (!isFrozen) {
      this.physics.start();
    }
    if (freezeProp) {
      freezeProp.resume();
    }
    const shrinkProp = this.propSystem.getProp(PropType.SHRINK);
    if (shrinkProp) {
      shrinkProp.resume();
    }
  }
}
