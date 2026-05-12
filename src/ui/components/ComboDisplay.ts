import { Container, Text } from 'pixi.js';
import gsap from 'gsap';

export class ComboDisplay extends Container {
  private comboText: Text;
  private currentCombo = 0;
  private displayTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DISPLAY_DURATION = 2000;
  private scaleTween: gsap.core.Tween | null = null;

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
    if (this.scaleTween) {
      this.scaleTween.kill();
    }

    this.scaleTween = gsap.to(this.scale, {
      x: 1,
      y: 1,
      duration: 0.2,
      ease: 'power3.out',
      onComplete: () => {
        this.scaleTween = null;
      },
    });
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
    if (this.scaleTween) {
      this.scaleTween.kill();
      this.scaleTween = null;
    }
    if (this.displayTimer) clearTimeout(this.displayTimer);
    this.currentCombo = 0;
    super.destroy();
  }
}
