import { Container, Text, Graphics } from 'pixi.js';
import { Screen } from '../UIManager';

export class LoadingScreen extends Screen {
  private progressBar!: Graphics;
  private progressText!: Text;
  private titleText!: Text;
  private currentScreenWidth = 800;
  private currentScreenHeight = 600;
  private initialized = false;

  show(screenWidth?: number, screenHeight?: number): void {
    const newWidth = screenWidth ?? 800;
    const newHeight = screenHeight ?? 600;
    this.currentScreenWidth = newWidth;
    this.currentScreenHeight = newHeight;

    if (!this.initialized) {
      this.createContent();
      this.initialized = true;
    }

    this.visible = true;
    this.alpha = 1;
  }

  hide(): void {
    this.visible = false;
  }

  updateProgress(progress: number): void {
    if (!this.initialized) return;
    const barWidth = 200;
    const fillWidth = barWidth * Math.max(0, Math.min(1, progress));
    this.progressBar.clear();
    this.progressBar.rect(-barWidth / 2, -4, barWidth, 8);
    this.progressBar.fill({ color: 0x333355 });
    this.progressBar.rect(-barWidth / 2, -4, fillWidth, 8);
    this.progressBar.fill({ color: 0x4ECDC4 });
    const percent = Math.round(progress * 100);
    this.progressText.text = `${percent}%`;
  }

  private createContent(): void {
    this.titleText = new Text({
      text: '数字工坊',
      style: {
        fontFamily: 'Arial',
        fontSize: 36,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = this.currentScreenWidth / 2;
    this.titleText.y = this.currentScreenHeight / 2 - 60;
    this.addChild(this.titleText);

    this.progressBar = new Graphics();
    this.progressBar.x = this.currentScreenWidth / 2;
    this.progressBar.y = this.currentScreenHeight / 2 + 10;
    this.addChild(this.progressBar);

    this.progressText = new Text({
      text: '0%',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xaaaaaa,
      },
    });
    this.progressText.anchor.set(0.5);
    this.progressText.x = this.currentScreenWidth / 2;
    this.progressText.y = this.currentScreenHeight / 2 + 40;
    this.addChild(this.progressText);

    this.updateProgress(0);
  }

  destroy(): void {
    super.destroy();
  }
}
