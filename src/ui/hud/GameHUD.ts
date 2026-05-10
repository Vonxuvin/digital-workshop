
import { Container, Text, Graphics } from 'pixi.js';
import { eventBus } from '../../utils/EventBus';
import { UIProgressBar } from '../components/UIProgressBar';
import { PropButton } from '../components/PropButton';
import { PropSystem } from '../../gameplay/props/PropSystem';
import { PropType } from '../../gameplay/props/Prop';

export class GameHUD extends Container {
  private scoreText!: Text;
  private chainText!: Text;
  private levelText!: Text;
  private pauseButton!: Container;
  private timerText!: Text;
  private objectiveBar!: UIProgressBar;
  private currentScore = 0;
  private displayScore = 0;
  private onScoreUpdatedBound: (data: { totalScore: number; earnedScore: number; chainCount: number }) => void;
  private propSystem: PropSystem;
  private propButtons: Map<PropType, PropButton> = new Map();
  private propsContainer!: Container;
  private selectedProp: PropType | null = null;
  private propTargetMode = false;

  constructor(propSystem: PropSystem) {
    super();
    this.eventMode = 'static';
    this.propSystem = propSystem;
    this.onScoreUpdatedBound = this.handleScoreUpdated.bind(this);
    this.createScoreDisplay();
    this.createChainDisplay();
    this.createLevelDisplay();
    this.createPropsBar();
    this.createPauseButton();
    this.createTimerDisplay();
    this.createObjectiveBar();
    this.setupEventListeners();
  }

  private createScoreDisplay(): void {
    this.scoreText = new Text({
      text: 'Score: 0',
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.scoreText.x = 20;
    this.scoreText.y = 20;
    this.addChild(this.scoreText);
  }

  private createChainDisplay(): void {
    this.chainText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xffd700,
      },
    });
    this.chainText.x = 20;
    this.chainText.y = 55;
    this.addChild(this.chainText);
  }

  private createLevelDisplay(): void {
    this.levelText = new Text({
      text: 'Level 1',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0x999999,
      },
    });
    this.levelText.x = 20;
    this.levelText.y = 80;
    this.addChild(this.levelText);
  }

  private createPropsBar(): void {
    this.propsContainer = new Container();
    this.propsContainer.eventMode = 'static';
    this.propsContainer.x = 600;
    this.propsContainer.y = 15;

    const propsData = [
      { type: PropType.BOMB, icon: 'bomb', x: 0 },
      { type: PropType.RAINBOW, icon: 'rainbow', x: 70 },
      { type: PropType.FREEZE, icon: 'freeze', x: 140 },
    ];

    propsData.forEach(propData => {
      const count = this.propSystem.getPropCount(propData.type);
      const button = new PropButton({
        propType: propData.type,
        icon: propData.icon,
        count: count,
        onClick: (type) => this.onPropClick(type),
        x: propData.x,
        y: 0,
      });
      this.propsContainer.addChild(button);
      this.propButtons.set(propData.type, button);
    });

    this.addChild(this.propsContainer);
  }

  private onPropClick(type: PropType): void {
    const count = this.propSystem.getPropCount(type);
    if (count <= 0) return;

    if (type === PropType.BOMB) {
      this.enterBombTargetMode();
    } else {
      const success = this.propSystem.useProp(type);
      if (success) {
        this.updatePropButtons();
        eventBus.emit('props:used', { type });
      }
    }
  }

  private enterBombTargetMode(): void {
    this.selectedProp = PropType.BOMB;
    this.propTargetMode = true;
    eventBus.emit('ui:propTargetMode', { type: PropType.BOMB, enabled: true });
  }

  usePropAtPosition(x: number, y: number): void {
    if (!this.propTargetMode || !this.selectedProp) return;
    
    const success = this.propSystem.useProp(this.selectedProp, { x, y });
    if (success) {
      this.updatePropButtons();
      eventBus.emit('props:used', { type: this.selectedProp, x, y });
    }
    
    this.exitPropTargetMode();
  }

  exitPropTargetMode(): void {
    this.selectedProp = null;
    this.propTargetMode = false;
    eventBus.emit('ui:propTargetMode', { enabled: false });
  }

  updatePropButtons(): void {
    this.propButtons.forEach((button, type) => {
      const count = this.propSystem.getPropCount(type);
      button.updateCount(count);
    });
  }

  private createPauseButton(): void {
    this.pauseButton = new Container();

    const bg = new Graphics();
    bg.circle(0, 0, 25);
    bg.fill(0x333333);
    this.pauseButton.addChild(bg);

    const icon = new Text({
      text: '⏸',
      style: {
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 0xffffff,
      },
    });
    icon.anchor.set(0.5);
    this.pauseButton.addChild(icon);

    this.pauseButton.x = 750;
    this.pauseButton.y = 100;
    this.pauseButton.eventMode = 'static';
    this.pauseButton.cursor = 'pointer';

    this.pauseButton.on('pointerdown', () => {
      eventBus.emit('ui:pause');
    });

    this.addChild(this.pauseButton);
  }

  private createTimerDisplay(): void {
    this.timerText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 0xff6b6b,
        fontWeight: 'bold',
      },
    });
    this.timerText.anchor.set(0.5, 0);
    this.timerText.x = 400;
    this.timerText.y = 10;
    this.timerText.visible = false;
    this.addChild(this.timerText);
  }

  updateTimer(seconds: number): void {
    if (seconds >= 0) {
      this.timerText.visible = true;
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      this.timerText.text = `${mins}:${secs.toString().padStart(2, '0')}`;
      if (seconds <= 10) {
        this.timerText.style.fill = 0xff4444;
      } else {
        this.timerText.style.fill = 0xff6b6b;
      }
    } else {
      this.timerText.visible = false;
    }
  }

  private createObjectiveBar(): void {
    this.objectiveBar = new UIProgressBar(150, 12, 0x333333, 0x4ECDC4);
    this.objectiveBar.x = 580;
    this.objectiveBar.y = 85;

    const label = new Text({
      text: '进度',
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0x999999,
      },
    });
    label.x = 0;
    label.y = -16;
    this.objectiveBar.addChild(label);

    this.addChild(this.objectiveBar);
  }

  setObjectiveProgress(progress: number): void {
    this.objectiveBar.setProgress(progress);
  }

  private setupEventListeners(): void {
    eventBus.on('score:updated', this.onScoreUpdatedBound);
  }

  private handleScoreUpdated(data: { totalScore: number; earnedScore: number; chainCount: number }): void {
    this.currentScore = data.totalScore;
    if (data.chainCount > 1) {
      this.chainText.text = `连锁 x${data.chainCount}!`;
    } else {
      this.chainText.text = '';
    }
  }

  update(delta: number): void {
    if (this.displayScore < this.currentScore) {
      const diff = this.currentScore - this.displayScore;
      const clampedDelta = Math.min(delta, 3);
      const increment = Math.max(1, Math.round(diff * 0.15 * clampedDelta));
      this.displayScore = Math.min(this.displayScore + increment, this.currentScore);
      this.scoreText.text = `Score: ${this.displayScore.toLocaleString()}`;
    }
  }

  updateLevel(levelId: number, levelName: string): void {
    this.levelText.text = `Level ${levelId}: ${levelName}`;
  }

  reset(): void {
    this.currentScore = 0;
    this.displayScore = 0;
    this.scoreText.text = 'Score: 0';
    this.chainText.text = '';
    this.timerText.visible = false;
    this.timerText.text = '';
    this.objectiveBar.setProgress(0);
    this.updatePropButtons();
    this.exitPropTargetMode();
  }

  skipAnimation(): void {
    this.displayScore = this.currentScore;
    this.scoreText.text = `Score: ${this.displayScore.toLocaleString()}`;
  }

  destroy(): void {
    eventBus.off('score:updated', this.onScoreUpdatedBound);
    this.propButtons.clear();
    super.destroy();
  }
}
