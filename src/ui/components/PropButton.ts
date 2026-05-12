import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { PropType } from '../../gameplay/props/Prop';

export interface PropButtonOptions {
  propType: PropType;
  icon: string;
  count: number;
  onClick: (propType: PropType) => void;
  x: number;
  y: number;
}

export class PropButton extends PIXI.Container {
  private background: PIXI.Graphics;
  private icon: PIXI.Text;
  private countLabel: PIXI.Text;
  private propType: PropType;
  private onClick: (propType: PropType) => void;
  private isEnabled: boolean = true;
  private cooldownOverlay: PIXI.Graphics;
  private scaleTween: gsap.core.Tween | null = null;

  constructor(options: PropButtonOptions) {
    super();
    this.propType = options.propType;
    this.onClick = options.onClick;
    
    this.background = new PIXI.Graphics();
    this.background.fill({ color: 0x2d3436 });
    this.background.setStrokeStyle({ width: 2, color: 0x636e72 });
    this.background.roundRect(0, 0, 60, 60, 8);
    this.addChild(this.background);

    this.icon = new PIXI.Text({
      text: this.getIconEmoji(options.icon),
      style: {
        fontSize: 28,
        align: 'center',
      }
    });
    this.icon.anchor.set(0.5);
    this.icon.x = 30;
    this.icon.y = 25;
    this.addChild(this.icon);

    this.countLabel = new PIXI.Text({
      text: `x${options.count}`,
      style: {
        fontSize: 14,
        fill: 0xffffff,
        fontWeight: 'bold',
      }
    });
    this.countLabel.anchor.set(0.5);
    this.countLabel.x = 30;
    this.countLabel.y = 50;
    this.addChild(this.countLabel);

    this.cooldownOverlay = new PIXI.Graphics();
    this.cooldownOverlay.fill({ color: 0x000000, alpha: 0.5 });
    this.cooldownOverlay.rect(0, 0, 60, 60);
    this.cooldownOverlay.visible = false;
    this.addChild(this.cooldownOverlay);

    this.x = options.x;
    this.y = options.y;
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerdown', this.handlePointerDown.bind(this));
    this.on('pointerup', this.handlePointerUp.bind(this));
    this.on('pointerover', this.handlePointerOver.bind(this));
    this.on('pointerout', this.handlePointerOut.bind(this));
  }

  private getIconEmoji(icon: string): string {
    const icons: Record<string, string> = {
      'bomb': '💣',
      'rainbow': '🌈',
      'freeze': '❄️',
      'shrink': '🔬',
      'lucky': '🍀',
    };
    return icons[icon] || '❓';
  }

  private killScaleTween(): void {
    if (this.scaleTween) {
      this.scaleTween.kill();
      this.scaleTween = null;
    }
  }

  private handlePointerDown(): void {
    if (!this.isEnabled) return;
    this.killScaleTween();
    this.scaleTween = gsap.to(this.scale, {
      x: 0.95,
      y: 0.95,
      duration: 0.08,
      ease: 'power2.out',
      onComplete: () => { this.scaleTween = null; },
    });
  }

  private handlePointerUp(): void {
    if (!this.isEnabled) return;
    this.killScaleTween();
    this.scaleTween = gsap.to(this.scale, {
      x: 1,
      y: 1,
      duration: 0.1,
      ease: 'power2.out',
      onComplete: () => { this.scaleTween = null; },
    });
    this.onClick(this.propType);
  }

  private handlePointerOver(): void {
    if (!this.isEnabled) return;
    this.background.clear();
    this.background.fill({ color: 0x3d4446 });
    this.background.setStrokeStyle({ width: 2, color: 0x74b9ff });
    this.background.roundRect(0, 0, 60, 60, 8);
  }

  private handlePointerOut(): void {
    this.background.clear();
    this.background.fill({ color: 0x2d3436 });
    this.background.setStrokeStyle({ width: 2, color: 0x636e72 });
    this.background.roundRect(0, 0, 60, 60, 8);
    this.killScaleTween();
    this.scaleTween = gsap.to(this.scale, {
      x: 1,
      y: 1,
      duration: 0.1,
      ease: 'power2.out',
      onComplete: () => { this.scaleTween = null; },
    });
  }

  updateCount(count: number): void {
    this.countLabel.text = `x${count}`;
    if (count <= 0) {
      this.setDisabled();
    }
  }

  setDisabled(): void {
    this.isEnabled = false;
    this.alpha = 0.5;
    this.cursor = 'default';
  }

  setEnabled(): void {
    this.isEnabled = true;
    this.alpha = 1;
    this.cursor = 'pointer';
  }

  showCooldown(ratio: number): void {
    this.cooldownOverlay.visible = true;
    this.cooldownOverlay.scale.y = ratio;
  }

  hideCooldown(): void {
    this.cooldownOverlay.visible = false;
  }

  destroy(): void {
    this.killScaleTween();
    this.removeAllListeners();
    super.destroy();
  }
}
