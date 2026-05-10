import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameHUD } from '../src/ui/hud/GameHUD';
import { eventBus } from '../src/utils/EventBus';
import { PropSystem } from '../src/gameplay/props/PropSystem';
import { PropType } from '../src/gameplay/props/Prop';

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
});
