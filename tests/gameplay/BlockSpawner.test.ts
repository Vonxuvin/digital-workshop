import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { BlockSpawner } from '../../src/gameplay/BlockSpawner';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { Container } from 'pixi.js';
import { eventBus, GameEvents } from '../../src/utils/EventBus';
import { Block } from '../../src/gameplay/Block';

describe('BlockSpawner - auto-drop and manual release conflict fix', () => {
  let spawner: BlockSpawner;
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    spawner.setContainerBounds(400, 0);
  });

  it('should have isAutoDropping false by default', () => {
    expect(spawner.getIsAutoDropping()).toBe(false);
  });

  it('should reset isAutoDropping on reset', () => {
    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);
    spawner.reset();
    expect(spawner.getIsAutoDropping()).toBe(false);
  });

  it('should set isAutoDropping to true during auto-spawn drop', () => {
    let isAutoDroppingDuringDrop = false;
    const originalDropBlock = spawner.dropBlock.bind(spawner);
    spawner.dropBlock = vi.fn((x, y, value) => {
      isAutoDroppingDuringDrop = spawner.getIsAutoDropping();
      originalDropBlock(x, y, value);
    });

    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);

    expect(isAutoDroppingDuringDrop).toBe(true);
  });

  it('should set isAutoDropping back to false after auto-spawn drop completes', () => {
    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);

    expect(spawner.getIsAutoDropping()).toBe(false);
  });

  it('should start cooldown after auto-spawn drop', () => {
    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);

    expect(spawner.getCanDrop()).toBe(false);
  });

  it('should allow manual drop after cooldown expires following auto-spawn', () => {
    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);

    expect(spawner.getCanDrop()).toBe(false);

    spawner.update(300);

    expect(spawner.getCanDrop()).toBe(true);
  });

  it('should not trigger auto-spawn when interval is 0', () => {
    spawner.startAutoSpawn(0, 80);
    spawner.update(10000);

    expect(spawner.getBlocks().length).toBe(0);
    expect(spawner.getIsAutoDropping()).toBe(false);
  });

  it('should stop auto-spawn correctly', () => {
    spawner.startAutoSpawn(1000, 80);
    spawner.stopAutoSpawn();
    spawner.update(2000);

    expect(spawner.getBlocks().length).toBe(0);
  });

  it('should handle multiple auto-spawn cycles correctly', () => {
    spawner.startAutoSpawn(500, 80);
    spawner.update(500);
    expect(spawner.getBlocks().length).toBe(1);

    spawner.update(500);
    expect(spawner.getBlocks().length).toBe(2);
  });

  it('should not auto-spawn when paused', () => {
    spawner.startAutoSpawn(1000, 80);
    spawner.pause();
    spawner.update(1000);

    expect(spawner.getBlocks().length).toBe(0);
  });

  it('should auto-spawn after resume', () => {
    spawner.startAutoSpawn(1000, 80);
    spawner.pause();
    spawner.update(1000);
    expect(spawner.getBlocks().length).toBe(0);

    spawner.resume();
    spawner.update(1000);
    expect(spawner.getBlocks().length).toBe(1);
  });

  it('should drop block at clamped x position within container bounds', () => {
    spawner.dropBlock(-100, 80, 1);
    const blocks = spawner.getBlocks();
    expect(blocks.length).toBe(1);
    expect(blocks[0].x).toBeGreaterThanOrEqual(0);
  });

  it('should handle concurrent auto-spawn and manual drop cooldown correctly', () => {
    spawner.startAutoSpawn(2000, 80);

    spawner.update(2000);
    expect(spawner.getCanDrop()).toBe(false);

    spawner.update(300);
    expect(spawner.getCanDrop()).toBe(true);

    spawner.dropBlock(200, 80, 1);
    spawner.startCooldown();
    expect(spawner.getCanDrop()).toBe(false);

    spawner.update(400);
    expect(spawner.getCanDrop()).toBe(true);
  });

  it('should track isAutoDropping correctly across multiple update cycles', () => {
    spawner.startAutoSpawn(500, 80);

    spawner.update(500);
    expect(spawner.getIsAutoDropping()).toBe(false);

    spawner.update(500);
    expect(spawner.getIsAutoDropping()).toBe(false);
  });

  it('should not spawn block before interval elapses', () => {
    spawner.startAutoSpawn(500, 80);
    spawner.update(499);
    expect(spawner.getBlocks().length).toBe(0);
  });

  it('should spawn block exactly when interval elapses', () => {
    spawner.startAutoSpawn(500, 80);
    spawner.update(500);
    expect(spawner.getBlocks().length).toBe(1);
  });

  it('should spawn block with visible and alpha > 0 on auto drop', () => {
    spawner.startAutoSpawn(500, 80);
    spawner.update(500);
    const block = spawner.getBlocks()[0];
    expect(block.visible).toBe(true);
    expect(block.alpha).toBeGreaterThan(0);
  });

  it('should spawn block with scale > 0 on auto drop', () => {
    spawner.startAutoSpawn(500, 80);
    spawner.update(500);
    const block = spawner.getBlocks()[0];
    expect(block.scale.x).toBeGreaterThan(0);
    expect(block.scale.y).toBeGreaterThan(0);
  });

  it('should accumulate elapsed time across multiple updates', () => {
    spawner.startAutoSpawn(500, 80);
    spawner.update(200);
    expect(spawner.getBlocks().length).toBe(0);
    spawner.update(200);
    expect(spawner.getBlocks().length).toBe(0);
    spawner.update(100);
    expect(spawner.getBlocks().length).toBe(1);
  });

  it('should reset auto spawn elapsed on startAutoSpawn call', () => {
    spawner.startAutoSpawn(500, 80);
    spawner.update(400);
    expect(spawner.getBlocks().length).toBe(0);
    spawner.startAutoSpawn(500, 80);
    spawner.update(400);
    expect(spawner.getBlocks().length).toBe(0);
    spawner.update(100);
    expect(spawner.getBlocks().length).toBe(1);
  });
});

describe('BlockSpawner - animation optimization for auto-drop', () => {
  let spawner: BlockSpawner;
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    spawner.setContainerBounds(400, 0);
  });

  it('should create block with initial scale 0.3 on manual drop', () => {
    spawner.dropBlock(200, 80, 1);
    const block = spawner.getBlocks()[0];
    expect(block.scale.x).toBeCloseTo(0.3, 1);
    expect(block.scale.y).toBeCloseTo(0.3, 1);
  });

  it('should create block with initial alpha 0.5 on manual drop', () => {
    spawner.dropBlock(200, 80, 1);
    const block = spawner.getBlocks()[0];
    expect(block.alpha).toBeCloseTo(0.5, 1);
  });

  it('should create block with initial scale 0.3 on auto drop', () => {
    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);
    const block = spawner.getBlocks()[0];
    expect(block.scale.x).toBeCloseTo(0.3, 1);
    expect(block.scale.y).toBeCloseTo(0.3, 1);
  });

  it('should create block with initial alpha 0.5 on auto drop', () => {
    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);
    const block = spawner.getBlocks()[0];
    expect(block.alpha).toBeCloseTo(0.5, 1);
  });

  it('should emit BLOCK_DROPPED event on auto drop', () => {
    const handler = vi.fn();
    eventBus.on(GameEvents.BLOCK_DROPPED, handler);

    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);

    expect(handler).toHaveBeenCalled();
    eventBus.off(GameEvents.BLOCK_DROPPED, handler);
  });

  it('should emit BLOCK_DROPPED event on manual drop', () => {
    const handler = vi.fn();
    eventBus.on(GameEvents.BLOCK_DROPPED, handler);

    spawner.dropBlock(200, 80, 1);

    expect(handler).toHaveBeenCalled();
    eventBus.off(GameEvents.BLOCK_DROPPED, handler);
  });
});

describe('BlockSpawner - block management', () => {
  let spawner: BlockSpawner;
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    spawner.setContainerBounds(400, 0);
  });

  it('should add and retrieve blocks', () => {
    spawner.dropBlock(200, 80, 1);
    expect(spawner.getBlocks().length).toBe(1);
  });

  it('should remove a block from the list', () => {
    spawner.dropBlock(200, 80, 1);
    const block = spawner.getBlocks()[0];
    spawner.removeBlock(block);
    expect(spawner.getBlocks().length).toBe(0);
  });

  it('should handle removing non-existent block', () => {
    spawner.dropBlock(200, 80, 1);
    const block = spawner.getBlocks()[0];
    spawner.removeBlock(block);
    spawner.removeBlock(block);
    expect(spawner.getBlocks().length).toBe(0);
  });

  it('should add a block manually', () => {
    const body = physics.createCircle(200, 80, 20, {});
    const block = new Block(body, 1, false, false);
    spawner.addBlock(block);
    expect(spawner.getBlocks().length).toBe(1);
  });

  it('should clear all blocks', () => {
    spawner.dropBlock(200, 80, 1);
    spawner.dropBlock(150, 80, 2);
    expect(spawner.getBlocks().length).toBe(2);
    spawner.clearBlocks();
    expect(spawner.getBlocks().length).toBe(0);
  });

  it('should return empty obstacle blocks initially', () => {
    expect(spawner.getObstacleBlocks().length).toBe(0);
  });

  it('should clear obstacles', () => {
    spawner.spawnObstacles(
      [{ value: 1, x: 200, y: 400 }],
      400,
      550,
      0,
    );
    expect(spawner.getObstacleBlocks().length).toBe(1);
    spawner.clearObstacles();
    expect(spawner.getObstacleBlocks().length).toBe(0);
  });

  it('should handle clearing blocks with destroyed blocks', () => {
    spawner.dropBlock(200, 80, 1);
    const block = spawner.getBlocks()[0];
    block.destroy();
    spawner.clearBlocks();
    expect(spawner.getBlocks().length).toBe(0);
  });

  it('should handle clearing obstacles with destroyed blocks', () => {
    spawner.spawnObstacles(
      [{ value: 1, x: 200, y: 400 }],
      400,
      550,
      0,
    );
    const obstacle = spawner.getObstacleBlocks()[0];
    obstacle.destroy();
    spawner.clearObstacles();
    expect(spawner.getObstacleBlocks().length).toBe(0);
  });
});

describe('BlockSpawner - spawn obstacles', () => {
  let spawner: BlockSpawner;
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    spawner.setContainerBounds(400, 0);
  });

  it('should spawn obstacles from config', () => {
    spawner.spawnObstacles(
      [{ value: 1, x: 200, y: 400 }],
      400,
      550,
      0,
    );
    expect(spawner.getObstacleBlocks().length).toBe(1);
  });

  it('should spawn multiple obstacles', () => {
    spawner.spawnObstacles(
      [
        { value: 1, x: 100, y: 400 },
        { value: 2, x: 200, y: 350 },
        { value: 4, x: 300, y: 300 },
      ],
      400,
      550,
      0,
    );
    expect(spawner.getObstacleBlocks().length).toBe(3);
  });

  it('should not spawn obstacles when config is null', () => {
    spawner.spawnObstacles(null as any, 400, 550, 0);
    expect(spawner.getObstacleBlocks().length).toBe(0);
  });

  it('should not spawn obstacles when config is undefined', () => {
    spawner.spawnObstacles(undefined as any, 400, 550, 0);
    expect(spawner.getObstacleBlocks().length).toBe(0);
  });

  it('should use groundY - radius when y is undefined', () => {
    spawner.spawnObstacles(
      [{ value: 1, x: 200 }],
      400,
      550,
      0,
    );
    expect(spawner.getObstacleBlocks().length).toBe(1);
  });

  it('should clamp obstacle x to left bound', () => {
    spawner.spawnObstacles(
      [{ value: 1, x: -100, y: 400 }],
      400,
      550,
      0,
    );
    expect(spawner.getObstacleBlocks().length).toBe(1);
  });

  it('should clamp obstacle x to right bound', () => {
    spawner.spawnObstacles(
      [{ value: 1, x: 500, y: 400 }],
      400,
      550,
      0,
    );
    expect(spawner.getObstacleBlocks().length).toBe(1);
  });

  it('should clamp obstacle y to top bound', () => {
    spawner.spawnObstacles(
      [{ value: 1, x: 200, y: -100 }],
      400,
      550,
      0,
    );
    expect(spawner.getObstacleBlocks().length).toBe(1);
  });

  it('should clamp obstacle y to bottom bound', () => {
    spawner.spawnObstacles(
      [{ value: 1, x: 200, y: 600 }],
      400,
      550,
      0,
    );
    expect(spawner.getObstacleBlocks().length).toBe(1);
  });

  it('should apply container offset to obstacle position', () => {
    spawner.spawnObstacles(
      [{ value: 1, x: 100, y: 400 }],
      400,
      550,
      50,
    );
    expect(spawner.getObstacleBlocks().length).toBe(1);
  });
});

describe('BlockSpawner - cleanup out of bounds', () => {
  let spawner: BlockSpawner;
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    spawner.setContainerBounds(400, 0);
  });

  it('should remove blocks below screen', () => {
    spawner.dropBlock(200, 80, 1);
    const block = spawner.getBlocks()[0];
    block.y = 1000;
    spawner.cleanupOutOfBounds(600);
    expect(spawner.getBlocks().length).toBe(0);
  });

  it('should remove blocks far above screen', () => {
    spawner.dropBlock(200, 80, 1);
    const block = spawner.getBlocks()[0];
    block.y = -600;
    spawner.cleanupOutOfBounds(600);
    expect(spawner.getBlocks().length).toBe(0);
  });

  it('should keep blocks within bounds', () => {
    spawner.dropBlock(200, 80, 1);
    const block = spawner.getBlocks()[0];
    block.y = 300;
    spawner.cleanupOutOfBounds(600);
    expect(spawner.getBlocks().length).toBe(1);
  });

  it('should remove destroyed blocks during cleanup', () => {
    spawner.dropBlock(200, 80, 1);
    const block = spawner.getBlocks()[0];
    block.destroy();
    spawner.cleanupOutOfBounds(600);
    expect(spawner.getBlocks().length).toBe(0);
  });
});

describe('BlockSpawner - state management', () => {
  let spawner: BlockSpawner;
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    spawner.setContainerBounds(400, 0);
  });

  it('should have canDrop true initially', () => {
    expect(spawner.getCanDrop()).toBe(true);
  });

  it('should set canDrop to false on startCooldown', () => {
    spawner.startCooldown();
    expect(spawner.getCanDrop()).toBe(false);
  });

  it('should restore canDrop after cooldown expires', () => {
    spawner.startCooldown();
    expect(spawner.getCanDrop()).toBe(false);
    spawner.update(300);
    expect(spawner.getCanDrop()).toBe(true);
  });

  it('should not restore canDrop before cooldown expires', () => {
    spawner.startCooldown();
    spawner.update(200);
    expect(spawner.getCanDrop()).toBe(false);
  });

  it('should handle partial cooldown updates', () => {
    spawner.startCooldown();
    spawner.update(150);
    expect(spawner.getCanDrop()).toBe(false);
    spawner.update(150);
    expect(spawner.getCanDrop()).toBe(true);
  });

  it('should return default current value', () => {
    expect(spawner.getCurrentValue()).toBe(1);
  });

  it('should set current value', () => {
    spawner.setCurrentValue(4);
    expect(spawner.getCurrentValue()).toBe(4);
  });

  it('should set level config', () => {
    const config = {
      id: 1,
      name: 'Test',
      objective: { type: 'score', target: 1000 },
      container: { width: 400, height: 600, shape: 'rectangle' as const },
      spawn: { availableNumbers: [1, 2, 4, 8] },
      rewards: { stars: [500, 800, 1000] as [number, number, number] },
    };
    spawner.setLevelConfig(config);
    expect(spawner.getCurrentValue()).toBeDefined();
  });

  it('should set rainbow remaining', () => {
    spawner.setRainbowRemaining(3);
    expect(spawner.getCurrentValue()).toBeDefined();
  });

  it('should set lucky mode', () => {
    spawner.setLuckyMode(true, 2);
    expect(spawner.getCurrentValue()).toBeDefined();
  });

  it('should disable lucky mode', () => {
    spawner.setLuckyMode(true, 2);
    spawner.setLuckyMode(false, 1);
    expect(spawner.getCurrentValue()).toBeDefined();
  });

  it('should sync all blocks', () => {
    spawner.dropBlock(200, 80, 1);
    expect(() => spawner.syncAllBlocks(false)).not.toThrow();
  });

  it('should sync all blocks with force', () => {
    spawner.dropBlock(200, 80, 1);
    expect(() => spawner.syncAllBlocks(true)).not.toThrow();
  });

  it('should reset all state', () => {
    spawner.dropBlock(200, 80, 1);
    spawner.startCooldown();
    spawner.setRainbowRemaining(3);
    spawner.setLuckyMode(true, 2);
    spawner.pause();
    spawner.startAutoSpawn(1000, 80);

    spawner.reset();

    expect(spawner.getBlocks().length).toBe(0);
    expect(spawner.getCanDrop()).toBe(true);
    expect(spawner.getCurrentValue()).toBe(1);
    expect(spawner.getIsAutoDropping()).toBe(false);
  });

  it('should return block pool', () => {
    expect(spawner.getBlockPool()).toBeDefined();
  });

  it('should set container bounds', () => {
    spawner.setContainerBounds(500, 50);
    spawner.dropBlock(300, 80, 1);
    expect(spawner.getBlocks().length).toBe(1);
  });

  it('should set onBlockDropped callback', () => {
    const callback = vi.fn();
    spawner.setOnBlockDropped(callback);
    spawner.dropBlock(200, 80, 1);
    expect(callback).toHaveBeenCalled();
  });

  it('should not call onBlockDropped when not set', () => {
    spawner.dropBlock(200, 80, 1);
    expect(spawner.getBlocks().length).toBe(1);
  });

  it('should drop block with different values', () => {
    spawner.dropBlock(100, 80, 1);
    spawner.dropBlock(200, 80, 2);
    spawner.dropBlock(300, 80, 4);
    expect(spawner.getBlocks().length).toBe(3);
  });

  it('should clamp drop position to right bound', () => {
    spawner.setContainerBounds(400, 0);
    spawner.dropBlock(500, 80, 1);
    const blocks = spawner.getBlocks();
    expect(blocks.length).toBe(1);
  });

  it('should drop block with offset container', () => {
    spawner.setContainerBounds(300, 100);
    spawner.dropBlock(250, 80, 1);
    expect(spawner.getBlocks().length).toBe(1);
  });

  it('should handle negative interval in startAutoSpawn', () => {
    spawner.startAutoSpawn(-1, 80);
    spawner.update(1000);
    expect(spawner.getBlocks().length).toBe(0);
  });
});

describe('BlockSpawner - getRandomValue', () => {
  let spawner: BlockSpawner;
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    spawner.setContainerBounds(400, 0);
  });

  it('should return value from default available numbers', () => {
    const value = spawner.getRandomValue();
    expect([1, 2, 4]).toContain(value);
  });

  it('should return value from custom available numbers', () => {
    const config = {
      id: 1,
      name: 'Test',
      objective: { type: 'score', target: 1000 },
      container: { width: 400, height: 600, shape: 'rectangle' as const },
      spawn: { availableNumbers: [1, 2, 4, 8, 16] },
      rewards: { stars: [500, 800, 1000] as [number, number, number] },
    };
    spawner.setLevelConfig(config);
    const value = spawner.getRandomValue();
    expect([1, 2, 4, 8, 16]).toContain(value);
  });

  it('should return higher values in lucky mode', () => {
    const config = {
      id: 1,
      name: 'Test',
      objective: { type: 'score', target: 1000 },
      container: { width: 400, height: 600, shape: 'rectangle' as const },
      spawn: { availableNumbers: [1, 2, 4, 8, 16] },
      rewards: { stars: [500, 800, 1000] as [number, number, number] },
    };
    spawner.setLevelConfig(config);
    spawner.setLuckyMode(true, 2);
    const value = spawner.getRandomValue();
    expect([1, 2, 4, 8, 16]).toContain(value);
  });

  it('should use default numbers when no level config', () => {
    spawner.setLevelConfig(null);
    const value = spawner.getRandomValue();
    expect([1, 2, 4]).toContain(value);
  });
});
