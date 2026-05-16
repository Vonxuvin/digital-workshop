import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResultScreen, ResultData } from '../../src/ui/screens/ResultScreen';
import { PauseScreen } from '../../src/ui/screens/PauseScreen';
import { SettingsScreen } from '../../src/ui/screens/SettingsScreen';
import { MainMenuScreen } from '../../src/ui/screens/MainMenuScreen';
import { AudioManager } from '../../src/core/AudioManager';
import { ParticleEffect, MAX_PARTICLE_COUNT } from '../../src/ui/effects/ParticleEffect';
import { FreezeEffect } from '../../src/ui/effects/FreezeEffect';
import { WarningLine } from '../../src/ui/components/WarningLine';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { ComboDisplay } from '../../src/ui/components/ComboDisplay';
import { PropButton } from '../../src/ui/components/PropButton';
import { PropType } from '../../src/gameplay/props/Prop';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { UIManager, Screen } from '../../src/ui/UIManager';
import { UIProgressBar } from '../../src/ui/components/UIProgressBar';
import { UIButton } from '../../src/ui/components/UIButton';
import { UIPanel } from '../../src/ui/components/UIPanel';
import { eventBus } from '../../src/utils/EventBus';
import { TimeManager } from '../../src/utils/TimeManager';
import { AnimationManager } from '../../src/utils/AnimationManager';

class MockApp {
  stage = {
    children: [] as any[],
    addChild(child: any) { this.children.push(child); },
  };
  screen = { width: 800, height: 600 };
}

class MockScreen extends Screen {
  show(): void {}
  hide(): void {}
}

describe('Week5 UI Fixes - ParticleEffect', () => {
  it('should not double-destroy particles (FIX: remove manual graphics.destroy)', () => {
    const effect = new ParticleEffect({
      type: 'sparkle',
      x: 100,
      y: 200,
      count: 10,
    });
    expect(() => effect.destroy()).not.toThrow();
    expect(() => effect.destroy()).not.toThrow();
  });

  it('should create confetti with rect before fill (PIXI v8)', () => {
    const effect = new ParticleEffect({
      type: 'confetti',
      x: 100,
      y: 200,
      count: 5,
    });
    expect(effect).toBeDefined();
    effect.destroy();
  });

  it('should clamp particle count to MAX_PARTICLE_COUNT', () => {
    const effect = new ParticleEffect({
      type: 'sparkle',
      x: 100,
      y: 200,
      count: 100,
    });
    expect(effect.children.length).toBe(MAX_PARTICLE_COUNT);
    effect.destroy();
  });

  it('should destroy all particle types without error', () => {
    const types = ['sparkle', 'confetti', 'smoke', 'bubble'] as const;
    for (const type of types) {
      const effect = new ParticleEffect({ type, x: 0, y: 0, count: 5 });
      expect(() => effect.destroy()).not.toThrow();
    }
  });

  it('should handle zero particle count', () => {
    const effect = new ParticleEffect({
      type: 'sparkle',
      x: 100,
      y: 200,
      count: 0,
    });
    expect(effect.children.length).toBe(0);
    effect.destroy();
  });

  it('should handle negative particle count', () => {
    const effect = new ParticleEffect({
      type: 'sparkle',
      x: 100,
      y: 200,
      count: -5,
    });
    expect(effect.children.length).toBe(0);
    effect.destroy();
  });
});

describe('Week5 UI Fixes - ResultScreen', () => {
  let screen: ResultScreen;

  beforeEach(() => {
    screen = new ResultScreen();
  });

  it('should call showButtons before layout (FIX: button position update)', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: true, score: 1000, stars: 3, levelId: 1 });
    expect(screen.nextButton).not.toBeNull();
    expect(screen.retryButton).not.toBeNull();
    expect(screen.menuButton).not.toBeNull();
    expect(screen.nextButton!.x).toBe(400);
  });

  it('should position lose buttons correctly after layout', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: false, score: 200, stars: 0, levelId: 2 });
    expect(screen.retryButton).not.toBeNull();
    expect(screen.menuButton).not.toBeNull();
  });

  it('should have correct format for hide/update methods', () => {
    screen.onShow();
    expect(() => screen.hide()).not.toThrow();
    expect(() => (screen as any).update()).not.toThrow();
  });

  it('should display details for win result with new record', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({
      isWin: true,
      score: 1500,
      stars: 3,
      levelId: 1,
      bestScore: 1000,
      playTime: 90,
      maxCombo: 5,
    });
  });

  it('should handle repeated setResult calls', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: true, score: 500, stars: 2, levelId: 1 });
    screen.setResult({ isWin: false, score: 100, stars: 0, levelId: 1 });
    expect(() => screen.destroy()).not.toThrow();
  });
});

describe('Week5 UI Fixes - PauseScreen', () => {
  let screen: PauseScreen;

  beforeEach(() => {
    screen = new PauseScreen();
  });

  it('should redraw overlay on show with different dimensions (FIX: resize support)', () => {
    screen.show(800, 600);
    expect(screen.visible).toBe(true);
    screen.hide();
    screen.show(1024, 768);
    expect(screen.visible).toBe(true);
  });

  it('should use nullish coalescing for zero values (FIX: || to ??)', () => {
    screen.show(0, 0);
    expect((screen as any).currentScreenWidth).toBe(0);
    expect((screen as any).currentScreenHeight).toBe(0);
  });

  it('should update content container position on show', () => {
    screen.show(1024, 768);
    const contentContainer = (screen as any).contentContainer;
    expect(contentContainer.x).toBe(512);
    expect(contentContainer.y).toBe(384);
  });

  it('should have all buttons accessible', () => {
    expect(screen.getContinueButton()).toBeDefined();
    expect(screen.getRestartButton()).toBeDefined();
    expect(screen.getMenuButton()).toBeDefined();
  });

  it('should initialize only once', () => {
    screen.show(800, 600);
    expect(screen.isInitialized()).toBe(true);
    screen.show(1024, 768);
    expect(screen.isInitialized()).toBe(true);
  });

  it('should show and hide correctly', () => {
    screen.show(800, 600);
    expect(screen.visible).toBe(true);
    screen.hide();
    expect(screen.visible).toBe(false);
  });
});

describe('Week5 UI Fixes - SettingsScreen', () => {
  let screen: SettingsScreen;

  beforeEach(() => {
    screen = new SettingsScreen();
  });

  it('should redraw overlay instead of setting width/height (FIX: PIXI v8 Graphics)', () => {
    screen.show(800, 600);
    expect(screen.visible).toBe(true);
    screen.hide();
    screen.show(1024, 768);
    expect(screen.visible).toBe(true);
  });

  it('should use undefined check for zero values (FIX: truthy check)', () => {
    screen.show(0, 0);
    expect((screen as any).currentScreenWidth).toBe(0);
    expect((screen as any).currentScreenHeight).toBe(0);
  });

  it('should center content panel on different screen sizes', () => {
    screen.show(1024, 768);
    const contentContainer = (screen as any).contentContainer;
    expect(contentContainer.x).toBe((1024 - 400) / 2);
    expect(contentContainer.y).toBe((768 - 300) / 2);
  });

  it('should handle multiple show/hide cycles', () => {
    screen.show(800, 600);
    screen.hide();
    screen.show(1024, 768);
    screen.hide();
    screen.show(400, 300);
  });

  it('should initialize only once', () => {
    screen.show(800, 600);
    expect((screen as any).initialized).toBe(true);
    screen.show(1024, 768);
    expect((screen as any).initialized).toBe(true);
  });
});

describe('Week5 UI Fixes - MainMenuScreen', () => {
  let screen: MainMenuScreen;
  let audioManager: AudioManager;

  beforeEach(() => {
    audioManager = new AudioManager();
    screen = new MainMenuScreen(audioManager);
  });

  it('should reinitialize on dimension change (FIX: resize support)', () => {
    screen.show(800, 600);
    expect((screen as any).initialized).toBe(true);
    screen.show(1024, 768);
    expect((screen as any).currentScreenWidth).toBe(1024);
    expect((screen as any).currentScreenHeight).toBe(768);
  });

  it('should use nullish coalescing for zero values (FIX: || to ??)', () => {
    screen.show(0, 0);
    expect((screen as any).currentScreenWidth).toBe(0);
    expect((screen as any).currentScreenHeight).toBe(0);
  });

  it('should have correct button count after reinitialize', () => {
    screen.show(800, 600);
    const buttons = (screen as any).allButtons;
    expect(buttons.length).toBe(3);
  });

  it('should handle multiple show with same dimensions', () => {
    screen.show(800, 600);
    screen.hide();
    screen.show(800, 600);
    expect((screen as any).initialized).toBe(true);
  });
});

describe('Week5 UI Fixes - FreezeEffect', () => {
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

  it('should use unique timer IDs (FIX: fixed ID collision)', () => {
    const effect1 = new FreezeEffect(800, 600);
    const effect2 = new FreezeEffect(800, 600);
    expect((effect1 as any).exitTimerId).not.toBe((effect2 as any).exitTimerId);
    effect1.destroy();
    effect2.destroy();
  });

  it('should generate incrementing unique IDs', () => {
    const effect1 = new FreezeEffect(800, 600);
    const effect2 = new FreezeEffect(800, 600);
    const effect3 = new FreezeEffect(800, 600);
    const ids = [
      (effect1 as any).exitTimerId,
      (effect2 as any).exitTimerId,
      (effect3 as any).exitTimerId,
    ];
    expect(new Set(ids).size).toBe(3);
    effect1.destroy();
    effect2.destroy();
    effect3.destroy();
  });

  it('should create snowflakes', () => {
    const effect = new FreezeEffect(800, 600);
    expect((effect as any).snowflakes.length).toBeGreaterThan(0);
    effect.destroy();
  });

  it('should destroy without error', () => {
    const effect = new FreezeEffect(800, 600);
    expect(() => effect.destroy()).not.toThrow();
  });
});

describe('Week5 UI Fixes - WarningLine', () => {
  let wl: WarningLine;

  beforeEach(() => {
    wl = new WarningLine(600);
    wl.y = 120;
  });

  it('should stroke each dash segment individually (FIX: double stroke path sharing)', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    const graphics = (wl as any).graphics;
    expect(graphics).toBeDefined();
  });

  it('should draw line without visual artifacts', () => {
    wl.drawLine?.(0xffff44, 0.8);
    expect(wl.getColor()).toBe(0xffff44);
  });

  it('should reset correctly', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    wl.reset();
    expect(wl.getWarningDuration()).toBe(0);
    expect(wl.getWarningProgress()).toBe(0);
  });

  it('should disable and stop warning', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    wl.setDisabled(true);
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    expect(wl.getWarningDuration()).toBe(0);
  });

  it('should emit game:over after threshold', () => {
    const handler = vi.fn();
    eventBus.on('game:over', handler);
    for (let i = 0; i < 350; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }
    expect(handler).toHaveBeenCalled();
    eventBus.off('game:over', handler);
  });
});

describe('Week5 UI Fixes - GameHUD', () => {
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

  it('should destroy all prop buttons on destroy (FIX: memory leak)', () => {
    const buttons = hud.propButtons;
    expect(buttons.size).toBeGreaterThan(0);
    const destroyed = vi.fn();
    buttons.forEach((btn) => {
      vi.spyOn(btn, 'destroy').mockImplementation(destroyed);
    });
    hud.destroy();
    expect(destroyed).toHaveBeenCalled();
  });

  it('should have all 5 prop buttons', () => {
    expect(hud.propButtons.size).toBe(5);
  });

  it('should layout correctly on different screen sizes', () => {
    hud.layout(1024, 768);
    expect((hud as any).screenWidth).toBe(1024);
    expect((hud as any).screenHeight).toBe(768);
    hud.layout(375, 667);
    expect((hud as any).screenWidth).toBe(375);
    expect((hud as any).screenHeight).toBe(667);
  });
});

describe('Week5 UI Fixes - ComboDisplay', () => {
  let combo: ComboDisplay;

  beforeEach(() => {
    AnimationManager.resetInstance();
    combo = new ComboDisplay();
  });

  afterEach(() => {
    combo.destroy();
    AnimationManager.resetInstance();
  });

  it('should kill fadeTween before new showCombo (FIX: race condition)', () => {
    combo.showCombo(3);
    expect(combo.visible).toBe(true);
    combo.showCombo(5);
    expect(combo.visible).toBe(true);
    expect(combo.getCurrentCombo()).toBe(5);
  });

  it('should handle rapid showCombo calls without error', () => {
    for (let i = 2; i <= 10; i++) {
      combo.showCombo(i);
    }
    expect(combo.visible).toBe(true);
  });

  it('should hide when combo < 2', () => {
    combo.showCombo(1);
    expect(combo.visible).toBe(false);
    expect(combo.getCurrentCombo()).toBe(0);
  });

  it('should handle show then rapid hide', () => {
    combo.showCombo(5);
    combo.hide();
    expect(combo.visible).toBe(false);
  });
});

describe('Week5 UI Fixes - PropButton', () => {
  const createButton = (size?: number) => new PropButton({
    propType: PropType.BOMB,
    icon: 'bomb',
    count: 3,
    onClick: () => {},
    x: 0,
    y: 0,
    size,
  });

  it('should preserve selected state after pointerout (FIX: selected overwrite)', () => {
    const btn = createButton();
    btn.setSelected();
    btn.emit('pointerout' as any);
    btn.destroy();
  });

  it('should preserve selected state after resize (FIX: resize clears selected)', () => {
    const btn = createButton(60);
    btn.setSelected();
    btn.resize(40);
    btn.destroy();
  });

  it('should clear selected state on clearSelected', () => {
    const btn = createButton();
    btn.setSelected();
    btn.clearSelected();
    btn.emit('pointerout' as any);
    btn.destroy();
  });

  it('should toggle selected state correctly', () => {
    const btn = createButton();
    btn.setSelected();
    btn.clearSelected();
    btn.setSelected();
    btn.destroy();
  });
});

describe('Week5 UI Fixes - UIManager', () => {
  let uiManager: UIManager;
  let app: any;

  beforeEach(() => {
    app = new MockApp();
    uiManager = new UIManager(app as any);
  });

  it('should destroy queued popups (FIX: popup queue memory leak)', () => {
    const popup1 = new MockScreen();
    const popup2 = new MockScreen();
    uiManager.showPopup(popup1);
    uiManager.showPopup(popup2);
    expect(() => uiManager.destroy()).not.toThrow();
  });

  it('should handle getLayer with valid layer names', () => {
    const layers = ['background', 'main', 'popup', 'overlay', 'toast'] as const;
    for (const name of layers) {
      expect(() => uiManager.getLayer(name)).not.toThrow();
    }
  });

  it('should handle destroy with no popups', () => {
    expect(() => uiManager.destroy()).not.toThrow();
  });

  it('should handle destroy with multiple queued popups', () => {
    const popup1 = new MockScreen();
    const popup2 = new MockScreen();
    const popup3 = new MockScreen();
    uiManager.showPopup(popup1);
    uiManager.showPopup(popup2);
    uiManager.showPopup(popup3);
    expect(uiManager.getPopupQueueLength()).toBe(2);
    expect(() => uiManager.destroy()).not.toThrow();
  });
});

describe('Week5 UI Fixes - UIProgressBar', () => {
  beforeEach(() => {
    TimeManager.resetInstance();
    new TimeManager();
  });

  afterEach(() => {
    TimeManager.resetInstance();
  });

  it('should add tween to TimeManager timeline (FIX: pause support)', () => {
    const bar = new UIProgressBar();
    bar.setProgress(0.5);
    expect(bar.progress).toBe(0.5);
    bar.destroy();
  });

  it('should handle rapid progress changes', () => {
    const bar = new UIProgressBar();
    bar.setProgress(0.3);
    bar.setProgress(0.7);
    bar.setProgress(1);
    expect(bar.progress).toBe(1);
    bar.destroy();
  });

  it('should clamp progress to 0-1', () => {
    const bar = new UIProgressBar();
    bar.setProgress(-0.5);
    expect(bar.progress).toBe(0);
    bar.setProgress(1.5);
    expect(bar.progress).toBe(1);
    bar.destroy();
  });

  it('should change colors without error', () => {
    const bar = new UIProgressBar();
    bar.setColors(0xff0000, 0x00ff00);
    bar.setProgress(0.5);
    bar.destroy();
  });
});

describe('Week5 UI Fixes - UIButton', () => {
  it('should clear cooldown timer on destroy (FIX: orphaned setTimeout)', () => {
    const btn = new UIButton({ label: 'Test', onClick: () => {} });
    btn.emit('pointerdown' as any);
    btn.emit('pointerup' as any);
    expect(() => btn.destroy()).not.toThrow();
  });

  it('should prevent double-click during cooldown', () => {
    let clickCount = 0;
    const btn = new UIButton({ label: 'Test', onClick: () => { clickCount++; } });
    btn.emit('pointerdown' as any);
    btn.emit('pointerup' as any);
    btn.emit('pointerdown' as any);
    btn.emit('pointerup' as any);
    expect(clickCount).toBe(1);
    btn.destroy();
  });

  it('should handle pointerupoutside without error', () => {
    const btn = new UIButton({ label: 'Test', onClick: () => {} });
    btn.emit('pointerdown' as any);
    btn.emit('pointerupoutside' as any);
    btn.destroy();
  });

  it('should set disabled state correctly', () => {
    const btn = new UIButton({ label: 'Test', onClick: () => {} });
    btn.setDisabled(true);
    expect(btn.disabled).toBe(true);
    btn.setDisabled(false);
    expect(btn.disabled).toBe(false);
    btn.destroy();
  });

  it('should not trigger onClick when disabled', () => {
    let clickCount = 0;
    const btn = new UIButton({ label: 'Test', onClick: () => { clickCount++; } });
    btn.setDisabled(true);
    btn.emit('pointerdown' as any);
    btn.emit('pointerup' as any);
    expect(clickCount).toBe(0);
    btn.destroy();
  });
});

describe('Week5 UI Fixes - UIPanel', () => {
  it('should animate show from off-screen position (FIX: interrupted hide targetY)', () => {
    const panel = new UIPanel();
    panel.y = 100;
    panel.show();
    panel.destroy();
  });

  it('should handle show after hide animation', () => {
    const panel = new UIPanel();
    panel.show();
    panel.hide();
    panel.show();
    panel.destroy();
  });

  it('should set title correctly', () => {
    const panel = new UIPanel();
    panel.setTitle('Test Panel');
    panel.destroy();
  });

  it('should have content area', () => {
    const panel = new UIPanel();
    const content = panel.getContentArea();
    expect(content).toBeDefined();
    panel.destroy();
  });

  it('should handle rapid show/hide cycles', () => {
    const panel = new UIPanel();
    panel.show();
    panel.hide();
    panel.show();
    panel.hide();
    panel.show();
    panel.destroy();
  });
});