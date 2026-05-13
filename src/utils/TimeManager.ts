import gsap from 'gsap';

export class TimeManager {
  private static instance: TimeManager | null = null;
  private gameTimeline: gsap.core.Timeline;
  private isPaused: boolean = false;

  constructor() {
    this.gameTimeline = gsap.timeline({ paused: false });
  }

  static setInstance(instance: TimeManager): void {
    TimeManager.instance = instance;
  }

  static getInstance(): TimeManager {
    if (!TimeManager.instance) {
      TimeManager.instance = new TimeManager();
    }
    return TimeManager.instance;
  }

  static resetInstance(): void {
    if (TimeManager.instance) {
      TimeManager.instance.destroy();
    }
    TimeManager.instance = null;
  }

  getGameTimeline(): gsap.core.Timeline {
    return this.gameTimeline;
  }

  pause(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.gameTimeline.pause();
  }

  resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.gameTimeline.resume();
  }

  isCurrentlyPaused(): boolean {
    return this.isPaused;
  }

  addToTimeline(tween: gsap.core.Tween | gsap.core.Timeline): void {
    this.gameTimeline.add(tween);
  }

  createTween(targets: any, vars: gsap.TweenVars): gsap.core.Tween {
    return gsap.to(targets, {
      ...vars,
      scrollTrigger: undefined,
    });
  }

  destroy(): void {
    this.gameTimeline.kill();
    this.isPaused = false;
  }
}
