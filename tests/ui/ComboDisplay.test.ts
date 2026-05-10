import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComboDisplay } from '../../src/ui/components/ComboDisplay';

describe('ComboDisplay', () => {
  let comboDisplay: ComboDisplay;

  beforeEach(() => {
    vi.useFakeTimers();
    comboDisplay = new ComboDisplay();
  });

  afterEach(() => {
    comboDisplay.destroy();
    vi.useRealTimers();
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
});
