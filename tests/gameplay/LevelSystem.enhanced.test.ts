import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { eventBus } from '../../src/utils/EventBus';

describe('LevelSystem Enhanced', () => {
  let levelSystem: LevelSystem;
  const createConfig = (overrides?: Partial<LevelConfig>): LevelConfig => ({
    id: 1,
    name: '测试关卡',
    objective: { type: 'score', target: 1000 },
    container: { width: 400, height: 600, shape: 'rectangle' as const },
    spawn: { availableNumbers: [1, 2, 4] },
    rewards: { stars: [500, 1000, 2000] },
    ...overrides,
  });

  afterEach(() => {
    eventBus.offAll('*');
  });

  describe('score objective', () => {
    it('应在达到目标分数时完成关卡', () => {
      levelSystem = new LevelSystem(createConfig({ objective: { type: 'score', target: 1000 } }));
      const spy = vi.spyOn(eventBus, 'emit');
      levelSystem.start();
      eventBus.emit('score:updated', { totalScore: 1000 });
      expect(spy).toHaveBeenCalledWith('level:completed', expect.any(Object));
    });

    it('应正确计算分数进度', () => {
      levelSystem = new LevelSystem(createConfig({ objective: { type: 'score', target: 1000 } }));
      eventBus.emit('score:updated', { totalScore: 500 });
      expect(levelSystem.getProgress()).toBe(0.5);
    });

    it('应超过100%时截断进度', () => {
      levelSystem = new LevelSystem(createConfig({ objective: { type: 'score', target: 1000 } }));
      eventBus.emit('score:updated', { totalScore: 2000 });
      expect(levelSystem.getProgress()).toBe(1);
    });
  });

  describe('target_merge objective', () => {
    it('应在达到目标合成值时完成关卡', () => {
      levelSystem = new LevelSystem(createConfig({ objective: { type: 'target_merge', target: 64 } }));
      const spy = vi.spyOn(eventBus, 'emit');
      levelSystem.start();
      eventBus.emit('block:merged', { newValue: 64 });
      expect(spy).toHaveBeenCalledWith('level:completed', expect.any(Object));
    });

    it('应正确计算合成进度', () => {
      levelSystem = new LevelSystem(createConfig({ objective: { type: 'target_merge', target: 64 } }));
      eventBus.emit('block:merged', { newValue: 32 });
      expect(levelSystem.getProgress()).toBe(0.5);
    });

    it('应记录最高合成值', () => {
      levelSystem = new LevelSystem(createConfig({ objective: { type: 'target_merge', target: 64 } }));
      eventBus.emit('block:merged', { newValue: 16 });
      eventBus.emit('block:merged', { newValue: 32 });
      eventBus.emit('block:merged', { newValue: 8 });
      expect(levelSystem.getProgress()).toBe(0.5);
    });
  });

  describe('clear_obstacle objective', () => {
    it('应在清除所有障碍物时完成关卡', () => {
      levelSystem = new LevelSystem(createConfig({
        objective: { type: 'clear_obstacle', target: 1 },
        obstacles: [{ x: 100, y: 100, value: 4 }],
      }));
      const spy = vi.spyOn(eventBus, 'emit');
      levelSystem.start();
      eventBus.emit('obstacle:cleared');
      expect(spy).toHaveBeenCalledWith('level:completed', expect.any(Object));
    });

    it('应正确计算障碍物清除进度', () => {
      levelSystem = new LevelSystem(createConfig({ objective: { type: 'clear_obstacle', target: 4 } }));
      eventBus.emit('obstacle:cleared');
      expect(levelSystem.getProgress()).toBe(0.25);
    });
  });

  describe('survival objective', () => {
    it('应在存活时间达到时完成关卡', () => {
      levelSystem = new LevelSystem(createConfig({
        objective: { type: 'survival', target: 60, timeLimit: 60 },
      }));
      const spy = vi.spyOn(eventBus, 'emit');
      levelSystem.start();
      levelSystem.update(60000);
      expect(spy).toHaveBeenCalledWith('level:completed', expect.any(Object));
    });

    it('应在限时结束时触发timeout', () => {
      levelSystem = new LevelSystem(createConfig({
        objective: { type: 'score', target: 1000, timeLimit: 60 },
      }));
      const spy = vi.spyOn(eventBus, 'emit');
      levelSystem.start();
      levelSystem.update(60000);
      expect(spy).toHaveBeenCalledWith('game:timeout');
    });

    it('应正确计算存活时间进度', () => {
      levelSystem = new LevelSystem(createConfig({
        objective: { type: 'survival', target: 60, timeLimit: 60 },
      }));
      levelSystem.start();
      levelSystem.update(30000);
      expect(levelSystem.getProgress()).toBe(0.5);
    });
  });

  describe('pause and resume', () => {
    it('暂停时应停止计时器', () => {
      levelSystem = new LevelSystem(createConfig({
        objective: { type: 'survival', target: 60, timeLimit: 60 },
      }));
      levelSystem.start();
      levelSystem.pause();
      levelSystem.update(30000);
      expect(levelSystem.getProgress()).toBe(0);
    });

    it('恢复时应继续计时', () => {
      levelSystem = new LevelSystem(createConfig({
        objective: { type: 'survival', target: 60, timeLimit: 60 },
      }));
      levelSystem.start();
      levelSystem.pause();
      levelSystem.update(30000);
      levelSystem.resume();
      levelSystem.update(30000);
      expect(levelSystem.getProgress()).toBe(0.5);
    });
  });

  describe('reset and destroy', () => {
    it('reset应重置所有状态', () => {
      levelSystem = new LevelSystem(createConfig({ objective: { type: 'score', target: 1000 } }));
      levelSystem.start();
      eventBus.emit('score:updated', { totalScore: 500 });
      levelSystem.reset();
      expect(levelSystem.getProgress()).toBe(0);
      expect(levelSystem.isLevelCompleted()).toBe(false);
    });

    it('destroy应清理事件监听', () => {
      const removeSpy = vi.spyOn(eventBus, 'off');
      levelSystem = new LevelSystem(createConfig());
      levelSystem.destroy();
      expect(removeSpy).toHaveBeenCalledTimes(3);
    });

    it('forceComplete应强制完成关卡', () => {
      levelSystem = new LevelSystem(createConfig());
      const spy = vi.spyOn(eventBus, 'emit');
      levelSystem.forceComplete();
      expect(levelSystem.isLevelCompleted()).toBe(true);
    });
  });

  describe('getters', () => {
    it('应正确返回配置属性', () => {
      levelSystem = new LevelSystem(createConfig());
      expect(levelSystem.containerWidth).toBe(400);
      expect(levelSystem.containerHeight).toBe(600);
      expect(levelSystem.availableNumbers).toEqual([1, 2, 4]);
      expect(levelSystem.spawnInterval).toBeUndefined();
    });

    it('getConfig应返回完整配置', () => {
      const config = createConfig();
      levelSystem = new LevelSystem(config);
      expect(levelSystem.getConfig()).toEqual(config);
    });
  });
});
