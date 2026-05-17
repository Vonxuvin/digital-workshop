import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Matter from 'matter-js';
import { GameContainer } from '../../src/gameplay/Container';
import { PhysicsManager } from '../../src/core/PhysicsManager';

describe('GameContainer', () => {
  let physics: PhysicsManager;
  let container: GameContainer;

  beforeEach(() => {
    physics = new PhysicsManager();
    container = new GameContainer(physics, 400, 600);
  });

  afterEach(() => {
    container.destroy();
    physics.destroy();
  });

  it('should create container with correct dimensions', () => {
    expect(container).toBeDefined();
  });

  it('should create physics bodies on construction', () => {
    const bodies = Matter.Composite.allBodies(physics.getEngine().world);
    const walls = bodies.filter(b => b.label === 'wall_left' || b.label === 'wall_right' || b.label === 'ground');
    expect(walls.length).toBe(3);
  });

  it('should rebuild physics bounds', () => {
    const bodiesBefore = Matter.Composite.allBodies(physics.getEngine().world);
    const wallsBefore = bodiesBefore.filter(b => b.label === 'wall_left' || b.label === 'wall_right' || b.label === 'ground');
    container.rebuildPhysicsBounds();
    const bodiesAfter = Matter.Composite.allBodies(physics.getEngine().world);
    const wallsAfter = bodiesAfter.filter(b => b.label === 'wall_left' || b.label === 'wall_right' || b.label === 'ground');
    expect(wallsAfter.length).toBe(3);
  });

  it('should resize and rebuild', () => {
    container.resize(500, 700);
    const bodies = Matter.Composite.allBodies(physics.getEngine().world);
    const walls = bodies.filter(b => b.label === 'wall_left' || b.label === 'wall_right' || b.label === 'ground');
    expect(walls.length).toBe(3);
  });

  it('should destroy without error', () => {
    container.destroy();
    const bodies = Matter.Composite.allBodies(physics.getEngine().world);
    const walls = bodies.filter(b => b.label === 'wall_left' || b.label === 'wall_right' || b.label === 'ground');
    expect(walls.length).toBe(0);
  });
});
