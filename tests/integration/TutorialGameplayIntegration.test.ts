import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TutorialManager } from '../../src/core/TutorialManager';
import { TutorialOverlay, TutorialStep } from '../../src/ui/TutorialOverlay';
import { SaveManager } from '../../src/core/SaveManager';
import { eventBus } from '../../src/utils/EventBus';
import { AnimationManager } from '../../src/utils/AnimationManager';

class MockTutorialOverlay {
  private steps: TutorialStep[] = [];
  private currentStep: TutorialStep | null = null;
  private onSkipCallback: (() => void) | null = null;
  private visible: boolean = false;

  setOnSkip(callback: () => void): void {
    this.onSkipCallback = callback;
  }

  show(step: TutorialStep, screenWidth: number, screenHeight: number): void {
    this.currentStep = step;
    this.visible = true;
  }

  showStep(step: TutorialStep): void {
    this.currentStep = step;
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
    this.currentStep = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  getCurrentStep(): TutorialStep | null {
    return this.currentStep;
  }

  triggerSkip(): void {
    if (this.onSkipCallback) {
      this.onSkipCallback();
    }
  }

  destroy(): void {}
}

describe('Tutorial + Gameplay Integration Tests', () => {

  describe('TutorialManager Core Integration', () => {
    let tutorialManager: TutorialManager;
    let overlay: MockTutorialOverlay;
    let saveManager: SaveManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      overlay = new MockTutorialOverlay();
      saveManager = new SaveManager();
      tutorialManager = new TutorialManager(overlay as unknown as TutorialOverlay, saveManager);
    });

    afterEach(() => {
      AnimationManager.resetInstance();
    });

    it('should show tutorial for level 1 when not completed', () => {
      const shouldShow = tutorialManager.shouldShowTutorial(1);
      expect(shouldShow).toBe(true);
    });

    it('should not show tutorial for level 1 when completed', () => {
      saveManager.updateLevelProgress(1, 500, 120, 3, true);

      const shouldShow = tutorialManager.shouldShowTutorial(1);
      expect(shouldShow).toBe(false);
    });

    it('should not show tutorial for level 1 after 5 attempts', () => {
      for (let i = 0; i < 5; i++) {
        saveManager.updateLevelProgress(1, 100, 60, 1, false);
      }

      const shouldShow = tutorialManager.shouldShowTutorial(1);
      expect(shouldShow).toBe(false);
    });

    it('should not show tutorial for invalid level ids', () => {
      expect(tutorialManager.shouldShowTutorial(0)).toBe(false);
      expect(tutorialManager.shouldShowTutorial(6)).toBe(false);
      expect(tutorialManager.shouldShowTutorial(-1)).toBe(false);
    });

    it('should start tutorial for level 1', () => {
      tutorialManager.startTutorial(1, 800, 600);

      expect(overlay.isVisible()).toBe(true);
      const step = overlay.getCurrentStep();
      expect(step).toBeDefined();
      expect(step!.id).toBe('welcome');
    });

    it('should start tutorial for level 2', () => {
      tutorialManager.startTutorial(2, 800, 600);

      expect(overlay.isVisible()).toBe(true);
      const step = overlay.getCurrentStep();
      expect(step).toBeDefined();
      expect(step!.id).toBe('prop_intro');
    });

    it('should start tutorial for level 3', () => {
      tutorialManager.startTutorial(3, 800, 600);

      expect(overlay.isVisible()).toBe(true);
      const step = overlay.getCurrentStep();
      expect(step).toBeDefined();
      expect(step!.id).toBe('obstacle_intro');
    });

    it('should skip tutorial', () => {
      tutorialManager.startTutorial(1, 800, 600);
      expect(overlay.isVisible()).toBe(true);

      overlay.triggerSkip();

      expect(overlay.isVisible()).toBe(false);
    });

    it('should not start tutorial if shouldShowTutorial returns false', () => {
      saveManager.updateLevelProgress(1, 500, 120, 3, true);

      tutorialManager.startTutorial(1, 800, 600);

      expect(overlay.isVisible()).toBe(false);
    });
  });

  describe('Tutorial Step Progression', () => {
    let tutorialManager: TutorialManager;
    let overlay: MockTutorialOverlay;
    let saveManager: SaveManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      overlay = new MockTutorialOverlay();
      saveManager = new SaveManager();
      tutorialManager = new TutorialManager(overlay as unknown as TutorialOverlay, saveManager);
    });

    it('should progress through level 1 tutorial steps', () => {
      tutorialManager.startTutorial(1, 800, 600);

      const step1 = overlay.getCurrentStep();
      expect(step1!.id).toBe('welcome');
      expect(step1!.trigger).toBe('auto');
    });

    it('should progress through level 2 tutorial steps', () => {
      tutorialManager.startTutorial(2, 800, 600);

      const step1 = overlay.getCurrentStep();
      expect(step1!.id).toBe('prop_intro');
      expect(step1!.trigger).toBe('auto');
    });

    it('should progress through level 3 tutorial steps', () => {
      tutorialManager.startTutorial(3, 800, 600);

      const step1 = overlay.getCurrentStep();
      expect(step1!.id).toBe('obstacle_intro');
      expect(step1!.trigger).toBe('auto');
    });
  });

  describe('Tutorial + Game Events Integration', () => {
    let tutorialManager: TutorialManager;
    let overlay: MockTutorialOverlay;
    let saveManager: SaveManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      overlay = new MockTutorialOverlay();
      saveManager = new SaveManager();
      tutorialManager = new TutorialManager(overlay as unknown as TutorialOverlay, saveManager);
    });

    afterEach(() => {
      AnimationManager.resetInstance();
    });

    it('should respond to drop event during tutorial', () => {
      tutorialManager.startTutorial(1, 800, 600);

      eventBus.emit('gameplay:blockDropped');

      expect(overlay.isVisible()).toBe(true);
    });

    it('should respond to merge event during tutorial', () => {
      tutorialManager.startTutorial(1, 800, 600);

      eventBus.emit('block:merged', { newValue: 4 });

      expect(overlay.isVisible()).toBe(true);
    });

    it('should respond to warning event during tutorial', () => {
      tutorialManager.startTutorial(1, 800, 600);

      eventBus.emit('warning:started');

      expect(overlay.isVisible()).toBe(true);
    });

    it('should respond to prop used event during tutorial', () => {
      tutorialManager.startTutorial(2, 800, 600);

      eventBus.emit('props:used', { type: 'bomb', remaining: 2 });

      expect(overlay.isVisible()).toBe(true);
    });

    it('should respond to obstacle cleared event during tutorial', () => {
      tutorialManager.startTutorial(3, 800, 600);

      eventBus.emit('obstacle:cleared');

      expect(overlay.isVisible()).toBe(true);
    });
  });

  describe('Tutorial Completion Integration', () => {
    let tutorialManager: TutorialManager;
    let overlay: MockTutorialOverlay;
    let saveManager: SaveManager;

    beforeEach(() => {
      AnimationManager.resetInstance();
      overlay = new MockTutorialOverlay();
      saveManager = new SaveManager();
      tutorialManager = new TutorialManager(overlay as unknown as TutorialOverlay, saveManager);
    });

    afterEach(() => {
      AnimationManager.resetInstance();
    });

    it('should hide tutorial after completion', () => {
      tutorialManager.startTutorial(1, 800, 600);
      expect(overlay.isVisible()).toBe(true);

      overlay.triggerSkip();
      expect(overlay.isVisible()).toBe(false);
    });

    it('should not show tutorial again after completion', () => {
      saveManager.updateLevelProgress(1, 500, 120, 3, true);

      const shouldShow = tutorialManager.shouldShowTutorial(1);
      expect(shouldShow).toBe(false);
    });
  });
});