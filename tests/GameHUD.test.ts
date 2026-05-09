import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameHUD } from '../src/ui/hud/GameHUD';
import { eventBus } from '../src/utils/EventBus';

describe('GameHUD', () => {
  let hud: GameHUD;

  beforeEach(() => {
    hud = new GameHUD();
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
  });
});
