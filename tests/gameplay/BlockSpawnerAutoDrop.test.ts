import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { BlockSpawner } from '../../src/gameplay/BlockSpawner';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { Container } from 'pixi.js';
import { eventBus, GameEvents } from '../../src/utils/EventBus';

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
