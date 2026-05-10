import * as PIXI from 'pixi.js';

interface Snowflake {
  text: PIXI.Text;
  targetY: number;
  targetX: number;
  speed: number;
  delay: number;
  startTime: number;
}

export class FreezeEffect extends PIXI.Container {
  private overlay!: PIXI.Graphics;
  private snowflakesContainer!: PIXI.Container;
  private containerWidth: number;
  private containerHeight: number;
  private onComplete: (() => void) | undefined;
  private snowflakes: Snowflake[] = [];
  private animationId: number = 0;
  private startTime: number = 0;
  private isExiting: boolean = false;

  constructor(containerWidth: number, containerHeight: number, onComplete?: () => void) {
    super();
    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;
    this.onComplete = onComplete;
    this.createEffect();
    this.playEntrance();
  }

  private createEffect(): void {
    this.overlay = new PIXI.Graphics();
    this.overlay.rect(0, 0, this.containerWidth, this.containerHeight);
    this.overlay.fill(0x87ceeb, 0.1);
    this.overlay.alpha = 0;
    this.addChild(this.overlay);

    this.snowflakesContainer = new PIXI.Container();
    this.addChild(this.snowflakesContainer);

    const numFlakes = 30;
    for (let i = 0; i < numFlakes; i++) {
      const flake = new PIXI.Text({
        text: '❄️',
        style: { fontSize: 16 + Math.random() * 16 },
      });
      flake.x = Math.random() * this.containerWidth;
      flake.y = -20;
      flake.alpha = 0;
      this.snowflakesContainer.addChild(flake);

      this.snowflakes.push({
        text: flake,
        targetY: this.containerHeight + 20,
        targetX: flake.x + (Math.random() - 0.5) * 50,
        speed: 2 + Math.random() * 2,
        delay: Math.random() * 2,
        startTime: 0,
      });
    }
  }

  public playEntrance(): void {
    this.startTime = performance.now();
    
    const animateEntrance = () => {
      const elapsed = (performance.now() - this.startTime) / 1000;
      const duration = 0.3;
      
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const easeProgress = progress * progress;
        this.overlay.alpha = easeProgress;
        this.animationId = requestAnimationFrame(animateEntrance);
      } else {
        this.overlay.alpha = 1;
        this.startSnowflakes();
      }
    };

    this.animationId = requestAnimationFrame(animateEntrance);
  }

  private startSnowflakes(): void {
    const animateSnowflakes = () => {
      if (this.isExiting) return;
      
      const elapsed = (performance.now() - this.startTime) / 1000;
      let allComplete = true;

      this.snowflakes.forEach(sf => {
        const snowElapsed = elapsed - sf.delay;
        if (snowElapsed < 0) {
          allComplete = false;
          return;
        }

        if (sf.text.alpha === 0) {
          sf.text.alpha = 0.7 + Math.random() * 0.3;
        }

        const progress = Math.min(snowElapsed / sf.speed, 1);
        sf.text.y = -20 + (sf.targetY + 20) * progress;
        sf.text.x = sf.text.x + (sf.targetX - sf.text.x) * 0.02;

        if (progress < 1) allComplete = false;
      });

      if (!allComplete) {
        this.animationId = requestAnimationFrame(animateSnowflakes);
      } else {
        this.resetSnowflakes();
      }
    };

    this.animationId = requestAnimationFrame(animateSnowflakes);
  }

  private resetSnowflakes(): void {
    this.snowflakes.forEach(sf => {
      sf.text.x = Math.random() * this.containerWidth;
      sf.text.y = -20;
      sf.targetY = this.containerHeight + 20;
      sf.targetX = sf.text.x + (Math.random() - 0.5) * 50;
      sf.speed = 2 + Math.random() * 2;
      sf.delay = 0;
      sf.text.alpha = 0.7 + Math.random() * 0.3;
    });
    this.startSnowflakes();
  }

  playExit(): Promise<void> {
    return new Promise(resolve => {
      this.isExiting = true;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }

      const exitStartTime = performance.now();
      const exitDuration = 500;

      const animateExit = () => {
        const elapsed = performance.now() - exitStartTime;
        const progress = Math.min(elapsed / exitDuration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 2);

        this.overlay.alpha = 1 * (1 - easeProgress);

        this.snowflakes.forEach(sf => {
          sf.text.alpha = (sf.text.alpha || 0.7) * (1 - easeProgress);
          sf.text.y = sf.text.y + (this.containerHeight + 20 - sf.text.y) * 0.1;
        });

        if (progress < 1) {
          this.animationId = requestAnimationFrame(animateExit);
        } else {
          this.cleanup();
          if (this.onComplete) {
            this.onComplete();
          }
          this.destroy();
          resolve();
        }
      };

      this.animationId = requestAnimationFrame(animateExit);
    });
  }

  private cleanup(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.removeChildren();
  }

  updateRemainingTime(remainingMs: number, totalMs: number): void {
    const ratio = remainingMs / totalMs;
    this.overlay.alpha = ratio * 0.3;
  }

  destroy(): void {
    this.cleanup();
    super.destroy({ children: true });
  }
}
