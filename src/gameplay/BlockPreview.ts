import { Container, Graphics, Text } from 'pixi.js';
import { getBlockConfig } from '../gameplay/Block';
import { BlockTextureCache } from '../utils/BlockTextureCache';

export class BlockPreview extends Container {
  private graphics: Graphics;
  private trailGraphics: Graphics;
  private landingMarker: Graphics;
  private valueText: Text;
  private nextPreview: Container | null = null;
  private nextValueText: Text | null = null;
  private currentValue: number = 1;
  private nextValue: number = 1;
  private targetX: number = 0;
  private previewY: number = 80;
  private radius: number = 20;
  private static readonly DASH_GAP = 6;
  private static readonly DASH_LENGTH = 6;

  constructor() {
    super();
    this.visible = false;

    this.trailGraphics = new Graphics();
    this.addChild(this.trailGraphics);

    this.landingMarker = new Graphics();
    this.addChild(this.landingMarker);

    this.graphics = new Graphics();
    this.addChild(this.graphics);

    this.valueText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xffffff,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.valueText.anchor.set(0.5);
    this.addChild(this.valueText);
  }

  show(value: number, x: number, dropY: number): void {
    this.currentValue = value;
    this.targetX = x;
    this.previewY = dropY;
    const config = getBlockConfig(value);
    this.radius = config.radius;

    this.visible = true;
    this.x = x;
    this.y = dropY;

    this.valueText.text = String(value);

    this.drawPreview();
    this.drawTrail(x, dropY);
    this.drawLandingMarker(x, dropY);
  }

  private drawPreview(): void {
    this.graphics.clear();
    const config = getBlockConfig(this.currentValue);

    this.graphics.circle(0, 0, this.radius);
    this.graphics.fill({ color: config.color, alpha: 0.5 });
    this.graphics.circle(0, 0, this.radius);
    this.graphics.stroke({ width: 2, color: config.color, alpha: 0.8 });
  }

  private drawTrail(x: number, targetY: number): void {
    this.trailGraphics.clear();
    const startY = 0;

    this.trailGraphics.moveTo(x, startY);
    this.trailGraphics.lineTo(x, targetY - this.radius);
    this.trailGraphics.stroke({ width: 1.5, color: 0xffffff, alpha: 0.25 });

    let dashY = startY;
    let drawDash = true;
    while (dashY < targetY - this.radius) {
      if (drawDash) {
        this.trailGraphics.moveTo(x, dashY);
        this.trailGraphics.lineTo(x, Math.min(dashY + BlockPreview.DASH_LENGTH, targetY - this.radius));
        this.trailGraphics.stroke({ width: 2, color: 0xffffff, alpha: 0.35 });
      }
      dashY += BlockPreview.DASH_LENGTH + BlockPreview.DASH_GAP;
      drawDash = !drawDash;
    }
  }

  private drawLandingMarker(x: number, y: number): void {
    this.landingMarker.clear();

    this.landingMarker.circle(0, 0, this.radius + 3);
    this.landingMarker.stroke({ width: 1.5, color: 0xffffff, alpha: 0.3 });

    this.landingMarker.x = 0;
    this.landingMarker.y = 0;
  }

  updatePosition(x: number): void {
    this.targetX = x;
    this.x = x;
    this.drawTrail(x, this.previewY);
    this.drawLandingMarker(x, this.previewY);
  }

  getTargetX(): number {
    return this.targetX;
  }

  hide(): void {
    this.visible = false;
  }

  setNextValue(value: number): void {
    this.nextValue = value;
    this.updateNextPreview();
  }

  setNextPosition(x: number, y: number): void {
    if (!this.nextPreview) {
      this.nextPreview = new Container();
      this.nextPreview.visible = false;
      this.parent?.addChild(this.nextPreview);
    }
    this.nextPreview.x = x;
    this.nextPreview.y = y;
  }

  private updateNextPreview(): void {
    if (!this.nextPreview) {
      this.nextPreview = new Container();
      this.parent?.addChild(this.nextPreview);
    }

    this.nextPreview.removeChildren();

    const config = getBlockConfig(this.nextValue);
    const bg = new Graphics();
    bg.roundRect(-25, -25, 50, 50, 8);
    bg.fill({ color: 0x1a1a2e, alpha: 0.8 });
    bg.roundRect(-25, -25, 50, 50, 8);
    bg.stroke({ width: 1, color: 0x444466, alpha: 0.6 });
    this.nextPreview.addChild(bg);

    const label = new Text({
      text: '下一个',
      style: {
        fontFamily: 'Arial',
        fontSize: 10,
        fill: 0x888899,
      },
    });
    label.anchor.set(0.5, 0);
    label.y = -20;
    this.nextPreview.addChild(label);

    const circle = new Graphics();
    circle.circle(0, 2, config.radius * 0.6);
    circle.fill({ color: config.color, alpha: 0.6 });
    this.nextPreview.addChild(circle);

    const valText = new Text({
      text: String(this.nextValue),
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffffff,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 2 },
      },
    });
    valText.anchor.set(0.5);
    valText.y = 2;
    this.nextPreview.addChild(valText);

    this.nextPreview.visible = true;
  }

  showNextPreview(): void {
    if (this.nextPreview) {
      this.nextPreview.visible = true;
    }
  }

  hideNextPreview(): void {
    if (this.nextPreview) {
      this.nextPreview.visible = false;
    }
  }

  destroy(): void {
    if (this.nextPreview) {
      this.nextPreview.destroy({ children: true });
      this.nextPreview = null;
    }
    super.destroy({ children: true });
  }
}