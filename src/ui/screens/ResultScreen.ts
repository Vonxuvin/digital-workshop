import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { Screen } from '../UIManager';

export interface ResultData {
  isWin: boolean;
  score: number;
  stars: number;
  levelId: number;
  levelName?: string;
  bestScore?: number;
  playTime?: number;
  maxCombo?: number;
  mergedCount?: number;
}

export class ResultScreen extends Screen {
  public container: Container;
  private resultText: Text;
  private scoreText: Text;
  private starsContainer: Container;
  private starTexts: Text[] = [];
  private nextButton: Container | null = null;
  private retryButton: Container | null = null;
  private menuButton: Container | null = null;
  private reviveButton: Container | null = null;
  private onNextLevel: (() => void) | null = null;
  private onRetry: (() => void) | null = null;
  private onMenu: (() => void) | null = null;
  private onRevive: (() => void) | null = null;
  private detailsContainer: Container;
  private starTimeline: gsap.core.Timeline | null = null;
  private screenWidth: number = 800;
  private screenHeight: number = 600;

  constructor() {
    super();
    this.container = new Container();
    this.container.visible = false;

    const overlay = new Graphics();
    overlay.rect(0, 0, 3000, 3000);
    overlay.fill({ color: 0x000000, alpha: 0.85 });
    this.container.addChild(overlay);

    this.resultText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 40,
        fill: 0xffd700,
        fontWeight: 'bold',
      },
    });
    this.resultText.anchor.set(0.5);
    this.container.addChild(this.resultText);

    this.scoreText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
      },
    });
    this.scoreText.anchor.set(0.5);
    this.container.addChild(this.scoreText);

    this.starsContainer = new Container();
    this.container.addChild(this.starsContainer);

    for (let i = 0; i < 3; i++) {
      const star = new Text({
        text: '★',
        style: {
          fontFamily: 'Arial',
          fontSize: 48,
          fill: 0x333333,
        },
      });
      star.anchor.set(0.5);
      star.scale.set(0);
      this.starsContainer.addChild(star);
      this.starTexts.push(star);
    }

    this.detailsContainer = new Container();
    this.container.addChild(this.detailsContainer);
  }

  setCallbacks(
    onNextLevel: (() => void) | null,
    onRetry: (() => void) | null,
    onMenu: (() => void) | null,
    onRevive: (() => void) | null,
  ): void {
    this.onNextLevel = onNextLevel;
    this.onRetry = onRetry;
    this.onMenu = onMenu;
    this.onRevive = onRevive;
  }

  setResult(data: ResultData): void {
    this.container.visible = true;

    if (this.starTimeline) {
      this.starTimeline.kill();
      this.starTimeline = null;
    }

    this.resultText.text = data.isWin ? '恭喜过关!' : '游戏结束';
    this.resultText.style.fill = data.isWin ? 0xffd700 : 0xff4444;

    this.scoreText.text = `得分: ${data.score}`;

    const starY = 280;
    this.starsContainer.x = this.screenWidth / 2;
    this.starsContainer.y = starY;

    for (let i = 0; i < 3; i++) {
      const star = this.starTexts[i];
      star.scale.set(0);
      star.x = (i - 1) * 60;
      star.y = 0;
    }

    this.detailsContainer.removeChildren();
    if (data.isWin) {
      this.showDetails(data);
    }

    this.layout(this.screenWidth, this.screenHeight);

    if (data.isWin && data.stars > 0) {
      this.animateStars(data.stars);
    }

    this.showButtons(data.isWin);
  }

  private animateStars(earnedStars: number): void {
    this.starTimeline = gsap.timeline();

    for (let i = 0; i < earnedStars; i++) {
      const star = this.starTexts[i];
      star.style.fill = 0xffd700;

      this.starTimeline.to(star.scale, {
        x: 1.3,
        y: 1.3,
        duration: 0.3,
        ease: 'back.out(2)',
      }, i * 0.4);

      this.starTimeline.to(star.scale, {
        x: 1,
        y: 1,
        duration: 0.15,
        ease: 'power2.out',
      }, i * 0.4 + 0.3);
    }
  }

  private showDetails(data: ResultData): void {
    let yOffset = 350;

    if (data.bestScore !== undefined && data.bestScore > data.score) {
      const bestText = new Text({
        text: `最佳记录: ${data.bestScore}`,
        style: { fontFamily: 'Arial', fontSize: 16, fill: 0xffd700 },
      });
      bestText.anchor.set(0.5);
      bestText.y = yOffset;
      bestText.x = 0;
      this.detailsContainer.addChild(bestText);
      yOffset += 28;
    }

    if (data.maxCombo !== undefined && data.maxCombo > 0) {
      const comboText = new Text({
        text: `最大连击: ${data.maxCombo}`,
        style: { fontFamily: 'Arial', fontSize: 16, fill: 0xaaaaaa },
      });
      comboText.anchor.set(0.5);
      comboText.y = yOffset;
      comboText.x = 0;
      this.detailsContainer.addChild(comboText);
      yOffset += 28;
    }

    if (data.playTime !== undefined) {
      const mins = Math.floor(data.playTime / 60);
      const secs = data.playTime % 60;
      const timeText = new Text({
        text: `用时: ${mins}:${String(secs).padStart(2, '0')}`,
        style: { fontFamily: 'Arial', fontSize: 16, fill: 0xaaaaaa },
      });
      timeText.anchor.set(0.5);
      timeText.y = yOffset;
      timeText.x = 0;
      this.detailsContainer.addChild(timeText);
    }
  }

  private showButtons(isWin: boolean): void {
    this.clearButtons();

    if (isWin) {
      this.nextButton = this.createButton('下一关', 0x27ae60, () => this.onNextLevel?.());
      this.retryButton = this.createButton('重试', 0x2d3436, () => this.onRetry?.());
      this.menuButton = this.createButton('返回', 0x2d3436, () => this.onMenu?.());
    } else {
      this.reviveButton = this.createButton('复活', 0xe74c3c, () => this.onRevive?.());
      this.retryButton = this.createButton('重试', 0x2d3436, () => this.onRetry?.());
      this.menuButton = this.createButton('返回', 0x2d3436, () => this.onMenu?.());
    }
  }

  private createButton(label: string, color: number, onClick: () => void): Container {
    const btn = new Container();
    const bg = new Graphics();
    bg.roundRect(-60, -20, 120, 44, 10);
    bg.fill({ color });
    bg.stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
    btn.addChild(bg);

    const text = new Text({
      text: label,
      style: {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    text.anchor.set(0.5);
    btn.addChild(text);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', onClick);
    this.container.addChild(btn);
    return btn;
  }

  private clearButtons(): void {
    if (this.nextButton) { this.container.removeChild(this.nextButton); this.nextButton.destroy(); this.nextButton = null; }
    if (this.retryButton) { this.container.removeChild(this.retryButton); this.retryButton.destroy(); this.retryButton = null; }
    if (this.menuButton) { this.container.removeChild(this.menuButton); this.menuButton.destroy(); this.menuButton = null; }
    if (this.reviveButton) { this.container.removeChild(this.reviveButton); this.reviveButton.destroy(); this.reviveButton = null; }
  }

  layout(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    this.resultText.x = screenWidth / 2;
    this.resultText.y = 160;
    this.scoreText.x = screenWidth / 2;
    this.scoreText.y = 220;
    this.starsContainer.x = screenWidth / 2;
    this.detailsContainer.x = screenWidth / 2;

    const btnY = 460;
    let btnX = screenWidth / 2;

    if (this.nextButton) {
      this.nextButton.x = btnX;
      this.nextButton.y = btnY;
      btnX = screenWidth / 2;
    }
    if (this.reviveButton) {
      this.reviveButton.x = btnX;
      this.reviveButton.y = btnY;
      btnX = screenWidth / 2;
    }
    if (this.retryButton) {
      this.retryButton.x = screenWidth / 2 - 80;
      this.retryButton.y = btnY + 60;
    }
    if (this.menuButton) {
      this.menuButton.x = screenWidth / 2 + 80;
      this.menuButton.y = btnY + 60;
    }
  }

  onShow(): void {}

  show(screenWidth?: number, screenHeight?: number): void {
    if (screenWidth !== undefined) this.screenWidth = screenWidth;
    if (screenHeight !== undefined) this.screenHeight = screenHeight;
    this.onShow();
  }

  onHide(): void {
    if (this.starTimeline) {
      this.starTimeline.kill();
      this.starTimeline = null;
    }
    this.container.visible = false;
  }

  hide(): void {
    this.onHide();
  }update(): void {}

  destroy(): void {
    if (this.starTimeline) {
      this.starTimeline.kill();
      this.starTimeline = null;
    }
    this.clearButtons();
    this.container.destroy({ children: true });
  }
}