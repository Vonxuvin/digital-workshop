import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { ObjectiveType, LevelConfig } from '../../gameplay/LevelSystem';
import { ObjectiveDisplay } from '../components/ObjectiveDisplay';
import { eventBus, GameEvents } from '../../utils/EventBus';

export class LevelObjectiveOverlay extends Container {
  private overlay: Graphics;
  private panel: Graphics;
  private titleText: Text;
  private levelNameText: Text;
  private objectiveDisplay: ObjectiveDisplay;
  private startHintText: Text;
  private _config: LevelConfig | null = null;
  private _visible = false;
  private panelTween: gsap.core.Tween | null = null;
  private screenWidth = 800;
  private screenHeight = 600;

  constructor() {
    super();

    this.overlay = new Graphics();
    this.addChild(this.overlay);

    this.panel = new Graphics();
    this.addChild(this.panel);

    this.titleText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 28,
        fill: 0xffd700,
        fontWeight: 'bold',
      },
    });
    this.titleText.anchor.set(0.5);
    this.addChild(this.titleText);

    this.levelNameText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 0xcccccc,
      },
    });
    this.levelNameText.anchor.set(0.5);
    this.addChild(this.levelNameText);

    this.objectiveDisplay = new ObjectiveDisplay(240);
    this.addChild(this.objectiveDisplay);

    this.startHintText = new Text({
      text: '点击任意处开始',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0x888888,
      },
    });
    this.startHintText.anchor.set(0.5);
    this.addChild(this.startHintText);

    this.visible = false;
    this.eventMode = 'static';
    this.on('pointerdown', () => {
      if (this._visible) {
        eventBus.emit(GameEvents.LEVEL_OBJECTIVE_DISMISSED);
        this.hide();
      }
    });
  }

  showObjective(config: LevelConfig): void {
    this._config = config;
    this._visible = true;
    this.visible = true;

    this.titleText.text = `关卡 ${config.id}`;
    this.levelNameText.text = config.name;

    const objectiveData = {
      type: config.objective.type,
      target: config.objective.target,
      currentValue: 0,
      timeLimit: config.objective.timeLimit,
    };
    this.objectiveDisplay.setObjective(objectiveData);

    this.layout(this.screenWidth, this.screenHeight);
    this.animateIn();
  }

  hide(): void {
    this._visible = false;
    this.animateOut();
  }

  isVisible(): boolean {
    return this._visible;
  }

  getConfig(): LevelConfig | null {
    return this._config;
  }

  private animateIn(): void {
    this.killPanelTween();
    this.panel.alpha = 0;
    this.titleText.alpha = 0;
    this.levelNameText.alpha = 0;
    this.objectiveDisplay.alpha = 0;
    this.startHintText.alpha = 0;

    const tl = gsap.timeline();
    tl.to(this.panel, { alpha: 1, duration: 0.3 });
    tl.to(this.titleText, { alpha: 1, duration: 0.2 }, '-=0.1');
    tl.to(this.levelNameText, { alpha: 1, duration: 0.2 }, '-=0.1');
    tl.to(this.objectiveDisplay, { alpha: 1, duration: 0.2 }, '-=0.1');
    tl.to(this.startHintText, { alpha: 1, duration: 0.2 }, '-=0.1');
  }

  private animateOut(): void {
    this.killPanelTween();
    this.panelTween = gsap.to(this, {
      alpha: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        this.visible = false;
        this.alpha = 1;
        this.panelTween = null;
      },
    });
  }

  private killPanelTween(): void {
    if (this.panelTween) {
      this.panelTween.kill();
      this.panelTween = null;
    }
  }

  layout(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    this.overlay.clear();
    this.overlay.rect(0, 0, screenWidth, screenHeight);
    this.overlay.fill({ color: 0x000000, alpha: 0.6 });

    const panelWidth = 320;
    const panelHeight = 220;
    const panelX = (screenWidth - panelWidth) / 2;
    const panelY = (screenHeight - panelHeight) / 2;

    this.panel.clear();
    this.panel.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
    this.panel.fill({ color: 0x1a1a2e, alpha: 0.95 });
    this.panel.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
    this.panel.stroke({ width: 2, color: 0x4a4a8a, alpha: 0.6 });

    this.titleText.x = screenWidth / 2;
    this.titleText.y = panelY + 35;

    this.levelNameText.x = screenWidth / 2;
    this.levelNameText.y = panelY + 70;

    this.objectiveDisplay.x = panelX + 40;
    this.objectiveDisplay.y = panelY + 100;

    this.startHintText.x = screenWidth / 2;
    this.startHintText.y = panelY + panelHeight - 30;
  }

  reset(): void {
    this._config = null;
    this._visible = false;
    this.visible = false;
    this.objectiveDisplay.reset();
    this.killPanelTween();
  }

  destroy(): void {
    this.killPanelTween();
    super.destroy();
  }
}
