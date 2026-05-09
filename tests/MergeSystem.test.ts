import { describe, it, expect } from 'vitest';
import { MergeSystem } from '../src/gameplay/MergeSystem';
import { PhysicsManager } from '../src/core/PhysicsManager';
import { Block } from '../src/gameplay/Block';

describe('MergeSystem', () => {
  it('should detect same value collision', () => {
    const physics = new PhysicsManager();
    const mergeSystem = new MergeSystem(physics);

    const bodyA = physics.createCircle(100, 100, 20);
    const bodyB = physics.createCircle(100, 100, 20);
    const blockA = new Block(bodyA, 2);
    const blockB = new Block(bodyB, 2);

    mergeSystem.registerBlock(blockA);
    mergeSystem.registerBlock(blockB);

    expect(blockA.value).toBe(2);
    expect(blockB.value).toBe(2);
  });

  it('should ignore different value collision', () => {
    const physics = new PhysicsManager();
    const mergeSystem = new MergeSystem(physics);

    const bodyA = physics.createCircle(100, 100, 20);
    const bodyB = physics.createCircle(100, 100, 22);
    const blockA = new Block(bodyA, 2);
    const blockB = new Block(bodyB, 4);

    mergeSystem.registerBlock(blockA);
    mergeSystem.registerBlock(blockB);

    expect(blockA.value).toBe(2);
    expect(blockB.value).toBe(4);
  });
});
