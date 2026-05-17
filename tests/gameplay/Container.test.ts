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

  describe('physics wall positions', () => {
    it('should position left wall center at x = -25', () => {
      const bodies = Matter.Composite.allBodies(physics.getEngine().world);
      const leftWall = bodies.find(b => b.label === 'wall_left');
      expect(leftWall).toBeDefined();
      expect(leftWall!.position.x).toBeCloseTo(-25, 0);
    });

    it('should position right wall center at x = containerWidth + 25', () => {
      const bodies = Matter.Composite.allBodies(physics.getEngine().world);
      const rightWall = bodies.find(b => b.label === 'wall_right');
      expect(rightWall).toBeDefined();
      expect(rightWall!.position.x).toBeCloseTo(425, 0);
    });

    it('should position ground wall center at x = containerWidth / 2', () => {
      const bodies = Matter.Composite.allBodies(physics.getEngine().world);
      const ground = bodies.find(b => b.label === 'ground');
      expect(ground).toBeDefined();
      expect(ground!.position.x).toBeCloseTo(200, 0);
    });

    it('should have wall width of 50 pixels', () => {
      const bodies = Matter.Composite.allBodies(physics.getEngine().world);
      const walls = bodies.filter(b => b.label === 'wall_left' || b.label === 'wall_right');
      for (const wall of walls) {
        const verts = wall.vertices;
        const maxX = Math.max(...verts.map(v => v.x));
        const minX = Math.min(...verts.map(v => v.x));
        expect(maxX - minX).toBeGreaterThanOrEqual(49);
      }
    });

    it('should position ground wall y at containerHeight - 25', () => {
      const bodies = Matter.Composite.allBodies(physics.getEngine().world);
      const ground = bodies.find(b => b.label === 'ground');
      expect(ground).toBeDefined();
      expect(ground!.position.y).toBeCloseTo(600 - 50 + 25, 0);
    });

    it('should have ground wall height of 50 pixels', () => {
      const bodies = Matter.Composite.allBodies(physics.getEngine().world);
      const ground = bodies.find(b => b.label === 'ground');
      expect(ground).toBeDefined();
      const verts = ground!.vertices;
      const maxY = Math.max(...verts.map(v => v.y));
      const minY = Math.min(...verts.map(v => v.y));
      expect(maxY - minY).toBeGreaterThanOrEqual(49);
    });
  });

  describe('resize', () => {
    it('should update physics wall positions after resize', () => {
      container.resize(500, 700);
      const bodies = Matter.Composite.allBodies(physics.getEngine().world);
      const rightWall = bodies.find(b => b.label === 'wall_right');
      expect(rightWall).toBeDefined();
      expect(rightWall!.position.x).toBeCloseTo(500 + 25, 0);
    });

    it('should update ground position after resize', () => {
      container.resize(500, 700);
      const bodies = Matter.Composite.allBodies(physics.getEngine().world);
      const ground = bodies.find(b => b.label === 'ground');
      expect(ground).toBeDefined();
      expect(ground!.position.y).toBeCloseTo(700 - 50 + 25, 0);
    });
  });

  describe('destroy', () => {
    it('should clean up all world bodies', () => {
      container.destroy();
      const bodies = Matter.Composite.allBodies(physics.getEngine().world);
      const walls = bodies.filter(b => b.label === 'wall_left' || b.label === 'wall_right' || b.label === 'ground');
      expect(walls.length).toBe(0);
    });
  });
});
