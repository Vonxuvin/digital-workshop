import Matter from 'matter-js';
import { Block, getBlockConfig } from './Block';
import { PhysicsManager } from '../core/PhysicsManager';
import { ScoreSystem } from './ScoreSystem';
import { eventBus, GameEvents } from '../utils/EventBus';
import { AnimationManager } from '../utils/AnimationManager';
import { BlockPool } from '../core/BlockPool';

export class MergeSystem {
  private physics: PhysicsManager;
  private scoreSystem: ScoreSystem | null = null;
  private blocks: Map<string, Block> = new Map();
  private obstacles: Map<string, Block> = new Map();
  private mergingBodies: Set<string> = new Set();
  private sameFramePairs: Set<string> = new Set();
  private maxChainDepth = 10;
  private chainDepthMap: Map<string, number> = new Map();
  private pendingChainChecks: string[] = [];
  private collisionCallback: ((pair: Matter.Pair) => void) | null = null;
  private postStepCallback: (() => void) | null = null;
  private blockPool: BlockPool | null = null;

  constructor(physics: PhysicsManager) {
    this.physics = physics;
    this.setupCollisionListener();
    this.setupPostStepHook();
  }

  setScoreSystem(scoreSystem: ScoreSystem): void {
    this.scoreSystem = scoreSystem;
  }

  setBlockPool(pool: BlockPool): void {
    this.blockPool = pool;
  }

  registerBlock(block: Block): void {
    this.blocks.set(block.body.label, block);
  }

  unregisterBlock(block: Block): void {
    this.blocks.delete(block.body.label);
  }

  registerObstacle(block: Block): void {
    this.obstacles.set(block.body.label, block);
  }

  private setupCollisionListener(): void {
    this.collisionCallback = (pair) => {
      this.handleCollision(pair.bodyA, pair.bodyB);
    };
    this.physics.onCollisionStart(this.collisionCallback);
  }

  private setupPostStepHook(): void {
    this.postStepCallback = () => {
      this.sameFramePairs.clear();
      this.runSpatialMergeCheck();
    };
    Matter.Events.on(this.physics.getEngine(), 'afterUpdate', this.postStepCallback);
  }

  private runSpatialMergeCheck(): void {
    const blockEntries = Array.from(this.blocks.entries());
    const checkedPairs = new Set<string>();

    for (let i = 0; i < blockEntries.length; i++) {
      const [labelA, blockA] = blockEntries[i];
      if (blockA.isDestroyed || this.mergingBodies.has(labelA)) continue;

      for (let j = i + 1; j < blockEntries.length; j++) {
        const [labelB, blockB] = blockEntries[j];
        if (blockB.isDestroyed || this.mergingBodies.has(labelB)) continue;
        if (blockA.value !== blockB.value) continue;

        const pairKey = this.getPairKey(labelA, labelB);
        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        const dist = Matter.Vector.magnitude(
          Matter.Vector.sub(blockA.body.position, blockB.body.position)
        );
        const touchDist = (blockA.body.circleRadius || 20) + (blockB.body.circleRadius || 20) + 2;

        if (dist <= touchDist) {
          this.mergingBodies.add(labelA);
          this.mergingBodies.add(labelB);
          this.mergeBlocks(blockA, blockB);
          break;
        }
      }
    }
  }

  private getPairKey(labelA: string, labelB: string): string {
    return labelA < labelB ? `${labelA}|${labelB}` : `${labelB}|${labelA}`;
  }

  private handleCollision(bodyA: Matter.Body, bodyB: Matter.Body): void {
    const pairKey = this.getPairKey(bodyA.label, bodyB.label);
    if (this.sameFramePairs.has(pairKey)) return;
    this.sameFramePairs.add(pairKey);

    const isObstacleA = bodyA.label.startsWith('obstacle_');
    const isObstacleB = bodyB.label.startsWith('obstacle_');

    if (isObstacleA && isObstacleB) return;

    if (isObstacleA || isObstacleB) {
      this.handleObstacleCollision(bodyA, bodyB, isObstacleA);
      return;
    }

    if (bodyA.isStatic || bodyB.isStatic) return;

    const blockA = this.blocks.get(bodyA.label);
    const blockB = this.blocks.get(bodyB.label);

    if (!blockA || !blockB) return;

    if (blockA.isRainbow || blockB.isRainbow) {
      if (this.mergingBodies.has(bodyA.label) || this.mergingBodies.has(bodyB.label)) return;
      this.mergingBodies.add(bodyA.label);
      this.mergingBodies.add(bodyB.label);

      const rainbowBlock = blockA.isRainbow ? blockA : blockB;
      const otherBlock = blockA.isRainbow ? blockB : blockA;
      const mergeValue = otherBlock.value * 2;
      this.mergeBlocks(rainbowBlock, otherBlock, mergeValue);
      return;
    }

    if (blockA.value !== blockB.value) return;
    if (this.mergingBodies.has(bodyA.label) || this.mergingBodies.has(bodyB.label)) return;

    this.mergingBodies.add(bodyA.label);
    this.mergingBodies.add(bodyB.label);

    this.mergeBlocks(blockA, blockB);
  }

  private handleObstacleCollision(bodyA: Matter.Body, bodyB: Matter.Body, aIsObstacle: boolean): void {
    const obstacleBody = aIsObstacle ? bodyA : bodyB;
    const playerBody = aIsObstacle ? bodyB : bodyA;

    const obstacle = this.obstacles.get(obstacleBody.label);
    const player = this.blocks.get(playerBody.label);

    if (!obstacle || !player) return;
    if (obstacle.value !== player.value) return;

    this.clearObstacle(obstacle);
  }

  private clearObstacle(obstacle: Block): void {
    const label = obstacle.body.label;
    this.obstacles.delete(label);
    this.physics.removeBody(obstacle.body);
    obstacle.destroy();
    eventBus.emit(GameEvents.OBSTACLE_CLEARED);
    console.log(`[MergeSystem] 障碍物已清除`);
  }

  private mergeBlocks(blockA: Block, blockB: Block, newValue?: number): void {
    const mergedValue = newValue ?? blockA.value * 2;
    const posX = (blockA.body.position.x + blockB.body.position.x) / 2;
    const posY = (blockA.body.position.y + blockB.body.position.y) / 2;

    const velocityX = (blockA.body.velocity.x + blockB.body.velocity.x) / 2;
    const velocityY = (blockA.body.velocity.y + blockB.body.velocity.y) / 2;

    const labelA = blockA.body.label;
    const labelB = blockB.body.label;

    const prevDepthA = this.chainDepthMap.get(labelA) || 0;
    const prevDepthB = this.chainDepthMap.get(labelB) || 0;
    const chainDepth = Math.max(prevDepthA, prevDepthB) + 1;

    this.unregisterBlock(blockA);
    this.unregisterBlock(blockB);

    this.physics.removeBody(blockA.body);
    this.physics.removeBody(blockB.body);

    this.mergingBodies.delete(labelA);
    this.mergingBodies.delete(labelB);
    this.chainDepthMap.delete(labelA);
    this.chainDepthMap.delete(labelB);

    blockA.destroy();
    blockB.destroy();

    const config = getBlockConfig(mergedValue);

    const newBody = this.physics.createCircle(posX, posY, config.radius, {
      density: config.mass * 0.001,
    });
    Matter.Body.setVelocity(newBody, { x: velocityX, y: velocityY });

    const newBlock = this.blockPool
      ? this.blockPool.acquire(newBody, mergedValue)
      : new Block(newBody, mergedValue);
    this.registerBlock(newBlock);

    if (chainDepth < this.maxChainDepth) {
      this.chainDepthMap.set(newBody.label, chainDepth);
    }

    if (this.scoreSystem) {
      this.scoreSystem.addMergeScore(mergedValue, chainDepth > 0);
    }
    eventBus.emit(GameEvents.BLOCK_MERGED, {
      newValue: mergedValue,
      position: { x: posX, y: posY },
      chainCount: chainDepth,
      newBlock,
      destroyedBlocks: [blockA, blockB],
    });
    console.log(`[MergeSystem] block:merged`, { newValue: mergedValue });

    console.log(`[MergeSystem] 合成: ${blockA.value} + ${blockB.value} = ${mergedValue}`);

    this.scheduleChainCheck(newBody.label);
  }

  private chainCheckAnimId: string | null = null;

  private scheduleChainCheck(label: string): void {
    this.pendingChainChecks.push(label);
    if (this.pendingChainChecks.length === 1 && !this.chainCheckAnimId) {
      this.chainCheckAnimId = AnimationManager.getInstance().registerOnce(() => {
        this.chainCheckAnimId = null;
        this.processChainChecks();
      }, `merge_chain_${Date.now()}`);
    }
  }

  private processChainChecks = (): void => {
    const checks = this.pendingChainChecks.splice(0);
    for (const label of checks) {
      const block = this.blocks.get(label);
      if (!block || block.isDestroyed) continue;
      const depth = this.chainDepthMap.get(label) || 0;
      if (depth >= this.maxChainDepth) continue;
      this.checkChainReaction(block, depth);
    }
  };

  private checkChainReaction(block: Block, currentDepth: number): void {
    const blockPos = block.body.position;
    const blockRadius = block.body.circleRadius || 20;
    const searchRadius = blockRadius * 4;

    const nearbyBodies = this.physics.getBodiesInArea(
      blockPos.x - searchRadius,
      blockPos.y - searchRadius,
      blockPos.x + searchRadius,
      blockPos.y + searchRadius
    );

    for (const other of nearbyBodies) {
      if (other === block.body || other.isStatic) continue;
      const dist = Matter.Vector.magnitude(Matter.Vector.sub(blockPos, other.position));
      if (dist >= blockRadius + (other.circleRadius || 20) + 5) continue;
      const otherBlock = this.blocks.get(other.label);
      if (otherBlock && !otherBlock.isDestroyed && otherBlock.value === block.value) {
        this.chainDepthMap.set(block.body.label, currentDepth + 1);
        this.mergeBlocks(block, otherBlock);
        break;
      }
    }
  }

  destroy(): void {
    if (this.collisionCallback) {
      this.physics.offCollisionStart(this.collisionCallback);
      this.collisionCallback = null;
    }
    if (this.postStepCallback) {
      Matter.Events.off(this.physics.getEngine(), 'afterUpdate', this.postStepCallback);
      this.postStepCallback = null;
    }
    if (this.chainCheckAnimId) {
      AnimationManager.getInstance().unregister(this.chainCheckAnimId);
      this.chainCheckAnimId = null;
    }
    this.blocks.clear();
    this.obstacles.clear();
    this.mergingBodies.clear();
    this.sameFramePairs.clear();
    this.chainDepthMap.clear();
    this.pendingChainChecks = [];
  }
}
