import { describe, it, expect, beforeEach } from 'vitest';
import Matter from 'matter-js';
import { PhysicsEntity } from '../../src/gameplay/PhysicsEntity';

describe('PhysicsEntity', () => {
  let body: Matter.Body;

  beforeEach(() => {
    body = Matter.Bodies.circle(100, 200, 20);
  });

  it('should create entity with body position', () => {
    const entity = new PhysicsEntity(body, 0xff0000, 20);
    expect(entity.x).toBe(100);
    expect(entity.y).toBe(200);
  });

  it('should sync from body after position change', () => {
    const entity = new PhysicsEntity(body, 0xff0000, 20);
    Matter.Body.setPosition(body, { x: 300, y: 400 });
    entity.syncFromBody();
    expect(entity.x).toBe(300);
    expect(entity.y).toBe(400);
  });

  it('should sync rotation from body', () => {
    const entity = new PhysicsEntity(body, 0xff0000, 20);
    Matter.Body.setAngle(body, Math.PI / 4);
    entity.syncFromBody();
    expect(entity.rotation).toBeCloseTo(Math.PI / 4, 4);
  });

  it('should not sync when sync disabled', () => {
    const entity = new PhysicsEntity(body, 0xff0000, 20);
    entity.setSyncEnabled(false);
    Matter.Body.setPosition(body, { x: 500, y: 600 });
    entity.syncFromBody();
    expect(entity.x).toBe(100);
    expect(entity.y).toBe(200);
  });

  it('should re-enable sync', () => {
    const entity = new PhysicsEntity(body, 0xff0000, 20);
    entity.setSyncEnabled(false);
    Matter.Body.setPosition(body, { x: 500, y: 600 });
    entity.setSyncEnabled(true);
    entity.syncFromBody();
    expect(entity.x).toBe(500);
    expect(entity.y).toBe(600);
  });

  it('should destroy without error', () => {
    const entity = new PhysicsEntity(body, 0x00ff00, 15);
    entity.destroy();
  });
});
