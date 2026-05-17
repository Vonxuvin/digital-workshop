import { describe, it, expect, beforeEach, vi } from 'vitest';
import Matter from 'matter-js';
import { PropEffectHandler } from '../../src/core/PropEffectHandler';
import { Block } from '../../src/gameplay/Block';
import { PropType, PropConfig } from '../../src/gameplay/props/Prop';
import { PropSystem } from '../../src/gameplay/props/PropSystem';

const defaultPropConfigs: PropConfig[] = [
  { id: 'bomb', type: PropType.BOMB, name: '炸弹', description: '爆炸', icon: 'bomb', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'rainbow', type: PropType.RAINBOW, name: '彩虹', description: '彩虹', icon: 'rainbow', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'freeze', type: PropType.FREEZE, name: '冰冻', description: '冰冻', icon: 'freeze', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'shrink', type: PropType.SHRINK, name: '缩小', description: '缩小', icon: 'shrink', maxCount: 2, cooldown: 1000, price: 100 },
  { id: 'lucky', type: PropType.LUCKY, name: '幸运', description: '幸运', icon: 'lucky', maxCount: 2, cooldown: 1000, price: 100 },
];

function createMockBlockSpawner() {
  const blocks: Block[] = [];
  return {
    getBlocks: vi.fn(() => blocks),
    removeBlock: vi.fn((b: Block) => {
      const idx = blocks.indexOf(b);
      if (idx >= 0) blocks.splice(idx, 1);
    }),
    setLuckyMode: vi.fn(),
    setRainbowRemaining: vi.fn(),
    getCurrentValue: vi.fn(() => 1),
    getCanDrop: vi.fn(() => true),
    startCooldown: vi.fn(),
    setContainerBounds: vi.fn(),
  };
}

function createMockMergeSystem() {
  return {
    unregisterBlock: vi.fn(),
  };
}

function createMockPhysics() {
  return {
    createCircle: vi.fn(() => Matter.Bodies.circle(100, 200, 20)),
    removeBody: vi.fn(),
    getAllBodies: vi.fn(() => []),
    start: vi.fn(),
    stop: vi.fn(),
    getEngine: vi.fn(() => ({ world: Matter.Composite.create() })),
  };
}

function createMockEffectManager() {
  return {
    addExplosionEffect: vi.fn(),
    addFreezeEffect: vi.fn(),
    removeFreezeEffect: vi.fn(),
  };
}

function createMockGameHUD() {
  return {
    setObjectiveProgress: vi.fn(),
    updateTimer: vi.fn(),
    showCrosshair: vi.fn(),
    updateCrosshair: vi.fn(),
    hideCrosshair: vi.fn(),
  };
}

function createMockPreview() {
  return {
    visible: false,
    show: vi.fn(),
    hide: vi.fn(),
    updatePosition: vi.fn(),
    setNextValue: vi.fn(),
  };
}

describe('PropEffectHandler', () => {
  let handler: PropEffectHandler;
  let blockSpawner: ReturnType<typeof createMockBlockSpawner>;
  let mergeSystem: ReturnType<typeof createMockMergeSystem>;
  let physics: ReturnType<typeof createMockPhysics>;
  let effectManager: ReturnType<typeof createMockEffectManager>;
  let propSystem: PropSystem;
  let gameHUD: ReturnType<typeof createMockGameHUD>;
  let preview: ReturnType<typeof createMockPreview>;

  beforeEach(async () => {
    blockSpawner = createMockBlockSpawner();
    mergeSystem = createMockMergeSystem();
    physics = createMockPhysics();
    effectManager = createMockEffectManager();
    propSystem = new PropSystem();
    gameHUD = createMockGameHUD();
    preview = createMockPreview();

    await propSystem.loadConfig(defaultPropConfigs);
    propSystem.initialize([
      { type: PropType.BOMB, count: 3 },
      { type: PropType.RAINBOW, count: 3 },
      { type: PropType.FREEZE, count: 3 },
      { type: PropType.SHRINK, count: 2 },
      { type: PropType.LUCKY, count: 2 },
    ]);

    handler = new PropEffectHandler(
      blockSpawner as any,
      mergeSystem as any,
      physics as any,
      effectManager as any,
      propSystem,
      gameHUD as any,
      preview as any,
    );
  });

  describe('handleBombExplode', () => {
    it('should remove affected blocks within radius', () => {
      const body = Matter.Bodies.circle(100, 200, 20);
      const block = new Block(body, 1);
      blockSpawner.getBlocks.mockReturnValue([block]);

      handler.handleBombExplode({ x: 100, y: 200, radius: 120 });
      expect(blockSpawner.removeBlock).toHaveBeenCalledWith(block);
      expect(mergeSystem.unregisterBlock).toHaveBeenCalledWith(block);
      expect(effectManager.addExplosionEffect).toHaveBeenCalled();
    });

    it('should skip destroyed blocks in affected list', () => {
      const body = Matter.Bodies.circle(100, 200, 20);
      const block = new Block(body, 1);
      blockSpawner.getBlocks.mockReturnValue([]);

      handler.handleBombExplode({ x: 100, y: 200, radius: 120 });
      expect(blockSpawner.removeBlock).not.toHaveBeenCalled();
    });

    it('should skip blocks outside container bounds', () => {
      handler.setContainerBounds(100, 400);
      const body = Matter.Bodies.circle(50, 200, 20);
      const block = new Block(body, 1);
      blockSpawner.getBlocks.mockReturnValue([block]);

      handler.handleBombExplode({ x: 50, y: 200, radius: 120 });
      expect(blockSpawner.removeBlock).not.toHaveBeenCalled();
    });

    it('should clip explosion radius at left container bound', () => {
      handler.setContainerBounds(100, 400);
      const body = Matter.Bodies.circle(150, 200, 20);
      const block = new Block(body, 1);
      blockSpawner.getBlocks.mockReturnValue([block]);

      handler.handleBombExplode({ x: 110, y: 200, radius: 120 });
      expect(effectManager.addExplosionEffect).toHaveBeenCalledWith(110, 200, 10);
    });

    it('should clip explosion radius at right container bound', () => {
      handler.setContainerBounds(0, 400);
      const body = Matter.Bodies.circle(350, 200, 20);
      const block = new Block(body, 1);
      blockSpawner.getBlocks.mockReturnValue([block]);

      handler.handleBombExplode({ x: 390, y: 200, radius: 120 });
      expect(effectManager.addExplosionEffect).toHaveBeenCalledWith(390, 200, 10);
    });

    it('should produce zero radius when center is at container edge', () => {
      handler.setContainerBounds(100, 400);
      handler.handleBombExplode({ x: 100, y: 200, radius: 120 });
      expect(effectManager.addExplosionEffect).toHaveBeenCalledWith(100, 200, 0);
    });

    it('should not produce negative radius when center is outside container', () => {
      handler.setContainerBounds(100, 400);
      handler.handleBombExplode({ x: 50, y: 200, radius: 120 });
      expect(effectManager.addExplosionEffect).toHaveBeenCalledWith(50, 200, 0);
    });

    it('should use full radius when explosion fits within container', () => {
      handler.setContainerBounds(0, 800);
      handler.handleBombExplode({ x: 400, y: 300, radius: 120 });
      expect(effectManager.addExplosionEffect).toHaveBeenCalledWith(400, 300, 120);
    });

    it('should not affect blocks far from explosion', () => {
      const body = Matter.Bodies.circle(500, 500, 20);
      const block = new Block(body, 1);
      blockSpawner.getBlocks.mockReturnValue([block]);

      handler.handleBombExplode({ x: 100, y: 200, radius: 120 });
      expect(blockSpawner.removeBlock).not.toHaveBeenCalled();
    });
  });

  describe('handleFreezeActivated', () => {
    it('should add freeze effect', () => {
      handler.handleFreezeActivated({ duration: 5000 });
      expect(effectManager.addFreezeEffect).toHaveBeenCalled();
    });
  });

  describe('handleFreezeDeactivated', () => {
    it('should remove freeze effect', () => {
      handler.handleFreezeDeactivated();
      expect(effectManager.removeFreezeEffect).toHaveBeenCalled();
    });
  });

  describe('handleShrinkActivate', () => {
    it('should shrink blocks', () => {
      const body = Matter.Bodies.circle(100, 200, 20);
      const block = new Block(body, 2);
      blockSpawner.getBlocks.mockReturnValue([block]);

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });
      expect(handler.isShrinkActive()).toBe(true);
      expect(handler.getShrinkFactor()).toBe(0.5);
    });

    it('should deactivate previous shrink before activating new one', () => {
      const body = Matter.Bodies.circle(100, 200, 20);
      const block = new Block(body, 2);
      blockSpawner.getBlocks.mockReturnValue([block]);

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });
      handler.handleShrinkActivate({ factor: 0.7, duration: 5000 });
      expect(handler.isShrinkActive()).toBe(true);
      expect(handler.getShrinkFactor()).toBe(0.7);
    });
  });

  describe('handleShrinkDeactivate', () => {
    it('should restore blocks to original size', () => {
      const body = Matter.Bodies.circle(100, 200, 20);
      const block = new Block(body, 2);
      blockSpawner.getBlocks.mockReturnValue([block]);

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });
      handler.handleShrinkDeactivate();
      expect(handler.isShrinkActive()).toBe(false);
      expect(handler.getShrinkFactor()).toBe(1);
    });

    it('should do nothing when not active', () => {
      handler.handleShrinkDeactivate();
      expect(handler.isShrinkActive()).toBe(false);
    });
  });

  describe('handleLuckyActivate', () => {
    it('should set lucky mode on block spawner', () => {
      handler.handleLuckyActivate({ multiplier: 2, remainingDrops: 5 });
      expect(blockSpawner.setLuckyMode).toHaveBeenCalledWith(true, 2);
    });
  });

  describe('handleLuckyDeactivate', () => {
    it('should reset lucky mode', () => {
      handler.handleLuckyDeactivate();
      expect(blockSpawner.setLuckyMode).toHaveBeenCalledWith(false, 1);
    });
  });

  describe('handlePropTargetMode', () => {
    it('should enable bomb target mode', () => {
      handler.handlePropTargetMode({ enabled: true });
      expect(handler.getBombTargetMode()).toBe(true);
    });

    it('should disable bomb target mode', () => {
      handler.handlePropTargetMode({ enabled: true });
      handler.handlePropTargetMode({ enabled: false });
      expect(handler.getBombTargetMode()).toBe(false);
    });

    it('should hide preview when enabling target mode', () => {
      handler.handlePropTargetMode({ enabled: true });
      expect(preview.hide).toHaveBeenCalled();
    });
  });

  describe('handleNextRainbowBlock', () => {
    it('should set rainbow remaining when isRainbow', () => {
      handler.handleNextRainbowBlock({ isRainbow: true, remaining: 3 });
      expect(blockSpawner.setRainbowRemaining).toHaveBeenCalledWith(3);
    });

    it('should not set rainbow remaining when not isRainbow', () => {
      handler.handleNextRainbowBlock({ isRainbow: false, remaining: 0 });
      expect(blockSpawner.setRainbowRemaining).not.toHaveBeenCalled();
    });
  });

  describe('handleRainbowConsumed', () => {
    it('should update rainbow remaining', () => {
      handler.handleRainbowConsumed({ remainingBlocks: 2 });
      expect(blockSpawner.setRainbowRemaining).toHaveBeenCalledWith(2);
    });
  });

  describe('handleRevive', () => {
    it('should remove blocks above warning line and reset', () => {
      const body1 = Matter.Bodies.circle(100, 100, 20);
      const block1 = new Block(body1, 1);
      const body2 = Matter.Bodies.circle(100, 500, 20);
      const block2 = new Block(body2, 2);
      blockSpawner.getBlocks.mockReturnValue([block1, block2]);

      handler.handleRevive(600, { resumeAll: vi.fn() });
      expect(blockSpawner.removeBlock).toHaveBeenCalledWith(block1);
      expect(blockSpawner.removeBlock).not.toHaveBeenCalledWith(block2);
    });
  });

  describe('initializeProps', () => {
    it('should initialize all props', async () => {
      const ps = new PropSystem();
      await ps.loadConfig(defaultPropConfigs);
      const h = new PropEffectHandler(
        blockSpawner as any, mergeSystem as any, physics as any,
        effectManager as any, ps, gameHUD as any, preview as any,
      );
      h.initializeProps();
      expect(ps.getProp(PropType.BOMB)).toBeDefined();
      expect(ps.getProp(PropType.RAINBOW)).toBeDefined();
      expect(ps.getProp(PropType.FREEZE)).toBeDefined();
      expect(ps.getProp(PropType.SHRINK)).toBeDefined();
      expect(ps.getProp(PropType.LUCKY)).toBeDefined();
    });
  });

  describe('applyShrinkToBlock', () => {
    it('should not apply when shrink not active', () => {
      const body = Matter.Bodies.circle(100, 200, 20);
      const block = new Block(body, 2);
      handler.applyShrinkToBlock(block);
      expect(block.scale.x).toBe(1);
    });

    it('should apply shrink when active', () => {
      const body = Matter.Bodies.circle(100, 200, 20);
      const block = new Block(body, 2);
      blockSpawner.getBlocks.mockReturnValue([block]);
      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });
      handler.applyShrinkToBlock(block);
      expect(block.scale.x).toBe(0.5);
    });
  });

  describe('clearBombTargetMode', () => {
    it('should clear bomb target mode', () => {
      handler.handlePropTargetMode({ enabled: true });
      handler.clearBombTargetMode();
      expect(handler.getBombTargetMode()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      handler.handlePropTargetMode({ enabled: true });
      const body = Matter.Bodies.circle(100, 200, 20);
      const block = new Block(body, 2);
      blockSpawner.getBlocks.mockReturnValue([block]);
      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      handler.reset();
      expect(handler.getBombTargetMode()).toBe(false);
      expect(handler.isShrinkActive()).toBe(false);
      expect(handler.getShrinkFactor()).toBe(1);
    });
  });

  describe('setContainerBounds', () => {
    it('should update container bounds', () => {
      handler.setContainerBounds(50, 300);
      const body = Matter.Bodies.circle(30, 200, 20);
      const block = new Block(body, 1);
      blockSpawner.getBlocks.mockReturnValue([block]);
      handler.handleBombExplode({ x: 30, y: 200, radius: 120 });
      expect(blockSpawner.removeBlock).not.toHaveBeenCalled();
    });
  });

  describe('pause and resume', () => {
    it('should pause and resume without error', () => {
      handler.pause();
      handler.resume();
    });
  });
});
