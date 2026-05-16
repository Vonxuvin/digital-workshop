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
    if (levelId < 1 || levelId > 5) return false;
    const progress = this.saveManager.getLevelProgress(levelId);
    return !progress.completed && progress.attempts < 5;
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
          message: '💣 炸弹：点击后选择位置\n可以炸掉附近的方块！\n点击炸弹按钮试试看',
          trigger: 'tap',
        },
        {
          id: 'try_bomb',
          message: '很好！现在点击屏幕上\n想炸掉方块的位置',
          trigger: 'tap',
        },
        {
          id: 'rainbow_prop',
          message: '🌈 彩虹方块：使用后\n下一个方块可以和任何数字合成！\n点击彩虹按钮试试',
          trigger: 'tap',
        },
        {
          id: 'freeze_prop',
          message: '❄️ 冰冻：暂停所有物理运动\n给你时间思考策略！\n点击冰冻按钮试试',
          trigger: 'tap',
        },
        {
          id: 'prop_complete',
          message: '道具就介绍到这里！\n合理使用道具是通关的关键！\n道具数量有限，请谨慎使用',
          trigger: 'auto',
        },
      ];
    }

    if (levelId === 3) {
      return [
        {
          id: 'obstacle_intro',
          message: '注意这些带✕标记的方块！\n它们是障碍物，会挡住你的路\n障碍物不会自己移动',
          trigger: 'auto',
        },
        {
          id: 'obstacle_rule',
          message: '消除障碍物的方法：\n1.观察障碍物上的数字\n2.合成一个相同数字的方块\n3.让合成方块碰到障碍物即可清除！\n例如：数字4的障碍物需要数字4的方块碰撞',
          trigger: 'tap',
        },
        {
          id: 'obstacle_strategy',
          message: '小技巧：先在障碍物附近\n投放相同数字的方块\n利用合成后的新方块去碰撞障碍物',
          trigger: 'tap',
        },
        {
          id: 'shrink_prop',
          message: '🔬 缩小：让所有方块变小\n腾出更多空间！\n空间紧张时使用效果最佳',
          trigger: 'tap',
        },
        {
          id: 'lucky_prop',
          message: '🍀 幸运：接下来几次投放\n会获得更高数字的方块！\n配合障碍物清除使用效果更好',
          trigger: 'tap',
        },
        {
          id: 'obstacle_complete',
          message: '清除所有障碍物即可过关！\n合理规划投放顺序是关键\n加油！',
          trigger: 'auto',
        },
      ];
    }

    if (levelId === 4) {
      return [
        {
          id: 'advanced_intro',
          message: '恭喜你来到进阶关卡！\n这一关会出现更大的数字\n合成策略更加重要',
          trigger: 'auto',
        },
        {
          id: 'chain_tip',
          message: '连锁合成技巧：\n连续合成可以获得更高倍率！\n尽量让方块集中在一起',
          trigger: 'tap',
        },
        {
          id: 'warning_tip',
          message: '注意：方块堆得太高\n超过红色警戒线就会游戏结束！\n及时使用道具清理空间',
          trigger: 'tap',
        },
        {
          id: 'advanced_complete',
          message: '掌握这些技巧后\n后面的关卡会更容易！\n祝你好运！',
          trigger: 'auto',
        },
      ];
    }

    if (levelId === 5) {
      return [
        {
          id: 'challenge_intro',
          message: '这是一个综合考验关卡！\n需要运用你学到的所有技巧',
          trigger: 'auto',
        },
        {
          id: 'planning_tip',
          message: '高级策略：\n先观察可用数字和目标\n规划合成路线再投放\n不要急于投放！',
          trigger: 'tap',
        },
        {
          id: 'space_tip',
          message: '空间管理：\n保持容器下方有足够空间\n避免方块堆积过高\n合理使用道具控制局面',
          trigger: 'tap',
        },
        {
          id: 'challenge_complete',
          message: '你已经掌握了核心技巧！\n接下来的关卡会引入\n更多有趣的机制！',
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

  getSteps(): TutorialStep[] {
    return this.steps;
  }

  getCurrentStepIndex(): number {
    return this.currentStepIndex;
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
