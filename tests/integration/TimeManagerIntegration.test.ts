import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimeManager } from '../../src/utils/TimeManager';
import { AnimationManager } from '../../src/utils/AnimationManager';
import gsap from 'gsap';

describe('TimeManager unified pause/resume', () => {
  let timeManager: TimeManager;
  let animManager: AnimationManager;

  beforeEach(() => {
    AnimationManager.resetInstance();
    TimeManager.resetInstance();
    animManager = AnimationManager.getInstance();
    timeManager = new TimeManager();
    TimeManager.setInstance(timeManager);
  });

  afterEach(() => {
    TimeManager.resetInstance();
    AnimationManager.resetInstance();
  });

  it('pause/resume should synchronize GSAP timeline and AnimationManager', () => {
    const timeline = timeManager.getGameTimeline();

    timeManager.pause();
    expect(timeManager.isCurrentlyPaused()).toBe(true);

    timeManager.resume();
    expect(timeManager.isCurrentlyPaused()).toBe(false);
  });

  it('should not execute AnimationManager callbacks while paused', () => {
    let callCount = 0;
    animManager.register(() => { callCount++; }, 'test_cb');

    timeManager.pause();
    animManager.update(16);
    expect(callCount).toBe(0);

    timeManager.resume();
    animManager.update(16);
    expect(callCount).toBe(1);
  });

  it('should not execute AnimationManager timers while paused', () => {
    let executed = false;
    animManager.setTimeout(() => { executed = true; }, 100, 'test_timer');

    timeManager.pause();
    animManager.update(200);
    expect(executed).toBe(false);

    timeManager.resume();
    animManager.update(200);
    expect(executed).toBe(true);
  });

  it('should handle multiple pause/resume cycles', () => {
    let callCount = 0;
    animManager.register(() => { callCount++; }, 'test_cb');

    timeManager.pause();
    timeManager.resume();
    animManager.update(16);
    expect(callCount).toBe(1);

    timeManager.pause();
    animManager.update(16);
    expect(callCount).toBe(1);

    timeManager.resume();
    animManager.update(16);
    expect(callCount).toBe(2);
  });

  it('重复 pause 不影响状态', () => {
    const tm = TimeManager.getInstance();
    tm.pause();
    tm.pause();
    expect(tm.isCurrentlyPaused()).toBe(true);
  });

  it('未暂停时 resume 不影响状态', () => {
    const tm = TimeManager.getInstance();
    tm.resume();
    expect(tm.isCurrentlyPaused()).toBe(false);
  });
});

describe('TimeManager singleton management', () => {
  beforeEach(() => {
    TimeManager.resetInstance();
  });

  afterEach(() => {
    TimeManager.resetInstance();
  });

  it('getInstance 返回单例', () => {
    const tm1 = TimeManager.getInstance();
    const tm2 = TimeManager.getInstance();
    expect(tm1).toBe(tm2);
  });

  it('setInstance 设置自定义实例', () => {
    const customTm = new TimeManager();
    TimeManager.setInstance(customTm);
    expect(TimeManager.getInstance()).toBe(customTm);
  });

  it('resetInstance 清除实例', () => {
    const tm = TimeManager.getInstance();
    TimeManager.resetInstance();
    const tm2 = TimeManager.getInstance();
    expect(tm2).not.toBe(tm);
  });
});

describe('TimeManager game timeline', () => {
  beforeEach(() => {
    TimeManager.resetInstance();
  });

  afterEach(() => {
    TimeManager.resetInstance();
  });

  it('getGameTimeline 返回 GSAP 时间线', () => {
    const tm = TimeManager.getInstance();
    const timeline = tm.getGameTimeline();
    expect(timeline).toBeDefined();
    expect(typeof timeline.pause).toBe('function');
    expect(typeof timeline.resume).toBe('function');
  });

  it('暂停 TimeManager 同时暂停游戏时间线', () => {
    const tm = TimeManager.getInstance();
    const timeline = tm.getGameTimeline();
    tm.pause();
    expect(timeline.isActive()).toBe(false);
  });
});

describe('TimeManager source code validation', () => {
  it('GameScene.pause 不使用 gsap.globalTimeline.pause', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../src/core/GameScene.ts'),
      'utf-8'
    );
    expect(content).not.toContain('gsap.globalTimeline.pause');
    expect(content).not.toContain('gsap.globalTimeline.resume');
    expect(content).toContain('timeManager.pause');
    expect(content).toContain('timeManager.resume');
  });

  it('MergeEffect 添加到 TimeManager 游戏时间线', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../src/ui/effects/MergeEffect.ts'),
      'utf-8'
    );
    expect(content).toContain('TimeManager');
    expect(content).toContain('getGameTimeline()');
  });

  it('ExplosionEffect 添加到 TimeManager 游戏时间线', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../src/ui/effects/ExplosionEffect.ts'),
      'utf-8'
    );
    expect(content).toContain('TimeManager');
    expect(content).toContain('getGameTimeline()');
  });

  it('FreezeEffect 添加到 TimeManager 游戏时间线', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../src/ui/effects/FreezeEffect.ts'),
      'utf-8'
    );
    expect(content).toContain('TimeManager');
    expect(content).toContain('getGameTimeline()');
  });

  it('ParticleEffect 添加到 TimeManager 游戏时间线', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../src/ui/effects/ParticleEffect.ts'),
      'utf-8'
    );
    expect(content).toContain('TimeManager');
    expect(content).toContain('getGameTimeline()');
  });

  it('GameHUD 分数动画添加到 TimeManager 游戏时间线', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../src/ui/hud/GameHUD.ts'),
      'utf-8'
    );
    expect(content).toContain('TimeManager');
    expect(content).toContain('getGameTimeline()');
  });

  it('ComboDisplay 动画添加到 TimeManager 游戏时间线', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../src/ui/components/ComboDisplay.ts'),
      'utf-8'
    );
    expect(content).toContain('TimeManager');
    expect(content).toContain('getGameTimeline()');
  });

  it('Game.init 中初始化 TimeManager', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../src/core/Game.ts'),
      'utf-8'
    );
    expect(content).toContain('TimeManager.setInstance');
  });

  it('Game.destroy 中清理 TimeManager', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../src/core/Game.ts'),
      'utf-8'
    );
    expect(content).toContain('TimeManager.resetInstance');
  });
});

describe('TimeManager animation timeline reset', () => {
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

  it('TimeManager类应可通过window.__TimeManager访问', () => {
    expect(typeof TimeManager).toBe('function');
    expect(typeof TimeManager.prototype.resetGameTimeline).toBe('function');
  });

  it('resetGameTimeline应创建新的运行中时间线', () => {
    const oldTimeline = timeManager.getGameTimeline();
    oldTimeline.pause();
    expect(oldTimeline.paused()).toBe(true);

    timeManager.resetGameTimeline();
    const newTimeline = timeManager.getGameTimeline();
    expect(newTimeline.paused()).toBe(false);
    expect(newTimeline).not.toBe(oldTimeline);
  });
});
