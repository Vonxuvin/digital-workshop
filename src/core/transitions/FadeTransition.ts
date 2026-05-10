import { Container } from 'pixi.js';
import { Transition } from './Transition';

export class FadeTransition extends Transition {
  private fadeOutDuration: number;
  private fadeInDuration: number;

  constructor(fadeOutDuration: number = 300, fadeInDuration: number = 300) {
    super();
    this.fadeOutDuration = fadeOutDuration;
    this.fadeInDuration = fadeInDuration;
  }

  async run(fromScene: Container | null, toScene: Container, container: Container): Promise<void> {
    if (fromScene) {
      await this.animateAlpha(fromScene, 1, 0, this.fadeOutDuration);
      container.removeChild(fromScene);
    }

    toScene.alpha = 0;
    container.addChild(toScene);
    await this.animateAlpha(toScene, 0, 1, this.fadeInDuration);
  }

  private animateAlpha(target: Container, from: number, to: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        target.alpha = from + (to - from) * progress;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }
}
