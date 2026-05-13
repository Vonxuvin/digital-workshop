import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { TimeManager } from '../../utils/TimeManager';

export class ComboDisplay extends Container {
  private comboText: Text;
  private comboBg: Graphics;
  private comboGlow: Graphics;
  private currentCombo = 0;
  private displayTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DISPLAY_DURATION = 2000;
  private scaleTween: gsap.core.Tween | null = null;
  private fadeTween: gsap.core.Tween | null = null;

  constructor() {
    super();
    this.visible = false;

    this.comboBg = new Graphics();
    this.addChild(this.comboBg);

    this.comboGlow = new Graphics();
    this.addChild(this.comboGlow);

    this.comboText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 48,
        fill: 0xffd700,
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 4 },
      },
    });
    this.comboText.anchor.set(0.5);
    this.addChild(this.comboText);
  }

  showCombo(comboCount: number, screenWidth?: number, screenHeight?: number): void {
    this.currentCombo = comboCount;
    if (comboCount < 2) {
      this.hide();
      return;
    }

    const scale = 0.8 + Math.min(comboCount * 0.1, 0.8);
    const glowRadius = 60 + comboCount * 8;

    this.comboText.text = `x${comboCount} COMBO!`;

    this.comboBg.clear();
    this.comboBg.circle(0, 0, glowRadius);
    this.comboBg.fill({ color: 0x000000, alpha: 0.4 });

    this.comboGlow.clear();
    this.comboGlow.circle(0, 0, glowRadius + 10);
    this.comboGlow.stroke({ width: 3, color: 0xffd700, alpha: 0.6 });

    if (screenWidth && screenHeight) {
      this.x = screenWidth / 2;
      this.y = screenHeight / 2;
    }

    this.visible = true;
    this.alpha = 1;
    this.scale.set(scale * 1.3);

    this.animateScale(scale);

    if (this.displayTimer) clearTimeout(this.displayTimer);
    this.displayTimer = setTimeout(() => {
      this.fadeOut();
    }, this.DISPLAY_DURATION);
  }

  private animateScale(targetScale: number = 1): void {
    if (this.scaleTween) {
      this.scaleTween.kill();
    }

    const timeline = TimeManager.getInstance().getGameTimeline();
    this.scaleTween = gsap.to(this.scale, {
      x: targetScale,
      y: targetScale,
      duration: 0.4,
      ease: 'back.out(1.7)',
      onComplete: () => {
        this.scaleTween = null;
      },
    });
    timeline.add(this.scaleTween, timeline.time());
  }

  private fadeOut(): void {
    if (this.fadeTween) {
      this.fadeTween.kill();
    }
    const timeline = TimeManager.getInstance().getGameTimeline();
    this.fadeTween = gsap.to(this, {
      alpha: 0,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        this.visible = false;
        this.currentCombo = 0;
        this.fadeTween = null;
      },
    });
    timeline.add(this.fadeTween, timeline.time());
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
    if (this.fadeTween) {
      this.fadeTween.kill();
      this.fadeTween = null;
    }
    if (this.displayTimer) clearTimeout(this.displayTimer);
    this.currentCombo = 0;
    super.destroy();
  }
}