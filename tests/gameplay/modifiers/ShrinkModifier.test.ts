import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShrinkModifier, ShrinkConfig } from '../../../src/gameplay/modifiers/ShrinkModifier';
import { PhysicsManager } from '../../../src/core/PhysicsManager';
import Matter from 'matter-js';
import { Container } from 'pixi.js';

describe('ShrinkModifier', () => {
  let physics: PhysicsManager;
  let engine: Matter.Engine;
  let stageContainer: Container;

  beforeEach(() => {
    engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 },
    });

    physics = {
      getEngine: vi.fn().mockReturnValue(engine),
    } as unknown as PhysicsManager;

    stageContainer = new Container();
  });

  afterEach(() => {
    stageContainer.destroy({ children: true });
    Matter.Engine.clear(engine);
  });

  const createConfig = (overrides?: Partial<ShrinkConfig>): ShrinkConfig => ({
    type: 'shrink',
    enabled: true,
    targetWidth: 200,
    shrinkSpeed: 50,
    minWidth: 150,
    duration: 10,
    startDelay: 3,
    ...overrides,
  });

  const createWalls = () => {
    const leftWall = Matter.Bodies.rectangle(0, 300, 10, 600, {
      isStatic: true,
      label: 'wall_left',
    });
    const rightWall = Matter.Bodies.rectangle(400, 300, 10, 600, {
      isStatic: true,
      label: 'wall_right',
    });
    Matter.Composite.add(engine.world, [leftWall, rightWall]);
    return { leftWall, rightWall };
  };

  it('should create without error', () => {
    const modifier = new ShrinkModifier(
      createConfig(), physics, 400, 600, 580, stageContainer, 0
    );
    expect(modifier).toBeDefined();
    expect(modifier.getType()).toBe('shrink');
    modifier.destroy();
  });

  it('should store containerOffsetX', () => {
    const modifier = new ShrinkModifier(
      createConfig(), physics, 400, 600, 580, stageContainer, 100
    );
    expect(modifier.getCurrentWidth()).toBe(400);
    modifier.destroy();
  });

  it('should use containerOffsetX in wall position calculation', () => {
    const offsetX = 100;
    const modifier = new ShrinkModifier(
      createConfig({ targetWidth: 300, startDelay: 0 }),
      physics, 400, 600, 580, stageContainer, offsetX
    );

    const { leftWall, rightWall } = createWalls();

    modifier.start();
    (modifier as any).onTick(16);

    const centerX = offsetX + 200;
    const halfWidth = 200;
    expect(leftWall.position.x).toBeCloseTo(centerX - halfWidth - 25, -1);
    expect(rightWall.position.x).toBeCloseTo(centerX + halfWidth + 25, -1);

    modifier.destroy();
  });

  it('should shrink walls toward center with offset via onTick', () => {
    const offsetX = 50;
    const modifier = new ShrinkModifier(
      createConfig({ targetWidth: 200, shrinkSpeed: 100, startDelay: 0 }),
      physics, 400, 600, 580, stageContainer, offsetX
    );

    const { leftWall, rightWall } = createWalls();

    modifier.start();

    const initialLeftX = leftWall.position.x;
    const initialRightX = rightWall.position.x;

    (modifier as any).onTick(1000);

    expect(leftWall.position.x).toBeGreaterThan(initialLeftX);
    expect(rightWall.position.x).toBeLessThan(initialRightX);

    modifier.destroy();
  });

  it('should not shrink below minWidth', () => {
    const modifier = new ShrinkModifier(
      createConfig({ targetWidth: 100, minWidth: 200, shrinkSpeed: 200, startDelay: 0 }),
      physics, 400, 600, 580, stageContainer, 0
    );

    createWalls();

    modifier.start();

    for (let i = 0; i < 20; i++) {
      (modifier as any).onTick(1000);
    }

    expect(modifier.getCurrentWidth()).toBeGreaterThanOrEqual(200);

    modifier.destroy();
  });

  it('should reset walls to original positions on deactivate', () => {
    const offsetX = 50;
    const modifier = new ShrinkModifier(
      createConfig({ targetWidth: 200, shrinkSpeed: 100, startDelay: 0 }),
      physics, 400, 600, 580, stageContainer, offsetX
    );

    const { leftWall, rightWall } = createWalls();

    modifier.start();
    (modifier as any).onTick(1000);
    modifier.deactivate();

    const centerX = offsetX + 200;
    const halfWidth = 200;
    expect(leftWall.position.x).toBeCloseTo(centerX - halfWidth - 25, -1);
    expect(rightWall.position.x).toBeCloseTo(centerX + halfWidth + 25, -1);

    modifier.destroy();
  });

  it('should show warning with correct offset positioning', () => {
    const offsetX = 100;
    const modifier = new ShrinkModifier(
      createConfig({ targetWidth: 200, startDelay: 1 }),
      physics, 400, 600, 580, stageContainer, offsetX
    );

    modifier.start();

    const warningContainer = (modifier as any).warningContainer;
    expect(warningContainer).toBeDefined();
    expect(stageContainer.children).toContain(warningContainer);

    modifier.destroy();
  });

  it('should return correct shrink progress', () => {
    const modifier = new ShrinkModifier(
      createConfig({ targetWidth: 200, shrinkSpeed: 100, startDelay: 0 }),
      physics, 400, 600, 580, stageContainer, 0
    );

    expect(modifier.getShrinkProgress()).toBe(0);

    createWalls();

    modifier.start();
    (modifier as any).onTick(1000);

    expect(modifier.getShrinkProgress()).toBeGreaterThan(0);
    expect(modifier.getShrinkProgress()).toBeLessThanOrEqual(1);

    modifier.destroy();
  });

  it('should clean up wall graphics on destroy', () => {
    const modifier = new ShrinkModifier(
      createConfig({ startDelay: 0 }), physics, 400, 600, 580, stageContainer, 0
    );

    createWalls();

    modifier.start();
    const initialChildCount = stageContainer.children.length;
    modifier.destroy();

    expect(stageContainer.children.length).toBeLessThan(initialChildCount);
  });

  it('should not be active before start', () => {
    const modifier = new ShrinkModifier(
      createConfig(), physics, 400, 600, 580, stageContainer, 0
    );
    expect(modifier.isActive()).toBe(false);
    modifier.destroy();
  });

  it('should be active after start with no delay', () => {
    const modifier = new ShrinkModifier(
      createConfig({ startDelay: 0 }), physics, 400, 600, 580, stageContainer, 0
    );

    createWalls();
    modifier.start();
    expect(modifier.isActive()).toBe(true);
    modifier.destroy();
  });
});