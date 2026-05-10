import { Container, Graphics, Text } from 'pixi.js';
import { UIButton } from './UIButton';

export class UIPanel extends Container {
  private background: Graphics;
  private titleBar: Container;
  private titleText: Text;
  private closeButton: UIButton;
  private contentArea: Container;
  private panelWidth: number;
  private panelHeight: number;
  private isShowing = false;
  private isHiding = false;
  private animationId: number | null = null;

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
    this.background.roundRect(0, 0, this.panelWidth, this.panelHeight, 12);
    this.background.fill({ color: 0x1a1a2e, alpha: 0.9 });

    this.background.moveTo(0, 50);
    this.background.lineTo(this.panelWidth, 50);
    this.background.stroke({ width: 1, color: 0x444466 });
  }

  setTitle(text: string): void {
    this.titleText.text = text;
  }

  getContentArea(): Container {
    return this.contentArea;
  }

  show(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    this.visible = true;
    this.isShowing = true;
    this.isHiding = false;

    const targetY = this.y;
    this.y = targetY + this.panelHeight;

    const startY = this.y;
    const startTime = performance.now();
    const duration = 300;

    const animate = (now: number) => {
      if (this.isHiding) return;

      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.y = startY + (targetY - startY) * eased;

      if (t < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isShowing = false;
        this.animationId = null;
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  hide(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    this.isHiding = true;
    this.isShowing = false;

    const startY = this.y;
    const targetY = startY + this.panelHeight;
    const startTime = performance.now();
    const duration = 250;

    const animate = (now: number) => {
      if (this.isShowing) return;

      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t * t;
      this.y = startY + (targetY - startY) * eased;

      if (t < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.visible = false;
        this.isHiding = false;
        this.animationId = null;
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }
}
