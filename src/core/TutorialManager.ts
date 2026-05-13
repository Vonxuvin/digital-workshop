import { TutorialOverlay, TutorialStep } from '../ui/TutorialOverlay';
import { SaveManager } from './SaveManager';
import { eventBus } from '../utils/EventBus';
import { AnimationManager } from '../utils/AnimationManager';

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
  private boundOnPropUsed: (() => void) | null = null;
  private boundOnObstacleCleared: (() => void) | null = null;

  private autoTimerId: string | null = null;

  constructor(overlay: TutorialOverlay, saveManager: SaveManager) {
    this.overlay = overlay;
    this.saveManager = saveManager;
    this.overlay.setOnSkip(() => this.skip());
  }

  shouldShowTutorial(levelId: number): boolean {
    if (levelId < 1 || levelId > 3) return false;
    const progress = this.saveManager.getLevelProgress(levelId);
    return !progress.completed && progress.attempts < 3;
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
          id: 'merge',
          message: '太棒了！方块合成了！\n继续合成更大的数字吧！',
          trigger: 'merge',
          waitForAction: 'first_merge',
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

    if (levelId === 2) {
      return [
        {
          id: 'prop_intro',
          message: '这一关可以使用道具了！\n看看右侧的道具栏',
          trigger: 'auto',
          highlightArea: { x: 0, y: 0, width: 100, height: 200 },
        },
        {
          id: 'bomb_prop',
          message: '💣 炸弹：点击后选择位置\n可以炸掉附近的方块！',
          trigger: 'tap',
        },
        {
          id: 'rainbow_prop',
          message: '🌈 彩虹：使用后下一个方块\n可以和任何数字合成！',
          trigger: 'tap',
        },
        {
          id: 'freeze_prop',
          message: '❄️ 冰冻：暂停物理运动\n给你时间思考策略！',
          trigger: 'tap',
        },
        {
          id: 'prop_complete',
          message: '道具就介绍到这里！\n合理使用道具是通关的关键！',
          trigger: 'auto',
        },
      ];
    }

    if (levelId === 3) {
      return [
        {
          id: 'obstacle_intro',
          message: '注意这些带✕标记的方块！\n它们是障碍物，会挡住你的路',
          trigger: 'auto',
        },
        {
          id: 'obstacle_rule',
          message: '消除障碍物的方法：\n合成与障碍物数字相同的方块\n放在它旁边即可清除！',
          trigger: 'tap',
        },
        {
          id: 'shrink_prop',
          message: '🔬 缩小：让所有方块变小\n腾出更多空间！',
          trigger: 'tap',
        },
        {
          id: 'lucky_prop',
          message: '🍀 幸运：接下来几次投放\n会获得更高数字的方块！',
          trigger: 'tap',
        },
        {
          id: 'obstacle_complete',
          message: '清除所有障碍物即可过关！\n加油！',
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
    this.boundOnPropUsed = () => this.handleAction('prop_used');
    this.boundOnObstacleCleared = () => this.handleAction('obstacle_cleared');

    eventBus.on('block:dropped', this.boundOnDrop);
    eventBus.on('block:merged', this.boundOnMerge);
    eventBus.on('warning:started', this.boundOnWarning);
    eventBus.on('props:used', this.boundOnPropUsed);
    eventBus.on('obstacle:cleared', this.boundOnObstacleCleared);
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
    if (this.boundOnPropUsed) {
      eventBus.off('props:used', this.boundOnPropUsed);
      this.boundOnPropUsed = null;
    }
    if (this.boundOnObstacleCleared) {
      eventBus.off('obstacle:cleared', this.boundOnObstacleCleared);
      this.boundOnObstacleCleared = null;
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
    this.clearAutoTimer();
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
      this.autoTimerId = AnimationManager.getInstance().setTimeout(() => {
        if (this.active && this.currentStepIndex < this.steps.length - 1) {
          this.advanceStep();
        } else if (this.active) {
          this.finish();
        }
      }, 3000, `tutorial_auto_${this.levelId}_${step.id}`);
    } else {
      this.overlay.show(step, this.screenWidth, this.screenHeight);
    }
  }

  private clearAutoTimer(): void {
    if (this.autoTimerId) {
      AnimationManager.getInstance().clearTimeout(this.autoTimerId);
      this.autoTimerId = null;
    }
  }

  private skip(): void {
    this.clearAutoTimer();
    this.finish();
  }

  private finish(): void {
    this.active = false;
    this.clearAutoTimer();
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
    this.clearAutoTimer();
    this.removeListeners();
    this.active = false;
  }
}
