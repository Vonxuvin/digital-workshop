import { Container, Text } from 'pixi.js';

export class ComboDisplay extends Container {
  private comboText: Text;
  private currentCombo = 0;
  private displayTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DISPLAY_DURATION = 2000;

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
    const startScale = 1.5;
    const endScale = 1.0;
    const duration = 200;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.scale.set(startScale + (endScale - startScale) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
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

  destroy(): void {
    if (this.displayTimer) clearTimeout(this.displayTimer);
    this.currentCombo = 0;
    super.destroy();
  }
}
