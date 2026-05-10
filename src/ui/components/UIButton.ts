import { Container, Graphics, Text } from 'pixi.js';

export interface UIButtonOptions {
  width?: number;
  height?: number;
  label: string;
  color?: number;
  disabledColor?: number;
  fontSize?: number;
  borderRadius?: number;
  onClick?: () => void;
}

export class UIButton extends Container {
  private bg: Graphics;
  private labelText: Text;
  private options: Required<UIButtonOptions>;
  private _disabled = false;
  private _pressed = false;
  private clickCooldown = false;
  private readonly COOLDOWN_MS = 300;

  constructor(options: UIButtonOptions) {
    super();

    this.options = {
      width: options.width ?? 200,
      height: options.height ?? 50,
      label: options.label,
      color: options.color ?? 0x4ECDC4,
      disabledColor: options.disabledColor ?? 0x666666,
      fontSize: options.fontSize ?? 18,
      borderRadius: options.borderRadius ?? 10,
      onClick: options.onClick ?? (() => {}),
    };

    this.bg = new Graphics();
    this.drawBackground();
    this.addChild(this.bg);

    this.labelText = new Text({
      text: this.options.label,
      style: {
        fontFamily: 'Arial',
        fontSize: this.options.fontSize,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.labelText.anchor.set(0.5);
    this.addChild(this.labelText);

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerdown', this.handlePointerDown, this);
    this.on('pointerup', this.handlePointerUp, this);
    this.on('pointerupoutside', this.handlePointerUpOutside, this);
  }

  private drawBackground(): void {
    this.bg.clear();
    const color = this._disabled ? this.options.disabledColor : this.options.color;
    this.bg.roundRect(
      -this.options.width / 2,
      -this.options.height / 2,
      this.options.width,
      this.options.height,
      this.options.borderRadius,
    );
    this.bg.fill(color);
  }

  private handlePointerDown(): void {
    if (this._disabled || this.clickCooldown) return;
    this._pressed = true;
    this.scale.set(0.95);
  }

  private handlePointerUp(): void {
    if (this._disabled || this.clickCooldown) return;
    if (this._pressed) {
      this._pressed = false;
      this.animateRelease();
      this.clickCooldown = true;
      this.options.onClick();
      setTimeout(() => {
        this.clickCooldown = false;
      }, this.COOLDOWN_MS);
    }
  }

  private handlePointerUpOutside(): void {
    this._pressed = false;
    this.scale.set(1);
  }

  private animateRelease(): void {
    const start = performance.now();
    const duration = 100;
    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      this.scale.set(0.95 + 0.05 * t);
      if (t < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  setDisabled(disabled: boolean): void {
    this._disabled = disabled;
    this.drawBackground();
    this.cursor = disabled ? 'default' : 'pointer';
  }

  get disabled(): boolean {
    return this._disabled;
  }
}
