import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TutorialManager } from '../../src/core/TutorialManager';
import { TutorialOverlay } from '../../src/ui/TutorialOverlay';
import { AnimationManager } from '../../src/utils/AnimationManager';

class MockSaveManager {
  private progress: Map<number, { completed: boolean; attempts: number }> = new Map();

  getLevelProgress(levelId: number) {
    if (!this.progress.has(levelId)) {
      this.progress.set(levelId, { completed: false, attempts: 0 });
    }
    return this.progress.get(levelId)!;
  }

  unlockLevel(levelId: number) {
    this.getLevelProgress(levelId);
  }
}

describe('FIX-10: TutorialManager expanded tutorials', () => {
  let tutorialManager: TutorialManager;
  let overlay: TutorialOverlay;
  let saveManager: MockSaveManager;

  beforeEach(() => {
    AnimationManager.resetInstance();
    overlay = new TutorialOverlay();
    saveManager = new MockSaveManager();
    tutorialManager = new TutorialManager(overlay, saveManager as any);
  });

  afterEach(() => {
    tutorialManager.destroy();
    overlay.destroy();
    AnimationManager.resetInstance();
  });

  describe('shouldShowTutorial', () => {
    it('should show tutorial for Level 1-5 when not completed and attempts < 5', () => {
      for (let i = 1; i <= 5; i++) {
        saveManager.getLevelProgress(i).attempts = 0;
        expect(tutorialManager.shouldShowTutorial(i)).toBe(true);
      }
    });

    it('should not show tutorial for Level 6+', () => {
      saveManager.unlockLevel(6);
      expect(tutorialManager.shouldShowTutorial(6)).toBe(false);
      expect(tutorialManager.shouldShowTutorial(7)).toBe(false);
    });

    it('should not show tutorial when attempts >= 5', () => {
      saveManager.getLevelProgress(1).attempts = 5;
      expect(tutorialManager.shouldShowTutorial(1)).toBe(false);
    });

    it('should show tutorial when attempts < 5', () => {
      saveManager.getLevelProgress(1).attempts = 4;
      expect(tutorialManager.shouldShowTutorial(1)).toBe(true);
    });

    it('should not show tutorial for completed levels', () => {
      saveManager.getLevelProgress(1).completed = true;
      expect(tutorialManager.shouldShowTutorial(1)).toBe(false);
    });

    it('should not show tutorial for level 0', () => {
      expect(tutorialManager.shouldShowTutorial(0)).toBe(false);
    });

    it('should not show tutorial for negative levels', () => {
      expect(tutorialManager.shouldShowTutorial(-1)).toBe(false);
    });
  });

  describe('Level 1 tutorial steps', () => {
    it('should have 5 steps for Level 1', () => {
      tutorialManager.startTutorial(1, 800, 600);
      const steps = tutorialManager.getSteps();
      expect(steps.length).toBe(5);
    });

    it('should start with welcome step', () => {
      tutorialManager.startTutorial(1, 800, 600);
      const steps = tutorialManager.getSteps();
      expect(steps[0].id).toBe('welcome');
    });

    it('should include drop and merge steps', () => {
      tutorialManager.startTutorial(1, 800, 600);
      const steps = tutorialManager.getSteps();
      const ids = steps.map(s => s.id);
      expect(ids).toContain('drop');
      expect(ids).toContain('merge');
    });
  });

  describe('Level 2 tutorial steps (enhanced)', () => {
    it('should have 6 steps for Level 2', () => {
      tutorialManager.startTutorial(2, 800, 600);
      const steps = tutorialManager.getSteps();
      expect(steps.length).toBe(6);
    });

    it('should include try_bomb step for interactive learning', () => {
      tutorialManager.startTutorial(2, 800, 600);
      const steps = tutorialManager.getSteps();
      const ids = steps.map(s => s.id);
      expect(ids).toContain('try_bomb');
    });

    it('should include all three prop introductions', () => {
      tutorialManager.startTutorial(2, 800, 600);
      const steps = tutorialManager.getSteps();
      const ids = steps.map(s => s.id);
      expect(ids).toContain('bomb_prop');
      expect(ids).toContain('rainbow_prop');
      expect(ids).toContain('freeze_prop');
    });
  });

  describe('Level 3 tutorial steps (enhanced)', () => {
    it('should have 6 steps for Level 3', () => {
      tutorialManager.startTutorial(3, 800, 600);
      const steps = tutorialManager.getSteps();
      expect(steps.length).toBe(6);
    });

    it('should include obstacle_strategy step', () => {
      tutorialManager.startTutorial(3, 800, 600);
      const steps = tutorialManager.getSteps();
      const ids = steps.map(s => s.id);
      expect(ids).toContain('obstacle_strategy');
    });

    it('should include shrink and lucky prop introductions', () => {
      tutorialManager.startTutorial(3, 800, 600);
      const steps = tutorialManager.getSteps();
      const ids = steps.map(s => s.id);
      expect(ids).toContain('shrink_prop');
      expect(ids).toContain('lucky_prop');
    });
  });

  describe('Level 4 tutorial steps (new)', () => {
    it('should have 4 steps for Level 4', () => {
      tutorialManager.startTutorial(4, 800, 600);
      const steps = tutorialManager.getSteps();
      expect(steps.length).toBe(4);
    });

    it('should include chain_tip step', () => {
      tutorialManager.startTutorial(4, 800, 600);
      const steps = tutorialManager.getSteps();
      const ids = steps.map(s => s.id);
      expect(ids).toContain('chain_tip');
    });

    it('should include warning_tip step', () => {
      tutorialManager.startTutorial(4, 800, 600);
      const steps = tutorialManager.getSteps();
      const ids = steps.map(s => s.id);
      expect(ids).toContain('warning_tip');
    });
  });

  describe('Level 5 tutorial steps (new)', () => {
    it('should have 4 steps for Level 5', () => {
      tutorialManager.startTutorial(5, 800, 600);
      const steps = tutorialManager.getSteps();
      expect(steps.length).toBe(4);
    });

    it('should include planning_tip step', () => {
      tutorialManager.startTutorial(5, 800, 600);
      const steps = tutorialManager.getSteps();
      const ids = steps.map(s => s.id);
      expect(ids).toContain('planning_tip');
    });

    it('should include space_tip step', () => {
      tutorialManager.startTutorial(5, 800, 600);
      const steps = tutorialManager.getSteps();
      const ids = steps.map(s => s.id);
      expect(ids).toContain('space_tip');
    });
  });

  describe('tutorial lifecycle', () => {
    it('should start and finish tutorial', () => {
      tutorialManager.startTutorial(1, 800, 600);
      expect(tutorialManager.isActive()).toBe(true);
      tutorialManager.finish();
      expect(tutorialManager.isActive()).toBe(false);
    });

    it('should handle tap to advance steps', () => {
      tutorialManager.startTutorial(2, 800, 600);
      const stepsBefore = tutorialManager.getCurrentStepIndex();
      tutorialManager.handleTap();
    });

    it('should handle action events', () => {
      tutorialManager.startTutorial(1, 800, 600);
      tutorialManager.handleAction('first_drop');
    });
  });
});
