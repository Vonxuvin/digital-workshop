import { Block, getBlockConfig } from '../gameplay/Block';
import { PhysicsManager } from '../core/PhysicsManager';
import { MergeSystem } from '../gameplay/MergeSystem';
import { PropSystem } from '../gameplay/props/PropSystem';
import { PropType } from '../gameplay/props/Prop';
import { RainbowProp } from '../gameplay/props/RainbowProp';
import { LevelConfig } from '../gameplay/LevelSystem';
import { Container } from 'pixi.js';

export class BlockSpawner {
  private physics: PhysicsManager;
  private mergeSystem: MergeSystem;
  private propSystem: PropSystem;
  private stage: Container;

  private blocks: Block[] = [];
  private obstacleBlocks: Block[] = [];
  private currentValue: number = 1;
  private canDrop = true;
  private dropCooldown = 500;
  private autoSpawnTimer: ReturnType<typeof setInterval> | null = null;
  private rainbowRemaining = 0;
  private currentLevelConfig: LevelConfig | null = null;

  constructor(
    physics: PhysicsManager,
    mergeSystem: MergeSystem,
    propSystem: PropSystem,
    stage: Container
  ) {
    this.physics = physics;
    this.mergeSystem = mergeSystem;
    this.propSystem = propSystem;
    this.stage = stage;
  }

  dropBlock(x: number, y: number, value: number): void {
    const config = getBlockConfig(value);
    const body = this.physics.createCircle(x, y, config.radius, {
      density: 0.003 + config.mass * 0.0005,
    });
    const isRainbowBlock = this.rainbowRemaining > 0;
    const block = new Block(body, value, isRainbowBlock);
    if (isRainbowBlock) {
      const rainbowProp = this.propSystem.getProp(PropType.RAINBOW) as RainbowProp;
      rainbowProp.consumeRainbowBlock();
    }
    this.stage.addChild(block);
    this.blocks.push(block);
    this.mergeSystem.registerBlock(block);

    this.currentValue = this.getRandomValue();
    console.log(`[BlockSpawner] 投放方块 ${value}${isRainbowBlock ? '(彩虹)' : ''}, 下一个: ${this.currentValue}`);
  }

  getRandomValue(): number {
    const availableNumbers = this.currentLevelConfig?.spawn.availableNumbers || [1, 2, 4];
    const weights: number[] = [];
    for (const num of availableNumbers) {
      const w = Math.max(1, Math.floor(8 / num));
      for (let i = 0; i < w; i++) {
        weights.push(num);
      }
    }
    return weights[Math.floor(Math.random() * weights.length)];
  }

  startCooldown(): void {
    this.canDrop = false;
    setTimeout(() => {
      this.canDrop = true;
    }, this.dropCooldown);
  }

  startAutoSpawn(interval: number, dropY: number): void {
    this.stopAutoSpawn();
    if (interval <= 0) return;

    this.autoSpawnTimer = window.setInterval(() => {
      const w = (this.stage as any).renderer?.width || 400;
      const x = Math.random() * (w - 100) + 50;
      this.dropBlock(x, dropY, this.currentValue);
      this.startCooldown();
    }, interval);
  }

  stopAutoSpawn(): void {
    if (this.autoSpawnTimer) {
      clearInterval(this.autoSpawnTimer);
      this.autoSpawnTimer = null;
    }
  }

  spawnObstacles(obstacles: LevelConfig['obstacles'], screenWidth: number, groundY: number): void {
    if (!obstacles) return;

    const xCenter = screenWidth / 2;
    const positions = [
      { x: xCenter - 120 },
      { x: xCenter - 60 },
      { x: xCenter },
      { x: xCenter + 60 },
      { x: xCenter + 120 },
    ];

    obstacles.forEach((obs, i) => {
      const config = getBlockConfig(obs.value);
      const pos = positions[i % positions.length];
      const adjustedY = groundY - config.radius;

      const body = this.physics.createCircle(pos.x, adjustedY, config.radius, {
        isStatic: true,
      });
      body.label = `obstacle_${pos.x}_${adjustedY}`;
      const block = new Block(body, obs.value);
      this.stage.addChild(block);
      this.obstacleBlocks.push(block);
      this.mergeSystem.registerObstacle(block);
    });
    console.log(`[BlockSpawner] 生成 ${obstacles.length} 个障碍物`);
  }

  removeBlock(block: Block): void {
    const idx = this.blocks.indexOf(block);
    if (idx !== -1) {
      this.blocks.splice(idx, 1);
    }
  }

  addBlock(block: Block): void {
    this.blocks.push(block);
  }

  clearBlocks(): void {
    this.blocks.forEach(block => {
      if (!block.isDestroyed) {
        this.mergeSystem.unregisterBlock(block);
        this.physics.removeBody(block.body);
        block.destroy();
      }
    });
    this.blocks = [];
  }

  clearObstacles(): void {
    this.obstacleBlocks.forEach(block => {
      if (!block.isDestroyed) {
        this.physics.removeBody(block.body);
        block.destroy();
      }
    });
    this.obstacleBlocks = [];
  }

  cleanupOutOfBounds(screenHeight: number): void {
    this.blocks = this.blocks.filter(block => {
      if (block.isDestroyed) return false;
      if (block.y > screenHeight + 100) {
        this.mergeSystem.unregisterBlock(block);
        this.physics.removeBody(block.body);
        block.destroy();
        return false;
      }
      return true;
    });
  }

  syncAllBlocks(): void {
    this.blocks.forEach(block => {
      block.syncFromBody();
    });
  }

  setLevelConfig(config: LevelConfig | null): void {
    this.currentLevelConfig = config;
  }

  setRainbowRemaining(count: number): void {
    this.rainbowRemaining = count;
  }

  getCurrentValue(): number {
    return this.currentValue;
  }

  setCurrentValue(value: number): void {
    this.currentValue = value;
  }

  getCanDrop(): boolean {
    return this.canDrop;
  }

  getBlocks(): Block[] {
    return this.blocks;
  }

  getObstacleBlocks(): Block[] {
    return this.obstacleBlocks;
  }

  reset(): void {
    this.clearBlocks();
    this.clearObstacles();
    this.stopAutoSpawn();
    this.canDrop = true;
    this.rainbowRemaining = 0;
    this.currentValue = 1;
  }
}
