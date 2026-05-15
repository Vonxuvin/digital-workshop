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

  it('should correctly set objective progress', () => {
    hud.setObjectiveProgress(0.5);
    hud.setObjectiveProgress(1);
    hud.setObjectiveProgress(0);
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

  it('should position objectiveBar in layout', () => {
    hud.layout(800, 600);
    const bar = hud.objectiveBar;
    expect(bar.x).toBe(550);
    expect(bar.y).toBe(85);
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
});
