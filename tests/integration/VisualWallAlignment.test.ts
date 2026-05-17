import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Matter from 'matter-js';
import { ContainerRenderer } from '../../src/core/ContainerRenderer';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { BlockPreview } from '../../src/gameplay/BlockPreview';
import { BlockSpawner } from '../../src/gameplay/BlockSpawner';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { PropEffectHandler } from '../../src/core/PropEffectHandler';
import { GameEffectManager } from '../../src/core/GameEffectManager';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { Container } from 'pixi.js';
import { PropType, PropConfig } from '../../src/gameplay/props/Prop';
import { ScoreSystem } from '../../src/gameplay/ScoreSystem';
import { Block } from '../../src/gameplay/Block';

const propConfigs: PropConfig[] = [
  { id: 'bomb', type: PropType.BOMB, name: '炸弹', description: '爆炸', icon: 'bomb', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'rainbow', type: PropType.RAINBOW, name: '彩虹', description: '彩虹', icon: 'rainbow', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'freeze', type: PropType.FREEZE, name: '冰冻', description: '冰冻', icon: 'freeze', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'shrink', type: PropType.SHRINK, name: '缩小', description: '缩小', icon: 'shrink', maxCount: 2, cooldown: 1000, price: 100 },
  { id: 'lucky', type: PropType.LUCKY, name: '幸运', description: '幸运', icon: 'lucky', maxCount: 2, cooldown: 1000, price: 100 },
];

describe('Visual Wall Alignment Integration', () => {
  let stage: Container;
  let physics: PhysicsManager;
  let blockSpawner: BlockSpawner;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let propEffectHandler: PropEffectHandler;
  let preview: BlockPreview;
  let scoreSystem: ScoreSystem;

  function createMockApp(screenW = 400, screenH = 600) {
    const stage = new Container();
    return {
      screen: { width: screenW, height: screenH },
      stage,
    };
  }

  beforeEach(async () => {
    stage = new Container();
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    preview = new BlockPreview();
    scoreSystem = new ScoreSystem();

    blockSpawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);

    await propSystem.loadConfig(propConfigs);
    propSystem.initialize([
      { type: PropType.BOMB, count: 3 },
      { type: PropType.RAINBOW, count: 3 },
      { type: PropType.FREEZE, count: 3 },
      { type: PropType.SHRINK, count: 2 },
      { type: PropType.LUCKY, count: 2 },
    ]);

    const effectManager = new GameEffectManager(stage);
    const gameHUD = new GameHUD(propSystem);
    propEffectHandler = new PropEffectHandler(
      blockSpawner, mergeSystem, physics, effectManager, propSystem, gameHUD, preview,
    );
  });

  afterEach(() => {
    propEffectHandler.reset();
    propSystem.destroy();
    blockSpawner.reset();
    physics.destroy();
    preview.destroy();
  });

  describe('ContainerRenderer → BlockPreview bounds', () => {
    it('should pass containerOffsetX and containerWidth as preview bounds', () => {
      const app = createMockApp(400, 600);
      const renderer = new ContainerRenderer(app as any, physics);
      const config = { container: { width: 300, height: 500 } } as any;

      renderer.setup(config, 400, 600, preview, blockSpawner, propEffectHandler, scoreSystem);

      preview.show(1, 200, 80);
      const targetX = preview.getTargetX();
      expect(targetX).toBeGreaterThanOrEqual(50);
      expect(targetX).toBeLessThanOrEqual(350);

      renderer.destroy();
    });

    it('should clamp preview to left bound when touching near left wall', () => {
      const app = createMockApp(400, 600);
      const renderer = new ContainerRenderer(app as any, physics);
      const config = { container: { width: 300, height: 500 } } as any;

      renderer.setup(config, 400, 600, preview, blockSpawner, propEffectHandler, scoreSystem);

      preview.show(1, 45, 80);
      expect(preview.getTargetX()).toBeGreaterThanOrEqual(50 + 20);

      renderer.destroy();
    });

    it('should clamp preview to right bound when touching near right wall', () => {
      const app = createMockApp(400, 600);
      const renderer = new ContainerRenderer(app as any, physics);
      const config = { container: { width: 300, height: 500 } } as any;

      renderer.setup(config, 400, 600, preview, blockSpawner, propEffectHandler, scoreSystem);

      preview.show(1, 355, 80);
      expect(preview.getTargetX()).toBeLessThanOrEqual(350 - 20);

      renderer.destroy();
    });

    it('should set containerOffsetX correctly for non-centered container', () => {
      const app = createMockApp(500, 600);
      const renderer = new ContainerRenderer(app as any, physics);
      const config = { container: { width: 300, height: 500 } } as any;

      renderer.setup(config, 500, 600, preview, blockSpawner, propEffectHandler, scoreSystem);

      expect(renderer.getContainerOffsetX()).toBe(100);

      preview.show(1, 90, 80);
      expect(preview.getTargetX()).toBeGreaterThanOrEqual(100 + 20);

      renderer.destroy();
    });
  });

  describe('Preview bounded X matches Spawner bounded X', () => {
    it('should produce same bounded X as BlockSpawner.dropBlock', () => {
      const app = createMockApp(400, 600);
      const renderer = new ContainerRenderer(app as any, physics);

      renderer.setup(null, 400, 600, preview, blockSpawner, propEffectHandler, scoreSystem);

      const testX = 10;
      preview.setBounds(0, 400);
      preview.show(1, testX, 80);
      const previewBounded = preview.getTargetX();

      blockSpawner.setContainerBounds(400, 0);
      blockSpawner.dropBlock(testX, 80, 1);
      const blocks = blockSpawner.getBlocks();
      const spawnedX = blocks[0].x;

      expect(previewBounded).toBeCloseTo(spawnedX, 0);

      renderer.destroy();
      blockSpawner.clearBlocks();
    });

    it('should match spawned X for off-center container', () => {
      const app = createMockApp(400, 600);
      const renderer = new ContainerRenderer(app as any, physics);
      const config = { container: { width: 300, height: 500 } } as any;

      renderer.setup(config, 400, 600, preview, blockSpawner, propEffectHandler, scoreSystem);

      const offsetX = renderer.getContainerOffsetX();

      const testX = offsetX + 5;
      preview.show(1, testX, 80);
      const previewBounded = preview.getTargetX();

      blockSpawner.dropBlock(testX, 80, 1);
      const spawnedX = blockSpawner.getBlocks()[0].x;

      expect(previewBounded).toBeCloseTo(spawnedX, 0);

      renderer.destroy();
      blockSpawner.clearBlocks();
    });
  });

  describe('physics wall ↔ container boundary alignment', () => {
    it('should have left wall inner edge at containerOffsetX', () => {
      const app = createMockApp(400, 600);
      const renderer = new ContainerRenderer(app as any, physics);

      renderer.setup(null, 400, 600, preview, blockSpawner, propEffectHandler, scoreSystem);

      const leftWall = renderer.getPhysicsWalls().find(w => w.label === 'wall_left')!;
      const verts = leftWall.vertices;
      const maxX = Math.max(...verts.map(v => v.x));
      const offsetX = renderer.getContainerOffsetX();

      expect(maxX).toBeCloseTo(offsetX, -1);

      renderer.destroy();
    });

    it('should have right wall inner edge at containerOffsetX + containerWidth', () => {
      const app = createMockApp(400, 600);
      const renderer = new ContainerRenderer(app as any, physics);

      renderer.setup(null, 400, 600, preview, blockSpawner, propEffectHandler, scoreSystem);

      const rightWall = renderer.getPhysicsWalls().find(w => w.label === 'wall_right')!;
      const verts = rightWall.vertices;
      const minX = Math.min(...verts.map(v => v.x));
      const expectedRight = renderer.getContainerOffsetX() + renderer.getContainerWidth();

      expect(minX).toBeCloseTo(expectedRight, -1);

      renderer.destroy();
    });

    it('should detect collision when block center touches wall inner edge', () => {
      const app = createMockApp(400, 600);
      const renderer = new ContainerRenderer(app as any, physics);

      renderer.setup(null, 400, 600, preview, blockSpawner, propEffectHandler, scoreSystem);

      const offsetX = renderer.getContainerOffsetX();
      const body = Matter.Bodies.circle(offsetX + 21, 200, 20);
      Matter.Composite.add(physics.getEngine().world, body);

      const collisionDetected = Matter.Detector.canCollide(
        body.collisionFilter,
        renderer.getPhysicsWalls().find(w => w.label === 'wall_left')!.collisionFilter,
      );

      expect(collisionDetected).toBe(true);

      Matter.Composite.remove(physics.getEngine().world, body);
      renderer.destroy();
    });
  });

  describe('preview landing marker ↔ ground alignment', () => {
    it('should place marker above ground Y in world coordinates', () => {
      preview.setGroundY(500);
      preview.show(1, 200, 80);

      const marker = (preview as any).landingMarker;
      const markerY = marker.y;

      expect(markerY).toBeLessThanOrEqual(500 - 80 - 23);
    });

    it('should scale marker offset with block radius', () => {
      preview.setGroundY(500);
      preview.show(2048, 200, 80);

      const marker = (preview as any).landingMarker;
      const markerY = marker.y;

      expect(markerY).toBeLessThanOrEqual(500 - 80 - 63);

      preview.show(1, 200, 80);
      const markerY2 = (preview as any).landingMarker.y;

      expect(markerY2).toBeLessThanOrEqual(500 - 80 - 23);
    });
  });

  describe('warning line ↔ container boundaries', () => {
    it('should position warning line correctly in container', () => {
      const app = createMockApp(400, 600);
      const renderer = new ContainerRenderer(app as any, physics);

      renderer.setup(null, 400, 600, preview, blockSpawner, propEffectHandler, scoreSystem);

      const warningLine = renderer.getWarningLine();
      expect(warningLine).toBeDefined();
      expect(warningLine!.x).toBe(0);
      expect(warningLine!.y).toBeCloseTo(550 * 0.8, -1);

      renderer.destroy();
    });
  });

  describe('PropEffectHandler container bounds', () => {
    it('should receive container bounds matching renderer', () => {
      const app = createMockApp(400, 600);
      const renderer = new ContainerRenderer(app as any, physics);
      const config = { container: { width: 300, height: 500 } } as any;

      renderer.setup(config, 400, 600, preview, blockSpawner, propEffectHandler, scoreSystem);

      blockSpawner.setContainerBounds(300, 50);
      const body = Matter.Bodies.circle(40, 200, 20);
      const block = new Block(body, 1);

      expect(block.x).toBeLessThan(50);

      blockSpawner.dropBlock(210, 80, 2);
      const blocks = blockSpawner.getBlocks();
      expect(blocks[0].x).toBeGreaterThanOrEqual(50);
      expect(blocks[0].x).toBeLessThanOrEqual(350);

      renderer.destroy();
      blockSpawner.clearBlocks();
    });
  });
});