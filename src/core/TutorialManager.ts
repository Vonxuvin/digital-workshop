import { TutorialOverlay, TutorialStep } from '../ui/TutorialOverlay';
import { SaveManager } from './SaveManager';
import { eventBus } from '../utils/EventBus';

export class TutorialManager {
  private overlay: TutorialOverlay;
  private saveManager: SaveManager;
  private currentStepIndex: number = 0;
  private steps: TutorialStep[] = [];
  private active: boolean = false;
  private levelId: number = 0;
  private screenWidth: number = 800;
  private screenHeight: number = 600;

  private boundOnDrop: (() => void) | null = null;
  private boundOnMerge: (() => void) | null = null;
  private boundOnWarning: (() => void) | null = null;

  constructor(overlay: TutorialOverlay, saveManager: SaveManager) {
    this.overlay = overlay;
    this.saveManager = saveManager;
    this.overlay.setOnSkip(() => this.skip());
  }

  shouldShowTutorial(levelId: number): boolean {
    if (levelId !== 1) return false;
    const progress = this.saveManager.getLevelProgress(1);
    return !progress.completed && progress.attempts === 0;
  }

  startTutorial(levelId: number, screenWidth: number, screenHeight: number): void {
    if (!this.shouldShowTutorial(levelId)) return;

    this.levelId = levelId;
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.currentStepIndex = 0;
    this.active = true;

    this.steps = this.getTutorialSteps(levelId);
    this.setupListeners();
    this.showCurrentStep();
  }

  private getTutorialSteps(levelId: number): TutorialStep[] {
    if (levelId === 1) {
      return [
        {
          id: 'welcome',
          message: '欢迎来到数字工坊！\n点击屏幕选择投放位置',
          trigger: 'auto',
        },
        {
          id: 'drop',
          message: '松开手指投放方块\n相同数字的方块碰撞会合成更大的数字！',
          trigger: 'drop',
          waitForAction: 'first_drop',
        },
        {
          id: 'warning',
          message: '注意红色警戒线！\n方块堆得太高会游戏结束',
          trigger: 'warning',
          waitForAction: 'first_warning',
        },
        {
          id: 'complete',
          message: '你已经掌握了基本操作！\n祝你好运！',
          trigger: 'auto',
        },
      ];
    }
    return [];
  }

  private setupListeners(): void {
    this.boundOnDrop = () => this.handleAction('first_drop');
    this.boundOnMerge = () => this.handleAction('first_merge');
    this.boundOnWarning = () => this.handleAction('first_warning');

    eventBus.on('block:dropped', this.boundOnDrop);
    eventBus.on('block:merged', this.boundOnMerge);
    eventBus.on('warning:started', this.boundOnWarning);
  }

  private removeListeners(): void {
    if (this.boundOnDrop) {
      eventBus.off('block:dropped', this.boundOnDrop);
      this.boundOnDrop = null;
    }
    if (this.boundOnMerge) {
      eventBus.off('block:merged', this.boundOnMerge);
      this.boundOnMerge = null;
    }
    if (this.boundOnWarning) {
      eventBus.off('warning:started', this.boundOnWarning);
      this.boundOnWarning = null;
    }
  }

  handleAction(action: string): void {
    if (!this.active) return;

    const currentStep = this.steps[this.currentStepIndex];
    if (!currentStep) return;

    if (currentStep.waitForAction === action) {
      this.advanceStep();
    }
  }

  handleTap(): void {
    if (!this.active) return;

    const currentStep = this.steps[this.currentStepIndex];
    if (!currentStep) return;

    if (currentStep.trigger === 'tap') {
      this.advanceStep();
    }
  }

  private advanceStep(): void {
    this.currentStepIndex++;
    if (this.currentStepIndex >= this.steps.length) {
      this.finish();
      return;
    }
    this.showCurrentStep();
  }

  private showCurrentStep(): void {
    const step = this.steps[this.currentStepIndex];
    if (!step) {
      this.finish();
      return;
    }

    if (step.trigger === 'auto') {
      this.overlay.show(step, this.screenWidth, this.screenHeight);
      setTimeout(() => {
        if (this.active && this.currentStepIndex < this.steps.length - 1) {
          this.advanceStep();
        } else if (this.active) {
          this.finish();
        }
      }, 3000);
    } else {
      this.overlay.show(step, this.screenWidth, this.screenHeight);
    }
  }

  private skip(): void {
    this.finish();
  }

  private finish(): void {
    this.active = false;
    this.overlay.hide();
    this.removeListeners();
    eventBus.emit('tutorial:completed');
  }

  isActive(): boolean {
    return this.active;
  }

  resize(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.overlay.resize(screenWidth, screenHeight);
  }

  destroy(): void {
    this.removeListeners();
    this.active = false;
  }
}