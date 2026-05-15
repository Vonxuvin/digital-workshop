import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LevelSelectScreen } from '../../../src/ui/screens/LevelSelectScreen';
import { SaveManager } from '../../../src/core/SaveManager';
import { LevelLoader } from '../../../src/core/LevelLoader';

describe('LevelSelectScreen', () => {
  let screen: LevelSelectScreen;
  let saveManager: SaveManager;
  let levelLoader: LevelLoader;

  const mockLevelConfigs = [
    {
      id: 1,
      name: '新手关卡',
      objective: { type: 'score' as const, target: 100 },
      container: { width: 400, height: 600, shape: 'rectangle' as const },
      spawn: { availableNumbers: [1, 2] },
      rewards: { stars: [50, 80, 100] },
    },
    {
      id: 2,
      name: '进阶关卡',
      objective: { type: 'survival' as const, target: 30, timeLimit: 30 },
      container: { width: 400, height: 600, shape: 'rectangle' as const },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [100, 150, 200] },
    },
    {
      id: 3,
      name: '高级关卡',
      objective: { type: 'score' as const, target: 500 },
      container: { width: 400, height: 600, shape: 'rectangle' as const },
      spawn: { availableNumbers: [1, 2, 4, 8] },
      rewards: { stars: [200, 300, 500] },
    },
  ];

  beforeEach(() => {
    saveManager = new SaveManager();
    levelLoader = new LevelLoader();

    vi.spyOn(levelLoader, 'getAllLevelConfigsSync').mockReturnValue(mockLevelConfigs as any);

    vi.spyOn(saveManager, 'getLevelProgress').mockImplementation((id: number) => {
      if (id === 1) {
        return { levelId: 1, unlocked: true, completed: true, highScore: 150, stars: 3, bestTime: 0, attempts: 1 };
      }
      if (id === 2) {
        return { levelId: 2, unlocked: true, completed: false, highScore: 80, stars: 1, bestTime: 0, attempts: 2 };
      }
      return { levelId: id, unlocked: false, completed: false, highScore: 0, stars: 0, bestTime: 0, attempts: 0 };
    });

    screen = new LevelSelectScreen(
      () => {},
      () => {},
      saveManager,
      levelLoader,
    );
  });

  it('should create without error', () => {
    expect(screen).toBeDefined();
  });

  it('should show and hide without error', () => {
    screen.onShow();
    screen.onHide();
  });

  it('should have container defined', () => {
    screen.onShow();
    expect(screen.container).toBeDefined();
  });

  it('should have scrollContainer defined', () => {
    screen.onShow();
    expect(screen.scrollContainer).toBeDefined();
  });

  it('should handle layout', () => {
    expect(() => screen.layout(800, 600)).not.toThrow();
  });

  it('should handle show with dimensions', () => {
    expect(() => screen.show(800, 600)).not.toThrow();
  });

  it('should handle update without error', () => {
    expect(() => screen.update()).not.toThrow();
  });

  it('should handle updateLevelProgress', () => {
    screen.onShow();
    expect(() => screen.updateLevelProgress(1, 3)).not.toThrow();
  });

  it('should handle updateLevelProgress for non-existent level', () => {
    screen.onShow();
    expect(() => screen.updateLevelProgress(999, 5)).not.toThrow();
  });

  it('should handle destroy', () => {
    screen.onShow();
    expect(() => screen.destroy()).not.toThrow();
  });

  it('should handle hide correctly', () => {
    screen.onShow();
    expect(() => screen.hide()).not.toThrow();
  });

  it('should handle layout with different dimensions', () => {
    screen.onShow();
    expect(() => screen.layout(400, 300)).not.toThrow();
    expect(() => screen.layout(1024, 768)).not.toThrow();
  });

  it('should handle multiple show/hide cycles', () => {
    screen.show(800, 600);
    screen.hide();
    screen.show(800, 600);
    screen.hide();
  });

  it('should handle onShow reloads level data', () => {
    screen.show(800, 600);
    screen.hide();
    expect(() => screen.onShow()).not.toThrow();
  });

  it('should handle pointer events on scroll container', () => {
    screen.show(800, 600);
    const container = screen.container;
    expect(container.eventMode).toBe('static');
  });

  it('should create level cards after layout when levels exist', () => {
    screen.show(800, 600);
    const scrollContainer = screen.scrollContainer;
    expect(scrollContainer).toBeDefined();
  });

  it('should handle back button interaction', () => {
    screen.show(800, 600);
    const backButton = (screen as any).backButton;
    expect(backButton).toBeDefined();
    expect(backButton.eventMode).toBe('static');
  });

  it('should handle scroll indicator creation', () => {
    screen.show(800, 600);
    const scrollIndicator = (screen as any).scrollIndicator;
    const scrollIndicatorTrack = (screen as any).scrollIndicatorTrack;
    expect(scrollIndicator).toBeDefined();
    expect(scrollIndicatorTrack).toBeDefined();
  });

  it('should handle layout with many levels', () => {
    screen.show(800, 600);
    expect(() => screen.layout(800, 1200)).not.toThrow();
  });

  it('should handle updateLevelProgress for completed level', () => {
    screen.show(800, 600);
    expect(() => screen.updateLevelProgress(1, 3)).not.toThrow();
    expect(() => screen.updateLevelProgress(1, 0)).not.toThrow();
  });

  it('should handle update without error after show', () => {
    screen.show(800, 600);
    expect(() => screen.update()).not.toThrow();
  });

  it('should handle scroll pointer down event', () => {
    screen.show(800, 600);
    const container = screen.container;
    container.emit('pointerdown' as any, { global: { x: 400, y: 200 } });
    expect((screen as any).isDragging).toBe(true);
  });

  it('should handle scroll pointer move event', () => {
    screen.show(800, 600);
    const container = screen.container;
    container.emit('pointerdown' as any, { global: { x: 400, y: 200 } });
    container.emit('pointermove' as any, { global: { x: 400, y: 150 } });
    expect((screen as any).scrollY).toBeGreaterThanOrEqual(0);
  });

  it('should handle scroll pointer up event', () => {
    screen.show(800, 600);
    const container = screen.container;
    container.emit('pointerdown' as any, { global: { x: 400, y: 200 } });
    container.emit('pointerup' as any, { global: { x: 400, y: 150 } });
    expect((screen as any).isDragging).toBe(false);
  });

  it('should handle pointerupoutside event', () => {
    screen.show(800, 600);
    const container = screen.container;
    container.emit('pointerdown' as any, { global: { x: 400, y: 200 } });
    container.emit('pointerupoutside' as any, { global: { x: 400, y: 150 } });
    expect((screen as any).isDragging).toBe(false);
  });

  it('should handle scroll with no drag', () => {
    screen.show(800, 600);
    const container = screen.container;
    container.emit('pointermove' as any, { global: { x: 400, y: 150 } });
    expect((screen as any).scrollY).toBe(0);
  });
});