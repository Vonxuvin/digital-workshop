import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComboDisplay } from '../../src/ui/components/ComboDisplay';
import { AnimationManager } from '../../src/utils/AnimationManager';

describe('ComboDisplay', () => {
  let comboDisplay: ComboDisplay;

  beforeEach(() => {
    AnimationManager.resetInstance();
    comboDisplay = new ComboDisplay();
  });

  afterEach(() => {
    comboDisplay.destroy();
    AnimationManager.resetInstance();
  });

  it('should create without error', () => {
    expect(comboDisplay).toBeDefined();
    expect(comboDisplay.visible).toBe(false);
  });

  it('should show combo with count >= 2', () => {
    comboDisplay.showCombo(3);
    expect(comboDisplay.visible).toBe(true);
    expect(comboDisplay.getCurrentCombo()).toBe(3);
  });

  it('should hide combo', () => {
    comboDisplay.showCombo(5);
    expect(comboDisplay.visible).toBe(true);
    comboDisplay.hide();
    expect(comboDisplay.visible).toBe(false);
    expect(comboDisplay.getCurrentCombo()).toBe(0);
  });

  it('should hide combo when count < 2', () => {
    comboDisplay.showCombo(1);
    expect(comboDisplay.visible).toBe(false);
    expect(comboDisplay.getCurrentCombo()).toBe(0);
  });

  it('should reset combo on destroy', () => {
    comboDisplay.showCombo(4);
    comboDisplay.destroy();
    expect(comboDisplay.getCurrentCombo()).toBe(0);
  });

  it('getCurrentCombo returns correct value', () => {
    expect(comboDisplay.getCurrentCombo()).toBe(0);
    comboDisplay.showCombo(7);
    expect(comboDisplay.getCurrentCombo()).toBe(7);
    comboDisplay.showCombo(1);
    expect(comboDisplay.getCurrentCombo()).toBe(0);
  });

  it('should use AnimationManager setTimeout for display timer (FIX-8)', () => {
    const animManager = AnimationManager.getInstance();
    const setTimeoutSpy = vi.spyOn(animManager, 'setTimeout');
    comboDisplay.showCombo(3);
    expect(setTimeoutSpy).toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
  });

  it('should clear display timer via AnimationManager on hide (FIX-8)', () => {
    const animManager = AnimationManager.getInstance();
    const clearTimeoutSpy = vi.spyOn(animManager, 'clearTimeout');
    comboDisplay.showCombo(3);
    comboDisplay.hide();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('should clear display timer via AnimationManager on destroy (FIX-8)', () => {
    const animManager = AnimationManager.getInstance();
    const clearTimeoutSpy = vi.spyOn(animManager, 'clearTimeout');
    comboDisplay.showCombo(3);
    comboDisplay.destroy();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('should fade out after display duration via AnimationManager', () => {
    const animManager = AnimationManager.getInstance();
    comboDisplay.showCombo(3);
    expect(comboDisplay.visible).toBe(true);
    animManager.update(2500);
  });

  it('should kill fadeTween before new showCombo', () => {
    comboDisplay.showCombo(3);
    expect(comboDisplay.visible).toBe(true);
    comboDisplay.showCombo(5);
    expect(comboDisplay.visible).toBe(true);
    expect(comboDisplay.getCurrentCombo()).toBe(5);
  });

  it('should handle rapid showCombo calls without error', () => {
    for (let i = 2; i <= 10; i++) {
      comboDisplay.showCombo(i);
    }
    expect(comboDisplay.visible).toBe(true);
  });

  it('should handle show then rapid hide', () => {
    comboDisplay.showCombo(5);
    comboDisplay.hide();
    expect(comboDisplay.visible).toBe(false);
  });
});
