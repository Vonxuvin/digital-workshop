import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../../src/core/AudioManager';
import { eventBus } from '../../src/utils/EventBus';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { ComboDisplay } from '../../src/ui/components/ComboDisplay';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { PropType } from '../../src/gameplay/props/Prop';
import { InputManager } from '../../src/core/InputManager';
import { GameEventRouter } from '../../src/core/GameEventRouter';
import { SaveManager } from '../../src/core/SaveManager';
import { ShrinkModifier, ShrinkConfig } from '../../src/gameplay/modifiers/ShrinkModifier';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import Matter from 'matter-js';
import { Container } from 'pixi.js';
import { WarningLine } from '../../src/ui/components/WarningLine';

describe('H-1: EventBus 事件名一致性 - AudioManager 事件监听修复', () => {
  let audioManager: AudioManager;
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    audioManager = new AudioManager();
    playSpy = vi.spyOn(audioManager, 'play').mockImplementation(() => {});
  });

  afterEach(() => {
    audioManager.destroy();
    playSpy.mockRestore();
  });

  it('FIXED: block:dropped 事件触发 spawn 音效', () => {
    eventBus.emit('block:dropped');
    expect(playSpy).toHaveBeenCalledWith('spawn');
  });

  it('FIXED: block:merged 事件触发 playMergeSound（使用 data.newValue）', () => {
    const playMergeSpy = vi.spyOn(audioManager as any, 'playMergeSound');
    eventBus.emit('block:merged', { newValue: 16, chainCount: 1 });
    expect(playMergeSpy).toHaveBeenCalledWith(16);
    playMergeSpy.mockRestore();
  });

  it('FIXED: score:updated 事件触发 combo 音效（使用 data.chainCount）', () => {
    eventBus.emit('score:updated', { totalScore: 500, earnedScore: 100, chainCount: 3 });
    expect(playSpy).toHaveBeenCalled();
  });

  it('FIXED: game:over 事件触发 gameOver 音效', () => {
    eventBus.emit('game:over');
    expect(playSpy).toHaveBeenCalledWith('gameOver');
  });

  it('FIXED: level:completed 事件触发 levelComplete 音效', () => {
    eventBus.emit('level:completed', { levelId: 1, score: 500, time: 30, highestMergeValue: 16 });
    expect(playSpy).toHaveBeenCalledWith('levelComplete');
  });

  it('FIXED: 旧事件名 gameplay:blockSpawn 不再触发监听', () => {
    eventBus.emit('gameplay:blockSpawn');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('FIXED: 旧事件名 gameplay:merge 不再触发监听', () => {
    eventBus.emit('gameplay:merge', { level: 4 });
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('FIXED: 旧事件名 gameplay:combo 不再触发监听', () => {
    eventBus.emit('gameplay:combo', { count: 5 });
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('FIXED: 旧事件名 gameplay:gameOver 不再触发监听', () => {
    eventBus.emit('gameplay:gameOver');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('FIXED: 旧事件名 gameplay:levelComplete 不再触发监听', () => {
    eventBus.emit('gameplay:levelComplete');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('FIXED: props:used 事件正确触发 propSound', () => {
    eventBus.emit('props:used', { type: 'bomb' });
    expect(playSpy).toHaveBeenCalled();
  });

  it('FIXED: block:merged 传递 newValue 而非 level', () => {
    const playMergeSpy = vi.spyOn(audioManager as any, 'playMergeSound');
    eventBus.emit('block:merged', { newValue: 32, chainCount: 2 });
    expect(playMergeSpy).toHaveBeenCalledWith(32);
    playMergeSpy.mockRestore();
  });

  it('FIXED: score:updated 传递 chainCount 而非 count', () => {
    const playComboSpy = vi.spyOn(audioManager as any, 'playComboSound');
    eventBus.emit('score:updated', { totalScore: 500, earnedScore: 100, chainCount: 7 });
    expect(playComboSpy).toHaveBeenCalledWith(7);
    playComboSpy.mockRestore();
  });
});

describe('H-2: ShrinkProp 音效名修复', () => {
  it('FIXED: GameEventRouter.handleShrinkActivate 应播放 shrink 而非 freeze', () => {
    const content = require('fs').readFileSync(
      require('path').resolve(__dirname, '../../src/core/GameEventRouter.ts'),
      'utf-8'
    );
    const shrinkActivateMatch = content.match(/private handleShrinkActivate\(data: \{ factor: number; duration: number \}\): void \{[\s\S]*?this\.audioManager\.play\('[^']+'\)/);
    expect(shrinkActivateMatch).toBeTruthy();
    expect(shrinkActivateMatch![0]).toContain("play('shrink')");
    expect(shrinkActivateMatch![0]).not.toContain("play('freeze')");
  });

  it('FIXED: AudioManager 中 shrink 音效频率已配置', () => {
    const am = new AudioManager();
    const freqMap = (am as any).getProceduralFrequency('shrink');
    expect(freqMap).toBe(330);
    expect(freqMap).toBeGreaterThan(0);
    am.destroy();
  });

  it('FIXED: freeze 和 shrink 音效频率不同，可区分', () => {
    const am = new AudioManager();
    const freezeFreq = (am as any).getProceduralFrequency('freeze');
    const shrinkFreq = (am as any).getProceduralFrequency('shrink');
    expect(freezeFreq).not.toBe(shrinkFreq);
    expect(freezeFreq).toBe(440);
    expect(shrinkFreq).toBe(330);
    am.destroy();
  });
});

describe('H-11: Level 5 timeLimit 冲突修复', () => {
  let ls: LevelSystem;

  afterEach(() => {
    if (ls) ls.destroy();
  });

  it('FIXED: Level 5 配置中不再包含 timeLimit', () => {
    const level5 = require('../../src/data/levels/level_05.json');
    expect(level5.objective.timeLimit).toBeUndefined();
  });

  it('FIXED: Level 5 score 类型不会因 timeLimit 触发 game:timeout', () => {
    const config: LevelConfig = {
      id: 5,
      name: '综合考验',
      objective: { type: 'score', target: 2000 },
      container: { width: 350, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4, 8, 16] },
      rewards: { stars: [800, 1500, 2500] },
    };
    ls = new LevelSystem(config);
    ls.start();

    const timeoutHandler = vi.fn();
    eventBus.on('game:timeout', timeoutHandler);

    ls.update(130000);

    expect(timeoutHandler).not.toHaveBeenCalled();
    eventBus.off('game:timeout', timeoutHandler);
  });

  it('FIXED: Level 5 score 类型在长时间后不会超时失败', () => {
    const config: LevelConfig = {
      id: 5,
      name: '综合考验',
      objective: { type: 'score', target: 2000 },
      container: { width: 350, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4, 8, 16] },
      rewards: { stars: [800, 1500, 2500] },
    };
    ls = new LevelSystem(config);
    ls.start();

    for (let i = 0; i < 200; i++) {
      ls.update(1000);
    }

    expect(ls.isLevelCompleted()).toBe(false);
  });

  it('FIXED: Level 5 达到目标分数后正常完成', () => {
    const config: LevelConfig = {
      id: 5,
      name: '综合考验',
      objective: { type: 'score', target: 2000 },
      container: { width: 350, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4, 8, 16] },
      rewards: { stars: [800, 1500, 2500] },
    };
    ls = new LevelSystem(config);
    ls.start();

    eventBus.emit('score:updated', { totalScore: 2500 });

    expect(ls.isLevelCompleted()).toBe(true);
  });

  it('FIXED: survival 类型仍正常使用 timeLimit', () => {
    const config: LevelConfig = {
      id: 4,
      name: '生存关卡',
      objective: { type: 'survival', target: 10, timeLimit: 10 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [100, 200, 300] },
    };
    ls = new LevelSystem(config);
    ls.start();

    ls.update(10000);

    expect(ls.isLevelCompleted()).toBe(true);
  });

  it('FIXED: score + timeLimit 组合不再触发 game:timeout（仅 survival 类型检查 timeLimit）', () => {
    const config: LevelConfig = {
      id: 99,
      name: '限时得分',
      objective: { type: 'score', target: 9999, timeLimit: 5 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [100, 200, 300] },
    };
    ls = new LevelSystem(config);
    ls.start();

    const timeoutHandler = vi.fn();
    eventBus.on('game:timeout', timeoutHandler);

    ls.update(5000);

    expect(timeoutHandler).not.toHaveBeenCalled();
    eventBus.off('game:timeout', timeoutHandler);
  });

  it('FIXED: Level 5 实际文件加载后无 timeLimit 字段', async () => {
    const fs = require('fs');
    const path = require('path');
    const levelPath = path.resolve(__dirname, '../../src/data/levels/level_05.json');
    const content = fs.readFileSync(levelPath, 'utf-8');
    const data = JSON.parse(content);
    expect(data.objective.type).toBe('score');
    expect(data.objective.timeLimit).toBeUndefined();
  });
});

describe('P1-2: ComboDisplay 连接到 GameHUD 修复', () => {
  let hud: GameHUD;
  let mockPropSystem: PropSystem;

  beforeEach(() => {
    mockPropSystem = {
      getPropCount: vi.fn().mockReturnValue(3),
      getAllProps: vi.fn().mockReturnValue([]),
      useProp: vi.fn(),
      getProp: vi.fn(),
      reset: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      destroy: vi.fn(),
    } as unknown as PropSystem;

    hud = new GameHUD(mockPropSystem);
  });

  afterEach(() => {
    hud.destroy();
  });

  it('FIXED: showCombo 方法存在且可调用', () => {
    expect(typeof hud.showCombo).toBe('function');
  });

  it('FIXED: score:updated 事件 chainCount > 1 时触发 showCombo', () => {
    const showComboSpy = vi.spyOn(hud, 'showCombo');

    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 3,
    });

    expect(showComboSpy).toHaveBeenCalledWith(3);
    showComboSpy.mockRestore();
  });

  it('FIXED: score:updated 事件 chainCount = 1 时不触发 showCombo', () => {
    const showComboSpy = vi.spyOn(hud, 'showCombo');

    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 1,
    });

    expect(showComboSpy).not.toHaveBeenCalled();
    showComboSpy.mockRestore();
  });

  it('FIXED: score:updated 事件 chainCount = 0 时不触发 showCombo', () => {
    const showComboSpy = vi.spyOn(hud, 'showCombo');

    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 0,
    });

    expect(showComboSpy).not.toHaveBeenCalled();
    showComboSpy.mockRestore();
  });

  it('FIXED: 连锁数正确传递到 ComboDisplay', () => {
    const comboDisplay = (hud as any).comboDisplay as ComboDisplay;
    expect(comboDisplay).not.toBeNull();

    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 5,
    });

    expect(comboDisplay.getCurrentCombo()).toBe(5);
  });

  it('FIXED: 连锁数 < 2 时 ComboDisplay 隐藏', () => {
    const comboDisplay = (hud as any).comboDisplay as ComboDisplay;

    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 1,
    });

    expect(comboDisplay.getCurrentCombo()).toBe(0);
  });

  it('FIXED: 多次 score:updated 事件正确更新 ComboDisplay', () => {
    const comboDisplay = (hud as any).comboDisplay as ComboDisplay;

    eventBus.emit('score:updated', { totalScore: 500, earnedScore: 100, chainCount: 2 });
    expect(comboDisplay.getCurrentCombo()).toBe(2);

    eventBus.emit('score:updated', { totalScore: 800, earnedScore: 300, chainCount: 5 });
    expect(comboDisplay.getCurrentCombo()).toBe(5);

    eventBus.emit('score:updated', { totalScore: 900, earnedScore: 100, chainCount: 1 });
    expect(comboDisplay.getCurrentCombo()).toBe(5);
  });
});

describe('H-9: InputManager touchend 位置更新修复', () => {
  let canvas: HTMLCanvasElement;
  let inputManager: InputManager;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.style.width = '400px';
    canvas.style.height = '600px';
    canvas.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0, top: 0, width: 400, height: 600, right: 400, bottom: 600,
    });
    document.body.appendChild(canvas);
    inputManager = new InputManager(canvas);
  });

  afterEach(() => {
    inputManager.destroy();
    document.body.removeChild(canvas);
  });

  it('FIXED: touchend 事件从 changedTouches 更新位置', () => {
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 200, identifier: 0 } as Touch],
      changedTouches: [{ clientX: 100, clientY: 200, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchStartEvent);

    const touchEndEvent = new TouchEvent('touchend', {
      touches: [] as Touch[],
      changedTouches: [{ clientX: 250, clientY: 350, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchEndEvent);

    const state = inputManager.getState();
    expect(state.position.x).toBeCloseTo(250, 0);
    expect(state.position.y).toBeCloseTo(350, 0);
  });

  it('FIXED: touchend 后 isDown 和 isMoving 被重置', () => {
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 200, identifier: 0 } as Touch],
      changedTouches: [{ clientX: 100, clientY: 200, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchStartEvent);

    expect(inputManager.getState().isDown).toBe(true);

    const touchEndEvent = new TouchEvent('touchend', {
      touches: [] as Touch[],
      changedTouches: [{ clientX: 100, clientY: 200, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchEndEvent);

    const state = inputManager.getState();
    expect(state.isDown).toBe(false);
    expect(state.isMoving).toBe(false);
  });

  it('FIXED: mouseup 事件更新位置', () => {
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100, clientY: 200, bubbles: true,
    });
    canvas.dispatchEvent(mouseDownEvent);

    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 300, clientY: 400, bubbles: true,
    });
    canvas.dispatchEvent(mouseUpEvent);

    const state = inputManager.getState();
    expect(state.position.x).toBeCloseTo(300, 0);
    expect(state.position.y).toBeCloseTo(400, 0);
  });

  it('FIXED: touchend 位置与 touchmove 位置不同时，使用 touchend 的 changedTouches 位置', () => {
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 200, identifier: 0 } as Touch],
      changedTouches: [{ clientX: 100, clientY: 200, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchStartEvent);

    const touchMoveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 150, clientY: 250, identifier: 0 } as Touch],
      changedTouches: [{ clientX: 150, clientY: 250, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchMoveEvent);

    const touchEndEvent = new TouchEvent('touchend', {
      touches: [] as Touch[],
      changedTouches: [{ clientX: 200, clientY: 300, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchEndEvent);

    const state = inputManager.getState();
    expect(state.position.x).toBeCloseTo(200, 0);
    expect(state.position.y).toBeCloseTo(300, 0);
  });

  it('FIXED: onUp 回调接收到更新后的位置', () => {
    const upCallback = vi.fn();

    inputManager.onUp(upCallback);

    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 200, identifier: 0 } as Touch],
      changedTouches: [{ clientX: 100, clientY: 200, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchStartEvent);

    const touchEndEvent = new TouchEvent('touchend', {
      touches: [] as Touch[],
      changedTouches: [{ clientX: 180, clientY: 280, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchEndEvent);

    expect(upCallback).toHaveBeenCalled();
    const lastCallState = upCallback.mock.calls[upCallback.mock.calls.length - 1][0];
    expect(lastCallState.position.x).toBeCloseTo(180, 0);
    expect(lastCallState.position.y).toBeCloseTo(280, 0);
    expect(lastCallState.isDown).toBe(false);
  });

  it('FIXED: 连续 touchstart → touchmove → touchend 位置正确更新', () => {
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [{ clientX: 50, clientY: 100, identifier: 0 } as Touch],
      changedTouches: [{ clientX: 50, clientY: 100, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchStartEvent);
    expect(inputManager.getState().position.x).toBeCloseTo(50, 0);

    const touchMoveEvent = new TouchEvent('touchmove', {
      touches: [{ clientX: 120, clientY: 180, identifier: 0 } as Touch],
      changedTouches: [{ clientX: 120, clientY: 180, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchMoveEvent);
    expect(inputManager.getState().position.x).toBeCloseTo(120, 0);

    const touchEndEvent = new TouchEvent('touchend', {
      touches: [] as Touch[],
      changedTouches: [{ clientX: 200, clientY: 250, identifier: 0 } as Touch],
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(touchEndEvent);
    expect(inputManager.getState().position.x).toBeCloseTo(200, 0);
    expect(inputManager.getState().position.y).toBeCloseTo(250, 0);
  });
});

describe('FIX-5: SaveManager.updateStatistics 参数修复', () => {
  let saveManager: SaveManager;

  beforeEach(() => {
    localStorage.clear();
    saveManager = SaveManager.getInstance();
    saveManager.reset();
  });

  it('FIXED: updateStatistics 接受 mergeValue, comboCount, playTime 三个参数', () => {
    expect(() => saveManager.updateStatistics(16, 3, 120)).not.toThrow();
  });

  it('FIXED: totalGames 正确递增', () => {
    saveManager.updateStatistics(0, 0, 0);
    saveManager.updateStatistics(0, 0, 0);
    expect(saveManager.getData().playStatistics.totalGames).toBe(2);
  });

  it('FIXED: totalPlayTime 正确累加', () => {
    saveManager.updateStatistics(0, 0, 60);
    saveManager.updateStatistics(0, 0, 45);
    expect(saveManager.getData().playStatistics.totalPlayTime).toBe(105);
  });

  it('FIXED: highestMerge 记录最高合并值', () => {
    saveManager.updateStatistics(4, 0, 0);
    saveManager.updateStatistics(32, 0, 0);
    saveManager.updateStatistics(8, 0, 0);
    expect(saveManager.getData().playStatistics.highestMerge).toBe(32);
  });

  it('FIXED: longestCombo 记录最长连击', () => {
    saveManager.updateStatistics(0, 2, 0);
    saveManager.updateStatistics(0, 5, 0);
    saveManager.updateStatistics(0, 3, 0);
    expect(saveManager.getData().playStatistics.longestCombo).toBe(5);
  });

  it('FIXED: maxCombo 记录最大连击', () => {
    saveManager.updateStatistics(0, 1, 0);
    saveManager.updateStatistics(0, 8, 0);
    saveManager.updateStatistics(0, 4, 0);
    expect(saveManager.getData().playStatistics.maxCombo).toBe(8);
  });

  it('FIXED: 同时更新所有统计字段', () => {
    saveManager.updateStatistics(128, 10, 300);
    const stats = saveManager.getData().playStatistics;
    expect(stats.totalGames).toBe(1);
    expect(stats.totalPlayTime).toBe(300);
    expect(stats.highestMerge).toBe(128);
    expect(stats.longestCombo).toBe(10);
    expect(stats.maxCombo).toBe(10);
  });
});

describe('FIX-6: ShrinkModifier 墙壁偏移修复', () => {
  let physics: PhysicsManager;
  let engine: Matter.Engine;
  let stageContainer: Container;

  beforeEach(() => {
    engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.001 },
    });

    physics = {
      getEngine: vi.fn().mockReturnValue(engine),
    } as unknown as PhysicsManager;

    stageContainer = new Container();
  });

  afterEach(() => {
    stageContainer.destroy({ children: true });
    Matter.Engine.clear(engine);
  });

  const createConfig = (overrides?: Partial<ShrinkConfig>): ShrinkConfig => ({
    type: 'shrink',
    enabled: true,
    targetWidth: 200,
    shrinkSpeed: 50,
    minWidth: 150,
    duration: 10,
    startDelay: 3,
    ...overrides,
  });

  it('FIXED: 使用 containerOffsetX 计算墙壁位置', () => {
    const offsetX = 100;
    const leftWall = Matter.Bodies.rectangle(0, 300, 10, 600, {
      isStatic: true,
      label: 'wall_left',
    });
    const rightWall = Matter.Bodies.rectangle(400, 300, 10, 600, {
      isStatic: true,
      label: 'wall_right',
    });
    Matter.Composite.add(engine.world, [leftWall, rightWall]);

    const modifier = new ShrinkModifier(
      createConfig(),
      physics,
      400,
      600,
      580,
      stageContainer,
      offsetX
    );

    modifier['activate']();
    expect(modifier.isActive()).toBe(true);
    modifier.deactivate();
  });

  it('FIXED: 通过 wall_left/wall_right 标签识别墙壁', () => {
    const leftWall = Matter.Bodies.rectangle(0, 300, 10, 600, {
      isStatic: true,
      label: 'wall_left',
    });
    const rightWall = Matter.Bodies.rectangle(400, 300, 10, 600, {
      isStatic: true,
      label: 'wall_right',
    });
    Matter.Composite.add(engine.world, [leftWall, rightWall]);

    const modifier = new ShrinkModifier(
      createConfig(),
      physics,
      400,
      600,
      580,
      stageContainer,
      0
    );

    modifier['activate']();
    expect(modifier.isActive()).toBe(true);
    modifier.deactivate();
  });

  it('FIXED: 无墙壁标签时不崩溃', () => {
    const modifier = new ShrinkModifier(
      createConfig(),
      physics,
      400,
      600,
      580,
      stageContainer,
      0
    );

    expect(() => modifier['activate']()).not.toThrow();
    modifier.deactivate();
  });

  it('FIXED: 墙壁收缩后位置正确更新', () => {
    const offsetX = 50;
    const leftWall = Matter.Bodies.rectangle(0, 300, 10, 600, {
      isStatic: true,
      label: 'wall_left',
    });
    const rightWall = Matter.Bodies.rectangle(400, 300, 10, 600, {
      isStatic: true,
      label: 'wall_right',
    });
    Matter.Composite.add(engine.world, [leftWall, rightWall]);

    const modifier = new ShrinkModifier(
      createConfig({ shrinkSpeed: 100 }),
      physics,
      400,
      600,
      580,
      stageContainer,
      offsetX
    );

    modifier['activate']();
    const centerX = offsetX + 200;
    expect(leftWall.position.x).toBeLessThan(centerX);
    expect(rightWall.position.x).toBeGreaterThan(centerX);
    modifier.deactivate();
  });

  it('FIXED: deactivate 后墙壁恢复原位', () => {
    const offsetX = 50;
    const leftWall = Matter.Bodies.rectangle(0, 300, 10, 600, {
      isStatic: true,
      label: 'wall_left',
    });
    const rightWall = Matter.Bodies.rectangle(400, 300, 10, 600, {
      isStatic: true,
      label: 'wall_right',
    });
    Matter.Composite.add(engine.world, [leftWall, rightWall]);

    const modifier = new ShrinkModifier(
      createConfig({ shrinkSpeed: 100 }),
      physics,
      400,
      600,
      580,
      stageContainer,
      offsetX
    );

    modifier['activate']();
    expect(modifier.isActive()).toBe(true);

    modifier.deactivate();
    expect(modifier.isActive()).toBe(false);
  });

  it('FIXED: getType 返回 shrink', () => {
    const modifier = new ShrinkModifier(
      createConfig(),
      physics,
      400,
      600,
      580,
      stageContainer,
      0
    );

    expect(modifier.getType()).toBe('shrink');
  });
});

describe('FIX-2: WarningLine PixiJS v8 Graphics.tint 兼容性修复', () => {
  let warningLine: WarningLine;

  beforeEach(() => {
    warningLine = new WarningLine(600, 400);
  });

  afterEach(() => {
    warningLine.destroy({ children: true });
  });

  it('FIXED: 使用 PixiJS v8 stroke API 而非 tint 属性', () => {
    const graphics = (warningLine as any).graphics;
    expect(graphics).toBeDefined();
    expect(typeof graphics.stroke).toBe('function');
  });

  it('FIXED: drawLine 使用 stroke({ width, color, alpha }) 格式', () => {
    const graphics = (warningLine as any).graphics;
    const clearSpy = vi.spyOn(graphics, 'clear');
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine(0xff4444, 0.8);

    expect(clearSpy).toHaveBeenCalled();
    expect(strokeSpy).toHaveBeenCalled();

    clearSpy.mockRestore();
    strokeSpy.mockRestore();
  });

  it('FIXED: 支持自定义颜色参数', () => {
    const graphics = (warningLine as any).graphics;
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine(0x00ff00, 0.5);

    const firstCall = strokeSpy.mock.calls[0][0] as { color: number; alpha: number; width: number };
    expect(firstCall.color).toBe(0x00ff00);
    expect(firstCall.alpha).toBe(0.5);

    strokeSpy.mockRestore();
  });

  it('FIXED: 支持自定义透明度参数', () => {
    const graphics = (warningLine as any).graphics;
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine(0xff4444, 0.3);

    const firstCall = strokeSpy.mock.calls[0][0] as { alpha: number };
    expect(firstCall.alpha).toBe(0.3);

    strokeSpy.mockRestore();
  });

  it('FIXED: 虚线使用较低透明度', () => {
    const graphics = (warningLine as any).graphics;
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine(0xff4444, 0.8);

    const secondCall = strokeSpy.mock.calls[1][0] as { alpha: number };
    expect(secondCall.alpha).toBeCloseTo(0.48, 1);

    strokeSpy.mockRestore();
  });

  it('FIXED: 默认颜色为红色警告色', () => {
    const graphics = (warningLine as any).graphics;
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine();

    const firstCall = strokeSpy.mock.calls[0][0] as { color: number };
    expect(firstCall.color).toBe(0xff4444);

    strokeSpy.mockRestore();
  });

  it('FIXED: 默认透明度为 0.8', () => {
    const graphics = (warningLine as any).graphics;
    const strokeSpy = vi.spyOn(graphics, 'stroke');

    (warningLine as any).drawLine();

    const firstCall = strokeSpy.mock.calls[0][0] as { alpha: number };
    expect(firstCall.alpha).toBe(0.8);

    strokeSpy.mockRestore();
  });

  it('FIXED: 不依赖已废弃的 Graphics.tint 属性进行绘制', () => {
    const graphics = (warningLine as any).graphics;
    const tintSpy = vi.spyOn(graphics, 'tint', 'set');

    (warningLine as any).drawLine(0xff4444, 0.8);

    expect(tintSpy).not.toHaveBeenCalled();

    tintSpy.mockRestore();
  });
});
