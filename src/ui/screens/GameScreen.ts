import { Scene } from '../../core/Scene';
import { Graphics } from 'pixi.js';

export class GameScreen extends Scene {
  private gameContainer: Graphics | null = null;
  private containerWidth: number;
  private containerHeight: number;

  constructor(containerWidth = 400, containerHeight = 600) {
    super();
    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;
  }

  async preload(): Promise<void> {}

  create(): void {
    this.drawContainer();
  }

  private drawContainer(): void {
    this.gameContainer = new Graphics();
    const groundY = this.containerHeight - 50;
    this.gameContainer.rect(0, groundY, this.containerWidth, 50);
    this.gameContainer.fill(0x2d2d44);
    this.gameContainer.rect(0, 0, 6, groundY);
    this.gameContainer.fill(0x4a4a6a);
    this.gameContainer.rect(this.containerWidth - 6, 0, 6, groundY);
    this.gameContainer.fill(0x4a4a6a);
    this.addChild(this.gameContainer);
  }

  update(delta: number): void {}

  setContainerSize(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
    if (this.gameContainer) {
      this.removeChild(this.gameContainer);
      this.gameContainer.destroy();
    }
    this.drawContainer();
  }

  destroy(): void {
    if (this.gameContainer) {
      this.gameContainer = null;
    }
    super.destroy();
  }
}
