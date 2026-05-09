export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 60;
  private frameTimes: number[] = [];
  private readonly maxSamples = 60;

  start(): void {
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.frameTimes = [];
  }

  tick(): void {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.frameTimes.push(delta);
    if (this.frameTimes.length > this.maxSamples) {
      this.frameTimes.shift();
    }

    this.frameCount++;
  }

  getFPS(): number {
    if (this.frameTimes.length === 0) return 60;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.round(1000 / avgFrameTime);
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  getStats(): {
    fps: number;
    avgFrameTime: number;
    minFrameTime: number;
    maxFrameTime: number;
  } {
    const times = this.frameTimes;
    return {
      fps: this.getFPS(),
      avgFrameTime: this.getAverageFrameTime(),
      minFrameTime: Math.min(...times),
      maxFrameTime: Math.max(...times),
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
