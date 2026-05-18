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
      Matter.Body.setVelocity(block.body, { x: 0, y: 0 });
      Matter.Sleeping.set(block.body, false);
    }
    const allBodies = blocks
      .filter(b => !b.isDestroyed && b.body)
      .map(b => b.body);
    this.resolveBlockOverlaps(allBodies);
  }

  handleShrinkDeactivate(): void {
    if (!this.shrinkActive) return;
    this.shrinkActive = false;
    const blocks = this.blockSpawner.getBlocks();
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
      Matter.Body.setVelocity(block.body, { x: 0, y: 0 });
      Matter.Sleeping.set(block.body, false);
      block.scale.set(1);
    }
    const allBodies = blocks
      .filter(b => !b.isDestroyed && b.body)
      .map(b => b.body);
    this.resolveBlockOverlaps(allBodies);
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
    Matter.Body.setVelocity(block.body, { x: 0, y: 0 });
    Matter.Sleeping.set(block.body, false);
    const allBlocks = this.blockSpawner.getBlocks();
    const allBodies = allBlocks
      .filter(b => !b.isDestroyed && b.body)
      .map(b => b.body);
    this.resolveBlockOverlaps(allBodies);
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
    }));

    for (let iter = 0; iter < 15; iter++) {
      let changed = false;

      if (this.groundY > 0) {
        for (const item of items) {
          const bottom = item.y + item.radius;
          if (bottom > this.groundY + 0.1) {
            item.y = this.groundY - item.radius;
            changed = true;
          }
        }
      }

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = a.radius + b.radius;

          if (distance < minDistance) {
            const overlap = minDistance - distance;
            if (distance > 0.001) {
              const nx = dx / distance;
              const ny = dy / distance;
              if (a.y <= b.y) {
                a.x += nx * overlap;
                a.y += ny * overlap;
              } else {
                b.x -= nx * overlap;
                b.y -= ny * overlap;
              }
            } else {
              if (a.y <= b.y) {
                a.y -= overlap;
              } else {
                b.y -= overlap;
              }
            }
            changed = true;
          }
        }
      }

      items.sort((a, b) => b.y - a.y);
      for (const item of items) {
        if (this.groundY <= 0) continue;
        let supportY = -Infinity;
        let hasBallSupport = false;
        let nearestBelowDist = Infinity;
        for (const other of items) {
          if (other === item) continue;
          if (other.y <= item.y) continue;
          const hDist = Math.abs(item.x - other.x);
          const maxHDist = item.radius + other.radius;
          if (hDist < maxHDist) {
            const dy = other.y - item.y;
            if (dy < nearestBelowDist) {
              nearestBelowDist = dy;
              const verticalOffset = Math.sqrt(maxHDist * maxHDist - hDist * hDist);
              supportY = other.y - verticalOffset;
              hasBallSupport = true;
            }
          }
        }
        if (hasBallSupport && item.y < supportY - 0.5) {
          item.y = supportY;
          changed = true;
        } else if (!hasBallSupport && this.groundY > 0) {
          const bottomY = item.y + item.radius;
          const distanceToGround = this.groundY - bottomY;
          if (distanceToGround >= 0 && distanceToGround < this.GROUND_SNAP_THRESHOLD) {
            item.y = this.groundY - item.radius;
            changed = true;
          }
        }
      }

      if (!changed) break;
    }

    for (const item of items) {
      const dx = item.x - item.body.position.x;
      const dy = item.y - item.body.position.y;
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        Matter.Body.setPosition(item.body, { x: item.x, y: item.y });
        Matter.Body.setVelocity(item.body, { x: 0, y: 0 });
      }
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
