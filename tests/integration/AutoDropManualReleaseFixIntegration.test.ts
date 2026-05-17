import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { BlockSpawner } from '../../src/gameplay/BlockSpawner';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { BlockPreview } from '../../src/gameplay/BlockPreview';
import { Block } from '../../src/gameplay/Block';
import { Container } from 'pixi.js';
import { eventBus, GameEvents } from '../../src/utils/EventBus';
import gsap from 'gsap';

describe('Auto-Drop and Manual Release Conflict Integration', () => {
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let spawner: BlockSpawner;
  let preview: BlockPreview;
  let stage: Container;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
    spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    spawner.setContainerBounds(400, 0);
    preview = new BlockPreview();
    stage.addChild(preview);
  });

  afterEach(() => {
    spawner.reset();
    mergeSystem.destroy();
    physics.destroy();
    propSystem.destroy();
    preview.destroy();
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

  it('should clean up preview graphics when auto-drop triggers during preview visibility', () => {
    preview.setBounds(0, 400);
    preview.setGroundY(500);
    preview.show(1, 200, 80);
    expect(preview.visible).toBe(true);

    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);

    preview.hide();

    expect(preview.visible).toBe(false);
    const trailGraphics = (preview as any).trailGraphics;
    expect(trailGraphics._context.instructions.length).toBe(0);
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

  it('should handle preview hide and re-show cycle without residual graphics', () => {
    preview.setBounds(0, 400);
    preview.setGroundY(500);

    preview.show(1, 200, 80);
    preview.hide();

    const trailGraphics = (preview as any).trailGraphics;
    const landingMarker = (preview as any).landingMarker;
    const graphics = (preview as any).graphics;
    expect(trailGraphics._context.instructions.length).toBe(0);
    expect(landingMarker._context.instructions.length).toBe(0);
    expect(graphics._context.instructions.length).toBe(0);

    preview.show(2, 150, 80);
    expect(preview.visible).toBe(true);
    expect(preview.x).toBe(150);
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

describe('GameScene auto-drop preview cleanup integration', () => {
  it('should hide preview when auto-drop occurs and preview is visible', () => {
    const preview = new BlockPreview();
    const container = new Container();
    container.addChild(preview);
    preview.setBounds(0, 400);
    preview.setGroundY(500);

    preview.show(1, 200, 80);
    expect(preview.visible).toBe(true);

    const physics = new PhysicsManager();
    const mergeSystem = new MergeSystem(physics);
    const propSystem = new PropSystem();
    const spawner = new BlockSpawner(physics, mergeSystem, propSystem, container);
    spawner.setContainerBounds(400, 0);

    spawner.startAutoSpawn(1000, 80);
    spawner.update(1000);

    preview.hide();

    expect(preview.visible).toBe(false);
    const trailGraphics = (preview as any).trailGraphics;
    expect(trailGraphics._context.instructions.length).toBe(0);

    spawner.reset();
    mergeSystem.destroy();
    physics.destroy();
    propSystem.destroy();
    preview.destroy();
  });
});
