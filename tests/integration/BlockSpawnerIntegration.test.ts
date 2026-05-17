import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { BlockSpawner } from '../../src/gameplay/BlockSpawner';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { Block, getBlockConfig } from '../../src/gameplay/Block';
import { Container } from 'pixi.js';
import { eventBus, GameEvents } from '../../src/utils/EventBus';
import gsap from 'gsap';

describe('BlockSpawner auto-drop and manual release', () => {
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let spawner: BlockSpawner;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    spawner.setContainerBounds(400, 0);
  });

  afterEach(() => {
    spawner.reset();
    mergeSystem.destroy();
    physics.destroy();
    propSystem.destroy();
  });

  it('should not leave ghost blocks when auto-drop and manual drop happen in sequence', () => {
    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);

    expect(spawner.getBlocks().length).toBe(1);

    spawner.update(300);
    expect(spawner.getCanDrop()).toBe(true);

    spawner.dropBlock(200, 80, 1);
    spawner.startCooldown();

    expect(spawner.getBlocks().length).toBe(2);

    for (const block of spawner.getBlocks()) {
      expect(block.visible).toBe(true);
      expect(block.alpha).toBeGreaterThan(0);
    }
  });

  it('should maintain correct block count across multiple auto-spawn and manual drops', () => {
    spawner.startAutoSpawn(500, 80);

    spawner.update(500);
    expect(spawner.getBlocks().length).toBe(1);

    spawner.update(300);
    spawner.dropBlock(200, 80, 1);
    spawner.startCooldown();
    expect(spawner.getBlocks().length).toBe(2);

    spawner.update(500);
    expect(spawner.getBlocks().length).toBe(3);
  });

  it('should not cause animation conflicts between auto-drop and manual drop blocks', () => {
    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);

    const autoBlock = spawner.getBlocks()[0];
    expect(autoBlock).toBeDefined();

    spawner.update(300);
    spawner.dropBlock(200, 80, 1);
    spawner.startCooldown();

    const manualBlock = spawner.getBlocks()[1];
    expect(manualBlock).toBeDefined();
    expect(manualBlock).not.toBe(autoBlock);

    expect(autoBlock.scale.x).toBeGreaterThan(0);
    expect(manualBlock.scale.x).toBeGreaterThan(0);
  });

  it('should handle rapid auto-spawn followed by manual drop without errors', () => {
    spawner.startAutoSpawn(300, 80);

    for (let i = 0; i < 5; i++) {
      spawner.update(300);
    }

    expect(spawner.getBlocks().length).toBeGreaterThan(0);

    spawner.update(300);
    if (spawner.getCanDrop()) {
      spawner.dropBlock(200, 80, 1);
      spawner.startCooldown();
    }

    expect(spawner.getBlocks().length).toBeGreaterThan(1);
  });

  it('should emit correct events during auto-drop and manual drop sequence', () => {
    const droppedHandler = vi.fn();
    eventBus.on(GameEvents.BLOCK_DROPPED, droppedHandler);

    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);
    expect(droppedHandler).toHaveBeenCalledTimes(1);

    spawner.update(300);
    spawner.dropBlock(200, 80, 1);
    spawner.startCooldown();
    expect(droppedHandler).toHaveBeenCalledTimes(2);

    eventBus.off(GameEvents.BLOCK_DROPPED, droppedHandler);
  });

  it('should correctly track isAutoDropping state across game loop iterations', () => {
    spawner.startAutoSpawn(1000, 80);

    spawner.update(500);
    expect(spawner.getIsAutoDropping()).toBe(false);

    spawner.update(500);
    expect(spawner.getIsAutoDropping()).toBe(false);

    expect(spawner.getBlocks().length).toBe(1);
  });

  it('should handle block pool recycling without ghost visuals', () => {
    spawner.dropBlock(200, 80, 1);
    const block1 = spawner.getBlocks()[0];

    spawner.removeBlock(block1);
    physics.removeBody(block1.body);
    spawner.getBlockPool().release(block1);

    expect(block1.visible).toBe(false);
    expect(block1.isDestroyed).toBe(true);

    spawner.dropBlock(200, 80, 2);
    const block2 = spawner.getBlocks()[0];

    expect(block2.visible).toBe(true);
    expect(block2.value).toBe(2);
  });
});

describe('BlockSpawner timing and animation', () => {
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let spawner: BlockSpawner;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    spawner.setContainerBounds(400, 0);
  });

  afterEach(() => {
    spawner.reset();
    mergeSystem.destroy();
    physics.destroy();
    propSystem.destroy();
  });

  it('should spawn first block after interval elapses via update accumulation', () => {
    spawner.startAutoSpawn(500, 80);
    spawner.update(200);
    expect(spawner.getBlocks().length).toBe(0);
    spawner.update(300);
    expect(spawner.getBlocks().length).toBe(1);
  });

  it('should produce visible block with animation properties on auto drop', () => {
    spawner.startAutoSpawn(500, 80);
    spawner.update(500);
    const block = spawner.getBlocks()[0];
    expect(block).toBeDefined();
    expect(block.visible).toBe(true);
    expect(block.alpha).toBeGreaterThan(0);
    expect(block.scale.x).toBeGreaterThan(0);
    expect(block.scale.y).toBeGreaterThan(0);
  });

  it('should produce multiple blocks across multiple intervals', () => {
    spawner.startAutoSpawn(300, 80);
    spawner.update(300);
    expect(spawner.getBlocks().length).toBe(1);
    spawner.update(300);
    expect(spawner.getBlocks().length).toBe(2);
    spawner.update(300);
    expect(spawner.getBlocks().length).toBe(3);
  });

  it('should handle manual drop after auto-spawn cooldown expires', () => {
    spawner.startAutoSpawn(500, 80);
    spawner.update(500);
    expect(spawner.getBlocks().length).toBe(1);
    expect(spawner.getCanDrop()).toBe(false);

    spawner.update(300);
    expect(spawner.getCanDrop()).toBe(true);

    spawner.dropBlock(200, 80, 1);
    spawner.startCooldown();
    expect(spawner.getBlocks().length).toBe(2);
  });

  it('should clean up gsap tweens when blocks are removed during auto-spawn', () => {
    spawner.startAutoSpawn(500, 80);
    spawner.update(500);

    const block = spawner.getBlocks()[0];
    gsap.to(block, { alpha: 0, duration: 1 });

    spawner.removeBlock(block);
    physics.removeBody(block.body);
    block.destroy();

    expect(block.isDestroyed).toBe(true);
    expect(gsap.getTweensOf(block).length).toBe(0);
  });
});

describe('BlockSpawner spawnObstacles with containerOffsetX', () => {
  let physics: PhysicsManager;
  let spawner: BlockSpawner;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
  });

  it('should apply containerOffsetX to obstacle x positions', () => {
    const obstacles = [
      { x: 100, y: 400, value: 1 },
      { x: 200, y: 350, value: 2 },
    ];
    const containerWidth = 400;
    const groundY = 550;
    const containerOffsetX = 200;

    spawner.spawnObstacles(obstacles, containerWidth, groundY, containerOffsetX);

    const obstacleBlocks = spawner.getObstacleBlocks();
    expect(obstacleBlocks.length).toBe(2);

    expect(obstacleBlocks[0].x).toBeCloseTo(100 + 200, 0);
    expect(obstacleBlocks[1].x).toBeCloseTo(200 + 200, 0);
  });

  it('should default containerOffsetX to 0 when not provided', () => {
    const obstacles = [
      { x: 150, y: 300, value: 4 },
    ];
    const containerWidth = 400;
    const groundY = 550;

    spawner.spawnObstacles(obstacles, containerWidth, groundY);

    const obstacleBlocks = spawner.getObstacleBlocks();
    expect(obstacleBlocks.length).toBe(1);
    expect(obstacleBlocks[0].x).toBeCloseTo(150, 0);
  });

  it('should use obs.y when provided, fallback to groundY - radius when not', () => {
    const config1 = getBlockConfig(1);
    const obstacles = [
      { x: 100, y: 400, value: 1 },
      { x: 200, value: 1 },
    ] as any[];
    const groundY = 550;
    const containerOffsetX = 100;

    spawner.spawnObstacles(obstacles, 400, groundY, containerOffsetX);

    const obstacleBlocks = spawner.getObstacleBlocks();
    expect(obstacleBlocks.length).toBe(2);
    expect(obstacleBlocks[0].y).toBeCloseTo(400, 0);
    expect(obstacleBlocks[1].y).toBeCloseTo(groundY - config1.radius, 0);
  });

  it('should place obstacles inside container walls when offset is applied', () => {
    const containerWidth = 400;
    const containerOffsetX = 200;
    const groundY = 550;

    const obstacles = [
      { x: 200, y: 400, value: 1 },
    ];

    spawner.spawnObstacles(obstacles, containerWidth, groundY, containerOffsetX);

    const obstacleBlocks = spawner.getObstacleBlocks();
    expect(obstacleBlocks[0].x).toBeCloseTo(400, 0);

    const leftWallX = containerOffsetX;
    const rightWallX = containerOffsetX + containerWidth;
    expect(obstacleBlocks[0].x).toBeGreaterThanOrEqual(leftWallX);
    expect(obstacleBlocks[0].x).toBeLessThanOrEqual(rightWallX);
  });
});

describe('BlockSpawner obstacle boundary clamping', () => {
  let physics: PhysicsManager;
  let spawner: BlockSpawner;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let stage: Container;
  const containerWidth = 400;
  const groundY = 580;
  const containerOffsetX = 50;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
  });

  afterEach(() => {
    spawner.reset();
    physics.destroy();
  });

  it('should clamp obstacle x to left boundary', () => {
    const obstacles = [{ x: -100, y: 300, value: 1 }];
    spawner.spawnObstacles(obstacles, containerWidth, groundY, containerOffsetX);
    const blocks = spawner.getObstacleBlocks();
    expect(blocks[0].x).toBeGreaterThanOrEqual(containerOffsetX);
  });

  it('should clamp obstacle x to right boundary', () => {
    const obstacles = [{ x: 9999, y: 300, value: 1 }];
    spawner.spawnObstacles(obstacles, containerWidth, groundY, containerOffsetX);
    const blocks = spawner.getObstacleBlocks();
    expect(blocks[0].x).toBeLessThanOrEqual(containerOffsetX + containerWidth);
  });

  it('should clamp obstacle y to top boundary', () => {
    const obstacles = [{ x: 200, y: -100, value: 1 }];
    spawner.spawnObstacles(obstacles, containerWidth, groundY, containerOffsetX);
    const blocks = spawner.getObstacleBlocks();
    expect(blocks[0].y).toBeGreaterThanOrEqual(0);
  });

  it('should clamp obstacle y to bottom boundary', () => {
    const obstacles = [{ x: 200, y: 9999, value: 1 }];
    spawner.spawnObstacles(obstacles, containerWidth, groundY, containerOffsetX);
    const blocks = spawner.getObstacleBlocks();
    expect(blocks[0].y).toBeLessThanOrEqual(groundY);
  });
});
