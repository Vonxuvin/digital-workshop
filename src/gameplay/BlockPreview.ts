import { Bounds, Container, Graphics, Text } from 'pixi.js';
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
  private static readonly NEXT_PREVIEW_PADDING_X = 40;
  private static readonly NEXT_PREVIEW_PADDING_Y = 40;
  private minX: number = 0;
  private maxX: number = 0;
  private groundY: number = 0;
  private gravityAngle: number = 0;
  private nextPreviewActive: boolean = false;

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
    const config = getBlockConfig(value);
    this.radius = config.radius;

    const boundedX = Math.max(this.minX + this.radius, Math.min(this.maxX - this.radius, x));
    this.targetX = boundedX;
    this.previewY = dropY;

    this.visible = true;
    this.x = boundedX;
    this.y = dropY;

    this.valueText.text = String(value);

    this.drawPreview();
    this.drawTrail(boundedX, dropY);
    this.drawLandingMarker(boundedX, dropY);
    this.hideNextPreview();
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
    const relativeY = targetY - this.y;

    const dx = Math.sin(this.gravityAngle);
    const dy = Math.cos(this.gravityAngle);
    const trailLength = relativeY - this.radius;
    const endX = dx * trailLength;
    const endY = dy * trailLength;

    this.trailGraphics.moveTo(0, 0);
    this.trailGraphics.lineTo(endX, endY);
    this.trailGraphics.stroke({ width: 1.5, color: 0xffffff, alpha: 0.25 });

    const totalLength = Math.sqrt(endX * endX + endY * endY);
    const dirX = totalLength > 0 ? dx : 0;
    const dirY = totalLength > 0 ? dy : 1;
    let dist = 0;
    let drawDash = true;
    while (dist < totalLength) {
      if (drawDash) {
        const segEnd = Math.min(dist + BlockPreview.DASH_LENGTH, totalLength);
        this.trailGraphics.moveTo(dirX * dist, dirY * dist);
        this.trailGraphics.lineTo(dirX * segEnd, dirY * segEnd);
        this.trailGraphics.stroke({ width: 2, color: 0xffffff, alpha: 0.35 });
      }
      dist += BlockPreview.DASH_LENGTH + BlockPreview.DASH_GAP;
      drawDash = !drawDash;
    }
  }

  private drawLandingMarker(x: number, y: number): void {
    this.landingMarker.clear();

    const markerRadius = this.radius + 3;
    this.landingMarker.circle(0, 0, markerRadius);
    this.landingMarker.stroke({ width: 1.5, color: 0xffffff, alpha: 0.3 });

    this.landingMarker.x = 0;
    this.landingMarker.y = this.groundY > 0 ? this.groundY - this.y - markerRadius : 0;
  }

  updatePosition(x: number): void {
    const boundedX = Math.max(this.minX + this.radius, Math.min(this.maxX - this.radius, x));
    this.targetX = boundedX;
    this.x = boundedX;
    this.drawTrail(boundedX, this.previewY);
    this.drawLandingMarker(boundedX, this.previewY);
  }

  getTargetX(): number {
    return this.targetX;
  }

  hide(): void {
    this.visible = false;
    this.trailGraphics.clear();
    this.landingMarker.clear();
    this.graphics.clear();
  }

  override getBounds(skipUpdate?: boolean, bounds?: Bounds): Bounds {
    if (!this.visible && this.maxX > this.minX) {
      const result = bounds || new Bounds();
      result.minX = this.minX;
      result.minY = 0;
      result.maxX = this.maxX;
      result.maxY = this.groundY > 0 ? this.groundY : 600;
      return result;
    }
    return super.getBounds(skipUpdate, bounds);
  }

  setGroundY(groundY: number): void {
    this.groundY = groundY;
    this.previewY = Math.max(60, groundY - 30);
  }

  setBounds(minX: number, maxX: number): void {
    this.minX = minX;
    this.maxX = maxX;
    this.updateNextPreviewPosition();
  }

  setGravityAngle(angleRad: number): void {
    this.gravityAngle = angleRad;
    if (this.visible) {
      this.drawTrail(this.targetX, this.previewY);
      this.drawLandingMarker(this.targetX, this.previewY);
    }
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

  getNextPreviewPosition(): { x: number; y: number } {
    return this.calculateNextPosition();
  }

  private updateNextPreview(): void {
    if (!this.nextPreview) {
      this.nextPreview = new Container();
      this.nextPreview.visible = false;
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

    this.updateNextPreviewPosition();
    this.nextPreview.visible = true;
    this.nextPreviewActive = true;
  }

  private calculateNextPosition(): { x: number; y: number } {
    return {
      x: this.maxX - BlockPreview.NEXT_PREVIEW_PADDING_X,
      y: BlockPreview.NEXT_PREVIEW_PADDING_Y,
    };
  }

  private updateNextPreviewPosition(): void {
    if (!this.nextPreview) return;
    const pos = this.calculateNextPosition();
    this.nextPreview.x = pos.x;
    this.nextPreview.y = pos.y;
  }

  showNextPreview(): void {
    if (this.nextPreview && this.nextPreviewActive) {
      this.nextPreview.visible = true;
    }
  }

  hideNextPreview(): void {
    if (this.nextPreview) {
      this.nextPreview.visible = false;
    }
  }

  deactivateNextPreview(): void {
    if (this.nextPreview) {
      this.nextPreview.visible = false;
    }
    this.nextPreviewActive = false;
  }

  isNextPreviewActive(): boolean {
    return this.nextPreviewActive;
  }

  isNextPreviewVisible(): boolean {
    return this.nextPreview?.visible ?? false;
  }

  destroy(): void {
    if (this.nextPreview) {
      this.nextPreview.destroy({ children: true });
      this.nextPreview = null;
    }
    super.destroy({ children: true });
  }
}