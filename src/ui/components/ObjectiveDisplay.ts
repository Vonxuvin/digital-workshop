import { Container, Graphics, Text } from 'pixi.js';
import { UIProgressBar } from './UIProgressBar';
import { ObjectiveType } from '../../gameplay/LevelSystem';

export interface ObjectiveDisplayData {
  type: ObjectiveType;
  target: number;
  currentValue: number;
  timeLimit?: number;
}

const OBJECTIVE_LABELS: Record<ObjectiveType, string> = {
  score: '得分',
  target_merge: '合成',
  clear_obstacle: '清除障碍',
  survival: '生存',
};

const OBJECTIVE_ICONS: Record<ObjectiveType, string> = {
  score: '🎯',
  target_merge: '🔮',
  clear_obstacle: '💥',
  survival: '⏱',
};

const OBJECTIVE_UNITS: Record<ObjectiveType, string> = {
  score: '',
  target_merge: '',
  clear_obstacle: '个',
  survival: '秒',
};

export class ObjectiveDisplay extends Container {
  private backgroundPanel: Graphics;
  private iconText: Text;
  private objectiveLabel: Text;
  private progressText: Text;
  private progressBar: UIProgressBar;
  private nearCompleteIndicator: Graphics;
  private _currentData: ObjectiveDisplayData | null = null;
  private _isNearComplete = false;
  private nearCompleteThreshold = 0.8;
  private pulseTween: { active: boolean; phase: number } = { active: false, phase: 0 };
  private barWidth: number;
  private _alwaysVisible = true;
  private panelPadding = 8;
  private panelHeight = 42;

  constructor(width: number = 280) {
    super();

    this.barWidth = width;

    this.backgroundPanel = new Graphics();
    this.addChild(this.backgroundPanel);

    this.iconText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffffff,
      },
    });
    this.iconText.x = this.panelPadding;
    this.iconText.y = this.panelPadding;
    this.addChild(this.iconText);

    this.objectiveLabel = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 13,
        fill: 0xcccccc,
        fontWeight: 'bold',
      },
    });
    this.objectiveLabel.x = this.panelPadding + 20;
    this.objectiveLabel.y = this.panelPadding;
    this.addChild(this.objectiveLabel);

    this.progressText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0x999999,
      },
    });
    this.progressText.x = width - 60;
    this.progressText.y = this.panelPadding;
    this.addChild(this.progressText);

    this.progressBar = new UIProgressBar(width - this.panelPadding * 2, 10, 0x333333, 0x4ECDC4);
    this.progressBar.x = this.panelPadding;
    this.progressBar.y = this.panelPadding + 22;
    this.addChild(this.progressBar);

    this.nearCompleteIndicator = new Graphics();
    this.nearCompleteIndicator.x = 0;
    this.nearCompleteIndicator.y = 0;
    this.nearCompleteIndicator.visible = false;
    this.addChild(this.nearCompleteIndicator);

    this.drawBackground();
  }

  private drawBackground(): void {
    this.backgroundPanel.clear();
    const w = this.barWidth;
    const h = this.panelHeight;
    this.backgroundPanel.roundRect(0, 0, w, h, 8);
    this.backgroundPanel.fill({ color: 0x0d0d1a, alpha: 0.85 });
    this.backgroundPanel.roundRect(0, 0, w, h, 8);
    this.backgroundPanel.stroke({ width: 1, color: 0x4a4a8a, alpha: 0.4 });
  }

  setObjective(data: ObjectiveDisplayData): void {
    this._currentData = data;
    this.iconText.text = OBJECTIVE_ICONS[data.type] || '🎯';
    this.objectiveLabel.text = `${OBJECTIVE_LABELS[data.type] || '目标'}: ${this.formatTarget(data)}`;
    this.updateProgress(data);
    if (this._alwaysVisible) {
      this.visible = true;
    }
  }

  updateProgress(data: ObjectiveDisplayData): void {
    this._currentData = data;
    const progress = this.calculateProgress(data);
    this.progressBar.setProgress(progress);

    this.progressText.text = this.formatProgress(data);

    const wasNearComplete = this._isNearComplete;
    this._isNearComplete = progress >= this.nearCompleteThreshold && progress < 1;

    if (this._isNearComplete && !wasNearComplete) {
      this.onNearComplete();
    } else if (!this._isNearComplete && wasNearComplete) {
      this.clearNearCompleteIndicator();
    }

    if (progress >= 1) {
      this.onComplete();
    }
  }

  forceUpdateProgress(data: ObjectiveDisplayData): void {
    this._currentData = data;
    const progress = this.calculateProgress(data);
    this.progressBar.forceSetProgress(progress);

    this.progressText.text = this.formatProgress(data);

    const wasNearComplete = this._isNearComplete;
    this._isNearComplete = progress >= this.nearCompleteThreshold && progress < 1;

    if (this._isNearComplete && !wasNearComplete) {
      this.onNearComplete();
    } else if (!this._isNearComplete && wasNearComplete) {
      this.clearNearCompleteIndicator();
    }

    if (progress >= 1) {
      this.onComplete();
    }
  }

  private calculateProgress(data: ObjectiveDisplayData): number {
    if (data.target <= 0) return 1;
    switch (data.type) {
      case 'score':
        return Math.min(data.currentValue / data.target, 1);
      case 'target_merge':
        if (data.currentValue <= 1) return 0;
        return Math.min(Math.log2(data.currentValue) / Math.log2(data.target), 1);
      case 'clear_obstacle':
        return Math.min(data.currentValue / data.target, 1);
      case 'survival':
        return data.timeLimit && data.timeLimit > 0
          ? Math.min(data.currentValue / data.timeLimit, 1)
          : 0;
      default:
        return 0;
    }
  }

  private formatTarget(data: ObjectiveDisplayData): string {
    const unit = OBJECTIVE_UNITS[data.type] || '';
    switch (data.type) {
      case 'score':
        return `${data.target}${unit}`;
      case 'target_merge':
        return `${data.target}${unit}`;
      case 'clear_obstacle':
        return `${data.target}${unit}`;
      case 'survival':
        return `${data.timeLimit || data.target}秒`;
      default:
        return `${data.target}`;
    }
  }

  private formatProgress(data: ObjectiveDisplayData): string {
    const unit = OBJECTIVE_UNITS[data.type] || '';
    switch (data.type) {
      case 'score':
        return `${data.currentValue}/${data.target}`;
      case 'target_merge':
        return `${data.currentValue}/${data.target}`;
      case 'clear_obstacle':
        return `${data.currentValue}/${data.target}${unit}`;
      case 'survival': {
        const elapsed = Math.min(data.currentValue, data.timeLimit || data.target);
        return `${elapsed}/${data.timeLimit || data.target}秒`;
      }
      default:
        return `${data.currentValue}/${data.target}`;
    }
  }

  private onNearComplete(): void {
    this.nearCompleteIndicator.visible = true;
    this.progressBar.setColors(0x333333, 0xffd700);
    this.objectiveLabel.style.fill = 0xffd700;
    this.progressText.style.fill = 0xffd700;
    this.drawNearCompleteIndicator();
  }

  private clearNearCompleteIndicator(): void {
    this.nearCompleteIndicator.visible = false;
    this.progressBar.setColors(0x333333, 0x4ECDC4);
    this.objectiveLabel.style.fill = 0xcccccc;
    this.progressText.style.fill = 0x999999;
  }

  private onComplete(): void {
    this.nearCompleteIndicator.visible = false;
    this.progressBar.setColors(0x333333, 0x27ae60);
    this.objectiveLabel.style.fill = 0x27ae60;
    this.progressText.style.fill = 0x27ae60;
  }

  private drawNearCompleteIndicator(): void {
    this.nearCompleteIndicator.clear();
    this.nearCompleteIndicator.moveTo(-4, 10);
    this.nearCompleteIndicator.lineTo(-4, 32);
    this.nearCompleteIndicator.stroke({ width: 2, color: 0xffd700, alpha: 0.6 });
  }

  getObjectiveDescription(data: ObjectiveDisplayData): string {
    const label = OBJECTIVE_LABELS[data.type] || '目标';
    const target = this.formatTarget(data);
    return `${OBJECTIVE_ICONS[data.type]} ${label}: ${target}`;
  }

  isNearComplete(): boolean {
    return this._isNearComplete;
  }

  getCurrentData(): ObjectiveDisplayData | null {
    return this._currentData;
  }

  setAlwaysVisible(value: boolean): void {
    this._alwaysVisible = value;
    if (value && this._currentData) {
      this.visible = true;
    }
  }

  isAlwaysVisible(): boolean {
    return this._alwaysVisible;
  }

  getBackgroundPanel(): Graphics {
    return this.backgroundPanel;
  }

  get objectiveBarWidth(): number {
    return this.barWidth;
  }

  reset(): void {
    this._currentData = null;
    this._isNearComplete = false;
    this.iconText.text = '';
    this.objectiveLabel.text = '';
    this.progressText.text = '';
    this.progressBar.forceSetProgress(0);
    this.progressBar.setColors(0x333333, 0x4ECDC4);
    this.objectiveLabel.style.fill = 0xcccccc;
    this.progressText.style.fill = 0x999999;
    this.nearCompleteIndicator.visible = false;
    this.drawBackground();
  }

  static getObjectiveLabel(type: ObjectiveType): string {
    return OBJECTIVE_LABELS[type] || '目标';
  }

  static getObjectiveIcon(type: ObjectiveType): string {
    return OBJECTIVE_ICONS[type] || '🎯';
  }

  static getObjectiveDescription(type: ObjectiveType, target: number, timeLimit?: number): string {
    const label = OBJECTIVE_LABELS[type] || '目标';
    const icon = OBJECTIVE_ICONS[type] || '🎯';
    const unit = OBJECTIVE_UNITS[type] || '';
    switch (type) {
      case 'survival':
        return `${icon} ${label}: ${timeLimit || target}秒`;
      default:
        return `${icon} ${label}: ${target}${unit}`;
    }
  }

  destroy(): void {
    this.nearCompleteIndicator.destroy();
    this.backgroundPanel.destroy();
    super.destroy();
  }
}
