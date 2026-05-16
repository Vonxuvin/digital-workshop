import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResultScreen } from '../../../src/ui/screens/ResultScreen';

describe('ResultScreen', () => {
  let screen: ResultScreen;

  beforeEach(() => {
    screen = new ResultScreen();
  });

  it('should create without error', () => {
    expect(screen).toBeDefined();
  });

  it('should set win result', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: true, score: 1000, stars: 3, levelId: 1 });
  });

  it('should set lose result', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: false, score: 200, stars: 0, levelId: 2 });
  });

  it('should show and hide without error', () => {
    screen.onShow();
    screen.onHide();
  });

  it('should set callbacks without error', () => {
    expect(() => screen.setCallbacks(
      () => {},
      () => {},
      () => {},
      () => {},
    )).not.toThrow();
  });

  it('should have container defined', () => {
    expect(screen.container).toBeDefined();
  });

  it('should show buttons for win result', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: true, score: 500, stars: 2, levelId: 1 });
    expect(screen.nextButton).not.toBeNull();
    expect(screen.retryButton).not.toBeNull();
    expect(screen.menuButton).not.toBeNull();
  });

  it('should show buttons for lose result', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: false, score: 200, stars: 0, levelId: 2 });
    expect(screen.retryButton).not.toBeNull();
    expect(screen.menuButton).not.toBeNull();
  });

  it('should destroy without error', () => {
    expect(() => screen.destroy()).not.toThrow();
  });

  it('should set result with full details', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({
      isWin: true,
      score: 1500,
      stars: 3,
      levelId: 3,
      levelName: 'Test Level',
      bestScore: 2000,
      playTime: 125,
      maxCombo: 5,
      mergedCount: 10,
    });
  });

  it('should handle layout', () => {
    expect(() => screen.layout(800, 600)).not.toThrow();
    expect(() => screen.layout(400, 300)).not.toThrow();
  });

  it('should handle show with dimensions', () => {
    expect(() => screen.show(1024, 768)).not.toThrow();
  });

  it('should handle hide', () => {
    screen.onShow();
    expect(() => screen.hide()).not.toThrow();
  });

  it('should handle starTimeline', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: true, score: 1000, stars: 3, levelId: 1 });
    expect(screen.starTimeline).toBeDefined();
  });

  it('should handle destroy with starTimeline', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: true, score: 1000, stars: 3, levelId: 1 });
    expect(() => screen.destroy()).not.toThrow();
  });

  it('should position nextButton at x=400 for win result', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: true, score: 1000, stars: 3, levelId: 1 });
    expect(screen.nextButton).not.toBeNull();
    expect(screen.nextButton!.x).toBe(400);
  });

  it('should handle repeated setResult calls', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: true, score: 500, stars: 2, levelId: 1 });
    screen.setResult({ isWin: false, score: 100, stars: 0, levelId: 1 });
    expect(() => screen.destroy()).not.toThrow();
  });

  it('should kill starTimeline on hide after win result', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: true, score: 1000, stars: 3, levelId: 1 });
    expect(screen.starTimeline).toBeDefined();
    screen.hide();
    expect(screen.starTimeline).toBeNull();
  });

  it('should handle update without error', () => {
    expect(() => screen.update()).not.toThrow();
  });

  it('should show revive button on lose result', () => {
    screen.setCallbacks(() => {}, () => {}, () => {}, () => {});
    screen.setResult({ isWin: false, score: 200, stars: 0, levelId: 2 });
    const reviveButton = (screen as any)._reviveButton;
    expect(reviveButton).not.toBeNull();
  });

  it('should handle show without arguments', () => {
    expect(() => screen.show()).not.toThrow();
  });

  it('should handle show with only width', () => {
    expect(() => screen.show(1024)).not.toThrow();
  });

  it('should handle show with only height', () => {
    expect(() => screen.show(undefined, 768)).not.toThrow();
  });

  it('should trigger win button callbacks on click', () => {
    const onNext = vi.fn();
    const onRetry = vi.fn();
    const onMenu = vi.fn();
    screen.setCallbacks(onNext, onRetry, onMenu, () => {});
    screen.setResult({ isWin: true, score: 1000, stars: 3, levelId: 1 });

    (screen.nextButton as any).emit('pointerdown');
    expect(onNext).toHaveBeenCalled();

    (screen.retryButton as any).emit('pointerdown');
    expect(onRetry).toHaveBeenCalled();

    (screen.menuButton as any).emit('pointerdown');
    expect(onMenu).toHaveBeenCalled();
  });

  it('should trigger lose button callbacks on click', () => {
    const onRevive = vi.fn();
    const onRetry = vi.fn();
    const onMenu = vi.fn();
    screen.setCallbacks(() => {}, onRetry, onMenu, onRevive);
    screen.setResult({ isWin: false, score: 200, stars: 0, levelId: 2 });

    const reviveButton = (screen as any)._reviveButton;
    (reviveButton as any).emit('pointerdown');
    expect(onRevive).toHaveBeenCalled();

    (screen.retryButton as any).emit('pointerdown');
    expect(onRetry).toHaveBeenCalled();

    (screen.menuButton as any).emit('pointerdown');
    expect(onMenu).toHaveBeenCalled();
  });
});