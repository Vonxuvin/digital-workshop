import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UIManager } from '../../src/ui/UIManager';
import { PauseScreen } from '../../src/ui/screens/PauseScreen';
import { SettingsScreen } from '../../src/ui/screens/SettingsScreen';
import { MainMenuScreen } from '../../src/ui/screens/MainMenuScreen';
import { ResultScreen } from '../../src/ui/screens/ResultScreen';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { ParticleEffect } from '../../src/ui/effects/ParticleEffect';
import { FreezeEffect } from '../../src/ui/effects/FreezeEffect';
import { WarningLine } from '../../src/ui/components/WarningLine';
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

describe('Week5 UI Fixes Integration - Screen Resize Flow', () => {
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

describe('Week5 UI Fixes Integration - Effect Lifecycle', () => {
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

describe('Week5 UI Fixes Integration - HUD + Props', () => {
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

describe('Week5 UI Fixes Integration - Warning + Combo', () => {
  beforeEach(() => {
    AnimationManager.resetInstance();
  });

  afterEach(() => {
    AnimationManager.resetInstance();
  });

  it('should handle warning line reset after game over', () => {
    const wl = new WarningLine(600);
    wl.y = 120;
    for (let i = 0; i < 350; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }
    wl.reset();
    expect(wl.getWarningDuration()).toBe(0);
    wl.setDisabled(false);
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

describe('Week5 UI Fixes Integration - UI Components', () => {
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

describe('Week5 UI Fixes Integration - PropButton States', () => {
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

describe('Week5 UI Fixes Integration - Event Flow', () => {
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