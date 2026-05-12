import { Container, Graphics } from 'pixi.js';
import gsap from 'gsap';

export class UIProgressBar extends Container {
  private track: Graphics;
  private fill: Graphics;
  private barWidth: number;
  private barHeight: number;
  private _progress = 0;
  private displayProgress = 0;
  private trackColor: number;
  private fillColor: number;
  private progressTween: gsap.core.Tween | null = null;
  private progressProxy: { value: number };

  constructor(width: number = 200, height: number = 20, trackColor: number = 0x333333, fillColor: number = 0x4ECDC4) {
    super();

    this.barWidth = width;
    this.barHeight = height;
    this.trackColor = trackColor;
    this.fillColor = fillColor;

    this.progressProxy = { value: 0 };

    this.track = new Graphics();
    this.drawTrack();
    this.addChild(this.track);

    this.fill = new Graphics();
    this.drawFill(0);
    this.addChild(this.fill);
  }

  private drawTrack(): void {
    this.track.clear();
    this.track.roundRect(0, 0, this.barWidth, this.barHeight, this.barHeight / 2);
    this.track.fill(this.trackColor);
  }

  private drawFill(progress: number): void {
    this.fill.clear();
    const fillWidth = Math.max(this.barHeight, this.barWidth * progress);
    this.fill.roundRect(0, 0, fillWidth, this.barHeight, this.barHeight / 2);
    this.fill.fill(this.fillColor);
  }

  setProgress(value: number): void {
    this._progress = Math.max(0, Math.min(1, value));
    this.animateProgress();
  }

  get progress(): number {
    return this._progress;
  }

  private animateProgress(): void {
    if (this.progressTween) {
      this.progressTween.kill();
    }

    this.progressProxy.value = this.displayProgress;

    this.progressTween = gsap.to(this.progressProxy, {
      value: this._progress,
      duration: 0.2,
      ease: 'none',
      onUpdate: () => {
        this.displayProgress = this.progressProxy.value;
        this.drawFill(this.displayProgress);
      },
      onComplete: () => {
        this.displayProgress = this._progress;
        this.progressTween = null;
      },
    });
  }

  setColors(trackColor: number, fillColor: number): void {
    this.trackColor = trackColor;
    this.fillColor = fillColor;
    this.drawTrack();
    this.drawFill(this.displayProgress);
  }

  destroy(): void {
    if (this.progressTween) {
      this.progressTween.kill();
      this.progressTween = null;
    }
    super.destroy();
  }
}
