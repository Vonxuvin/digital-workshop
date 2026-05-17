import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Matter from 'matter-js';
import { ContainerRenderer } from '../../src/core/ContainerRenderer';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { BlockPreview } from '../../src/gameplay/BlockPreview';
import { ScoreSystem } from '../../src/gameplay/ScoreSystem';

function createMockApp() {
  const stage = {
    addChild: vi.fn(),
    removeChild: vi.fn(),
  };
  return {
    screen: { width: 400, height: 600 },
    stage,
  };
}

function createMockPreview() {
  return {
    setGroundY: vi.fn(),
    setBounds: vi.fn(),
    visible: false,
    show: vi.fn(),
    hide: vi.fn(),
    updatePosition: vi.fn(),
    setNextValue: vi.fn(),
  };
}

function createMockBlockSpawner() {
  return {
    setContainerBounds: vi.fn(),
  };
}

function createMockPropEffectHandler() {
  return {
    setWarningLine: vi.fn(),
    setScoreSystem: vi.fn(),
  };
}

describe('ContainerRenderer', () => {
  let app: ReturnType<typeof createMockApp>;
  let physics: PhysicsManager;
  let renderer: ContainerRenderer;
  let preview: ReturnType<typeof createMockPreview>;
  let blockSpawner: ReturnType<typeof createMockBlockSpawner>;
  let propEffectHandler: ReturnType<typeof createMockPropEffectHandler>;
  let scoreSystem: ScoreSystem;

  beforeEach(() => {
    app = createMockApp();
    physics = new PhysicsManager();
    renderer = new ContainerRenderer(app as any, physics);
    preview = createMockPreview();
    blockSpawner = createMockBlockSpawner();
    propEffectHandler = createMockPropEffectHandler();
    scoreSystem = new ScoreSystem();
  });

  afterEach(() => {
    renderer.destroy();
  });

  it('should setup without config', () => {
    renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    expect(renderer.getContainerWidth()).toBe(400);
    expect(renderer.getContainerHeight()).toBe(600);
    expect(renderer.getContainerOffsetX()).toBe(0);
    expect(renderer.getGroundY()).toBe(550);
  });

  it('should setup with config', () => {
    const config = {
      container: { width: 300, height: 500 },
    } as any;
    renderer.setup(config, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    expect(renderer.getContainerWidth()).toBe(300);
    expect(renderer.getContainerHeight()).toBe(500);
    expect(renderer.getContainerOffsetX()).toBe(50);
  });

  it('should create physics walls', () => {
    renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    const walls = renderer.getPhysicsWalls();
    expect(walls.length).toBe(3);
    expect(walls.find(w => w.label === 'ground')).toBeDefined();
    expect(walls.find(w => w.label === 'wall_left')).toBeDefined();
    expect(walls.find(w => w.label === 'wall_right')).toBeDefined();
  });

  it('should rebuild physics walls', () => {
    renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    renderer.rebuildPhysicsWalls();
    const walls = renderer.getPhysicsWalls();
    expect(walls.length).toBe(3);
  });

  it('should set preview bounds on setup', () => {
    renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    expect(preview.setGroundY).toHaveBeenCalledWith(550);
    expect(preview.setBounds).toHaveBeenCalledWith(0, 400);
  });

  it('should set block spawner bounds on setup', () => {
    renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    expect(blockSpawner.setContainerBounds).toHaveBeenCalledWith(400, 0);
  });

  it('should set warning line on propEffectHandler', () => {
    renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    expect(propEffectHandler.setWarningLine).toHaveBeenCalled();
    expect(propEffectHandler.setScoreSystem).toHaveBeenCalledWith(scoreSystem);
  });

  it('should return warning line', () => {
    renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    const warningLine = renderer.getWarningLine();
    expect(warningLine).toBeDefined();
  });

  it('should handle resize', () => {
    renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    const gameHUD = { layout: vi.fn() };
    renderer.handleResize(null, 500, 700, preview as any, blockSpawner as any, gameHUD);
    expect(renderer.getContainerWidth()).toBe(500);
    expect(renderer.getContainerHeight()).toBe(700);
    expect(gameHUD.layout).toHaveBeenCalledWith(500, 700);
  });

  it('should handle resize with config', () => {
    const config = {
      container: { width: 300, height: 500 },
    } as any;
    renderer.setup(config, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    const gameHUD = { layout: vi.fn() };
    renderer.handleResize(config, 500, 700, preview as any, blockSpawner as any, gameHUD);
    expect(renderer.getContainerWidth()).toBe(300);
  });

  it('should clamp bodies to container on resize', () => {
    renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    physics.createCircle(500, 200, 20);
    const gameHUD = { layout: vi.fn() };
    renderer.handleResize(null, 300, 600, preview as any, blockSpawner as any, gameHUD);
  });

  it('should destroy cleanly', () => {
    renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
    renderer.destroy();
    expect(renderer.getPhysicsWalls().length).toBe(0);
    expect(renderer.getWarningLine()).toBeNull();
  });

  describe('physics wall positions', () => {
    it('should position left wall at offsetX - 25 (half wall width into bounds)', () => {
      const config = { container: { width: 300, height: 500 } } as any;
      renderer.setup(config, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      const leftWall = renderer.getPhysicsWalls().find(w => w.label === 'wall_left');
      expect(leftWall).toBeDefined();
      expect(leftWall!.position.x).toBeCloseTo(50 - 25, 0);
    });

    it('should position right wall at offsetX + containerWidth + 25', () => {
      const config = { container: { width: 300, height: 500 } } as any;
      renderer.setup(config, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      const rightWall = renderer.getPhysicsWalls().find(w => w.label === 'wall_right');
      expect(rightWall).toBeDefined();
      expect(rightWall!.position.x).toBeCloseTo(50 + 300 + 25, 0);
    });

    it('should position ground wall at offsetX + w/2, groundY + 25', () => {
      renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      const ground = renderer.getPhysicsWalls().find(w => w.label === 'ground');
      expect(ground).toBeDefined();
      expect(ground!.position.x).toBeCloseTo(200, 0);
      expect(ground!.position.y).toBeCloseTo(550 + 25, 0);
    });

    it('should use screen dimensions as fallback when no config', () => {
      const physics = new PhysicsManager();
      const r = new ContainerRenderer(app as any, physics);
      r.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      const leftWall = r.getPhysicsWalls().find(w => w.label === 'wall_left');
      expect(leftWall!.position.x).toBeCloseTo(-25, 0);
      r.destroy();
    });

    it('should have wall width of 50 (dense enough for collision detection)', () => {
      renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      for (const wall of renderer.getPhysicsWalls()) {
        const verts = wall.vertices;
        const maxY = Math.max(...verts.map(v => v.y));
        const minY = Math.min(...verts.map(v => v.y));
        const maxX = Math.max(...verts.map(v => v.x));
        const minX = Math.min(...verts.map(v => v.x));
        expect(maxX - minX).toBeGreaterThanOrEqual(49);
        expect(maxY - minY).toBeGreaterThanOrEqual(49);
      }
    });
  });

  describe('clampBodiesToContainer', () => {
    it('should clamp a body beyond left bound back into container', () => {
      renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      const body = physics.createCircle(-10, 200, 20);
      const gameHUD = { layout: vi.fn() };
      renderer.handleResize(null, 400, 600, preview as any, blockSpawner as any, gameHUD);
      expect(body.position.x).toBeGreaterThanOrEqual(20);
    });

    it('should clamp a body beyond right bound back into container', () => {
      renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      const body = physics.createCircle(410, 200, 20);
      const gameHUD = { layout: vi.fn() };
      renderer.handleResize(null, 400, 600, preview as any, blockSpawner as any, gameHUD);
      expect(body.position.x).toBeLessThanOrEqual(380);
    });

    it('should clamp a body below ground back above', () => {
      renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      const body = physics.createCircle(200, 600, 20);
      const gameHUD = { layout: vi.fn() };
      renderer.handleResize(null, 400, 600, preview as any, blockSpawner as any, gameHUD);
      expect(body.position.y).toBeLessThanOrEqual(renderer.getGroundY() - 20);
    });

    it('should zero velocity after clamping', () => {
      renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      const body = physics.createCircle(500, 200, 20);
      Matter.Body.setVelocity(body, { x: 5, y: 5 });
      const gameHUD = { layout: vi.fn() };
      renderer.handleResize(null, 400, 600, preview as any, blockSpawner as any, gameHUD);
      expect(body.velocity.x).toBe(0);
      expect(body.velocity.y).toBe(0);
    });

    it('should not clamp a body inside container bounds', () => {
      renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      const body = physics.createCircle(200, 200, 20);
      const gameHUD = { layout: vi.fn() };
      renderer.handleResize(null, 400, 600, preview as any, blockSpawner as any, gameHUD);
      expect(body.position.x).toBe(200);
      expect(body.position.y).toBe(200);
    });

    it('should skip static bodies during clamping', () => {
      renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      const initialWallsCount = renderer.getPhysicsWalls().length;
      const gameHUD = { layout: vi.fn() };
      renderer.handleResize(null, 400, 600, preview as any, blockSpawner as any, gameHUD);
      expect(renderer.getPhysicsWalls().length).toBeGreaterThanOrEqual(initialWallsCount);
    });
  });

  describe('preview and spawner bounds after visual wall fix', () => {
    it('should set preview bounds to containerOffsetX and containerOffsetX + containerWidth', () => {
      const config = { container: { width: 300, height: 500 } } as any;
      renderer.setup(config, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      expect(preview.setBounds).toHaveBeenCalledWith(50, 350);
    });

    it('should set spawner bounds to containerWidth and containerOffsetX', () => {
      const config = { container: { width: 300, height: 500 } } as any;
      renderer.setup(config, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      expect(blockSpawner.setContainerBounds).toHaveBeenCalledWith(300, 50);
    });

    it('should set ground Y to containerHeight - 50', () => {
      expect(renderer.getGroundY()).toBe(0);
      renderer.setup(null, 400, 600, preview as any, blockSpawner as any, propEffectHandler as any, scoreSystem);
      expect(renderer.getGroundY()).toBe(550);
    });
  });
});
