import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LevelSelectScreen } from '../../../src/ui/screens/LevelSelectScreen';
import { SaveManager } from '../../../src/core/SaveManager';
import { LevelLoader } from '../../../src/core/LevelLoader';

function createLevelConfig(id: number, name: string = `关卡 ${id}`, objectiveType: string = 'score', target: number = 300) {
  return {
    id,
    name,
    objective: { type: objectiveType, target },
    container: { width: 400, height: 600 },
    spawn: { availableNumbers: [1, 2, 4] },
    rewards: { stars: [300, 400, 500] },
  };
}

function setupLevelLoader(count: number = 15): LevelLoader {
  const loader = new LevelLoader();
  for (let i = 1; i <= count; i++) {
    loader.loadFromData(i, createLevelConfig(i));
  }
  return loader;
}

describe('LevelSelectScreen', () => {
  let screen: LevelSelectScreen;

  beforeEach(() => {
    const saveManager = new SaveManager();
    const levelLoader = new LevelLoader();
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

  describe('Callback invocations', () => {
    it('should invoke onBack when back button is clicked', () => {
      const onBack = vi.fn();
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(onBack, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const backButton = (testScreen as any).backButton;
      backButton.emit('pointerdown', {});
      expect(onBack).toHaveBeenCalledOnce();
    });

    it('should invoke onSelectLevel when unlocked card is clicked', () => {
      const onSelectLevel = vi.fn();
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, onSelectLevel, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const levelCards = (testScreen as any).levelCards;
      const firstCard = levelCards[0];
      firstCard.emit('pointerdown', {});
      expect(onSelectLevel).toHaveBeenCalledWith(1);
    });

    it('should not invoke onSelectLevel when locked card is clicked', () => {
      const onSelectLevel = vi.fn();
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, onSelectLevel, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const levelCards = (testScreen as any).levelCards;
      const lockedCard = levelCards[1];
      lockedCard.emit('pointerdown', {});
      expect(onSelectLevel).not.toHaveBeenCalled();
    });
  });

  describe('Scroll interactions', () => {
    it('should start dragging on pointerdown', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      testScreen.container.emit('pointerdown', { global: { y: 100 } });
      expect((testScreen as any).isDragging).toBe(true);
      expect((testScreen as any).dragStartY).toBe(100);
      expect((testScreen as any).dragStartScrollY).toBe(0);
    });

    it('should update scroll position on pointermove while dragging', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      testScreen.container.emit('pointerdown', { global: { y: 200 } });
      testScreen.container.emit('pointermove', { global: { y: 100 } });
      expect((testScreen as any).scrollY).toBe(100);
      expect(testScreen.scrollContainer.y).toBe(80 - 100);
    });

    it('should not update scroll on pointermove while not dragging', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const initialScrollY = (testScreen as any).scrollY;
      testScreen.container.emit('pointermove', { global: { y: 100 } });
      expect((testScreen as any).scrollY).toBe(initialScrollY);
    });

    it('should stop dragging on pointerup', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      testScreen.container.emit('pointerdown', { global: { y: 100 } });
      expect((testScreen as any).isDragging).toBe(true);
      testScreen.container.emit('pointerup', {});
      expect((testScreen as any).isDragging).toBe(false);
    });

    it('should stop dragging on pointerupoutside', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      testScreen.container.emit('pointerdown', { global: { y: 100 } });
      expect((testScreen as any).isDragging).toBe(true);
      testScreen.container.emit('pointerupoutside', {});
      expect((testScreen as any).isDragging).toBe(false);
    });

    it('should clamp scrollY to maxScrollY when scrolling too far down', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const maxScrollY = (testScreen as any).maxScrollY;
      testScreen.container.emit('pointerdown', { global: { y: 100 } });
      testScreen.container.emit('pointermove', { global: { y: -10000 } });
      expect((testScreen as any).scrollY).toBe(maxScrollY);
    });

    it('should clamp scrollY to 0 when scrolling too far up', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      testScreen.container.emit('pointerdown', { global: { y: 100 } });
      testScreen.container.emit('pointermove', { global: { y: 10000 } });
      expect((testScreen as any).scrollY).toBe(0);
    });

    it('should scroll from a non-zero starting position', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      testScreen.container.emit('pointerdown', { global: { y: 200 } });
      testScreen.container.emit('pointermove', { global: { y: 100 } });
      const midScrollY = (testScreen as any).scrollY;
      expect(midScrollY).toBe(100);
      testScreen.container.emit('pointerup', {});
      testScreen.container.emit('pointerdown', { global: { y: 150 } });
      testScreen.container.emit('pointermove', { global: { y: 100 } });
      expect((testScreen as any).scrollY).toBe(midScrollY + 50);
    });
  });

  describe('Level card states', () => {
    it('should create completed level card with correct data', () => {
      const saveManager = new SaveManager();
      saveManager.updateLevelProgress(1, 100, 60, 3, true);
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const levelData = (testScreen as any).levelData;
      expect(levelData[0].completed).toBe(true);
      expect(levelData[0].earnedStars).toBe(3);
      expect(levelData[0].bestScore).toBe(100);
      expect(levelData[0].unlocked).toBe(true);
    });

    it('should create unlocked but not completed level card', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const levelData = (testScreen as any).levelData;
      expect(levelData[0].unlocked).toBe(true);
      expect(levelData[0].completed).toBe(false);
      expect(levelData[0].bestScore).toBe(0);
      expect(levelData[0].earnedStars).toBe(0);
    });

    it('should create locked level card', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const levelData = (testScreen as any).levelData;
      expect(levelData[1].unlocked).toBe(false);
      expect(levelData[1].completed).toBe(false);
    });

    it('should create card with non-score objective type', () => {
      const saveManager = new SaveManager();
      const levelLoader = new LevelLoader();
      levelLoader.loadFromData(1, createLevelConfig(1, '合成挑战', 'target_merge', 16));
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const levelData = (testScreen as any).levelData;
      expect(levelData[0].objectiveType).toBe('target_merge');
      expect(levelData[0].objectiveTarget).toBe(16);
    });

    it('should create unlocked card for level 2 after completing level 1', () => {
      const saveManager = new SaveManager();
      saveManager.updateLevelProgress(1, 100, 60, 2, true);
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const levelData = (testScreen as any).levelData;
      expect(levelData[0].completed).toBe(true);
      expect(levelData[1].unlocked).toBe(true);
      expect(levelData[1].completed).toBe(false);
    });
  });

  describe('show() method', () => {
    it('should set screenWidth and screenHeight when called with parameters', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.show(1024, 768);
      expect((testScreen as any).screenWidth).toBe(1024);
      expect((testScreen as any).screenHeight).toBe(768);
    });

    it('should use default dimensions when called without parameters', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.show();
      expect((testScreen as any).screenWidth).toBe(800);
      expect((testScreen as any).screenHeight).toBe(600);
    });

    it('should set only screenWidth when only one parameter is provided', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.show(1024);
      expect((testScreen as any).screenWidth).toBe(1024);
      expect((testScreen as any).screenHeight).toBe(600);
    });
  });

  describe('updateLevelProgress', () => {
    it('should update existing level data with stars and completed flag', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      testScreen.updateLevelProgress(1, 3);
      const levelData = (testScreen as any).levelData;
      expect(levelData[0].earnedStars).toBe(3);
      expect(levelData[0].completed).toBe(true);
    });

    it('should keep maximum stars when updating with fewer stars', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      testScreen.updateLevelProgress(1, 3);
      testScreen.updateLevelProgress(1, 1);
      const levelData = (testScreen as any).levelData;
      expect(levelData[0].earnedStars).toBe(3);
      expect(levelData[0].completed).toBe(true);
    });

    it('should update stars for higher level', () => {
      const saveManager = new SaveManager();
      saveManager.updateLevelProgress(1, 100, 60, 3, true);
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      testScreen.updateLevelProgress(2, 2);
      const levelData = (testScreen as any).levelData;
      expect(levelData[1].earnedStars).toBe(2);
      expect(levelData[1].completed).toBe(true);
    });
  });

  describe('Scroll indicator', () => {
    it('should be visible when content overflows (maxScrollY > 0)', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader(15);
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      expect((testScreen as any).maxScrollY).toBeGreaterThan(0);
      expect((testScreen as any).scrollIndicator.visible).toBe(true);
    });

    it('should be hidden when content fits (maxScrollY <= 0)', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader(2);
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 2000);
      expect((testScreen as any).maxScrollY).toBe(0);
      expect((testScreen as any).scrollIndicator.visible).toBe(false);
    });

    it('should update scroll indicator position during scroll', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader(15);
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      expect((testScreen as any).scrollIndicator.visible).toBe(true);
      testScreen.container.emit('pointerdown', { global: { y: 200 } });
      testScreen.container.emit('pointermove', { global: { y: 100 } });
      expect((testScreen as any).scrollY).toBeGreaterThan(0);
      expect((testScreen as any).scrollIndicator.visible).toBe(true);
    });
  });

  describe('onHide', () => {
    it('should reset scrollY and isDragging', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      testScreen.container.emit('pointerdown', { global: { y: 200 } });
      testScreen.container.emit('pointermove', { global: { y: 100 } });
      expect((testScreen as any).scrollY).toBeGreaterThan(0);
      expect((testScreen as any).isDragging).toBe(true);
      testScreen.onHide();
      expect((testScreen as any).scrollY).toBe(0);
      expect((testScreen as any).isDragging).toBe(false);
    });

    it('should reset scrollY to 0 even when not dragging', () => {
      const saveManager = new SaveManager();
      const levelLoader = setupLevelLoader();
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      testScreen.container.emit('pointerdown', { global: { y: 200 } });
      testScreen.container.emit('pointermove', { global: { y: 100 } });
      testScreen.container.emit('pointerup', {});
      expect((testScreen as any).isDragging).toBe(false);
      expect((testScreen as any).scrollY).toBeGreaterThan(0);
      testScreen.onHide();
      expect((testScreen as any).scrollY).toBe(0);
    });
  });

  describe('loadLevelData fallback branches', () => {
    it('should use default objectiveType and target when config has no objective', () => {
      const saveManager = new SaveManager();
      const levelLoader = new LevelLoader();
      (levelLoader as any).levelConfigs.set(1, {
        id: 1,
        name: 'No Objective Level',
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
      });
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const levelData = (testScreen as any).levelData;
      expect(levelData[0].objectiveType).toBe('score');
      expect(levelData[0].objectiveTarget).toBe(0);
    });

    it('should use default stars when config has no rewards.stars', () => {
      const saveManager = new SaveManager();
      const levelLoader = new LevelLoader();
      levelLoader.loadFromData(1, {
        id: 1,
        name: 'No Stars Level',
        objective: { type: 'score', target: 300 },
        container: { width: 400, height: 600 },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: {},
      });
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const levelData = (testScreen as any).levelData;
      expect(levelData[0].stars).toEqual([0, 0, 0]);
    });

    it('should use default name when config has no name', () => {
      const saveManager = new SaveManager();
      const levelLoader = new LevelLoader();
      (levelLoader as any).levelConfigs.set(1, {
        id: 1,
        name: undefined,
        objective: { type: 'score', target: 300 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [100, 200, 300] },
      });
      const testScreen = new LevelSelectScreen(() => {}, () => {}, saveManager, levelLoader);
      testScreen.layout(800, 600);
      const levelData = (testScreen as any).levelData;
      expect(levelData[0].name).toBe('关卡 1');
    });
  });
});