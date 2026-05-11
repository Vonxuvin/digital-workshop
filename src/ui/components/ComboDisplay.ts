import { Container, Text, Ticker } from 'pixi.js';

export class ComboDisplay extends Container {
  private comboText: Text;
  private currentCombo = 0;
  private displayTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DISPLAY_DURATION = 2000;
  private tickerCallback: ((ticker: any) => void) | null = null;

  constructor() {
    super();
    this.comboText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 36,
        fill: 0xffd700,
        fontWeight: 'bold',
        dropShadow: { color: 0x000000, blur: 4, angle: Math.PI / 4, distance: 3 },
      },
    });
    this.comboText.anchor.set(0.5);
    this.addChild(this.comboText);
    this.visible = false;
  }

  showCombo(comboCount: number): void {
    this.currentCombo = comboCount;
    if (comboCount < 2) {
      this.hide();
      return;
    }
    this.comboText.text = `x${comboCount} COMBO!`;
    this.visible = true;
    this.alpha = 1;
    this.scale.set(1.5);

    this.animateScale();

    if (this.displayTimer) clearTimeout(this.displayTimer);
    this.displayTimer = setTimeout(() => {
      this.hide();
    }, this.DISPLAY_DURATION);
  }

  private animateScale(): void {
    this.detachTicker();
    const startScale = 1.5;
    const endScale = 1.0;
    const duration = 200;
    const startTime = performance.now();

    this.tickerCallback = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.scale.set(startScale + (endScale - startScale) * eased);
      if (progress >= 1) {
        this.detachTicker();
      }
    };
    Ticker.shared.add(this.tickerCallback);
  }

  hide(): void {
    this.visible = false;
    this.currentCombo = 0;
    if (this.displayTimer) {
      clearTimeout(this.displayTimer);
      this.displayTimer = null;
    }
  }

  getCurrentCombo(): number {
    return this.currentCombo;
  }

  private detachTicker(): void {
    if (this.tickerCallback) {
      Ticker.shared.remove(this.tickerCallback);
      this.tickerCallback = null;
    }
  }

  destroy(): void {
    this.detachTicker();
    if (this.displayTimer) clearTimeout(this.displayTimer);
    this.currentCombo = 0;
    super.destroy();
  }
}
