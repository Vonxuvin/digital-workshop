import { describe, it, expect } from 'vitest';
import Matter from 'matter-js';
import { PhysicsManager } from '../src/core/PhysicsManager';
import { PerformanceMonitor } from '../src/utils/PerformanceMonitor';

describe('Stress Test', () => {
  it('should handle 100 bodies simulation', () => {
    const physics = new PhysicsManager();
    const monitor = new PerformanceMonitor();

    for (let i = 0; i < 100; i++) {
      physics.createCircle(
        200 + Math.random() * 400,
        Math.random() * 200,
        15 + Math.random() * 15
      );
    }

    monitor.start();

    for (let i = 0; i < 300; i++) {
      monitor.tick();
    }

    const stats = monitor.getStats();
    console.log('100 bodies stress test:', stats);
    expect(stats.fps).toBeGreaterThan(30);
  });

  it('should handle rapid spawn and merge', () => {
    const physics = new PhysicsManager();
    const bodies: Matter.Body[] = [];

    for (let i = 0; i < 50; i++) {
      const body = physics.createCircle(300 + (i % 10) * 30, 100 + Math.floor(i / 10) * 30, 20);
      bodies.push(body);
    }

    const startTime = performance.now();

    for (let i = 0; i < 180; i++) {
      if (i % 30 === 0 && bodies.length > 10) {
        const toRemove = bodies.splice(0, 5);
        toRemove.forEach(b => physics.removeBody(b));
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(`Rapid spawn/merge test: ${totalTime}ms`);
    expect(totalTime / 180).toBeLessThan(33);
  });
});
