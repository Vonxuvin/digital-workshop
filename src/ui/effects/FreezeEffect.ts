import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { TimeManager } from '../../utils/TimeManager';
import { AnimationManager } from '../../utils/AnimationManager';

interface SnowflakeData {
  text: PIXI.Text;
  speed: number;
}

export class FreezeEffect extends PIXI.Container {
  private overlay!: PIXI.Graphics;
  private containerWidth: number;
  private containerHeight: number;
  private snowflakes: SnowflakeData[] = [];
  public allComplete: boolean = false;
  private isExiting: boolean = false;
  private snowflakeTweens: gsap.core.Tween[] = [];
  private entranceTween: gsap.core.Tween | null = null;

  constructor(containerWidth: number, containerHeight: number, onComplete?: () => void) {
    super();
    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;
    this.createEffect();
    this.playEntrance();
  }

  private createEffect(): void {
    this.overlay = new PIXI.Graphics();
    this.overlay.rect(0, 0, this.containerWidth, this.containerHeight);
    this.overlay.fill({ color: 0x87ceeb, alpha: 0.3 });
    this.overlay.alpha = 0;
    this.addChild(this.overlay);

    const numFlakes = 30;
    for (let i = 0; i < numFlakes; i++) {
      const flake = new PIXI.Text({
        text: '\u2744\uFE0F',
        style: { fontSize: 16 + Math.random() * 16 },
      });
      flake.x = Math.random() * this.containerWidth;
      flake.y = -20;
      flake.alpha = 0;
      this.addChild(flake);

      this.snowflakes.push({
        text: flake,
        speed: 2 + Math.random() * 2,
      });
    }
  }

  public playEntrance(): void {
    const timeline = TimeManager.getInstance().getGameTimeline();
    this.entranceTween = gsap.to(this.overlay, {
      alpha: 1,
      duration: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        this.startSnowflakes();
      },
    });
    timeline.add(this.entranceTween, timeline.time());
  }

  private startSnowflakes(): void {
    this.snowflakes.forEach((sf) => {
      this.animateSnowflake(sf);
    });
  }

  private animateSnowflake(sf: SnowflakeData): void {
    if (this.isExiting) return;

    sf.text.x = Math.random() * this.containerWidth;
    sf.text.y = -20;
    sf.text.alpha = 0.7 + Math.random() * 0.3;

    const timeline = TimeManager.getInstance().getGameTimeline();
    const tween = gsap.to(sf.text, {
      y: this.containerHeight + 20,
      duration: sf.speed,
      ease: 'none',
      onComplete: () => {
        if (!this.isExiting) {
          this.animateSnowflake(sf);
        }
      },
    });
    timeline.add(tween, timeline.time());
    this.snowflakeTweens.push(tween);
  }

  playExit(): Promise<void> {
    return new Promise(resolve => {
      this.isExiting = true;

      this.snowflakeTweens.forEach(tw => tw.kill());
      this.snowflakeTweens = [];

      if (this.entranceTween) {
        this.entranceTween.kill();
        this.entranceTween = null;
      }

      const timeline = TimeManager.getInstance().getGameTimeline();

      const overlayTween = gsap.to(this.overlay, {
        alpha: 0,
        duration: 0.5,
        ease: 'power2.out',
      });
      timeline.add(overlayTween, timeline.time());

      this.snowflakes.forEach(sf => {
        const snowTween = gsap.to(sf.text, {
          alpha: 0,
          y: this.containerHeight + 20,
          duration: 0.5,
          ease: 'power2.out',
        });
        timeline.add(snowTween, timeline.time());
      });

      AnimationManager.getInstance().setTimeout(() => {
        this.allComplete = true;
        this.destroy();
        resolve();
      }, 500, 'freeze_exit_delay');
    });
  }

  updateRemainingTime(remainingMs: number, totalMs: number): void {
    const ratio = remainingMs / totalMs;
    this.overlay.alpha = ratio * 0.3;
  }

  destroy(): void {
    this.snowflakeTweens.forEach(tw => tw.kill());
    this.snowflakeTweens = [];
    if (this.entranceTween) {
      this.entranceTween.kill();
      this.entranceTween = null;
    }
    super.destroy({ children: true });
  }
}
