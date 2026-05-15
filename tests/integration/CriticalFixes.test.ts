import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { Block, getBlockConfig } from '../../src/gameplay/Block';
import { BlockSpawner } from '../../src/gameplay/BlockSpawner';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { Container } from 'pixi.js';
import Matter from 'matter-js';

describe('Critical Fixes Verification', () => {
  describe('#5 - BlockSpawner.spawnObstacles containerOffsetX', () => {
    let physics: PhysicsManager;
    let spawner: BlockSpawner;
    let mergeSystem: MergeSystem;
    let propSystem: PropSystem;
    let stage: Container;

    beforeEach(() => {
      physics = new PhysicsManager();
      mergeSystem = new MergeSystem(physics, { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any);
      propSystem = new PropSystem({ emit: vi.fn(), on: vi.fn(), off: vi.fn() } as any);
      stage = new Container();
      spawner = new BlockSpawner(physics, mergeSystem, propSystem, stage);
    });

    it('should apply containerOffsetX to obstacle x positions', () => {
      const obstacles = [
        { x: 100, y: 400, value: 1 },
        { x: 200, y: 350, value: 2 },
      ];
      const containerWidth = 400;
      const groundY = 550;
      const containerOffsetX = 200;

      spawner.spawnObstacles(obstacles, containerWidth, groundY, containerOffsetX);

      const obstacleBlocks = spawner.getObstacleBlocks();
      expect(obstacleBlocks.length).toBe(2);

      expect(obstacleBlocks[0].x).toBeCloseTo(100 + 200, 0);
      expect(obstacleBlocks[1].x).toBeCloseTo(200 + 200, 0);
    });

    it('should default containerOffsetX to 0 when not provided', () => {
      const obstacles = [
        { x: 150, y: 300, value: 4 },
      ];
      const containerWidth = 400;
      const groundY = 550;

      spawner.spawnObstacles(obstacles, containerWidth, groundY);

      const obstacleBlocks = spawner.getObstacleBlocks();
      expect(obstacleBlocks.length).toBe(1);
      expect(obstacleBlocks[0].x).toBeCloseTo(150, 0);
    });

    it('should use obs.y when provided, fallback to groundY - radius when not', () => {
      const config1 = getBlockConfig(1);
      const obstacles = [
        { x: 100, y: 400, value: 1 },
        { x: 200, value: 1 },
      ] as any[];
      const groundY = 550;
      const containerOffsetX = 100;

      spawner.spawnObstacles(obstacles, 400, groundY, containerOffsetX);

      const obstacleBlocks = spawner.getObstacleBlocks();
      expect(obstacleBlocks.length).toBe(2);
      expect(obstacleBlocks[0].y).toBeCloseTo(400, 0);
      expect(obstacleBlocks[1].y).toBeCloseTo(groundY - config1.radius, 0);
    });

    it('should place obstacles inside container walls when offset is applied', () => {
      const containerWidth = 400;
      const containerOffsetX = 200;
      const groundY = 550;

      const obstacles = [
        { x: 200, y: 400, value: 1 },
      ];

      spawner.spawnObstacles(obstacles, containerWidth, groundY, containerOffsetX);

      const obstacleBlocks = spawner.getObstacleBlocks();
      expect(obstacleBlocks[0].x).toBeCloseTo(400, 0);

      const leftWallX = containerOffsetX;
      const rightWallX = containerOffsetX + containerWidth;
      expect(obstacleBlocks[0].x).toBeGreaterThanOrEqual(leftWallX);
      expect(obstacleBlocks[0].x).toBeLessThanOrEqual(rightWallX);
    });
  });

  describe('#13 - PropEffectHandler circleRadius for circle bodies', () => {
    let physics: PhysicsManager;

    beforeEach(() => {
      physics = new PhysicsManager();
    });

    it('Matter.Body.scale should update circleRadius automatically in v0.20.0', () => {
      const body = physics.createCircle(200, 300, 20);
      const originalRadius = body.circleRadius;

      expect(originalRadius).toBe(20);

      Matter.Body.scale(body, 0.7, 0.7);

      expect(body.circleRadius).toBeCloseTo(14, 5);
    });

    it('should NOT double-scale circleRadius (regression check)', () => {
      const body = physics.createCircle(200, 300, 20);
      const originalRadius = body.circleRadius;

      Matter.Body.scale(body, 0.7, 0.7);

      expect(body.circleRadius).toBeCloseTo(originalRadius! * 0.7, 5);
      expect(body.circleRadius).not.toBeCloseTo(originalRadius! * 0.7 * 0.7, 2);
    });

    it('should restore original circleRadius after inverse scale', () => {
      const body = physics.createCircle(200, 300, 20);
      const originalRadius = body.circleRadius;

      const factor = 0.7;
      Matter.Body.scale(body, factor, factor);
      expect(body.circleRadius).toBeCloseTo(14, 5);

      const inverseFactor = 1 / factor;
      Matter.Body.scale(body, inverseFactor, inverseFactor);
      expect(body.circleRadius).toBeCloseTo(20, 5);
    });

    it('should restore via stored original value (PropEffectHandler pattern)', () => {
      const body = physics.createCircle(200, 300, 20);
      const storedCircleRadius = body.circleRadius;

      const factor = 0.7;
      Matter.Body.scale(body, factor, factor);
      expect(body.circleRadius).toBeCloseTo(14, 5);

      body.circleRadius = storedCircleRadius!;
      expect(body.circleRadius).toBe(20);
    });

    it('should handle multiple scale/restore cycles without drift', () => {
      const body = physics.createCircle(200, 300, 25);
      const originalRadius = body.circleRadius!;

      for (let i = 0; i < 5; i++) {
        const factor = 0.7;
        Matter.Body.scale(body, factor, factor);

        body.circleRadius = originalRadius;
        Matter.Body.scale(body, 1 / factor, 1 / factor);
        body.circleRadius = originalRadius;
      }

      expect(body.circleRadius).toBe(originalRadius);
    });
  });

  describe('#6 - SceneManager.failGame should not call forceComplete', () => {
    it('failGame should not mark level as completed', () => {
      const fs = require('fs');
      const path = require('path');
      const sceneManagerPath = path.resolve(__dirname, '../../src/core/SceneManager.ts');
      const content = fs.readFileSync(sceneManagerPath, 'utf-8');

      const failGameMatch = content.match(/failGame\(\)[\s\S]*?\n  \}/);
      expect(failGameMatch).toBeTruthy();

      const failGameBody = failGameMatch![0];
      expect(failGameBody).not.toContain('forceComplete');
    });
  });
});
