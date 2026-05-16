import { Block } from '../gameplay/Block';
import Matter from 'matter-js';

export class BlockPool {
  private pool: Block[] = [];
  private maxSize: number;

  constructor(maxSize: number = 30) {
    this.maxSize = maxSize;
  }

  acquire(body: Matter.Body, value: number, isRainbow: boolean = false, isObstacle: boolean = false): Block {
    if (this.pool.length > 0) {
      const block = this.pool.pop()!;
      block.reinit(body, value, isRainbow, isObstacle);
      return block;
    }
    return new Block(body, value, isRainbow, isObstacle);
  }

  release(block: Block): void {
    if (this.pool.length >= this.maxSize) {
      block.destroy();
      return;
    }
    block.recycle();
    this.pool.push(block);
  }

  clear(): void {
    for (const block of this.pool) {
      if (!block.isDestroyed) {
        block.destroy();
      }
    }
    this.pool = [];
  }

  getSize(): number {
    return this.pool.length;
  }

  destroy(): void {
    this.clear();
  }
}
