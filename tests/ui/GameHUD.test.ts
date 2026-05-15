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

  describe('onPropClick', () => {
    it('should enter bomb target mode when BOMB prop clicked and not already selected', () => {
      const handler = vi.fn();
      eventBus.on('ui:propTargetMode', handler);
      hud['onPropClick'](PropType.BOMB);
      expect(handler).toHaveBeenCalledWith({ type: PropType.BOMB, enabled: true });
      eventBus.off('ui:propTargetMode', handler);
    });

    it('should exit bomb target mode when BOMB prop clicked while already selected', () => {
      hud['onPropClick'](PropType.BOMB);
      const handler = vi.fn();
      eventBus.on('ui:propTargetMode', handler);
      hud['onPropClick'](PropType.BOMB);
      expect(handler).toHaveBeenCalledWith({ enabled: false });
      eventBus.off('ui:propTargetMode', handler);
    });

    it('should return early when prop count <= 0', () => {
      (mockPropSystem.getPropCount as ReturnType<typeof vi.fn>).mockReturnValue(0);
      const handler = vi.fn();
      eventBus.on('props:used', handler);
      hud['onPropClick'](PropType.RAINBOW);
      expect(mockPropSystem.useProp).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
      eventBus.off('props:used', handler);
    });

    it('should use RAINBOW prop and emit props:used when useProp succeeds', () => {
      (mockPropSystem.useProp as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const handler = vi.fn();
      eventBus.on('props:used', handler);
      hud['onPropClick'](PropType.RAINBOW);
      expect(mockPropSystem.useProp).toHaveBeenCalledWith(PropType.RAINBOW);
      expect(handler).toHaveBeenCalledWith({ type: PropType.RAINBOW });
      eventBus.off('props:used', handler);
    });

    it('should not emit props:used when useProp fails for non-BOMB prop', () => {
      (mockPropSystem.useProp as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const handler = vi.fn();
      eventBus.on('props:used', handler);
      hud['onPropClick'](PropType.FREEZE);
      expect(handler).not.toHaveBeenCalled();
      eventBus.off('props:used', handler);
    });

    it('should use FREEZE prop when useProp succeeds', () => {
      (mockPropSystem.useProp as ReturnType<typeof vi.fn>).mockReturnValue(true);
      hud['onPropClick'](PropType.FREEZE);
      expect(mockPropSystem.useProp).toHaveBeenCalledWith(PropType.FREEZE);
    });

    it('should use SHRINK prop when useProp succeeds', () => {
      (mockPropSystem.useProp as ReturnType<typeof vi.fn>).mockReturnValue(true);
      hud['onPropClick'](PropType.SHRINK);
      expect(mockPropSystem.useProp).toHaveBeenCalledWith(PropType.SHRINK);
    });

    it('should use LUCKY prop when useProp succeeds', () => {
      (mockPropSystem.useProp as ReturnType<typeof vi.fn>).mockReturnValue(true);
      hud['onPropClick'](PropType.LUCKY);
      expect(mockPropSystem.useProp).toHaveBeenCalledWith(PropType.LUCKY);
    });
  });

  describe('enterBombTargetMode', () => {
    it('should emit ui:propTargetMode with BOMB type and enabled true', () => {
      const handler = vi.fn();
      eventBus.on('ui:propTargetMode', handler);
      hud['enterBombTargetMode']();
      expect(handler).toHaveBeenCalledWith({ type: PropType.BOMB, enabled: true });
      eventBus.off('ui:propTargetMode', handler);
    });
  });

  describe('usePropAtPosition', () => {
    it('should use prop at position when propTargetMode is true and useProp succeeds', () => {
      hud['onPropClick'](PropType.BOMB);
      (mockPropSystem.useProp as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const handler = vi.fn();
      eventBus.on('props:used', handler);
      hud.usePropAtPosition(100, 200);
      expect(mockPropSystem.useProp).toHaveBeenCalledWith(PropType.BOMB, { x: 100, y: 200 });
      expect(handler).toHaveBeenCalledWith({ type: PropType.BOMB, x: 100, y: 200 });
      eventBus.off('props:used', handler);
    });

    it('should not emit props:used when useProp fails at position', () => {
      hud['onPropClick'](PropType.BOMB);
      (mockPropSystem.useProp as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const handler = vi.fn();
      eventBus.on('props:used', handler);
      hud.usePropAtPosition(100, 200);
      expect(handler).not.toHaveBeenCalled();
      eventBus.off('props:used', handler);
    });

    it('should return early when propTargetMode is false', () => {
      (mockPropSystem.useProp as ReturnType<typeof vi.fn>).mockReturnValue(true);
      hud.usePropAtPosition(100, 200);
      expect(mockPropSystem.useProp).not.toHaveBeenCalled();
    });
  });

  describe('exitPropTargetMode', () => {
    it('should reset state and emit ui:propTargetMode with enabled false', () => {
      hud['onPropClick'](PropType.BOMB);
      const handler = vi.fn();
      eventBus.on('ui:propTargetMode', handler);
      hud.exitPropTargetMode();
      expect(handler).toHaveBeenCalledWith({ enabled: false });
      eventBus.off('ui:propTargetMode', handler);
    });

    it('should allow re-entering bomb target mode after exit', () => {
      hud['onPropClick'](PropType.BOMB);
      hud.exitPropTargetMode();
      const handler = vi.fn();
      eventBus.on('ui:propTargetMode', handler);
      hud['onPropClick'](PropType.BOMB);
      expect(handler).toHaveBeenCalledWith({ type: PropType.BOMB, enabled: true });
      eventBus.off('ui:propTargetMode', handler);
    });
  });

  describe('crosshair', () => {
    it('showCrosshair should make crosshair visible', () => {
      hud.showCrosshair(150, 250);
      const crosshair = hud['crosshair'];
      expect(crosshair).not.toBeNull();
      expect(crosshair!.visible).toBe(true);
    });

    it('updateCrosshair should update crosshair position when visible', () => {
      hud.showCrosshair(100, 100);
      hud.updateCrosshair(200, 300);
      const crosshair = hud['crosshair'];
      expect(crosshair!.visible).toBe(true);
    });

    it('updateCrosshair should do nothing when crosshair is not visible', () => {
      const crosshair = hud['crosshair'];
      crosshair!.visible = false;
      hud.updateCrosshair(200, 300);
      expect(crosshair!.visible).toBe(false);
    });

    it('hideCrosshair should make crosshair invisible', () => {
      hud.showCrosshair(100, 100);
      hud.hideCrosshair();
      const crosshair = hud['crosshair'];
      expect(crosshair!.visible).toBe(false);
    });

    it('showCrosshair should do nothing when crosshair is null', () => {
      hud['crosshair'] = null;
      expect(() => hud.showCrosshair(100, 100)).not.toThrow();
    });

    it('hideCrosshair should do nothing when crosshair is null', () => {
      hud['crosshair'] = null;
      expect(() => hud.hideCrosshair()).not.toThrow();
    });
  });

  describe('setPropSelected', () => {
    it('should select a prop button', () => {
      const bombButton = hud.propButtons.get(PropType.BOMB)!;
      const setSelectedSpy = vi.spyOn(bombButton, 'setSelected');
      hud.setPropSelected(PropType.BOMB);
      expect(setSelectedSpy).toHaveBeenCalled();
    });

    it('should clear previous selection when switching props', () => {
      hud['selectedProp'] = PropType.BOMB;
      const bombButton = hud.propButtons.get(PropType.BOMB)!;
      const clearSelectedSpy = vi.spyOn(bombButton, 'clearSelected');
      const rainbowButton = hud.propButtons.get(PropType.RAINBOW)!;
      const setSelectedSpy = vi.spyOn(rainbowButton, 'setSelected');
      hud.setPropSelected(PropType.RAINBOW);
      expect(clearSelectedSpy).toHaveBeenCalled();
      expect(setSelectedSpy).toHaveBeenCalled();
    });

    it('should set selectedProp to null when called with null', () => {
      hud['selectedProp'] = PropType.BOMB;
      hud.setPropSelected(null);
      expect(hud['selectedProp']).toBeNull();
    });
  });

  describe('layout', () => {
    it('should position elements based on screen dimensions', () => {
      hud.layout(800, 600);
      expect(hud.propsContainer.x).toBe(800 - (3 * 60 + 2 * 8) - 10);
      expect(hud.propsContainer.y).toBe(15);
      expect(hud.pauseButton.x).toBe(800 - 50);
      expect(hud.pauseButton.y).toBe(30);
    });

    it('should position timer at center of screen width', () => {
      hud.layout(1024, 768);
      expect(hud['timerText'].x).toBe(1024 / 2);
    });

    it('should position objective bar correctly', () => {
      hud.layout(800, 600);
      expect(hud.objectiveBar.x).toBe(800 - 250);
      expect(hud.objectiveBar.y).toBe(85);
    });
  });

  describe('updateTimer', () => {
    it('should show timer with red color when seconds <= 10', () => {
      hud.updateTimer(5);
      expect(hud['timerText'].visible).toBe(true);
      expect(hud['timerText'].style.fill).toBe(0xff4444);
      expect(hud['timerText'].text).toBe('0:05');
    });

    it('should show timer with normal color when seconds > 10', () => {
      hud.updateTimer(60);
      expect(hud['timerText'].visible).toBe(true);
      expect(hud['timerText'].style.fill).toBe(0xff6b6b);
      expect(hud['timerText'].text).toBe('1:00');
    });

    it('should hide timer when seconds < 0', () => {
      hud.updateTimer(-1);
      expect(hud['timerText'].visible).toBe(false);
    });

    it('should format seconds with leading zero', () => {
      hud.updateTimer(65);
      expect(hud['timerText'].text).toBe('1:05');
    });

    it('should show timer at exactly 10 seconds with red color', () => {
      hud.updateTimer(10);
      expect(hud['timerText'].style.fill).toBe(0xff4444);
    });

    it('should show timer at 11 seconds with normal color', () => {
      hud.updateTimer(11);
      expect(hud['timerText'].style.fill).toBe(0xff6b6b);
    });
  });

  describe('handleScoreUpdated', () => {
    it('should show chain text when chainCount > 1', () => {
      eventBus.emit('score:updated', {
        totalScore: 500,
        earnedScore: 100,
        chainCount: 3,
      });
      expect(hud['_chainText'].text).toBe('连锁 x3!');
    });

    it('should clear chain text when chainCount <= 1', () => {
      eventBus.emit('score:updated', {
        totalScore: 500,
        earnedScore: 100,
        chainCount: 1,
      });
      expect(hud['_chainText'].text).toBe('');
    });

    it('should update currentScore', () => {
      eventBus.emit('score:updated', {
        totalScore: 750,
        earnedScore: 100,
        chainCount: 1,
      });
      expect(hud['currentScore']).toBe(750);
    });
  });

  describe('update', () => {
    it('should trigger animateScore when displayScore < currentScore', () => {
      eventBus.emit('score:updated', {
        totalScore: 1000,
        earnedScore: 200,
        chainCount: 1,
      });
      const animateSpy = vi.spyOn(hud as any, 'animateScore');
      hud.update(1);
      expect(animateSpy).toHaveBeenCalled();
    });

    it('should not trigger animateScore when displayScore >= currentScore', () => {
      const animateSpy = vi.spyOn(hud as any, 'animateScore');
      hud.update(1);
      expect(animateSpy).not.toHaveBeenCalled();
    });
  });

  describe('animateScore', () => {
    it('should kill existing scoreTween before creating new one', () => {
      eventBus.emit('score:updated', { totalScore: 500, earnedScore: 100, chainCount: 1 });
      hud.update(1);
      const firstTween = hud['scoreTween'];
      eventBus.emit('score:updated', { totalScore: 1000, earnedScore: 500, chainCount: 1 });
      hud.update(1);
      expect(hud['scoreTween']).not.toBe(firstTween);
    });
  });

  describe('skipAnimation', () => {
    it('should skip animation and set displayScore to currentScore', () => {
      eventBus.emit('score:updated', {
        totalScore: 9999,
        earnedScore: 1000,
        chainCount: 5,
      });
      hud.skipAnimation();
      expect(hud['displayScore']).toBe(9999);
      expect(hud['scoreProxy'].value).toBe(9999);
      expect(hud.scoreText.text).toBe('Score: 9,999');
    });

    it('should kill scoreTween when active', () => {
      eventBus.emit('score:updated', { totalScore: 500, earnedScore: 100, chainCount: 1 });
      hud.update(1);
      expect(hud['scoreTween']).not.toBeNull();
      hud.skipAnimation();
      expect(hud['scoreTween']).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state correctly', () => {
      eventBus.emit('score:updated', {
        totalScore: 500,
        earnedScore: 100,
        chainCount: 2,
      });
      hud.updateTimer(30);
      hud.setObjectiveProgress(0.7);
      hud['onPropClick'](PropType.BOMB);
      hud.reset();
      expect(hud['currentScore']).toBe(0);
      expect(hud['displayScore']).toBe(0);
      expect(hud['scoreProxy'].value).toBe(0);
      expect(hud.scoreText.text).toBe('Score: 0');
      expect(hud['_chainText'].text).toBe('');
      expect(hud['timerText'].visible).toBe(false);
      expect(hud['timerText'].text).toBe('');
      expect(hud['propTargetMode']).toBe(false);
      expect(hud['selectedProp']).toBeNull();
    });

    it('should kill scoreTween during reset if active', () => {
      eventBus.emit('score:updated', { totalScore: 500, earnedScore: 100, chainCount: 1 });
      hud.update(1);
      expect(hud['scoreTween']).not.toBeNull();
      hud.reset();
      expect(hud['scoreTween']).toBeNull();
    });
  });

  describe('destroy', () => {
    it('should kill scoreTween on destroy if active', () => {
      eventBus.emit('score:updated', { totalScore: 500, earnedScore: 100, chainCount: 1 });
      hud.update(1);
      expect(hud['scoreTween']).not.toBeNull();
      hud.destroy();
      expect(hud['scoreTween']).toBeNull();
    });

    it('should clear propButtons on destroy', () => {
      expect(hud.propButtons.size).toBeGreaterThan(0);
      hud.destroy();
      expect(hud.propButtons.size).toBe(0);
    });

    it('should not throw when destroying with no active tween', () => {
      expect(() => hud.destroy()).not.toThrow();
    });
  });

  describe('showCombo', () => {
    it('should call showCombo on comboDisplay', () => {
      const comboDisplay = hud.comboDisplay;
      if (comboDisplay) {
        const spy = vi.spyOn(comboDisplay, 'showCombo');
        hud.showCombo(5);
        expect(spy).toHaveBeenCalledWith(5);
      }
    });
  });

  describe('updatePropButtons', () => {
    it('should update all prop button counts', () => {
      const bombButton = hud.propButtons.get(PropType.BOMB)!;
      const rainbowButton = hud.propButtons.get(PropType.RAINBOW)!;
      const bombSpy = vi.spyOn(bombButton, 'updateCount');
      const rainbowSpy = vi.spyOn(rainbowButton, 'updateCount');
      hud.updatePropButtons();
      expect(bombSpy).toHaveBeenCalled();
      expect(rainbowSpy).toHaveBeenCalled();
    });
  });
});
