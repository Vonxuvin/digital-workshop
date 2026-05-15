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

  it('FIXED: score + timeLimit 组合仍触发 game:timeout（其他关卡可能保留此组合）', () => {
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

    expect(timeoutHandler).toHaveBeenCalled();
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
