import { Graphics, Container } from 'pixi.js';

export class GraphicsPool {
  private pool: Graphics[] = [];
  private activeObjects: Set<Graphics> = new Set();
  private parent: Container | null = null;

  constructor(initialSize: number = 30) {
    for (let i = 0; i < initialSize; i++) {
      const g = new Graphics();
      g.visible = false;
      this.pool.push(g);
    }
  }

  setParent(parent: Container): void {
    this.parent = parent;
    for (const g of this.pool) {
      if (!g.parent) {
        parent.addChild(g);
      }
    }
    for (const g of this.activeObjects) {
      if (!g.parent) {
        parent.addChild(g);
      }
    }
  }

  acquire(): Graphics {
    let g: Graphics;
    if (this.pool.length > 0) {
      g = this.pool.pop()!;
    } else {
      g = new Graphics();
      if (this.parent) {
        this.parent.addChild(g);
      }
    }
    g.visible = true;
    g.alpha = 1;
    g.scale.set(1);
    g.x = 0;
    g.y = 0;
    g.rotation = 0;
    this.activeObjects.add(g);
    return g;
  }

  release(g: Graphics): void {
    if (!this.activeObjects.has(g)) return;
    this.activeObjects.delete(g);
    g.clear();
    g.visible = false;
    g.alpha = 1;
    g.scale.set(1);
    g.x = 0;
    g.y = 0;
    g.rotation = 0;
    this.pool.push(g);
  }

  releaseAll(): void {
    for (const g of this.activeObjects) {
      g.clear();
      g.visible = false;
      g.alpha = 1;
      g.scale.set(1);
      g.x = 0;
      g.y = 0;
      g.rotation = 0;
      this.pool.push(g);
    }
    this.activeObjects.clear();
  }

  getActiveCount(): number {
    return this.activeObjects.size;
  }

  getPoolSize(): number {
    return this.pool.length;
  }

  destroy(): void {
    for (const g of this.pool) {
      g.destroy();
    }
    for (const g of this.activeObjects) {
      g.destroy();
    }
    this.pool = [];
    this.activeObjects.clear();
    this.parent = null;
  }
}
