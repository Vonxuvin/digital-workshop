import Matter from 'matter-js';
import { Block, BLOCK_CONFIGS } from './Block';
import { PhysicsManager } from '../core/PhysicsManager';
import { eventBus } from '../utils/EventBus';

export interface MergeResult {
  newValue: number;
  position: { x: number; y: number };
  chainCount: number;
  newBlock: Block;
  destroyedBlocks: Block[];
}

export class MergeSystem {
  private physics: PhysicsManager;
  private blocks: Map<string, Block> = new Map();
  private mergingBodies: Set<string> = new Set();

  constructor(physics: PhysicsManager) {
    this.physics = physics;
    this.setupCollisionListener();
  }

  registerBlock(block: Block): void {
    this.blocks.set(block.body.label, block);
  }

  unregisterBlock(block: Block): void {
    this.blocks.delete(block.body.label);
  }

  private setupCollisionListener(): void {
    this.physics.onCollisionStart((pair) => {
      this.handleCollision(pair.bodyA, pair.bodyB);
    });
  }

  private handleCollision(bodyA: Matter.Body, bodyB: Matter.Body): void {
    if (bodyA.isStatic || bodyB.isStatic) return;

    const blockA = this.blocks.get(bodyA.label);
    const blockB = this.blocks.get(bodyB.label);

    if (!blockA || !blockB) return;
    if (blockA.value !== blockB.value) return;
    if (this.mergingBodies.has(bodyA.label) || this.mergingBodies.has(bodyB.label)) return;

    this.mergingBodies.add(bodyA.label);
    this.mergingBodies.add(bodyB.label);

    this.mergeBlocks(blockA, blockB);
  }

  private mergeBlocks(blockA: Block, blockB: Block): void {
    const newValue = blockA.value * 2;
    const posX = (blockA.body.position.x + blockB.body.position.x) / 2;
    const posY = (blockA.body.position.y + blockB.body.position.y) / 2;

    const velocityX = (blockA.body.velocity.x + blockB.body.velocity.x) / 2;
    const velocityY = (blockA.body.velocity.y + blockB.body.velocity.y) / 2;

    this.unregisterBlock(blockA);
    this.unregisterBlock(blockB);

    this.physics.removeBody(blockA.body);
    this.physics.removeBody(blockB.body);

    blockA.destroy();
    blockB.destroy();

    this.mergingBodies.delete(blockA.body.label);
    this.mergingBodies.delete(blockB.body.label);

    const config = BLOCK_CONFIGS[newValue] || {
      value: newValue,
      color: this.generateColor(newValue),
      radius: 40 + Math.log2(newValue) * 4,
      mass: newValue,
    };

    const newBody = this.physics.createCircle(posX, posY, config.radius, {
      density: config.mass * 0.001,
    });
    Matter.Body.setVelocity(newBody, { x: velocityX, y: velocityY });

    const newBlock = new Block(newBody, newValue);
    this.registerBlock(newBlock);

    eventBus.emit('block:merged', {
      newValue,
      position: { x: posX, y: posY },
      chainCount: 1,
      newBlock,
      destroyedBlocks: [blockA, blockB],
    });

    eventBus.emit('blocks:destroyed', {
      blocks: [blockA, blockB],
    });

    console.log(`[MergeSystem] 合成: ${blockA.value} + ${blockB.value} = ${newValue}`);

    setTimeout(() => {
      this.checkChainReaction(newBlock);
    }, 50);
  }

  private checkChainReaction(block: Block): void {
    const nearbyBodies = this.physics.getAllBodies().filter(b => {
      if (b === block.body || b.isStatic) return false;
      const dist = Matter.Vector.magnitude(Matter.Vector.sub(block.body.position, b.position));
      return dist < (block.body.circleRadius || 20) + (b.circleRadius || 20) + 5;
    });

    for (const other of nearbyBodies) {
      const otherBlock = this.blocks.get(other.label);
      if (otherBlock && otherBlock.value === block.value) {
        this.mergeBlocks(block, otherBlock);
        break;
      }
    }
  }

  private generateColor(value: number): number {
    const hue = (Math.log2(value) * 30) % 360;
    return this.hslToHex(hue, 70, 60);
  }

  private hslToHex(h: number, s: number, l: number): number {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color);
    };
    return (f(0) << 16) | (f(8) << 8) | f(4);
  }
}
