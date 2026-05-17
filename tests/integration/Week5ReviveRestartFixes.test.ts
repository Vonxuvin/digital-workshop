import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Matter from 'matter-js';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { PropEffectHandler } from '../../src/core/PropEffectHandler';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { PropType, PropConfig } from '../../src/gameplay/props/Prop';
import { eventBus } from '../../src/utils/EventBus';
import { TimeManager } from '../../src/utils/TimeManager';
import { AnimationManager } from '../../src/utils/AnimationManager';
import { WarningLine } from '../../src/ui/components/WarningLine';
import { Block } from '../../src/gameplay/Block';
import gsap from 'gsap';

const defaultPropConfigs: PropConfig[] = [
  { id: 'bomb', type: PropType.BOMB, name: '炸弹', description: '爆炸', icon: 'bomb', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'rainbow', type: PropType.RAINBOW, name: '彩虹', description: '彩虹', icon: 'rainbow', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'freeze', type: PropType.FREEZE, name: '冰冻', description: '冰冻', icon: 'freeze', maxCount: 3, cooldown: 1000, price: 100 },
  { id: 'shrink', type: PropType.SHRINK, name: '缩小', description: '缩小', icon: 'shrink', maxCount: 2, cooldown: 1000, price: 100 },
  { id: 'lucky', type: PropType.LUCKY, name: '幸运', description: '幸运', icon: 'lucky', maxCount: 2, cooldown: 1000, price: 100 },
];

describe('集成测试：复活流程 - 计时器恢复与惩罚', () => {
  const timedConfig: LevelConfig = {
    id: 10, name: '计时测试', objective: { type: 'survival', target: 30, timeLimit: 30 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2] },
    rewards: { stars: [15, 20, 30] },
  };

  it('完整复活流程：失败 → stopTimer → 复活 → resumeTimer + 惩罚 → 计时器恢复', () => {
    const ls = new LevelSystem(timedConfig);
    ls.start();

    ls.update(10000);
    expect(ls.getRemainingTime()).toBe(20);

    ls.stopTimer();
    ls.update(5000);
    expect(ls.getRemainingTime()).toBe(20);

    ls.resumeTimer();
    ls.applyTimerPenalty(10);
    expect(ls.getRemainingTime()).toBe(10);

    ls.update(3000);
    expect(ls.getRemainingTime()).toBe(7);
  });

  it('复活后计时器应继续触发timeUpdate事件', () => {
    const ls = new LevelSystem(timedConfig);
    ls.start();
    ls.update(1000);
    ls.stopTimer();

    const handler = vi.fn();
    eventBus.on('level:timeUpdate', handler);
    ls.resumeTimer();
    ls.applyTimerPenalty(5);
    ls.update(2000);
    ls.update(2000);

    expect(handler).toHaveBeenCalled();
    eventBus.off('level:timeUpdate', handler);
  });

  it('复活惩罚不应使剩余时间变为负数', () => {
    const ls = new LevelSystem(timedConfig);
    ls.start();
    ls.update(28000);
    ls.stopTimer();

    ls.resumeTimer();
    ls.applyTimerPenalty(10);

    expect(ls.getRemainingTime()).toBeGreaterThanOrEqual(0);
  });
});

describe('集成测试：重新开始流程 - 动画时间线重置', () => {
  let timeManager: TimeManager;

  beforeEach(() => {
    AnimationManager.resetInstance();
    TimeManager.resetInstance();
    timeManager = new TimeManager();
    TimeManager.setInstance(timeManager);
  });

  afterEach(() => {
    TimeManager.resetInstance();
    AnimationManager.resetInstance();
  });

  it('重新开始后GSAP时间线应被重置', () => {
    const oldTimeline = timeManager.getGameTimeline();
    timeManager.resetGameTimeline();
    const newTimeline = timeManager.getGameTimeline();

    expect(newTimeline).toBeDefined();
    expect(newTimeline).not.toBe(oldTimeline);
  });

  it('重新开始后新时间线应可正常添加动画', () => {
    timeManager.resetGameTimeline();
    const timeline = timeManager.getGameTimeline();

    const testObj = { x: 0 };
    const tween = gsap.to(testObj, { x: 100, duration: 0.5 });

    expect(() => timeline.add(tween)).not.toThrow();
  });

  it('重新开始后暂停状态应被清除', () => {
    timeManager.pause();
    expect(timeManager.isCurrentlyPaused()).toBe(true);

    timeManager.resetGameTimeline();
    expect(timeManager.isCurrentlyPaused()).toBe(false);
  });
});

describe('集成测试：WarningLine 重置与可见性', () => {
  let wl: WarningLine;

  beforeEach(() => {
    wl = new WarningLine(600);
    wl.y = 600 * 0.2;
  });

  afterEach(() => {
    wl.destroy();
  });

  it('警告触发后reset应清除所有警告状态', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(wl.getWarningDuration()).toBeGreaterThan(0);

    wl.reset();

    expect(wl.getWarningDuration()).toBe(0);
    expect(wl.getWarningProgress()).toBe(0);
  });

  it('reset后disabled状态仍需单独管理', () => {
    wl.setDisabled(true);
    wl.reset();

    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(wl.getWarningDuration()).toBe(0);

    wl.setDisabled(false);
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(wl.getWarningDuration()).toBeGreaterThan(0);
  });

  it('visible属性可独立控制WarningLine显示', () => {
    expect(wl.visible).toBe(true);

    wl.visible = false;
    expect(wl.visible).toBe(false);

    wl.visible = true;
    expect(wl.visible).toBe(true);
  });

  it('游戏结束时game:over事件会使警告线停止更新', () => {
    const handler = vi.fn();
    eventBus.on('game:over', handler);

    for (let i = 0; i < 320; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }

    expect(handler).toHaveBeenCalled();
    const durationAfterGameOver = wl.getWarningDuration();
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    expect(wl.getWarningDuration()).toBe(durationAfterGameOver);
    eventBus.off('game:over', handler);
  });
});

describe('集成测试：PropEffectHandler.handleRevive 调用链验证', () => {
  let handler: PropEffectHandler;
  let mockBlockSpawner: any;
  let mockMergeSystem: any;
  let mockPhysics: any;
  let mockEffectManager: any;
  let propSystem: PropSystem;
  let mockGameHUD: any;
  let mockPreview: any;
  let mockLevelSystem: any;

  beforeEach(async () => {
    mockBlockSpawner = {
      getBlocks: vi.fn(() => []),
      removeBlock: vi.fn(),
    };

    mockMergeSystem = {
      unregisterBlock: vi.fn(),
    };

    mockPhysics = {
      createCircle: vi.fn(() => Matter.Bodies.circle(100, 200, 20)),
      removeBody: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    mockEffectManager = {
      addExplosionEffect: vi.fn(),
      addFreezeEffect: vi.fn(),
      removeFreezeEffect: vi.fn(),
    };

    propSystem = new PropSystem();
    await propSystem.loadConfig(defaultPropConfigs);
    propSystem.initialize([
      { type: PropType.BOMB, count: 3 },
      { type: PropType.RAINBOW, count: 3 },
      { type: PropType.FREEZE, count: 3 },
      { type: PropType.SHRINK, count: 2 },
      { type: PropType.LUCKY, count: 2 },
    ]);

    mockGameHUD = {
      setObjectiveProgress: vi.fn(),
    };

    mockPreview = {
      hide: vi.fn(),
    };

    mockLevelSystem = {
      resume: vi.fn(),
      resumeTimer: vi.fn(),
      applyTimerPenalty: vi.fn(),
    };

    handler = new PropEffectHandler(
      mockBlockSpawner,
      mockMergeSystem,
      mockPhysics,
      mockEffectManager,
      propSystem,
      mockGameHUD,
      mockPreview,
    );

    handler.setLevelSystem(mockLevelSystem);
  });

  it('handleRevive应调用resumeTimer而非resume', () => {
    const mockModifierManager = { resumeAll: vi.fn() };
    handler.handleRevive(600, mockModifierManager);

    expect(mockLevelSystem.resumeTimer).toHaveBeenCalled();
    expect(mockLevelSystem.resume).not.toHaveBeenCalled();
  });

  it('handleRevive应调用applyTimerPenalty(10)', () => {
    const mockModifierManager = { resumeAll: vi.fn() };
    handler.handleRevive(600, mockModifierManager);

    expect(mockLevelSystem.applyTimerPenalty).toHaveBeenCalledWith(10);
  });

  it('handleRevive应调用warningLine.reset和warningLine.setDisabled(false)', () => {
    const mockModifierManager = { resumeAll: vi.fn() };
    const mockWarningLine = {
      y: 120,
      reset: vi.fn(),
      setDisabled: vi.fn(),
    };
    handler.setWarningLine(mockWarningLine as any);

    handler.handleRevive(600, mockModifierManager);

    expect(mockWarningLine.reset).toHaveBeenCalled();
    expect(mockWarningLine.setDisabled).toHaveBeenCalledWith(false);
  });
});

describe('集成测试：完整失败→重新开始流程', () => {
  const timedConfig: LevelConfig = {
    id: 10, name: '计时测试', objective: { type: 'survival', target: 30, timeLimit: 30 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2] },
    rewards: { stars: [15, 20, 30] },
  };

  it('重新开始后LevelSystem应完全重置', () => {
    const ls = new LevelSystem(timedConfig);
    ls.start();
    ls.update(10000);
    expect(ls.getRemainingTime()).toBe(20);

    ls.stopTimer();
    ls.reset();

    expect(ls.isLevelCompleted()).toBe(false);
    expect(ls.getProgress()).toBe(0);
    expect(ls.getRemainingTime()).toBe(30);
  });

  it('重新开始后计时器应从头开始', () => {
    const ls = new LevelSystem(timedConfig);
    ls.start();
    ls.update(15000);
    expect(ls.getRemainingTime()).toBe(15);

    ls.reset();
    ls.start();
    expect(ls.getRemainingTime()).toBe(30);
    ls.update(5000);
    expect(ls.getRemainingTime()).toBe(25);
  });

  it('重新开始后警告线应能重新触发', () => {
    const wl = new WarningLine(600);
    wl.y = 600 * 0.2;

    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(wl.getWarningDuration()).toBeGreaterThan(0);

    wl.reset();
    wl.setDisabled(false);

    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(wl.getWarningDuration()).toBeGreaterThan(0);

    wl.destroy();
  });

  it('游戏失败→复活→重新开始完整流程中WarningLine应正确恢复', () => {
    const wl = new WarningLine(600);
    wl.y = 600 * 0.2;

    for (let i = 0; i < 320; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }
    const durationAfterGameOver = wl.getWarningDuration();
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    expect(wl.getWarningDuration()).toBe(durationAfterGameOver);

    wl.reset();
    wl.setDisabled(false);
    expect(wl.getWarningDuration()).toBe(0);
    expect(wl.getWarningProgress()).toBe(0);

    const handler = vi.fn();
    eventBus.on('warning:started', handler);
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 250);
    expect(handler).toHaveBeenCalled();
    expect(wl.getWarningDuration()).toBeGreaterThan(0);
    eventBus.off('warning:started', handler);

    wl.destroy();
  });
});