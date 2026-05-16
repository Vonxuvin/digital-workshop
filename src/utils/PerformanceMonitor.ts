export type QualityLevel = 'high' | 'medium' | 'low';

export class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 60;
  private frameTimes: number[] = [];
  private readonly maxSamples = 60;
  private qualityLevel: QualityLevel = 'high';
  private lowFpsFrameCount = 0;
  private readonly LOW_FPS_THRESHOLD = 25;
  private readonly MEDIUM_FPS_THRESHOLD = 35;
  private readonly FRAMES_TO_DEGRADE = 30;
  private readonly FRAMES_TO_RECOVER = 60;

  start(): void {
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.frameTimes = [];
    this.qualityLevel = 'high';
    this.lowFpsFrameCount = 0;
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

    const currentFps = delta > 0 ? 1000 / delta : 60;

    if (currentFps < this.LOW_FPS_THRESHOLD) {
      this.lowFpsFrameCount = Math.min(this.lowFpsFrameCount + 1, this.FRAMES_TO_DEGRADE * 2);
    } else if (currentFps < this.MEDIUM_FPS_THRESHOLD) {
      this.lowFpsFrameCount = Math.min(this.lowFpsFrameCount + 1, this.FRAMES_TO_DEGRADE * 2);
    } else {
      this.lowFpsFrameCount = Math.max(0, this.lowFpsFrameCount - 1);
    }

    if (this.lowFpsFrameCount >= this.FRAMES_TO_DEGRADE * 2) {
      this.qualityLevel = 'low';
    } else if (this.lowFpsFrameCount >= this.FRAMES_TO_DEGRADE) {
      this.qualityLevel = 'medium';
    } else if (this.lowFpsFrameCount <= 0) {
      this.qualityLevel = 'high';
    }
  }

  getQualityLevel(): QualityLevel {
    return this.qualityLevel;
  }

  getParticleMultiplier(): number {
    switch (this.qualityLevel) {
      case 'high': return 1.0;
      case 'medium': return 0.6;
      case 'low': return 0.3;
    }
  }

  shouldReduceEffects(): boolean {
    return this.qualityLevel !== 'high';
  }

  shouldPauseNonEssentialAnimations(): boolean {
    return this.qualityLevel === 'low';
  }

  getFPS(): number {
    if (this.frameTimes.length === 0) return 60;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.round(1000 / avgFrameTime);
  }

  getAverageFPS(): number {
    return this.getFPS();
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
