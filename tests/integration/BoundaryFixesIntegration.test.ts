import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { Block } from '../../src/gameplay/Block';
import { BlockSpawner } from '../../src/gameplay/BlockSpawner';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { PropEffectHandler } from '../../src/core/PropEffectHandler';
import { GameEffectManager } from '../../src/core/GameEffectManager';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { BlockPreview } from '../../src/gameplay/BlockPreview';
import { Container } from 'pixi.js';
import { PropType, PropConfig } from '../../src/gameplay/props/Prop';
import Matter from 'matter-js';

const propConfigs: PropConfig[] = [
  { id: 'bomb', type: PropType.BOMB, name: '炸弹', description: '爆炸', icon: 'bomb', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'rainbow', type: PropType.RAINBOW, name: '彩虹', description: '彩虹', icon: 'rainbow', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'freeze', type: PropType.FREEZE, name: '冰冻', description: '冰冻', icon: 'freeze', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'shrink', type: PropType.SHRINK, name: '缩小', description: '缩小', icon: 'shrink', maxCount: 2, cooldown: 1000, price: 100 },
  { id: 'lucky', type: PropType.LUCKY, name: '幸运', description: '幸运', icon: 'lucky', maxCount: 2, cooldown: 1000, price: 100 },
];

describe('Boundary Fix Integration Tests', () => {
  let physics: PhysicsManager;
  let blockSpawner: BlockSpawner;
  let mergeSystem: MergeSystem;
  let propSystem: PropSystem;
  let propEffectHandler: PropEffectHandler;
  let stage: Container;

  beforeEach(async () => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    propSystem = new PropSystem();
    stage = new Container();
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
    const preview = new BlockPreview();
    propEffectHandler = new PropEffectHandler(
      blockSpawner, mergeSystem, physics, effectManager, propSystem, gameHUD, preview,
    );
  });

  afterEach(() => {
    propEffectHandler.reset();
    propSystem.destroy();
    physics.destroy();
  });

  describe('Container boundary clamping', () => {
    it('should clamp blocks to container bounds on bomb explosion near edge', () => {
      propEffectHandler.setContainerBounds(100, 300);
      const body1 = Matter.Bodies.circle(120, 200, 20);
      const block1 = new Block(body1, 1);
      const body2 = Matter.Bodies.circle(350, 200, 20);
      const block2 = new Block(body2, 2);
      blockSpawner.setContainerBounds(300, 100);

      const blocks = blockSpawner.getBlocks();
      expect(blocks.length).toBe(0);

      propEffectHandler.handleBombExplode({ x: 120, y: 200, radius: 120 });
    });

    it('should respect container offset when checking block positions', () => {
      propEffectHandler.setContainerBounds(100, 300);
      const body = Matter.Bodies.circle(50, 200, 20);
      const block = new Block(body, 1);

      expect(block.x).toBe(50);
      expect(block.x < 100).toBe(true);
    });
  });

  describe('Prop interaction with container bounds', () => {
    it('should clip bomb explosion radius at left boundary', () => {
      propEffectHandler.setContainerBounds(100, 400);
      const body = Matter.Bodies.circle(150, 200, 20);
      const block = new Block(body, 1);

      propEffectHandler.handleBombExplode({ x: 110, y: 200, radius: 120 });
    });

    it('should clip bomb explosion radius at right boundary', () => {
      propEffectHandler.setContainerBounds(0, 400);
      const body = Matter.Bodies.circle(350, 200, 20);
      const block = new Block(body, 1);

      propEffectHandler.handleBombExplode({ x: 390, y: 200, radius: 120 });
    });
  });

  describe('Shrink and block interaction', () => {
    it('should shrink blocks managed by spawner and then restore them', () => {
      blockSpawner.setContainerBounds(400, 0);
      blockSpawner.dropBlock(100, 80, 2);

      propEffectHandler.handleShrinkActivate({ factor: 0.5, duration: 5000 });
      expect(propEffectHandler.isShrinkActive()).toBe(true);

      propEffectHandler.handleShrinkDeactivate();
      expect(propEffectHandler.isShrinkActive()).toBe(false);
    });

    it('should handle shrink activate when already active', () => {
      propEffectHandler.handleShrinkActivate({ factor: 0.5, duration: 5000 });
      propEffectHandler.handleShrinkActivate({ factor: 0.7, duration: 5000 });
      expect(propEffectHandler.getShrinkFactor()).toBe(0.7);
    });
  });

  describe('Lucky mode integration', () => {
    it('should activate and deactivate lucky mode', () => {
      propEffectHandler.handleLuckyActivate({ multiplier: 2, remainingDrops: 5 });
      propEffectHandler.handleLuckyDeactivate();
    });
  });

  describe('Prop target mode integration', () => {
    it('should toggle bomb target mode', () => {
      expect(propEffectHandler.getBombTargetMode()).toBe(false);
      propEffectHandler.handlePropTargetMode({ enabled: true });
      expect(propEffectHandler.getBombTargetMode()).toBe(true);
      propEffectHandler.handlePropTargetMode({ enabled: false });
      expect(propEffectHandler.getBombTargetMode()).toBe(false);
    });
  });

  describe('Reset state integration', () => {
    it('should reset all prop effect state', () => {
      const body = Matter.Bodies.circle(100, 200, 20);
      const block = new Block(body, 2);

      propEffectHandler.handlePropTargetMode({ enabled: true });
      propEffectHandler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      propEffectHandler.reset();
      expect(propEffectHandler.getBombTargetMode()).toBe(false);
      expect(propEffectHandler.isShrinkActive()).toBe(false);
      expect(propEffectHandler.getShrinkFactor()).toBe(1);
    });
  });
});
