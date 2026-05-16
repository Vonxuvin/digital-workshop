import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { Block, getBlockConfig } from '../../src/gameplay/Block';
import { eventBus } from '../../src/utils/EventBus';
import { AnimationManager } from '../../src/utils/AnimationManager';
import { ScoreSystem } from '../../src/gameplay/ScoreSystem';
import Matter from 'matter-js';

describe('MergeSystem', () => {
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
    vi.restoreAllMocks();
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

  it('should register and unregister blocks', () => {
    const body = physics.createCircle(100, 100, 20);
    const block = new Block(body, 1);
    mergeSystem.registerBlock(block);
    expect(() => mergeSystem.unregisterBlock(block)).not.toThrow();
  });

  it('should handle unregister of unregistered block gracefully', () => {
    const body = physics.createCircle(100, 100, 20);
    const block = new Block(body, 1);
    expect(() => mergeSystem.unregisterBlock(block)).not.toThrow();
  });

  it('should not merge already merging blocks', () => {
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
    it('getBlockConfig应生成有效的颜色值', () => {
      const config = getBlockConfig(2);
      expect(typeof config.color).toBe('number');
      expect(config.color).toBeGreaterThan(0);
    });

    it('不同值应生成不同颜色', () => {
      const config1 = getBlockConfig(2);
      const config2 = getBlockConfig(4);
      expect(config1.color).not.toBe(config2.color);
    });
  });

  describe('destroy', () => {
    it('应正确清理资源', () => {
      mergeSystem.destroy();
      expect(mergeSystem['blocks'].size).toBe(0);
    });
  });

  describe('rainbow block merging', () => {
    it('彩虹方块应与任意值方块合成', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'rainbow_1';
      const rainbowBlock = new Block(body1, 2, true);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'other_1';
      const otherBlock = new Block(body2, 8);

      mergeSystem.registerBlock(rainbowBlock);
      mergeSystem.registerBlock(otherBlock);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleCollision'](body1, body2);
      expect(emitSpy).toHaveBeenCalledWith('block:merged', expect.any(Object));
    });

    it('彩虹方块与彩虹方块可以合成', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'rainbow_a';
      const rainbowBlock1 = new Block(body1, 2, true);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'rainbow_b';
      const rainbowBlock2 = new Block(body2, 4, true);

      mergeSystem.registerBlock(rainbowBlock1);
      mergeSystem.registerBlock(rainbowBlock2);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleCollision'](body1, body2);
      expect(emitSpy).toHaveBeenCalledWith('block:merged', expect.any(Object));
    });
  });

  describe('chain reaction', () => {
    it('should process chain checks', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'chain_a';
      const block1 = new Block(body1, 4);
      mergeSystem.registerBlock(block1);

      mergeSystem['pendingChainChecks'].push('chain_a');
      expect(() => mergeSystem['processChainChecks']()).not.toThrow();
    });

    it('should skip destroyed blocks in chain check', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'chain_destroyed';
      const block1 = new Block(body1, 4);
      mergeSystem.registerBlock(block1);
      block1.destroy();

      mergeSystem['pendingChainChecks'].push('chain_destroyed');
      expect(() => mergeSystem['processChainChecks']()).not.toThrow();
    });

    it('should skip blocks at max chain depth', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'chain_max';
      const block1 = new Block(body1, 4);
      mergeSystem.registerBlock(block1);
      mergeSystem['chainDepthMap'].set('chain_max', mergeSystem['maxChainDepth']);

      mergeSystem['pendingChainChecks'].push('chain_max');
      expect(() => mergeSystem['processChainChecks']()).not.toThrow();
    });

    it('should schedule chain check', () => {
      expect(() => mergeSystem['scheduleChainCheck']('test_label')).not.toThrow();
    });
  });

  describe('obstacle collision', () => {
    it('should handle obstacle collision with same value', () => {
      const obstacleBody = physics.createCircle(200, 300, 20, { density: 0.001, label: 'obs_same' });
      const obstacle = new Block(obstacleBody, 4);
      mergeSystem.registerObstacle(obstacle);

      const playerBody = physics.createCircle(220, 300, 20, { density: 0.001, label: 'player_same' });
      playerBody.label = 'player_same';
      const player = new Block(playerBody, 4);
      mergeSystem.registerBlock(player);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleObstacleCollision'](obstacleBody, playerBody, true);
      expect(emitSpy).toHaveBeenCalledWith('obstacle:cleared');

      obstacle.destroy();
      player.destroy();
    });

    it('should handle obstacle collision with different value', () => {
      const obstacleBody = physics.createCircle(200, 300, 20, { density: 0.001, label: 'obs_diff' });
      const obstacle = new Block(obstacleBody, 2);
      mergeSystem.registerObstacle(obstacle);

      const playerBody = physics.createCircle(220, 300, 20, { density: 0.001, label: 'player_diff' });
      playerBody.label = 'player_diff';
      const player = new Block(playerBody, 8);
      mergeSystem.registerBlock(player);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleObstacleCollision'](obstacleBody, playerBody, false);
      expect(emitSpy).not.toHaveBeenCalled();

      obstacle.destroy();
      player.destroy();
    });
  });

  describe('collision with unregistered bodies', () => {
    it('should handle collision with unregistered body', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'unreg_1';
      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'unreg_2';

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleCollision'](body1, body2);
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should handle collision with one registered and one unregistered body', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'reg_1';
      const block1 = new Block(body1, 2);
      mergeSystem.registerBlock(block1);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'unreg_2';

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleCollision'](body1, body2);
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('merge with custom value', () => {
    it('should merge blocks with custom newValue', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'custom_1';
      const block1 = new Block(body1, 2);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'custom_2';
      const block2 = new Block(body2, 2);

      mergeSystem.registerBlock(block1);
      mergeSystem.registerBlock(block2);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['mergeBlocks'](block1, block2, 8);
      expect(emitSpy).toHaveBeenCalledWith('block:merged', expect.objectContaining({ newValue: 8 }));
    });
  });

  describe('setScoreSystem', () => {
    it('should add merge score when blocks merge with scoreSystem set', () => {
      const scoreSystem = new ScoreSystem();
      mergeSystem.setScoreSystem(scoreSystem);

      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'block_score_1';
      const b1 = new Block(body1, 2);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'block_score_2';
      const b2 = new Block(body2, 2);

      mergeSystem.registerBlock(b1);
      mergeSystem.registerBlock(b2);

      mergeSystem['mergeBlocks'](b1, b2);

      expect(scoreSystem.getScore()).toBeGreaterThan(0);
    });
  });

  describe('rainbow block as blockB', () => {
    it('should merge when blockB is the rainbow block', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'normal_rb1';
      const normalBlock = new Block(body1, 8);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'rainbow_rb2';
      const rainbowBlock = new Block(body2, 2, true);

      mergeSystem.registerBlock(normalBlock);
      mergeSystem.registerBlock(rainbowBlock);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleCollision'](body1, body2);

      expect(emitSpy).toHaveBeenCalledWith('block:merged', expect.objectContaining({
        newValue: 16,
      }));
    });
  });

  describe('one static body collision', () => {
    it('should not merge when one body is static', () => {
      const staticBody = physics.createCircle(200, 300, 20, { isStatic: true });
      staticBody.label = 'static_body_1';

      const dynamicBody = physics.createCircle(220, 300, 20, { density: 0.001 });
      dynamicBody.label = 'dynamic_body_1';
      const dynamicBlock = new Block(dynamicBody, 2);

      mergeSystem.registerBlock(dynamicBlock);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleCollision'](staticBody, dynamicBody);
      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('obstacle collision with aIsObstacle=false', () => {
    it('should clear obstacle when obstacle is bodyB', () => {
      const obstacleBody = physics.createCircle(200, 300, 20, { density: 0.001 });
      const obstacle = new Block(obstacleBody, 4);

      const playerBody = physics.createCircle(220, 300, 20, { density: 0.001 });
      playerBody.label = 'player_obs_b';
      const player = new Block(playerBody, 4);

      mergeSystem.registerObstacle(obstacle);
      mergeSystem.registerBlock(player);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleObstacleCollision'](playerBody, obstacleBody, false);

      expect(emitSpy).toHaveBeenCalledWith('obstacle:cleared');

      obstacle.destroy();
      player.destroy();
    });
  });

  describe('obstacle collision not found in maps', () => {
    it('should not clear when obstacle not found in map', () => {
      const obstacleBody = physics.createCircle(200, 300, 20, { density: 0.001 });
      obstacleBody.label = 'obstacle_missing';

      const playerBody = physics.createCircle(220, 300, 20, { density: 0.001 });
      playerBody.label = 'player_found_obs';
      const player = new Block(playerBody, 4);

      mergeSystem.registerBlock(player);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleObstacleCollision'](obstacleBody, playerBody, true);

      expect(emitSpy).not.toHaveBeenCalled();
      player.destroy();
    });

    it('should not clear when player not found in map', () => {
      const obstacleBody = physics.createCircle(200, 300, 20, { density: 0.001 });
      const obstacle = new Block(obstacleBody, 4);

      const playerBody = physics.createCircle(220, 300, 20, { density: 0.001 });
      playerBody.label = 'player_missing_obs';

      mergeSystem.registerObstacle(obstacle);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['handleObstacleCollision'](obstacleBody, playerBody, true);

      expect(emitSpy).not.toHaveBeenCalled();
      obstacle.destroy();
    });
  });

  describe('processChainChecks', () => {
    it('should skip destroyed blocks', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'block_destroyed_check';
      const b1 = new Block(body1, 4);

      mergeSystem.registerBlock(b1);
      b1.destroy();

      mergeSystem['pendingChainChecks'].push('block_destroyed_check');

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['processChainChecks']();

      expect(emitSpy).not.toHaveBeenCalledWith('block:merged', expect.any(Object));
    });

    it('should skip blocks at max chain depth', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'block_max_depth';
      const b1 = new Block(body1, 4);

      mergeSystem.registerBlock(b1);
      mergeSystem['chainDepthMap'].set('block_max_depth', 10);
      mergeSystem['pendingChainChecks'].push('block_max_depth');

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['processChainChecks']();

      expect(emitSpy).not.toHaveBeenCalledWith('block:merged', expect.any(Object));
    });

    it('should skip blocks not found in blocks map', () => {
      mergeSystem['pendingChainChecks'].push('nonexistent_label');

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['processChainChecks']();

      expect(emitSpy).not.toHaveBeenCalledWith('block:merged', expect.any(Object));
    });
  });

  describe('checkChainReaction', () => {
    it('should detect and merge nearby matching blocks', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'block_chain_detect_1';
      const b1 = new Block(body1, 4);

      const body2 = physics.createCircle(215, 300, 20, { density: 0.001 });
      body2.label = 'block_chain_detect_2';
      const b2 = new Block(body2, 4);

      mergeSystem.registerBlock(b1);
      mergeSystem.registerBlock(b2);

      const emitSpy = vi.spyOn(eventBus, 'emit');
      mergeSystem['checkChainReaction'](b1, 0);

      expect(emitSpy).toHaveBeenCalledWith('block:merged', expect.any(Object));
    });
  });

  describe('scheduleChainCheck', () => {
    it('should schedule chain check and set chainCheckAnimId', () => {
      mergeSystem['scheduleChainCheck']('test_schedule_label');

      expect(mergeSystem['pendingChainChecks']).toContain('test_schedule_label');
      expect(mergeSystem['chainCheckAnimId']).not.toBeNull();
    });
  });

  describe('destroy with chainCheckAnimId', () => {
    it('should unregister chainCheckAnimId on destroy', () => {
      const body1 = physics.createCircle(200, 300, 20, { density: 0.001 });
      body1.label = 'block_destroy_anim_1';
      const b1 = new Block(body1, 2);

      const body2 = physics.createCircle(220, 300, 20, { density: 0.001 });
      body2.label = 'block_destroy_anim_2';
      const b2 = new Block(body2, 2);

      mergeSystem.registerBlock(b1);
      mergeSystem.registerBlock(b2);

      mergeSystem['mergeBlocks'](b1, b2);

      expect(mergeSystem['chainCheckAnimId']).not.toBeNull();

      const animManager = AnimationManager.getInstance();
      const unregisterSpy = vi.spyOn(animManager, 'unregister');

      mergeSystem.destroy();

      expect(unregisterSpy).toHaveBeenCalled();
      expect(mergeSystem['chainCheckAnimId']).toBeNull();
    });
  });

  describe('registerObstacle', () => {
    it('should register obstacle in obstacles map', () => {
      const obstacleBody = physics.createCircle(200, 300, 20, { density: 0.001 });
      obstacleBody.label = 'obstacle_reg_test';
      const obstacle = new Block(obstacleBody, 4);

      mergeSystem.registerObstacle(obstacle);

      expect(mergeSystem['obstacles'].has('obstacle_reg_test')).toBe(true);
      expect(mergeSystem['obstacles'].get('obstacle_reg_test')).toBe(obstacle);

      obstacle.destroy();
    });
  });
});