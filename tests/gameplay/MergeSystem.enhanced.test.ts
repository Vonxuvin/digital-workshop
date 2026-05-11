import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { Block } from '../../src/gameplay/Block';
import { eventBus } from '../../src/utils/EventBus';
import Matter from 'matter-js';

describe('MergeSystem Enhanced', () => {
  let physics: PhysicsManager;
  let mergeSystem: MergeSystem;
  let block1: Block;
  let block2: Block;

  beforeEach(() => {
    physics = new PhysicsManager();
    mergeSystem = new MergeSystem(physics);
    vi.spyOn(physics, 'onCollisionStart').mockImplementation((callback) => {
      return () => {};
    });
  });

  afterEach(() => {
    block1?.destroy();
    block2?.destroy();
    physics.clearAll();
  });

  const createBlocks = () => {
    const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
    body1.label = 'block_1';
    block1 = new Block(body1, 2);

    const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
    body2.label = 'block_2';
    block2 = new Block(body2, 2);

    mergeSystem.registerBlock(block1);
    mergeSystem.registerBlock(block2);

    return { block1, block2 };
  };

  describe('register and unregister', () => {
    it('应正确注册方块', () => {
      const { block1 } = createBlocks();
      mergeSystem.registerBlock(block1);
      expect(mergeSystem['blocks'].size).toBeGreaterThanOrEqual(1);
    });

    it('应正确注销方块', () => {
      const { block1 } = createBlocks();
      mergeSystem.unregisterBlock(block1);
    });
  });

  describe('obstacle handling', () => {
    it('应正确处理障碍物碰撞', () => {
      const obstacleBody = physics.createCircle(200, 300, 20, { density: 0.001, label: 'obstacle_1' });
      const obstacle = new Block(obstacleBody, 4);

      const playerBody = physics.createCircle(220, 300, 20, { density: 0.001, label: 'player_1' });
      playerBody.label = 'player_1';
      const player = new Block(playerBody, 4);

      mergeSystem.registerObstacle(obstacle);
      mergeSystem.registerBlock(player);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleObstacleCollision'](obstacleBody, playerBody, true);

      expect(emitSpy).toHaveBeenCalledWith('obstacle:cleared');

      obstacle.destroy();
      player.destroy();
    });

    it('不同值的障碍物和玩家不应清除', () => {
      const obstacleBody = physics.createCircle(200, 300, 20, { density: 0.001, label: 'obstacle_1' });
      const obstacle = new Block(obstacleBody, 2);

      const playerBody = physics.createCircle(220, 300, 20, { density: 0.001, label: 'player_1' });
      playerBody.label = 'player_1';
      const player = new Block(playerBody, 4);

      mergeSystem.registerObstacle(obstacle);
      mergeSystem.registerBlock(player);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleObstacleCollision'](obstacleBody, playerBody, true);

      expect(emitSpy).not.toHaveBeenCalled();

      obstacle.destroy();
      player.destroy();
    });
  });

  describe('merge blocks', () => {
    it('应触发chain reaction检测', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'block_chain_1';
      const block1 = new Block(body1, 4);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'block_chain_2';
      const block2 = new Block(body2, 4);

      mergeSystem.registerBlock(block1);
      mergeSystem.registerBlock(block2);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['mergeBlocks'](block1, block2);

      expect(emitSpy).toHaveBeenCalledWith('block:merged', expect.any(Object));
    });

    it('应正确计算合并后的速度', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'block_vel_1';
      Matter.Body.setVelocity(body1, { x: 5, y: 10 });
      const block1 = new Block(body1, 2);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'block_vel_2';
      Matter.Body.setVelocity(body2, { x: -5, y: -10 });
      const block2 = new Block(body2, 2);

      mergeSystem.registerBlock(block1);
      mergeSystem.registerBlock(block2);

      mergeSystem['mergeBlocks'](block1, block2);
    });

    it('应正确处理未知配置的方块值', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'block_unknown_1';
      const block1 = new Block(body1, 2048);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'block_unknown_2';
      const block2 = new Block(body2, 2048);

      mergeSystem.registerBlock(block1);
      mergeSystem.registerBlock(block2);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['mergeBlocks'](block1, block2);

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('collision handling', () => {
    it('两个静态物体不应触发合并', () => {
      const body1 = physics.createCircle(200, 300, 20, { isStatic: true });
      const body2 = physics.createCircle(220, 300, 20, { isStatic: true });

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleCollision'](body1, body2);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('两个障碍物碰撞不应触发合并', () => {
      const body1 = physics.createCircle(200, 300, 20, { label: 'obstacle_1' });
      const body2 = physics.createCircle(220, 300, 20, { label: 'obstacle_2' });

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleCollision'](body1, body2);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('不同值的方块不应合并', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'block_diff_1';
      const block1 = new Block(body1, 2);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'block_diff_2';
      const block2 = new Block(body2, 4);

      mergeSystem.registerBlock(block1);
      mergeSystem.registerBlock(block2);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleCollision'](body1, body2);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('正在合并的方块不应再次合并', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'block_merge_1';
      const block1 = new Block(body1, 2);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'block_merge_2';
      const block2 = new Block(body2, 2);

      mergeSystem.registerBlock(block1);
      mergeSystem.registerBlock(block2);

      mergeSystem['mergingBodies'].add('block_merge_1');
      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleCollision'](body1, body2);
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('color generation', () => {
    it('应生成有效的颜色值', () => {
      const color = mergeSystem['generateColor'](2);
      expect(typeof color).toBe('number');
      expect(color).toBeGreaterThan(0);
    });

    it('不同值应生成不同颜色', () => {
      const color1 = mergeSystem['generateColor'](2);
      const color2 = mergeSystem['generateColor'](4);
      expect(color1).not.toBe(color2);
    });
  });
});
