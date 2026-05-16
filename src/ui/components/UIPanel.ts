import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { UIButton } from './UIButton';

export class UIPanel extends Container {
  private background: Graphics;
  private titleBar: Container;
  private titleText: Text;
  private closeButton: UIButton;
  private contentArea: Container;
  private panelWidth: number;
  private panelHeight: number;
  private panelTween: gsap.core.Tween | null = null;

  constructor(width: number = 400, height: number = 500) {
    super();

    this.panelWidth = width;
    this.panelHeight = height;

    this.background = new Graphics();
    this.drawBackground();
    this.addChild(this.background);

    this.titleBar = new Container();
    this.addChild(this.titleBar);

    this.titleText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.titleText.anchor.set(0, 0.5);
    this.titleText.x = 20;
    this.titleText.y = 25;
    this.titleBar.addChild(this.titleText);

    this.closeButton = new UIButton({
      width: 30,
      height: 30,
      label: 'X',
      color: 0xff4444,
      fontSize: 14,
      borderRadius: 5,
      onClick: () => this.hide(),
    });
    this.closeButton.x = this.panelWidth - 25;
    this.closeButton.y = 25;
    this.titleBar.addChild(this.closeButton);

    this.contentArea = new Container();
    this.contentArea.y = 50;
    this.addChild(this.contentArea);

    this.visible = false;
  }

  private drawBackground(): void {
    this.background.clear();

    this.background.beginPath();
    this.background.roundRect(0, 0, this.panelWidth, this.panelHeight, 12);
    this.background.fill({ color: 0x1a1a2e, alpha: 0.9 });
    this.background.closePath();

    this.background.beginPath();
    this.background.moveTo(0, 50);
    this.background.lineTo(this.panelWidth, 50);
    this.background.stroke({ width: 1, color: 0x444466 });
    this.background.closePath();
  }

  setTitle(text: string): void {
    this.titleText.text = text;
  }

  getContentArea(): Container {
    return this.contentArea;
  }

  show(): void {
    this.killPanelTween();

    this.visible = true;

    const targetY = this.y + this.panelHeight;
    this.y = targetY;

    this.panelTween = gsap.to(this, {
      y: targetY - this.panelHeight,
      duration: 0.3,
      ease: 'power3.out',
      onComplete: () => {
        this.panelTween = null;
      },
    });
  }

  hide(): void {
    this.killPanelTween();

    const targetY = this.y + this.panelHeight;

    this.panelTween = gsap.to(this, {
      y: targetY,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        this.visible = false;
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

  destroy(): void {
    this.killPanelTween();
    super.destroy();
  }
}
