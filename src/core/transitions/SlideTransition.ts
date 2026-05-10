import { Container } from 'pixi.js';
import { Transition } from './Transition';

export class SlideTransition extends Transition {
  private duration: number;
  private width: number;

  constructor(duration: number = 400, width: number = 800) {
    super();
    this.duration = duration;
    this.width = width;
  }

  async run(fromScene: Container | null, toScene: Container, container: Container): Promise<void> {
    toScene.x = this.width;
    container.addChild(toScene);

    await new Promise<void>((resolve) => {
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / this.duration, 1);
        if (fromScene) {
          fromScene.x = -this.width * progress;
        }
        toScene.x = this.width * (1 - progress);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          if (fromScene) {
            container.removeChild(fromScene);
          }
          toScene.x = 0;
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }
}
