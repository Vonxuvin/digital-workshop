import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { eventBus } from '../../src/utils/EventBus';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { PropType } from '../../src/gameplay/props/Prop';

describe('GameHUD', () => {
  let hud: GameHUD;
  let mockPropSystem: PropSystem;

  beforeEach(() => {
    mockPropSystem = {
      getPropCount: vi.fn().mockReturnValue(3),
      getAllProps: vi.fn().mockReturnValue([
        { type: PropType.BOMB, config: { id: 'bomb' } as any, remaining: 3 },
        { type: PropType.RAINBOW, config: { id: 'rainbow' } as any, remaining: 2 },
      ]),
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

  it('should create without error', () => {
    expect(hud).toBeDefined();
  });

  it('should update level info', () => {
    hud.updateLevel(3, '合成挑战');
  });

  it('should handle score:updated event', () => {
    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 1,
    });
  });

  it('should show chain text when chain > 1', () => {
    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 3,
    });
  });

  it('should update score display with animation', () => {
    eventBus.emit('score:updated', {
      totalScore: 1000,
      earnedScore: 200,
      chainCount: 1,
    });
    hud.update(1);
  });

  it('should reset correctly', () => {
    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 2,
    });
    hud.reset();
  });

  it('should emit ui:pause on pause button click', () => {
    const handler = vi.fn();
    eventBus.on('ui:pause', handler);
    eventBus.off('ui:pause', handler);
  });

  it('should not contain any floating ball (nextBlockPreview) after initialization', () => {
    const children = hud.children;
    for (const child of children) {
      if (child.label === 'nextBlockPreview' || child.label === 'next-block-preview') {
        fail('GameHUD should not contain a floating nextBlockPreview component');
      }
    }
  });

  it('should have no visible floating elements after reset', () => {
    hud.reset();
    const allChildren = hud.children;
    for (const child of allChildren) {
      const containerChild = child as unknown as { label?: string; visible?: boolean };
      if (containerChild.label && (
        containerChild.label.toLowerCase().includes('preview') ||
        containerChild.label.toLowerCase().includes('next')
      )) {
        expect(containerChild.visible).toBe(false);
      }
    }
  });

  it('should correctly update objective progress', () => {
    hud.setObjectiveInfo('score', 100);
    hud.updateObjectiveProgress(50);
    hud.updateObjectiveProgress(100);
    hud.updateObjectiveProgress(0);
  });

  it('should handle timer display updates', () => {
    hud.updateTimer(60);
    hud.updateTimer(10);
    hud.updateTimer(-1);
  });

  it('should skip animation and show final score immediately', () => {
    eventBus.emit('score:updated', {
      totalScore: 9999,
      earnedScore: 1000,
      chainCount: 5,
    });
    hud.skipAnimation();
  });

  it('should destroy cleanly and remove event listeners', () => {
    hud.destroy();
    expect(() => hud.destroy()).not.toThrow();
  });

  it('should store screen dimensions on layout', () => {
    hud.layout(800, 600);
    const sw = (hud as any).screenWidth;
    const sh = (hud as any).screenHeight;
    expect(sw).toBe(800);
    expect(sh).toBe(600);
  });

  it('should pass screen dimensions to ComboDisplay on showCombo', () => {
    hud.layout(800, 600);
    const comboDisplay = hud.comboDisplay;
    expect(comboDisplay).toBeDefined();
    if (comboDisplay) {
      const showComboSpy = vi.spyOn(comboDisplay, 'showCombo');
      hud.showCombo(3);
      expect(showComboSpy).toHaveBeenCalledWith(3, 800, 600);
      showComboSpy.mockRestore();
    }
  });

  it('should destroy all prop buttons on destroy', () => {
    const buttons = hud.propButtons;
    expect(buttons.size).toBeGreaterThan(0);
    const destroyed = vi.fn();
    buttons.forEach((btn) => {
      vi.spyOn(btn, 'destroy').mockImplementation(destroyed);
    });
    hud.destroy();
    expect(destroyed).toHaveBeenCalled();
  });

  it('should layout correctly on different screen sizes', () => {
    hud.layout(1024, 768);
    expect((hud as any).screenWidth).toBe(1024);
    expect((hud as any).screenHeight).toBe(768);
    hud.layout(375, 667);
    expect((hud as any).screenWidth).toBe(375);
    expect((hud as any).screenHeight).toBe(667);
  });

  it('should show combo display when chainCount > 1', () => {
    hud.layout(800, 600);
    const comboDisplay = hud.comboDisplay;
    if (comboDisplay) {
      eventBus.emit('score:updated', {
        totalScore: 500,
        earnedScore: 100,
        chainCount: 3,
      });
      expect(comboDisplay.visible).toBe(true);
    }
  });

  it('should not show combo display when chainCount <= 1', () => {
    hud.layout(800, 600);
    const comboDisplay = hud.comboDisplay;
    if (comboDisplay) {
      eventBus.emit('score:updated', {
        totalScore: 500,
        earnedScore: 100,
        chainCount: 1,
      });
      expect(comboDisplay.visible).toBe(false);
    }
  });

  it('should position objectiveDisplay in layout', () => {
    hud.layout(800, 600);
    const display = hud.objectiveDisplay;
    const expectedX = Math.max(10, (800 - (display.objectiveBarWidth || 280)) / 2);
    expect(display.x).toBe(expectedX);
    expect(display.y).toBe(5);
  });

  it('should reset timerText visibility and text on reset', () => {
    hud.updateTimer(30);
    hud.reset();
    const timerText = (hud as any).timerText;
    expect(timerText.visible).toBe(false);
    expect(timerText.text).toBe('');
  });

  it('should position propsContainer in layout', () => {
    hud.layout(800, 600);
    const propsContainer = hud.propsContainer;
    expect(propsContainer.x).toBeGreaterThan(0);
    expect(propsContainer.y).toBe(15);
  });

  it('should position pauseButton in layout', () => {
    hud.layout(800, 600);
    const pauseButton = hud.pauseButton;
    expect(pauseButton.x).toBe(750);
    expect(pauseButton.y).toBe(30);
  });

  it('should position timerText in layout', () => {
    hud.layout(800, 600);
    const timerText = (hud as any).timerText;
    expect(timerText.x).toBe(400);
  });

  it('should update prop buttons after prop use', () => {
    (mockPropSystem.useProp as any).mockReturnValue(true);
    (mockPropSystem.getPropCount as any).mockReturnValue(2);
    const button = hud.propButtons.get(PropType.RAINBOW);
    if (button) {
      (button as any).onClick();
    }
    expect(mockPropSystem.useProp).toHaveBeenCalled();
  });

  it('should not use prop when count is 0', () => {
    (mockPropSystem.getPropCount as any).mockReturnValue(0);
    (mockPropSystem.useProp as any).mockReturnValue(true);
    const button = hud.propButtons.get(PropType.RAINBOW);
    if (button) {
      (button as any).onClick(PropType.RAINBOW);
    }
    expect(mockPropSystem.useProp).not.toHaveBeenCalled();
  });

  it('should enter bomb target mode on bomb click', () => {
    (mockPropSystem.getPropCount as any).mockReturnValue(3);
    const button = hud.propButtons.get(PropType.BOMB);
    if (button) {
      (button as any).onClick(PropType.BOMB);
    }
    expect((hud as any).propTargetMode).toBe(true);
    expect((hud as any).selectedProp).toBe(PropType.BOMB);
  });

  it('should exit bomb target mode on second bomb click', () => {
    (mockPropSystem.getPropCount as any).mockReturnValue(3);
    const button = hud.propButtons.get(PropType.BOMB);
    if (button) {
      (button as any).onClick(PropType.BOMB);
      (button as any).onClick(PropType.BOMB);
    }
    expect((hud as any).propTargetMode).toBe(false);
  });

  it('should use prop at position in target mode', () => {
    (mockPropSystem.getPropCount as any).mockReturnValue(3);
    (mockPropSystem.useProp as any).mockReturnValue(true);
    const button = hud.propButtons.get(PropType.BOMB);
    if (button) {
      (button as any).onClick(PropType.BOMB);
    }
    hud.usePropAtPosition(100, 200);
    expect(mockPropSystem.useProp).toHaveBeenCalledWith(PropType.BOMB, { x: 100, y: 200 });
  });

  it('should not use prop at position when not in target mode', () => {
    hud.usePropAtPosition(100, 200);
    expect(mockPropSystem.useProp).not.toHaveBeenCalled();
  });

  it('should show and hide crosshair', () => {
    hud.showCrosshair(100, 200);
    const crosshair = (hud as any).crosshair;
    expect(crosshair.visible).toBe(true);
    hud.hideCrosshair();
    expect(crosshair.visible).toBe(false);
  });

  it('should set crosshair position to given coordinates', () => {
    hud.showCrosshair(400, 300);
    const crosshair = (hud as any).crosshair;
    expect(crosshair.x).toBe(400);
    expect(crosshair.y).toBe(300);
  });

  it('should update crosshair position when called with new coordinates', () => {
    hud.showCrosshair(100, 200);
    const crosshair = (hud as any).crosshair;
    expect(crosshair.x).toBe(100);
    expect(crosshair.y).toBe(200);
    hud.updateCrosshair(400, 300);
    expect(crosshair.x).toBe(400);
    expect(crosshair.y).toBe(300);
  });

  it('should position crosshair at screen center on enterBombTargetMode', () => {
    hud.layout(800, 600);
    (mockPropSystem.getPropCount as any).mockReturnValue(3);
    const button = hud.propButtons.get(PropType.BOMB);
    if (button) {
      (button as any).onClick(PropType.BOMB);
    }
    const crosshair = (hud as any).crosshair;
    expect(crosshair.visible).toBe(true);
    expect(crosshair.x).toBeCloseTo(400, -1);
    expect(crosshair.y).toBeCloseTo(300, -1);
  });

  it('should update crosshair position', () => {
    hud.showCrosshair(100, 200);
    hud.updateCrosshair(150, 250);
    const crosshair = (hud as any).crosshair;
    expect(crosshair.visible).toBe(true);
  });

  it('should not update crosshair when hidden', () => {
    hud.updateCrosshair(100, 200);
    const crosshair = (hud as any).crosshair;
    expect(crosshair.visible).toBe(false);
  });

  it('should set prop selected state', () => {
    (hud as any).setPropSelected(PropType.BOMB);
    expect((hud as any).selectedProp).toBe(PropType.BOMB);
    (hud as any).setPropSelected(null);
    expect((hud as any).selectedProp).toBeNull();
  });

  it('should switch prop selection', () => {
    (hud as any).setPropSelected(PropType.BOMB);
    (hud as any).setPropSelected(PropType.RAINBOW);
    expect((hud as any).selectedProp).toBe(PropType.RAINBOW);
  });

  it('should kill scoreTween on reset when tween is active', () => {
    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 1,
    });
    hud.update(0.016);
    expect((hud as any).scoreTween).toBeDefined();
    hud.reset();
    expect((hud as any).scoreTween).toBeNull();
  });

  it('should kill scoreTween on skipAnimation when tween is active', () => {
    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 1,
    });
    hud.update(0.016);
    expect((hud as any).scoreTween).toBeDefined();
    hud.skipAnimation();
    expect((hud as any).scoreTween).toBeNull();
  });

  it('should handle reset without active tween', () => {
    hud.reset();
    expect((hud as any).scoreTween).toBeNull();
  });

  it('should handle skipAnimation without active tween', () => {
    hud.skipAnimation();
    expect((hud as any).scoreTween).toBeNull();
  });

  it('should expose scoreText getter', () => {
    expect(hud.scoreText).toBeDefined();
    expect(hud.scoreText.text).toBe('Score: 0');
  });

  it('should expose levelText getter', () => {
    expect(hud.levelText).toBeDefined();
  });

  it('should expose pauseButton getter', () => {
    expect(hud.pauseButton).toBeDefined();
  });

  it('should expose propsContainer getter', () => {
    expect(hud.propsContainer).toBeDefined();
  });

  it('should not expose objectiveBar getter (removed, replaced by objectiveDisplay)', () => {
    expect((hud as any).objectiveBar).toBeUndefined();
  });

  it('should emit ui:pause on pause button pointerdown', () => {
    const handler = vi.fn();
    eventBus.on('ui:pause', handler);
    (hud.pauseButton as any).emit('pointerdown');
    expect(handler).toHaveBeenCalled();
    eventBus.off('ui:pause', handler);
  });

  it('should layout with small screen triggering scaling branch', () => {
    hud.layout(320, 480);
    expect((hud as any).screenWidth).toBe(320);
    expect((hud as any).screenHeight).toBe(480);
    expect(hud.currentButtonSize).toBeLessThan(60);
  });

  it('should expose propsContainerX', () => {
    hud.layout(800, 600);
    expect(hud.propsContainerX).toBeGreaterThan(0);
  });

  it('should expose getObjectiveBar method returning ObjectiveDisplay', () => {
    const bar = hud.getObjectiveBar();
    expect(bar).toBeDefined();
  });

  it('should handle non-bomb prop click when useProp returns false', () => {
    (mockPropSystem.getPropCount as any).mockReturnValue(3);
    (mockPropSystem.useProp as any).mockReturnValue(false);
    const button = hud.propButtons.get(PropType.RAINBOW);
    if (button) {
      (button as any).onClick(PropType.RAINBOW);
    }
    expect(mockPropSystem.useProp).toHaveBeenCalledWith(PropType.RAINBOW);
  });

  it('should handle usePropAtPosition when useProp returns false', () => {
    (mockPropSystem.getPropCount as any).mockReturnValue(3);
    (mockPropSystem.useProp as any).mockReturnValue(false);
    const button = hud.propButtons.get(PropType.BOMB);
    if (button) {
      (button as any).onClick(PropType.BOMB);
    }
    hud.usePropAtPosition(100, 200);
    expect(mockPropSystem.useProp).toHaveBeenCalledWith(PropType.BOMB, { x: 100, y: 200 });
    expect((hud as any).propTargetMode).toBe(false);
  });

  it('should set _propButtonJustClicked flag on prop click', () => {
    (mockPropSystem.getPropCount as any).mockReturnValue(3);
    const button = hud.propButtons.get(PropType.BOMB);
    if (button) {
      (button as any).onClick(PropType.BOMB);
    }
    expect((hud as any)._propButtonJustClicked).toBe(true);
  });

  it('should consume prop button click flag via consumePropButtonClick', () => {
    (hud as any)._propButtonJustClicked = true;
    expect(hud.consumePropButtonClick()).toBe(true);
    expect(hud.consumePropButtonClick()).toBe(false);
  });

  it('should return false from consumePropButtonClick when flag is not set', () => {
    expect(hud.consumePropButtonClick()).toBe(false);
  });

  it('should clear _propButtonJustClicked on reset', () => {
    (hud as any)._propButtonJustClicked = true;
    hud.reset();
    expect((hud as any)._propButtonJustClicked).toBe(false);
  });

  it('should prevent bomb from firing on same click as PropButton activation', () => {
    (mockPropSystem.getPropCount as any).mockReturnValue(3);
    (mockPropSystem.useProp as any).mockReturnValue(true);

    const button = hud.propButtons.get(PropType.BOMB);
    if (button) {
      (button as any).onClick(PropType.BOMB);
    }

    expect(hud.consumePropButtonClick()).toBe(true);
    expect((hud as any).propTargetMode).toBe(true);

    hud.usePropAtPosition(100, 200);
    expect(mockPropSystem.useProp).toHaveBeenCalledWith(PropType.BOMB, { x: 100, y: 200 });
  });

  it('should not use prop at position when propTargetMode is false', () => {
    (hud as any).propTargetMode = false;
    (hud as any).selectedProp = null;
    hud.usePropAtPosition(100, 200);
    expect(mockPropSystem.useProp).not.toHaveBeenCalled();
  });

  it('should exit prop target mode and emit event on exitPropTargetMode', () => {
    const handler = vi.fn();
    eventBus.on('ui:propTargetMode', handler);

    (hud as any).propTargetMode = true;
    (hud as any).selectedProp = PropType.BOMB;
    hud.exitPropTargetMode();

    expect((hud as any).propTargetMode).toBe(false);
    expect((hud as any).selectedProp).toBeNull();
    expect(handler).toHaveBeenCalledWith({ enabled: false });

    eventBus.off('ui:propTargetMode', handler);
  });

  it('should expose isPropTargetMode getter', () => {
    expect(hud.isPropTargetMode).toBe(false);
    (hud as any).propTargetMode = true;
    expect(hud.isPropTargetMode).toBe(true);
  });

  it('should show crosshair immediately on enterBombTargetMode when screen dimensions are set', () => {
    hud.layout(800, 600);
    const showCrosshairSpy = vi.spyOn(hud, 'showCrosshair');
    (mockPropSystem.getPropCount as any).mockReturnValue(3);
    const button = hud.propButtons.get(PropType.BOMB);
    if (button) {
      (button as any).onClick(PropType.BOMB);
    }
    expect((hud as any).propTargetMode).toBe(true);
    expect(showCrosshairSpy).toHaveBeenCalledWith(400, 300);
    showCrosshairSpy.mockRestore();
  });

  it('should not show crosshair on enterBombTargetMode when screen dimensions are zero', () => {
    const showCrosshairSpy = vi.spyOn(hud, 'showCrosshair');
    (mockPropSystem.getPropCount as any).mockReturnValue(3);
    const button = hud.propButtons.get(PropType.BOMB);
    if (button) {
      (button as any).onClick(PropType.BOMB);
    }
    expect((hud as any).propTargetMode).toBe(true);
    expect(showCrosshairSpy).not.toHaveBeenCalled();
    showCrosshairSpy.mockRestore();
  });

  it('should hide crosshair on exitBombTargetMode', () => {
    hud.layout(800, 600);
    (mockPropSystem.getPropCount as any).mockReturnValue(3);
    const button = hud.propButtons.get(PropType.BOMB);
    if (button) {
      (button as any).onClick(PropType.BOMB);
    }
    expect((hud as any).crosshair.visible).toBe(true);
    const button2 = hud.propButtons.get(PropType.BOMB);
    if (button2) {
      (button2 as any).onClick(PropType.BOMB);
    }
    expect((hud as any).propTargetMode).toBe(false);
    expect((hud as any).crosshair.visible).toBe(false);
  });

  it('should reset isPropTargetMode to false on reset', () => {
    (hud as any).propTargetMode = true;
    hud.reset();
    expect(hud.isPropTargetMode).toBe(false);
  });

  it('should not have separate objectiveBar (removed, unified into ObjectiveDisplay)', () => {
    expect((hud as any)._objectiveBar).toBeUndefined();
  });

  it('should have only one progress bar via ObjectiveDisplay', () => {
    const display = hud.objectiveDisplay;
    expect(display).toBeDefined();
    expect(display.progressBar).toBeDefined();
  });

  it('should update objective progress via updateObjectiveProgress only', () => {
    hud.setObjectiveInfo('score', 200);
    hud.updateObjectiveProgress(100);
    expect(hud.objectiveDisplay.getCurrentData()?.currentValue).toBe(100);
    expect(hud.objectiveDisplay.progressBar.progress).toBeCloseTo(0.5);
  });

  it('should not have setObjectiveProgress method', () => {
    expect((hud as any).setObjectiveProgress).toBeUndefined();
  });

  it('should position ObjectiveDisplay at unified location after layout', () => {
    hud.layout(800, 600);
    const expectedX = Math.max(10, (800 - (hud.objectiveDisplay.objectiveBarWidth || 280)) / 2);
    expect(hud.objectiveDisplay.x).toBe(expectedX);
    expect(hud.objectiveDisplay.y).toBe(5);
  });

  it('should show objective info persistently in HUD', () => {
    hud.setObjectiveInfo('score', 500);
    expect(hud.objectiveDisplay.getCurrentData()).not.toBeNull();
    expect(hud.objectiveDisplay.getCurrentData()?.type).toBe('score');
    expect(hud.objectiveDisplay.getCurrentData()?.target).toBe(500);
  });

  it('should update progress text with current/target values', () => {
    hud.setObjectiveInfo('score', 300);
    hud.updateObjectiveProgress(150);
    const display = hud.objectiveDisplay;
    expect(display.getCurrentData()?.currentValue).toBe(150);
  });

  it('should clear objective info on reset', () => {
    hud.setObjectiveInfo('score', 300);
    hud.updateObjectiveProgress(150);
    hud.reset();
    expect(hud.objectiveDisplay.getCurrentData()).toBeNull();
  });

  it('should support forceUpdateObjectiveProgress', () => {
    hud.setObjectiveInfo('score', 300);
    hud.forceUpdateObjectiveProgress(150);
    expect(hud.objectiveDisplay.getCurrentData()?.currentValue).toBe(150);
    expect(hud.objectiveDisplay.progressBar.displayProgressValue).toBeCloseTo(0.5);
  });

  it('should not force update when no objective set', () => {
    hud.forceUpdateObjectiveProgress(100);
    expect(hud.objectiveDisplay.getCurrentData()).toBeNull();
  });

  it('should have always visible objective display', () => {
    expect(hud.objectiveDisplay.isAlwaysVisible()).toBe(true);
  });

  it('should position objective display at top center', () => {
    hud.layout(800, 600);
    const display = hud.objectiveDisplay;
    expect(display.y).toBe(5);
    expect(display.x).toBeGreaterThan(0);
    expect(display.x).toBeLessThan(400);
  });

  it('should position objective display centered on different screen sizes', () => {
    hud.layout(1024, 768);
    const display = hud.objectiveDisplay;
    const expectedX = Math.max(10, (1024 - (display.objectiveBarWidth || 280)) / 2);
    expect(display.x).toBe(expectedX);
    expect(display.y).toBe(5);
  });

  it('should have background panel on objective display', () => {
    expect(hud.objectiveDisplay.getBackgroundPanel()).toBeDefined();
  });

  it('should use wider objective display (280px)', () => {
    expect(hud.objectiveDisplay.objectiveBarWidth).toBe(280);
  });
});

describe('GameHUD Score Animation', () => {
  let hud: GameHUD;
  let mockPropSystem: PropSystem;

  beforeEach(() => {
    mockPropSystem = {
      getPropCount: vi.fn().mockReturnValue(3),
      getAllProps: vi.fn().mockReturnValue([
        { type: PropType.BOMB, config: { id: 'bomb' } as any, remaining: 3 },
        { type: PropType.RAINBOW, config: { id: 'rainbow' } as any, remaining: 2 },
      ]),
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

  it('should start score animation when SCORE_UPDATED event fires', () => {
    eventBus.emit('score:updated', {
      totalScore: 20,
      earnedScore: 10,
      chainCount: 2,
    });
    expect((hud as any).scoreTween).toBeDefined();
    expect((hud as any).currentScore).toBe(20);
  });

  it('should update currentScore but not displayScore immediately on event', () => {
    eventBus.emit('score:updated', {
      totalScore: 50,
      earnedScore: 30,
      chainCount: 1,
    });
    expect((hud as any).currentScore).toBe(50);
  });

  it('should not recreate tween on consecutive SCORE_UPDATED with same totalScore', () => {
    eventBus.emit('score:updated', {
      totalScore: 30,
      earnedScore: 10,
      chainCount: 1,
    });
    const firstTween = (hud as any).scoreTween;
    expect(firstTween).toBeDefined();
    eventBus.emit('score:updated', {
      totalScore: 30,
      earnedScore: 10,
      chainCount: 1,
    });
    expect((hud as any).scoreTween).toBe(firstTween);
  });

  it('should kill and recreate tween when totalScore changes during animation', () => {
    eventBus.emit('score:updated', {
      totalScore: 10,
      earnedScore: 10,
      chainCount: 1,
    });
    const firstTween = (hud as any).scoreTween;
    eventBus.emit('score:updated', {
      totalScore: 50,
      earnedScore: 40,
      chainCount: 2,
    });
    const secondTween = (hud as any).scoreTween;
    expect(secondTween).not.toBe(firstTween);
    expect((hud as any).currentScore).toBe(50);
  });

  it('should update displayScore during animation updates', () => {
    eventBus.emit('score:updated', {
      totalScore: 100,
      earnedScore: 100,
      chainCount: 1,
    });
    (hud as any).displayScore = 0;
    (hud as any).scoreProxy.value = 0;
    (hud as any).scoreTween = null;
    hud.update(0.016);
    expect((hud as any).displayScore).toBeGreaterThanOrEqual(1);
  });

  it('should complete animation with skipAnimation setting displayScore to currentScore', () => {
    eventBus.emit('score:updated', {
      totalScore: 200,
      earnedScore: 50,
      chainCount: 3,
    });
    hud.skipAnimation();
    expect((hud as any).displayScore).toBe(200);
    expect((hud as any).currentScore).toBe(200);
    expect((hud as any).scoreTween).toBeNull();
    expect(hud.scoreText.text).toContain('200');
  });

  it('should reset displayScore to 0 when reset is called', () => {
    eventBus.emit('score:updated', {
      totalScore: 500,
      earnedScore: 100,
      chainCount: 2,
    });
    hud.reset();
    expect((hud as any).currentScore).toBe(0);
    expect((hud as any).displayScore).toBe(0);
    expect((hud as any).scoreTween).toBeNull();
    expect(hud.scoreText.text).toBe('Score: 0');
  });

  it('should not call animateScore from update when tween is active', () => {
    eventBus.emit('score:updated', {
      totalScore: 50,
      earnedScore: 10,
      chainCount: 1,
    });
    const tween = (hud as any).scoreTween;
    expect(tween).toBeDefined();
    const displayBefore = (hud as any).displayScore;
    hud.update(0.016);
    expect((hud as any).scoreTween).toBe(tween);
  });

  it('should use fallback interpolation when tween is null and display < current', () => {
    (hud as any).currentScore = 30;
    (hud as any).displayScore = 5;
    (hud as any).scoreTween = null;
    hud.update(0.016);
    expect((hud as any).displayScore).toBeGreaterThan(5);
    expect((hud as any).displayScore).toBeLessThanOrEqual(30);
  });

  it('should not exceed currentScore in fallback interpolation', () => {
    (hud as any).currentScore = 10;
    (hud as any).displayScore = 9;
    (hud as any).scoreTween = null;
    hud.update(0.016);
    expect((hud as any).displayScore).toBe(10);
  });

  it('should not update when displayScore equals currentScore', () => {
    (hud as any).currentScore = 50;
    (hud as any).displayScore = 50;
    (hud as any).scoreTween = null;
    const displayBefore = (hud as any).displayScore;
    hud.update(0.016);
    expect((hud as any).displayScore).toBe(displayBefore);
  });

  it('should handle rapid consecutive score events', () => {
    for (let i = 1; i <= 5; i++) {
      eventBus.emit('score:updated', {
        totalScore: i * 10,
        earnedScore: 10,
        chainCount: 1,
      });
    }
    expect((hud as any).currentScore).toBe(50);
    expect((hud as any).scoreTween).toBeDefined();
  });

  it('should allow fallback update to reach exact currentScore', () => {
    (hud as any).currentScore = 3;
    (hud as any).displayScore = 0;
    (hud as any).scoreTween = null;
    for (let i = 0; i < 20; i++) {
      hud.update(0.016);
    }
    expect((hud as any).displayScore).toBe(3);
    expect(hud.scoreText.text).toContain('3');
  });
});
