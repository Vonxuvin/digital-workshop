import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
});
