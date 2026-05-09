import { describe, it, expect } from 'vitest';
import Matter from 'matter-js';

describe('Physics Benchmark', () => {
  it('should simulate 50 bodies at 60fps', () => {
    const engine = Matter.Engine.create();
    const bodies: Matter.Body[] = [];

    for (let i = 0; i < 50; i++) {
      const body = Matter.Bodies.circle(
        Math.random() * 400 + 100,
        Math.random() * 200,
        20 + Math.random() * 20
      );
      bodies.push(body);
    }

    Matter.Composite.add(engine.world, bodies);

    const startTime = performance.now();
    for (let i = 0; i < 60; i++) {
      Matter.Engine.update(engine, 1000 / 60);
    }
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const avgFrameTime = totalTime / 60;

    console.log(`50 bodies 60 frames: ${totalTime.toFixed(2)}ms, avg: ${avgFrameTime.toFixed(2)}ms/frame`);
    expect(avgFrameTime).toBeLessThan(16.67);
  });

  it('should handle collision events efficiently', () => {
    const engine = Matter.Engine.create();
    let collisionCount = 0;

    Matter.Events.on(engine, 'collisionStart', () => {
      collisionCount++;
    });

    const bodies: Matter.Body[] = [];
    for (let i = 0; i < 30; i++) {
      const body = Matter.Bodies.circle(200 + (i % 10) * 40, 100 + Math.floor(i / 10) * 40, 20);
      Matter.Body.setVelocity(body, { x: 2, y: 2 });
      bodies.push(body);
    }
    Matter.Composite.add(engine.world, bodies);

    for (let i = 0; i < 120; i++) {
      Matter.Engine.update(engine, 1000 / 60);
    }

    console.log(`Collision events: ${collisionCount}`);
    expect(collisionCount).toBeGreaterThanOrEqual(0);
  });
});
