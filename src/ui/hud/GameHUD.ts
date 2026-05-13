
import { Container, Text, Graphics } from 'pixi.js';
import { eventBus } from '../../utils/EventBus';
import { UIProgressBar } from '../components/UIProgressBar';
import { PropButton } from '../components/PropButton';
import { PropSystem } from '../../gameplay/props/PropSystem';
import { PropType } from '../../gameplay/props/Prop';
import gsap from 'gsap';
import { ComboDisplay } from '../components/ComboDisplay';

export class GameHUD extends Container {
  private scoreText!: Text;
  private chainText!: Text;
  private levelText!: Text;
  private pauseButton!: Container;
  private timerText!: Text;
  private objectiveBar!: UIProgressBar;
  private currentScore = 0;
  private displayScore = 0;
  private scoreProxy: { value: number };
  private scoreTween: gsap.core.Tween | null = null;
  private onScoreUpdatedBound: (data: { totalScore: number; earnedScore: number; chainCount: number }) => void;
  private propSystem: PropSystem;
  private propButtons: Map<PropType, PropButton> = new Map();
  private crosshair: Graphics | null = null;
  private comboDisplay: ComboDisplay | null = null;
  private propsContainer!: Container;
  private selectedProp: PropType | null = null;
  private propTargetMode = false;

  constructor(propSystem: PropSystem) {
    super();
    this.eventMode = 'static';
    this.propSystem = propSystem;
    this.scoreProxy = { value: 0 };
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
    this.propsContainer.x = -360;

    const propsData = [
      { type: PropType.BOMB, icon: 'bomb', x: 0 },
      { type: PropType.RAINBOW, icon: 'rainbow', x: 70 },
      { type: PropType.FREEZE, icon: 'freeze', x: 140 },
      { type: PropType.SHRINK, icon: 'shrink', x: 210 },
      { type: PropType.LUCKY, icon: 'lucky', x: 280 },
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

    this.crosshair = new Graphics();
    this.crosshair.visible = false;
    this.addChild(this.crosshair);

    this.comboDisplay = new ComboDisplay();
    this.comboDisplay.visible = false;
    this.addChild(this.comboDisplay);
  }

  private onPropClick(type: PropType): void {
    const count = this.propSystem.getPropCount(type);
    if (count <= 0) return;

    if (type === PropType.BOMB) {
      if (this.selectedProp === PropType.BOMB) {
        this.exitBombTargetMode();
        this.setPropSelected(null);
      } else {
        this.enterBombTargetMode();
        this.setPropSelected(PropType.BOMB);
      }
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
    this.setPropSelected(null);
    this.hideCrosshair();
    eventBus.emit('ui:propTargetMode', { enabled: false });
  }

  private exitBombTargetMode(): void {
    this.exitPropTargetMode();
  }

  updatePropButtons(): void {
    this.propButtons.forEach((button, type) => {
      const count = this.propSystem.getPropCount(type);
      button.updateCount(count);
    });
  }

  showCombo(count: number): void {
    if (this.comboDisplay) {
      this.comboDisplay.showCombo(count);
    }
  }

  showCrosshair(x: number, y: number): void {
    if (!this.crosshair) return;
    this.crosshair.visible = true;
    this.crosshair.clear();
    this.crosshair.moveTo(x - 20, y);
    this.crosshair.lineTo(x + 20, y);
    this.crosshair.moveTo(x, y - 20);
    this.crosshair.lineTo(x, y + 20);
    this.crosshair.stroke({ width: 2, color: 0xff4444, alpha: 0.8 });
    this.crosshair.circle(x, y, 10);
    this.crosshair.stroke({ width: 2, color: 0xff4444, alpha: 0.5 });
  }

  updateCrosshair(x: number, y: number): void {
    if (!this.crosshair || !this.crosshair.visible) return;
    this.showCrosshair(x, y);
  }

  hideCrosshair(): void {
    if (this.crosshair) {
      this.crosshair.visible = false;
    }
  }

  setPropSelected(propType: PropType | null): void {
    if (this.selectedProp && this.selectedProp !== propType) {
      const prev = this.propButtons.get(this.selectedProp);
      if (prev) prev.clearSelected();
    }
    this.selectedProp = propType;
    if (propType) {
      const btn = this.propButtons.get(propType);
      if (btn) btn.setSelected();
    }
  }

  private createPauseButton(): void {
    this.pauseButton = new Container();

    const bg = new Graphics();
    bg.circle(0, 0, 25);
    bg.fill({ color: 0x333333 });
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

    this.pauseButton.x = -100;
    this.pauseButton.y = 30;
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
    this.timerText.x = -100;
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
    this.objectiveBar.x = -100;
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
      this.animateScore();
    }
  }

  private animateScore(): void {
    if (this.scoreTween) {
      this.scoreTween.kill();
    }

    this.scoreProxy.value = this.displayScore;

    this.scoreTween = gsap.to(this.scoreProxy, {
      value: this.currentScore,
      duration: 0.6,
      ease: 'power1.out',
      onUpdate: () => {
        this.displayScore = Math.round(this.scoreProxy.value);
        this.scoreText.text = `Score: ${this.displayScore.toLocaleString()}`;
      },
      onComplete: () => {
        this.displayScore = this.currentScore;
        this.scoreText.text = `Score: ${this.displayScore.toLocaleString()}`;
        this.scoreTween = null;
      },
    });
  }

  updateLevel(levelId: number, levelName: string): void {
    this.levelText.text = `Level ${levelId}: ${levelName}`;
  }

  layout(screenWidth: number, screenHeight: number): void {
    this.propsContainer.x = screenWidth - 360;
    this.propsContainer.y = 15;
    this.pauseButton.x = screenWidth - 50;
    this.pauseButton.y = 30;
    this.timerText.x = screenWidth / 2;
    this.objectiveBar.x = screenWidth - 250;
    this.objectiveBar.y = 85;
  }

  reset(): void {
    this.currentScore = 0;
    this.displayScore = 0;
    this.scoreProxy.value = 0;
    if (this.scoreTween) {
      this.scoreTween.kill();
      this.scoreTween = null;
    }
    this.scoreText.text = 'Score: 0';
    this.chainText.text = '';
    this.timerText.visible = false;
    this.timerText.text = '';
    this.objectiveBar.setProgress(0);
    this.updatePropButtons();
    this.exitPropTargetMode();
  }

  skipAnimation(): void {
    if (this.scoreTween) {
      this.scoreTween.kill();
      this.scoreTween = null;
    }
    this.displayScore = this.currentScore;
    this.scoreProxy.value = this.currentScore;
    this.scoreText.text = `Score: ${this.displayScore.toLocaleString()}`;
  }

  destroy(): void {
    eventBus.off('score:updated', this.onScoreUpdatedBound);
    if (this.scoreTween) {
      this.scoreTween.kill();
      this.scoreTween = null;
    }
    this.propButtons.clear();
    super.destroy();
  }
}
