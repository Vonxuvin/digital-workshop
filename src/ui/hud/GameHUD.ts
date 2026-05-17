
import { Container, Text, Graphics } from 'pixi.js';
import { eventBus, GameEvents } from '../../utils/EventBus';
import { ObjectiveDisplay, ObjectiveDisplayData } from '../components/ObjectiveDisplay';
import { PropButton } from '../components/PropButton';
import { PropSystem } from '../../gameplay/props/PropSystem';
import { PropType } from '../../gameplay/props/Prop';
import gsap from 'gsap';
import { ComboDisplay } from '../components/ComboDisplay';
import { TimeManager } from '../../utils/TimeManager';
import { ObjectiveType } from '../../gameplay/LevelSystem';

export class GameHUD extends Container {
  private _scoreText!: Text;
  private _chainText!: Text;
  private _levelText!: Text;
  private _pauseButton!: Container;
  private timerText!: Text;
  private _objectiveDisplay!: ObjectiveDisplay;
  private _currentObjectiveType: ObjectiveType | null = null;
  private _currentObjectiveTarget = 0;
  private _currentTimeLimit: number | undefined = undefined;
  private currentScore = 0;
  private displayScore = 0;
  private scoreProxy: { value: number };
  private scoreTween: gsap.core.Tween | null = null;
  private onScoreUpdatedBound: (data: { totalScore: number; earnedScore: number; chainCount: number }) => void;
  private propSystem: PropSystem;
  private _propButtons: Map<PropType, PropButton> = new Map();
  private crosshair: Graphics | null = null;
  private _comboDisplay: ComboDisplay | null = null;
  private _propsContainer!: Container;
  private selectedProp: PropType | null = null;
  private propTargetMode = false;
  private _propButtonJustClicked = false;
  private screenWidth = 0;
  private screenHeight = 0;
  private _currentButtonSize = 60;

  get scoreText(): Text { return this._scoreText; }
  get levelText(): Text { return this._levelText; }
  get pauseButton(): Container { return this._pauseButton; }
  get propsContainer(): Container { return this._propsContainer; }
  get objectiveDisplay(): ObjectiveDisplay { return this._objectiveDisplay; }
  get comboDisplay(): ComboDisplay | null { return this._comboDisplay; }
  get propButtons(): Map<PropType, PropButton> { return this._propButtons; }
  get propsContainerX(): number { return this._propsContainer?.x ?? 0; }
  get propsBarWidth(): number { return this._propsContainer?.width ?? 0; }
  get currentButtonSize(): number { return this._currentButtonSize; }
  get isPropTargetMode(): boolean { return this.propTargetMode; }

  getObjectiveBar(): ObjectiveDisplay { return this._objectiveDisplay; }

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
    this.createObjectiveDisplay();
    this.setupEventListeners();
  }

  private createScoreDisplay(): void {
    this._scoreText = new Text({
      text: 'Score: 0',
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this._scoreText.x = 20;
    this._scoreText.y = 20;
    this.addChild(this._scoreText);
  }

  private createChainDisplay(): void {
    this._chainText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xffd700,
      },
    });
    this._chainText.x = 20;
    this._chainText.y = 55;
    this.addChild(this._chainText);
  }

  private createLevelDisplay(): void {
    this._levelText = new Text({
      text: 'Level 1',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0x999999,
      },
    });
    this._levelText.x = 20;
    this._levelText.y = 80;
    this.addChild(this._levelText);
  }

  private createPropsBar(): void {
    this._propsContainer = new Container();
    this._propsContainer.eventMode = 'static';

    const propsData = [
      { type: PropType.BOMB, icon: 'bomb', row: 0, col: 0 },
      { type: PropType.RAINBOW, icon: 'rainbow', row: 0, col: 1 },
      { type: PropType.FREEZE, icon: 'freeze', row: 0, col: 2 },
      { type: PropType.SHRINK, icon: 'shrink', row: 1, col: 0 },
      { type: PropType.LUCKY, icon: 'lucky', row: 1, col: 1 },
    ];

    const buttonSize = 60;
    const buttonGap = 8;
    const rowGap = 6;

    propsData.forEach(propData => {
      const count = this.propSystem.getPropCount(propData.type);
      const x = propData.col * (buttonSize + buttonGap);
      const y = propData.row * (buttonSize + rowGap);
      const button = new PropButton({
        propType: propData.type,
        icon: propData.icon,
        count: count,
        onClick: (type) => this.onPropClick(type),
        x,
        y,
        size: buttonSize,
      });
      this._propsContainer.addChild(button);
      this._propButtons.set(propData.type, button);
    });

    this.addChild(this._propsContainer);

    this.crosshair = new Graphics();
    this.crosshair.visible = false;
    this.addChild(this.crosshair);

    this._comboDisplay = new ComboDisplay();
    this._comboDisplay.visible = false;
    this.addChild(this._comboDisplay);
  }

  private onPropClick(type: PropType): void {
    const count = this.propSystem.getPropCount(type);
    if (count <= 0) return;

    this._propButtonJustClicked = true;

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
      }
    }
  }

  private enterBombTargetMode(): void {
    this.selectedProp = PropType.BOMB;
    this.propTargetMode = true;
    const centerX = this.screenWidth / 2;
    const centerY = this.screenHeight / 2;
    if (centerX > 0 && centerY > 0) {
      this.showCrosshair(centerX, centerY);
    }
    eventBus.emit(GameEvents.UI_PROP_TARGET_MODE, { type: PropType.BOMB, enabled: true });
  }

  usePropAtPosition(x: number, y: number): void {
    if (!this.propTargetMode || !this.selectedProp) return;
    
    const success = this.propSystem.useProp(this.selectedProp, { x, y });
    if (success) {
      this.updatePropButtons();
    }
    
    this.exitPropTargetMode();
  }

  exitPropTargetMode(): void {
    this.selectedProp = null;
    this.propTargetMode = false;
    this.setPropSelected(null);
    this.hideCrosshair();
    eventBus.emit(GameEvents.UI_PROP_TARGET_MODE, { enabled: false });
  }

  consumePropButtonClick(): boolean {
    if (this._propButtonJustClicked) {
      this._propButtonJustClicked = false;
      return true;
    }
    return false;
  }

  private exitBombTargetMode(): void {
    this.exitPropTargetMode();
  }

  updatePropButtons(): void {
    this._propButtons.forEach((button, type) => {
      const count = this.propSystem.getPropCount(type);
      button.updateCount(count);
    });
  }

  showCombo(count: number): void {
    if (this._comboDisplay) {
      this._comboDisplay.showCombo(count, this.screenWidth, this.screenHeight);
    }
  }

  showCrosshair(x: number, y: number): void {
    if (!this.crosshair) return;
    this.crosshair.visible = true;
    this.crosshair.clear();
    this.crosshair.position.set(x, y);
    this.crosshair.moveTo(-20, 0);
    this.crosshair.lineTo(20, 0);
    this.crosshair.moveTo(0, -20);
    this.crosshair.lineTo(0, 20);
    this.crosshair.stroke({ width: 2, color: 0xff4444, alpha: 0.8 });
    this.crosshair.circle(0, 0, 10);
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
      const prev = this._propButtons.get(this.selectedProp);
      if (prev) prev.clearSelected();
    }
    this.selectedProp = propType;
    if (propType) {
      const btn = this._propButtons.get(propType);
      if (btn) btn.setSelected();
    }
  }

  private createPauseButton(): void {
    this._pauseButton = new Container();

    const bg = new Graphics();
    bg.circle(0, 0, 25);
    bg.fill({ color: 0x333333 });
    this._pauseButton.addChild(bg);

    const icon = new Text({
      text: '⏸',
      style: {
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 0xffffff,
      },
    });
    icon.anchor.set(0.5);
    this._pauseButton.addChild(icon);

    this._pauseButton.x = -100;
    this._pauseButton.y = 30;
    this._pauseButton.eventMode = 'static';
    this._pauseButton.cursor = 'pointer';

    this._pauseButton.on('pointerdown', () => {
      eventBus.emit(GameEvents.UI_PAUSE);
    });

    this.addChild(this._pauseButton);
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

  private createObjectiveDisplay(): void {
    this._objectiveDisplay = new ObjectiveDisplay(200);
    this._objectiveDisplay.x = -100;
    this._objectiveDisplay.y = 105;
    this.addChild(this._objectiveDisplay);
  }

  setObjectiveInfo(type: ObjectiveType, target: number, timeLimit?: number): void {
    this._currentObjectiveType = type;
    this._currentObjectiveTarget = target;
    this._currentTimeLimit = timeLimit;
    const data: ObjectiveDisplayData = {
      type,
      target,
      currentValue: 0,
      timeLimit,
    };
    this._objectiveDisplay.setObjective(data);
  }

  updateObjectiveProgress(currentValue: number): void {
    if (!this._currentObjectiveType) return;
    const data: ObjectiveDisplayData = {
      type: this._currentObjectiveType,
      target: this._currentObjectiveTarget,
      currentValue,
      timeLimit: this._currentTimeLimit,
    };
    this._objectiveDisplay.updateProgress(data);
  }

  private setupEventListeners(): void {
    eventBus.on(GameEvents.SCORE_UPDATED, this.onScoreUpdatedBound);
  }

  private handleScoreUpdated(data: { totalScore: number; earnedScore: number; chainCount: number }): void {
    if (data.totalScore === this.currentScore) return;
    this.currentScore = data.totalScore;
    if (data.chainCount > 1) {
      this._chainText.text = `连锁 x${data.chainCount}!`;
      this.showCombo(data.chainCount);
    } else {
      this._chainText.text = '';
    }
    this.animateScore();
  }

  update(delta: number): void {
    if (this.displayScore >= this.currentScore) return;
    if (this.scoreTween) return;
    const step = Math.max(1, Math.ceil((this.currentScore - this.displayScore) * delta * 0.08));
    this.displayScore = Math.min(this.currentScore, this.displayScore + step);
    this._scoreText.text = `Score: ${this.displayScore.toLocaleString()}`;
  }

  private animateScore(): void {
    if (this.scoreTween) {
      this.scoreTween.kill();
    }

    this.scoreProxy.value = this.displayScore;

    const timeline = TimeManager.getInstance().getGameTimeline();
    this.scoreTween = gsap.to(this.scoreProxy, {
      value: this.currentScore,
      duration: 0.6,
      ease: 'power1.out',
      onUpdate: () => {
        this.displayScore = Math.round(this.scoreProxy.value);
        this._scoreText.text = `Score: ${this.displayScore.toLocaleString()}`;
      },
      onComplete: () => {
        this.displayScore = this.currentScore;
        this._scoreText.text = `Score: ${this.displayScore.toLocaleString()}`;
        this.scoreTween = null;
      },
    });
    timeline.add(this.scoreTween, timeline.time());
  }

  updateLevel(levelId: number, levelName: string): void {
    this._levelText.text = `Level ${levelId}: ${levelName}`;
  }

  layout(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    const maxPropsBarRatio = 0.45;
    const maxPropsBarWidth = screenWidth * maxPropsBarRatio;
    const baseButtonSize = 60;
    const baseGap = 8;
    const baseRowGap = 6;
    const basePropsBarWidth = 3 * baseButtonSize + 2 * baseGap;

    let buttonSize: number;
    let buttonGap: number;
    let rowGap: number;

    if (basePropsBarWidth > maxPropsBarWidth) {
      const scale = maxPropsBarWidth / basePropsBarWidth;
      buttonSize = Math.floor(baseButtonSize * scale);
      buttonGap = Math.max(4, Math.floor(baseGap * scale));
      rowGap = Math.max(3, Math.floor(baseRowGap * scale));
    } else {
      buttonSize = baseButtonSize;
      buttonGap = baseGap;
      rowGap = baseRowGap;
    }

    const propsBarWidth = 3 * buttonSize + 2 * buttonGap;
    this._currentButtonSize = buttonSize;
    this._propsContainer.x = screenWidth - propsBarWidth - 10;
    this._propsContainer.y = 15;

    this._propButtons.forEach((button) => {
      button.resize(buttonSize);
    });

    const propsData = [
      { type: PropType.BOMB, row: 0, col: 0 },
      { type: PropType.RAINBOW, row: 0, col: 1 },
      { type: PropType.FREEZE, row: 0, col: 2 },
      { type: PropType.SHRINK, row: 1, col: 0 },
      { type: PropType.LUCKY, row: 1, col: 1 },
    ];
    propsData.forEach(pd => {
      const btn = this._propButtons.get(pd.type);
      if (btn) {
        btn.x = pd.col * (buttonSize + buttonGap);
        btn.y = pd.row * (buttonSize + rowGap);
      }
    });

    this._pauseButton.x = screenWidth - 50;
    this._pauseButton.y = 30;
    this.timerText.x = screenWidth / 2;
    this._objectiveDisplay.x = screenWidth - 250;
    this._objectiveDisplay.y = 85;
  }

  reset(): void {
    this.currentScore = 0;
    this.displayScore = 0;
    this.scoreProxy.value = 0;
    this._propButtonJustClicked = false;
    if (this.scoreTween) {
      this.scoreTween.kill();
      this.scoreTween = null;
    }
    this._scoreText.text = 'Score: 0';
    this._chainText.text = '';
    this.timerText.visible = false;
    this.timerText.text = '';
    this._objectiveDisplay.reset();
    this._currentObjectiveType = null;
    this._currentObjectiveTarget = 0;
    this._currentTimeLimit = undefined;
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
    this._scoreText.text = `Score: ${this.displayScore.toLocaleString()}`;
  }

  destroy(): void {
    eventBus.off(GameEvents.SCORE_UPDATED, this.onScoreUpdatedBound);
    if (this.scoreTween) {
      this.scoreTween.kill();
      this.scoreTween = null;
    }
    this._propButtons.forEach((button) => button.destroy());
    this._propButtons.clear();
    super.destroy();
  }
}
