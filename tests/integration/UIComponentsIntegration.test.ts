import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UIManager } from '../../src/ui/UIManager';
import { PauseScreen } from '../../src/ui/screens/PauseScreen';
import { SettingsScreen } from '../../src/ui/screens/SettingsScreen';
import { MainMenuScreen } from '../../src/ui/screens/MainMenuScreen';
import { ResultScreen } from '../../src/ui/screens/ResultScreen';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { ParticleEffect } from '../../src/ui/effects/ParticleEffect';
import { FreezeEffect } from '../../src/ui/effects/FreezeEffect';
import { ComboDisplay } from '../../src/ui/components/ComboDisplay';
import { PropButton } from '../../src/ui/components/PropButton';
import { UIButton } from '../../src/ui/components/UIButton';
import { UIProgressBar } from '../../src/ui/components/UIProgressBar';
import { UIPanel } from '../../src/ui/components/UIPanel';
import { PropType } from '../../src/gameplay/props/Prop';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { AudioManager } from '../../src/core/AudioManager';
import { TimeManager } from '../../src/utils/TimeManager';
import { AnimationManager } from '../../src/utils/AnimationManager';
import { eventBus } from '../../src/utils/EventBus';

class MockApp {
  stage = {
    children: [] as any[],
    addChild(child: any) { this.children.push(child); },
  };
  screen = { width: 800, height: 600 };
}

describe('UI Screen resize flow', () => {
  let uiManager: UIManager;
  let app: any;

  beforeEach(() => {
    app = new MockApp();
    uiManager = new UIManager(app as any);
  });

  it('should handle pause screen show with multiple sizes', () => {
    const pauseScreen = new PauseScreen();
    uiManager.registerScreen('pause', pauseScreen);
    pauseScreen.show(800, 600);
    expect(pauseScreen.visible).toBe(true);
    pauseScreen.hide();
    pauseScreen.show(1024, 768);
    expect(pauseScreen.visible).toBe(true);
  });

  it('should handle settings screen show with multiple sizes', () => {
    const settingsScreen = new SettingsScreen();
    uiManager.registerScreen('settings', settingsScreen);
    settingsScreen.show(800, 600);
    expect(settingsScreen.visible).toBe(true);
    settingsScreen.hide();
    settingsScreen.show(1024, 768);
    expect(settingsScreen.visible).toBe(true);
  });

  it('should handle main menu reinitialize on resize', () => {
    const audioManager = new AudioManager();
    const mainMenu = new MainMenuScreen(audioManager);
    uiManager.registerScreen('mainMenu', mainMenu);
    mainMenu.show(800, 600);
    expect((mainMenu as any).initialized).toBe(true);
    mainMenu.hide();
    mainMenu.show(1024, 768);
    expect((mainMenu as any).currentScreenWidth).toBe(1024);
    expect((mainMenu as any).currentScreenHeight).toBe(768);
  });

  it('should handle result screen button positioning after layout', () => {
    const resultScreen = new ResultScreen();
    uiManager.registerScreen('result', resultScreen);
    resultScreen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    resultScreen.setResult({ isWin: true, score: 1000, stars: 3, levelId: 1 });
    expect(resultScreen.nextButton).not.toBeNull();
    expect(resultScreen.retryButton).not.toBeNull();
    expect(resultScreen.menuButton).not.toBeNull();
  });
});

describe('UI Effect lifecycle', () => {
  beforeEach(() => {
    AnimationManager.resetInstance();
    TimeManager.resetInstance();
    new TimeManager();
    AnimationManager.getInstance();
  });

  afterEach(() => {
    AnimationManager.resetInstance();
    TimeManager.resetInstance();
  });

  it('should create and destroy multiple particle effects without error', () => {
    const effects: ParticleEffect[] = [];
    for (let i = 0; i < 10; i++) {
      const effect = new ParticleEffect({
        type: 'sparkle',
        x: 100 + i * 10,
        y: 200,
        count: 5,
      });
      effects.push(effect);
    }
    effects.forEach(e => expect(() => e.destroy()).not.toThrow());
  });

  it('should create and destroy multiple freeze effects with unique timer IDs', () => {
    const effects: FreezeEffect[] = [];
    for (let i = 0; i < 5; i++) {
      const effect = new FreezeEffect(800, 600);
      effects.push(effect);
    }
    const ids = effects.map(e => (e as any).exitTimerId);
    expect(new Set(ids).size).toBe(5);
    effects.forEach(e => e.destroy());
  });

  it('should handle freeze effect with updateRemainingTime', () => {
    const effect = new FreezeEffect(800, 600);
    effect.updateRemainingTime(2000, 5000);
    effect.updateRemainingTime(1000, 5000);
    effect.updateRemainingTime(0, 5000);
    effect.destroy();
  });
});

describe('HUD + Props integration', () => {
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

  it('should destroy all prop buttons when HUD is destroyed', () => {
    const buttons = Array.from(hud.propButtons.values());
    expect(buttons.length).toBe(5);
    const destroySpies = buttons.map(b => vi.spyOn(b, 'destroy'));
    hud.destroy();
    destroySpies.forEach(spy => expect(spy).toHaveBeenCalled());
  });

  it('should update prop button counts after layout', () => {
    hud.layout(800, 600);
    (mockPropSystem.getPropCount as any).mockReturnValue(5);
    hud.updatePropButtons();
  });

  it('should handle layout on different screen sizes', () => {
    hud.layout(800, 600);
    hud.layout(1024, 768);
    hud.layout(375, 667);
    expect((hud as any).currentButtonSize).toBeGreaterThan(0);
  });
});

describe('ComboDisplay integration', () => {
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

  it('showCombo 方法存在且可调用', () => {
    expect(typeof hud.showCombo).toBe('function');
  });

  it('score:updated 事件 chainCount > 1 时触发 showCombo', () => {
    const showComboSpy = vi.spyOn(hud, 'showCombo');

    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 3,
    });

    expect(showComboSpy).toHaveBeenCalledWith(3);
    showComboSpy.mockRestore();
  });

  it('score:updated 事件 chainCount = 1 时不触发 showCombo', () => {
    const showComboSpy = vi.spyOn(hud, 'showCombo');

    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 1,
    });

    expect(showComboSpy).not.toHaveBeenCalled();
    showComboSpy.mockRestore();
  });

  it('score:updated 事件 chainCount = 0 时不触发 showCombo', () => {
    const showComboSpy = vi.spyOn(hud, 'showCombo');

    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 0,
    });

    expect(showComboSpy).not.toHaveBeenCalled();
    showComboSpy.mockRestore();
  });

  it('连锁数正确传递到 ComboDisplay', () => {
    const comboDisplay = (hud as any).comboDisplay as ComboDisplay;
    expect(comboDisplay).not.toBeNull();

    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 5,
    });

    expect(comboDisplay.getCurrentCombo()).toBe(5);
  });

  it('连锁数 < 2 时 ComboDisplay 隐藏', () => {
    const comboDisplay = (hud as any).comboDisplay as ComboDisplay;

    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 1,
    });

    expect(comboDisplay.getCurrentCombo()).toBe(0);
  });

  it('多次 score:updated 事件正确更新 ComboDisplay', () => {
    const comboDisplay = (hud as any).comboDisplay as ComboDisplay;

    eventBus.emit('score:updated', { totalScore: 500, earnedScore: 100, chainCount: 2 });
    expect(comboDisplay.getCurrentCombo()).toBe(2);

    eventBus.emit('score:updated', { totalScore: 800, earnedScore: 300, chainCount: 5 });
    expect(comboDisplay.getCurrentCombo()).toBe(5);

    eventBus.emit('score:updated', { totalScore: 900, earnedScore: 100, chainCount: 1 });
    expect(comboDisplay.getCurrentCombo()).toBe(5);
  });

  it('should handle combo display with multiple rapid calls', () => {
    const combo = new ComboDisplay();
    combo.showCombo(3);
    combo.showCombo(5);
    combo.showCombo(7);
    expect(combo.visible).toBe(true);
    combo.destroy();
  });

  it('should handle combo hide then show cycle', () => {
    const combo = new ComboDisplay();
    combo.showCombo(5);
    combo.hide();
    combo.showCombo(3);
    expect(combo.visible).toBe(true);
    combo.destroy();
  });
});

describe('UI Components (Button/ProgressBar/Panel)', () => {
  beforeEach(() => {
    TimeManager.resetInstance();
    new TimeManager();
  });

  afterEach(() => {
    TimeManager.resetInstance();
  });

  it('should create and interact with multiple UIButtons', () => {
    let clickCount = 0;
    const btn1 = new UIButton({ label: 'Btn1', onClick: () => { clickCount++; } });
    const btn2 = new UIButton({ label: 'Btn2', onClick: () => { clickCount++; } });
    btn1.emit('pointerdown' as any);
    btn1.emit('pointerup' as any);
    btn2.emit('pointerdown' as any);
    btn2.emit('pointerup' as any);
    expect(clickCount).toBe(2);
    btn1.destroy();
    btn2.destroy();
  });

  it('should handle progress bar with TimeManager pause', () => {
    const bar = new UIProgressBar();
    bar.setProgress(0.8);
    expect(bar.progress).toBe(0.8);
    TimeManager.getInstance().pause();
    bar.setProgress(1);
    expect(bar.progress).toBe(1);
    TimeManager.getInstance().resume();
    bar.destroy();
  });

  it('should handle panel show/hide with proper positioning', () => {
    const panel = new UIPanel();
    panel.y = 100;
    panel.show();
    panel.hide();
    panel.show();
    panel.destroy();
  });
});

describe('UIButton detailed', () => {
  it('should not fire onClick when disabled on pointerdown', () => {
    let clicked = false;
    const btn = new UIButton({ label: 'Test', onClick: () => { clicked = true; } });
    btn.setDisabled(true);
    btn.emit('pointerdown' as any);
    btn.emit('pointerup' as any);
    expect(clicked).toBe(false);
    expect(btn.disabled).toBe(true);
    btn.destroy();
  });

  it('should not fire onClick when in cooldown', () => {
    let clickCount = 0;
    const btn = new UIButton({ label: 'Test', onClick: () => { clickCount++; } });
    btn.emit('pointerdown' as any);
    btn.emit('pointerup' as any);
    expect(clickCount).toBe(1);
    btn.emit('pointerdown' as any);
    btn.emit('pointerup' as any);
    expect(clickCount).toBe(1);
    btn.destroy();
  });

  it('should not fire onClick when pointerup without pointerdown', () => {
    let clicked = false;
    const btn = new UIButton({ label: 'Test', onClick: () => { clicked = true; } });
    btn.emit('pointerup' as any);
    expect(clicked).toBe(false);
    btn.destroy();
  });

  it('should reset pressed state on pointerupoutside', () => {
    const btn = new UIButton({ label: 'Test' });
    btn.emit('pointerdown' as any);
    expect((btn as any)._pressed).toBe(true);
    btn.emit('pointerupoutside' as any);
    expect((btn as any)._pressed).toBe(false);
    expect(btn.scale.x).toBe(1);
    btn.destroy();
  });

  it('should set cursor to default when disabled and pointer when enabled', () => {
    const btn = new UIButton({ label: 'Test' });
    btn.setDisabled(true);
    expect(btn.cursor).toBe('default');
    btn.setDisabled(false);
    expect(btn.cursor).toBe('pointer');
    btn.destroy();
  });

  it('should use default option values', () => {
    const btn = new UIButton({ label: 'Test' });
    expect((btn as any).options.width).toBe(200);
    expect((btn as any).options.height).toBe(50);
    expect((btn as any).options.color).toBe(0x4ECDC4);
    expect((btn as any).options.disabledColor).toBe(0x666666);
    expect((btn as any).options.fontSize).toBe(18);
    expect((btn as any).options.borderRadius).toBe(10);
    btn.destroy();
  });

  it('should use custom option values', () => {
    const btn = new UIButton({
      label: 'Custom',
      width: 300,
      height: 60,
      color: 0xff0000,
      disabledColor: 0x333333,
      fontSize: 24,
      borderRadius: 15,
      onClick: () => {},
    });
    expect((btn as any).options.width).toBe(300);
    expect((btn as any).options.height).toBe(60);
    expect((btn as any).options.color).toBe(0xff0000);
    expect((btn as any).options.disabledColor).toBe(0x333333);
    expect((btn as any).options.fontSize).toBe(24);
    expect((btn as any).options.borderRadius).toBe(15);
    btn.destroy();
  });

  it('should clear cooldown timer on destroy', () => {
    vi.useFakeTimers();
    const btn = new UIButton({ label: 'Test' });
    btn.emit('pointerdown' as any);
    btn.emit('pointerup' as any);
    expect((btn as any).cooldownTimerId).not.toBeNull();
    btn.destroy();
    expect((btn as any).cooldownTimerId).toBeNull();
    vi.useRealTimers();
  });

  it('should draw disabled color background when disabled', () => {
    const btn = new UIButton({ label: 'Test', disabledColor: 0x999999 });
    btn.setDisabled(true);
    expect((btn as any)._disabled).toBe(true);
    btn.destroy();
  });
});

describe('UIPanel detailed', () => {
  it('should set title text', () => {
    const panel = new UIPanel();
    panel.setTitle('Test Title');
    expect((panel as any).titleText.text).toBe('Test Title');
    panel.destroy();
  });

  it('should return content area container', () => {
    const panel = new UIPanel();
    const contentArea = panel.getContentArea();
    expect(contentArea).toBeDefined();
    expect(contentArea.y).toBe(50);
    panel.destroy();
  });

  it('should be hidden initially', () => {
    const panel = new UIPanel();
    expect(panel.visible).toBe(false);
    panel.destroy();
  });

  it('should be visible after show', () => {
    const panel = new UIPanel();
    panel.show();
    expect(panel.visible).toBe(true);
    panel.destroy();
  });

  it('should use custom dimensions', () => {
    const panel = new UIPanel(500, 600);
    expect((panel as any).panelWidth).toBe(500);
    expect((panel as any).panelHeight).toBe(600);
    panel.destroy();
  });

  it('should kill panel tween on destroy', () => {
    const panel = new UIPanel();
    panel.show();
    panel.destroy();
    expect((panel as any).panelTween).toBeNull();
  });

  it('should kill existing tween when showing', () => {
    const panel = new UIPanel();
    panel.y = 100;
    panel.show();
    panel.show();
    panel.destroy();
  });

  it('should hide panel and set visible to false on complete', () => {
    const panel = new UIPanel();
    panel.y = 100;
    panel.show();
    panel.hide();
    expect((panel as any).panelTween).not.toBeNull();
    panel.destroy();
  });

  it('should position close button at top right', () => {
    const panel = new UIPanel(400, 500);
    const closeButton = (panel as any).closeButton;
    expect(closeButton.x).toBe(375);
    expect(closeButton.y).toBe(25);
    panel.destroy();
  });
});

describe('PropButton states', () => {
  it('should maintain selected state across pointer interactions', () => {
    const btn = new PropButton({
      propType: PropType.BOMB,
      icon: 'bomb',
      count: 3,
      onClick: () => {},
      x: 0,
      y: 0,
    });
    btn.setSelected();
    btn.emit('pointerout' as any);
    btn.emit('pointerover' as any);
    btn.clearSelected();
    btn.emit('pointerout' as any);
    btn.destroy();
  });

  it('should handle resize while selected', () => {
    const btn = new PropButton({
      propType: PropType.RAINBOW,
      icon: 'rainbow',
      count: 2,
      onClick: () => {},
      x: 0,
      y: 0,
    });
    btn.setSelected();
    btn.resize(40);
    btn.clearSelected();
    btn.resize(60);
    btn.destroy();
  });

  it('should handle disabled state with pointer events', () => {
    const btn = new PropButton({
      propType: PropType.SHRINK,
      icon: 'shrink',
      count: 1,
      onClick: () => {},
      x: 0,
      y: 0,
    });
    btn.updateCount(0);
    btn.emit('pointerdown' as any);
    btn.emit('pointerup' as any);
    btn.destroy();
  });
});

describe('UI Event flow', () => {
  it('should handle score:updated event chain in HUD', () => {
    const mockPropSystem = {
      getPropCount: vi.fn().mockReturnValue(3),
      getAllProps: vi.fn().mockReturnValue([]),
      useProp: vi.fn(),
      getProp: vi.fn(),
      reset: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      destroy: vi.fn(),
    } as unknown as PropSystem;
    const hud = new GameHUD(mockPropSystem);
    hud.layout(800, 600);

    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 3,
    });
    hud.update(1);

    eventBus.emit('score:updated', {
      totalScore: 1000,
      earnedScore: 200,
      chainCount: 5,
    });
    hud.update(1);

    hud.destroy();
  });
});
