import { describe, it, expect } from 'vitest';
import { PropButton } from '../../src/ui/components/PropButton';
import { PropType } from '../../src/gameplay/props/Prop';

describe('PropButton dynamic sizing (FIX-12)', () => {
  const createButton = (size?: number) => {
    return new PropButton({
      propType: PropType.BOMB,
      icon: 'bomb',
      count: 3,
      onClick: () => {},
      x: 0,
      y: 0,
      size,
    });
  };

  it('should create button with default size 60', () => {
    const btn = createButton();
    expect(btn).toBeDefined();
    btn.destroy();
  });

  it('should create button with custom size', () => {
    const btn = createButton(40);
    expect(btn).toBeDefined();
    btn.destroy();
  });

  it('should resize button dynamically', () => {
    const btn = createButton(60);
    expect(() => btn.resize(40)).not.toThrow();
    btn.destroy();
  });

  it('should not resize if same size', () => {
    const btn = createButton(60);
    expect(() => btn.resize(60)).not.toThrow();
    btn.destroy();
  });

  it('should handle resize to smaller size', () => {
    const btn = createButton(60);
    expect(() => btn.resize(30)).not.toThrow();
    btn.destroy();
  });

  it('should handle resize to larger size', () => {
    const btn = createButton(40);
    expect(() => btn.resize(80)).not.toThrow();
    btn.destroy();
  });

  it('should update count display', () => {
    const btn = createButton();
    expect(() => btn.updateCount(5)).not.toThrow();
    btn.destroy();
  });

  it('should disable when count is 0', () => {
    const btn = createButton();
    btn.updateCount(0);
    expect(btn.alpha).toBe(0.5);
    btn.destroy();
  });

  it('should enable when count > 0', () => {
    const btn = createButton();
    btn.updateCount(0);
    btn.updateCount(3);
    expect(btn.alpha).toBe(1);
    btn.destroy();
  });

  it('should set selected state', () => {
    const btn = createButton();
    expect(() => btn.setSelected()).not.toThrow();
    btn.destroy();
  });

  it('should clear selected state', () => {
    const btn = createButton();
    btn.setSelected();
    expect(() => btn.clearSelected()).not.toThrow();
    btn.destroy();
  });

  it('should show cooldown overlay', () => {
    const btn = createButton();
    expect(() => btn.showCooldown(0.5)).not.toThrow();
    btn.destroy();
  });

  it('should handle pointer events', () => {
    const btn = createButton();
    expect(btn.eventMode).toBe('static');
    btn.destroy();
  });
});
