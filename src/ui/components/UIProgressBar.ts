import { Container, Graphics, Ticker } from 'pixi.js';

export class UIProgressBar extends Container {
  private track: Graphics;
  private fill: Graphics;
  private barWidth: number;
  private barHeight: number;
  private _progress = 0;
  private displayProgress = 0;
  private trackColor: number;
  private fillColor: number;
  private animating = false;
  private tickerCallback: ((ticker: any) => void) | null = null;

  constructor(width: number = 200, height: number = 20, trackColor: number = 0x333333, fillColor: number = 0x4ECDC4) {
    super();

    this.barWidth = width;
    this.barHeight = height;
    this.trackColor = trackColor;
    this.fillColor = fillColor;

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
    if (this.animating) return;
    this.animating = true;

    this.detachTicker();
    const startProgress = this.displayProgress;
    const targetProgress = this._progress;
    const startTime = performance.now();
    const duration = 200;

    this.tickerCallback = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      this.displayProgress = startProgress + (targetProgress - startProgress) * t;
      this.drawFill(this.displayProgress);

      if (t >= 1) {
        this.displayProgress = targetProgress;
        this.animating = false;
        this.detachTicker();
      }
    };
    Ticker.shared.add(this.tickerCallback);
  }

  setColors(trackColor: number, fillColor: number): void {
    this.trackColor = trackColor;
    this.fillColor = fillColor;
    this.drawTrack();
    this.drawFill(this.displayProgress);
  }

  private detachTicker(): void {
    if (this.tickerCallback) {
      Ticker.shared.remove(this.tickerCallback);
      this.tickerCallback = null;
    }
  }

  destroy(): void {
    this.detachTicker();
    super.destroy();
  }
}
