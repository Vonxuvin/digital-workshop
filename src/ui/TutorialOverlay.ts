import { Container, Graphics, Text } from 'pixi.js';

export interface TutorialStep {
  id: string;
  message: string;
  highlightArea?: { x: number; y: number; width: number; height: number };
  trigger: 'auto' | 'tap' | 'drop' | 'merge' | 'warning';
  waitForAction?: string;
}

export class TutorialOverlay extends Container {
  private maskGraphics: Graphics;
  private messageBox: Graphics;
  private messageText: Text;
  private skipText: Text;
  private currentHighlight: { x: number; y: number; width: number; height: number } | null = null;
  private screenWidth: number = 800;
  private screenHeight: number = 600;
  private onSkip: (() => void) | null = null;

  constructor() {
    super();
    this.visible = false;
    this.eventMode = 'static';

    this.maskGraphics = new Graphics();
    this.addChild(this.maskGraphics);

    this.messageBox = new Graphics();
    this.addChild(this.messageBox);

    this.messageText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 0xffffff,
        wordWrap: true,
        wordWrapWidth: 280,
        align: 'center',
      },
    });
    this.messageText.anchor.set(0.5);
    this.addChild(this.messageText);

    this.skipText = new Text({
      text: '跳过教程',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0x888888,
      },
    });
    this.skipText.eventMode = 'static';
    this.skipText.cursor = 'pointer';
    this.skipText.on('pointerdown', () => {
      if (this.onSkip) this.onSkip();
    });
    this.addChild(this.skipText);
  }

  setOnSkip(callback: () => void): void {
    this.onSkip = callback;
  }

  show(step: TutorialStep, screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.currentHighlight = step.highlightArea || null;
    this.visible = true;
    this.drawMask();
    this.drawMessage(step.message);
  }

  hide(): void {
    this.visible = false;
    this.currentHighlight = null;
  }

  private drawMask(): void {
    this.maskGraphics.clear();

    this.maskGraphics.rect(0, 0, this.screenWidth, this.screenHeight);
    this.maskGraphics.fill({ color: 0x000000, alpha: 0.6 });

    if (this.currentHighlight) {
      const h = this.currentHighlight;
      this.maskGraphics.clear();
      this.maskGraphics.beginPath();
      this.maskGraphics.rect(0, 0, this.screenWidth, this.screenHeight);
      this.maskGraphics.rect(h.x, h.y, h.width, h.height);
      this.maskGraphics.fill({ color: 0x000000, alpha: 0.6 });
      this.maskGraphics.closePath();
    }
  }

  private drawMessage(message: string): void {
    const boxWidth = 320;
    const boxHeight = 100;
    const boxX = (this.screenWidth - boxWidth) / 2;
    const boxY = this.screenHeight - boxHeight - 120;

    this.messageBox.clear();
    this.messageBox.roundRect(boxX, boxY, boxWidth, boxHeight, 12);
    this.messageBox.fill({ color: 0x2a2a4a, alpha: 0.95 });
    this.messageBox.roundRect(boxX, boxY, boxWidth, boxHeight, 12);
    this.messageBox.stroke({ width: 2, color: 0x6a6a8a, alpha: 0.8 });

    this.messageText.text = message;
    this.messageText.x = boxX + boxWidth / 2;
    this.messageText.y = boxY + boxHeight / 2;

    this.skipText.x = this.screenWidth - 80;
    this.skipText.y = 20;
  }

  resize(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    if (this.visible && this.currentHighlight) {
      this.drawMask();
    }
  }
}