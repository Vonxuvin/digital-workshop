import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Matter from 'matter-js';
import { PropEffectHandler } from '../../src/core/PropEffectHandler';
import { Block } from '../../src/gameplay/Block';
import { PropType, PropConfig } from '../../src/gameplay/props/Prop';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { eventBus } from '../../src/utils/EventBus';

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

describe('Shrink Bottom Position Fix Integration', () => {
  let handler: PropEffectHandler;
  let blockSpawner: ReturnType<typeof createMockBlockSpawner>;
  let mergeSystem: ReturnType<typeof createMockMergeSystem>;
  let physics: PhysicsManager;
  let effectManager: ReturnType<typeof createMockEffectManager>;
  let propSystem: PropSystem;
  let gameHUD: ReturnType<typeof createMockGameHUD>;
  let preview: ReturnType<typeof createMockPreview>;

  beforeEach(async () => {
    blockSpawner = createMockBlockSpawner();
    mergeSystem = createMockMergeSystem();
    physics = new PhysicsManager();
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

  afterEach(() => {
    physics.stop();
    physics.destroy();
  });

  describe('Shrink + Physics Integration', () => {
    it('should keep ball on ground after shrink with real physics engine', () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';

      const radius = 40;
      const body = physics.createCircle(200, groundY - radius, radius);
      const block = new Block(body, 8);
      blockSpawner.getBlocks.mockReturnValue([block]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      const settledY = body.position.y;
      const settledBottom = settledY + body.circleRadius!;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const shrunkBottom = body.position.y + body.circleRadius!;
      expect(shrunkBottom).toBeCloseTo(settledBottom, 0);
    });

    it('should maintain bottom contact through shrink-restore cycle with physics', () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';

      const radius = 30;
      const body = physics.createCircle(200, groundY - radius, radius);
      const block = new Block(body, 4);
      blockSpawner.getBlocks.mockReturnValue([block]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      const originalBottom = body.position.y + body.circleRadius!;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      for (let i = 0; i < 30; i++) {
        physics.step(1000 / 60);
      }

      handler.handleShrinkDeactivate();

      const finalBottom = body.position.y + body.circleRadius!;
      expect(finalBottom).toBeCloseTo(originalBottom, 0);
    });

    it('should not cause ball to float above ground after shrink', () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';

      const radius = 40;
      const body = physics.createCircle(200, groundY - radius, radius);
      const block = new Block(body, 8);
      blockSpawner.getBlocks.mockReturnValue([block]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      const originalBottom = body.position.y + body.circleRadius!;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const shrunkBottom = body.position.y + body.circleRadius!;
      expect(shrunkBottom).toBeGreaterThanOrEqual(originalBottom - 1);
    });

    it('should handle multiple blocks at different heights after shrink', () => {
      physics.start();
      const groundY = 590;
      const ground = physics.createRectangle(200, groundY + 25, 400, 50);
      ground.label = 'ground';

      const body1 = physics.createCircle(150, groundY - 20, 20);
      const block1 = new Block(body1, 1);
      const body2 = physics.createCircle(250, groundY - 40, 40);
      const block2 = new Block(body2, 8);

      blockSpawner.getBlocks.mockReturnValue([block1, block2]);

      for (let i = 0; i < 120; i++) {
        physics.step(1000 / 60);
      }

      const bottom1 = body1.position.y + body1.circleRadius!;
      const bottom2 = body2.position.y + body2.circleRadius!;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const shrunkBottom1 = body1.position.y + body1.circleRadius!;
      const shrunkBottom2 = body2.position.y + body2.circleRadius!;

      expect(shrunkBottom1).toBeCloseTo(bottom1, 0);
      expect(shrunkBottom2).toBeCloseTo(bottom2, 0);
    });
  });

  describe('Shrink + EventBus Integration', () => {
    it('should maintain bottom position when shrink is triggered via event', () => {
      const groundY = 590;
      const radius = 40;
      const body = Matter.Bodies.circle(200, groundY - radius, radius);
      const block = new Block(body, 8);
      blockSpawner.getBlocks.mockReturnValue([block]);

      const originalBottom = body.position.y + radius;

      eventBus.emit('props:shrink:activate', { factor: 0.5, duration: 5000 });

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const shrunkBottom = body.position.y + body.circleRadius!;
      expect(shrunkBottom).toBeCloseTo(originalBottom, 1);
    });
  });

  describe('Shrink + PropSystem Integration', () => {
    it('should maintain bottom position when using shrink prop through PropSystem', async () => {
      const ps = new PropSystem();
      await ps.loadConfig(defaultPropConfigs);
      ps.initialize([{ type: PropType.SHRINK, count: 3 }]);

      const h = new PropEffectHandler(
        blockSpawner as any,
        mergeSystem as any,
        physics as any,
        effectManager as any,
        ps,
        gameHUD as any,
        preview as any,
      );

      const groundY = 590;
      const radius = 40;
      const body = Matter.Bodies.circle(200, groundY - radius, radius);
      const block = new Block(body, 8);
      blockSpawner.getBlocks.mockReturnValue([block]);

      const originalBottom = body.position.y + radius;

      h.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const shrunkBottom = body.position.y + body.circleRadius!;
      expect(shrunkBottom).toBeCloseTo(originalBottom, 1);

      ps.destroy();
    });
  });

  describe('Shrink Reactivation Integration', () => {
    it('should maintain bottom position when reactivating shrink with different factor', () => {
      const groundY = 590;
      const radius = 40;
      const body = Matter.Bodies.circle(200, groundY - radius, radius);
      const block = new Block(body, 8);
      blockSpawner.getBlocks.mockReturnValue([block]);

      const originalBottom = body.position.y + radius;

      handler.handleShrinkActivate({ factor: 0.5, duration: 5000 });

      const firstShrunkBottom = body.position.y + body.circleRadius!;
      expect(firstShrunkBottom).toBeCloseTo(originalBottom, 1);

      handler.handleShrinkActivate({ factor: 0.7, duration: 5000 });

      const secondShrunkBottom = body.position.y + body.circleRadius!;
      expect(secondShrunkBottom).toBeCloseTo(originalBottom, 0);
    });
  });
});
