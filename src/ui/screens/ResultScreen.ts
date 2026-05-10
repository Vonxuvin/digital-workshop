import { Container, Text, Graphics } from 'pixi.js';
import { Screen } from '../UIManager';
import { eventBus } from '../../utils/EventBus';
import { Layout } from '../layout/Layout';

export interface ResultData {
  isWin: boolean;
  score: number;
  stars: number;
  levelId: number;
  baseScore?: number;
  chainBonus?: number;
  timeBonus?: number;
}

export class ResultScreen extends Screen {
  private resultData: ResultData | null = null;
  private titleText!: Text;
  private scoreText!: Text;
  private starsContainer!: Container;
  private starGraphics: Graphics[] = [];
  private breakdownText!: Text;
  private nextLevelButton!: Container;
  private restartButton!: Container;
  private menuButton!: Container;
  private reviveButton!: Container;
  private currentScreenWidth = 800;
  private currentScreenHeight = 600;
  private initialized = false;

  constructor() {
    super();
  }

  private initialize(): void {
    if (this.initialized) return;
    this.createBackground();
    this.createTitle();
    this.createScoreDisplay();
    this.createStarsDisplay();
    this.createBreakdownDisplay();
    this.createButtons();
    this.initialized = true;
  }

  private createBackground(): void {
    const bg = new Graphics();
    bg.rect(0, 0, this.currentScreenWidth, this.currentScreenHeight);
    bg.fill({ color: 0x000000, alpha: 0.8 });
    this.addChild(bg);
  }

  private createTitle(): void {
    this.titleText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 36,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.titleText.anchor.set(0.5);
    const pos = Layout.anchor(
      { x: 0, y: 0, width: 300, height: 40 },
      { width: this.currentScreenWidth, height: this.currentScreenHeight },
      'center',
      'top',
      0,
      60,
    );
    this.titleText.x = pos.x;
    this.titleText.y = pos.y;
    this.addChild(this.titleText);
  }

  private createScoreDisplay(): void {
    this.scoreText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xcccccc,
      },
    });
    this.scoreText.anchor.set(0.5);
    const pos = Layout.anchor(
      { x: 0, y: 0, width: 300, height: 30 },
      { width: this.currentScreenWidth, height: this.currentScreenHeight },
      'center',
      'top',
      0,
      110,
    );
    this.scoreText.x = pos.x;
    this.scoreText.y = pos.y;
    this.addChild(this.scoreText);
  }

  private createStarsDisplay(): void {
    this.starsContainer = new Container();
    const pos = Layout.anchor(
      { x: 0, y: 0, width: 150, height: 40 },
      { width: this.currentScreenWidth, height: this.currentScreenHeight },
      'center',
      'top',
      0,
      155,
    );
    this.starsContainer.x = pos.x;
    this.starsContainer.y = pos.y;

    for (let i = 0; i < 3; i++) {
      const star = new Graphics();
      star.x = (i - 1) * 50;
      star.alpha = 0.2;
      this.drawStar(star, 0, 0, 5, 18, 8, 0x666666);
      this.starsContainer.addChild(star);
      this.starGraphics.push(star);
    }

    this.addChild(this.starsContainer);
  }

  private drawStar(g: Graphics, cx: number, cy: number, points: number, outerR: number, innerR: number, color: number): void {
    g.clear();
    const step = Math.PI / points;
    g.moveTo(cx + outerR, cy);
    for (let i = 1; i <= points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = i * step - Math.PI / 2;
      g.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    g.closePath();
    g.fill(color);
  }

  private createBreakdownDisplay(): void {
    this.breakdownText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0x999999,
        lineHeight: 24,
      },
    });
    this.breakdownText.anchor.set(0.5);
    const pos = Layout.anchor(
      { x: 0, y: 0, width: 300, height: 80 },
      { width: this.currentScreenWidth, height: this.currentScreenHeight },
      'center',
      'top',
      0,
      210,
    );
    this.breakdownText.x = pos.x;
    this.breakdownText.y = pos.y;
    this.addChild(this.breakdownText);
  }

  private createButtons(): void {
    this.nextLevelButton = this.createButton('下一关', 0x4ECDC4, () => {
      eventBus.emit('ui:nextLevel');
    });

    this.restartButton = this.createButton('重新开始', 0xFF6B6B, () => {
      eventBus.emit('ui:restart');
    });

    this.menuButton = this.createButton('关卡选择', 0x95E1D3, () => {
      eventBus.emit('ui:levelSelect');
    });

    this.reviveButton = this.createButton('看广告复活', 0xFFA500, () => {
      eventBus.emit('ui:revive');
    });

    const buttonsRow1 = [this.restartButton, this.menuButton];
    const positions1 = Layout.flex(
      buttonsRow1.map(() => ({ width: 140, height: 50 })),
      'row',
      30,
      0,
      0,
    );
    const row1CenterX = this.currentScreenWidth / 2 - (positions1.length * 140 + (positions1.length - 1) * 30) / 2;
    buttonsRow1.forEach((btn, i) => {
      btn.x = this.currentScreenWidth / 2 + positions1[i].x - 105;
      btn.y = 420;
      this.addChild(btn);
    });

    this.nextLevelButton.x = this.currentScreenWidth / 2;
    this.nextLevelButton.y = 350;
    this.addChild(this.nextLevelButton);

    this.reviveButton.x = this.currentScreenWidth / 2;
    this.reviveButton.y = 490;
    this.addChild(this.reviveButton);
  }

  private createButton(label: string, color: number, onClick: () => void): Container {
    const button = new Container();

    const bg = new Graphics();
    bg.roundRect(-70, -25, 140, 50, 10);
    bg.fill(color);
    button.addChild(bg);

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
    button.addChild(text);

    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.on('pointerdown', onClick);

    button.on('pointerover', () => { bg.scale.set(1.05); });
    button.on('pointerout', () => { bg.scale.set(1); });

    return button;
  }

  setResult(data: ResultData): void {
    this.resultData = data;
    this.initialize(); // 确保 UI 元素已初始化
    this.titleText.text = data.isWin ? '关卡完成!' : '游戏结束';
    this.titleText.style.fill = data.isWin ? 0x4ECDC4 : 0xff4444;
    this.scoreText.text = `得分: ${data.score.toLocaleString()}`;
    this.nextLevelButton.visible = data.isWin;
    this.reviveButton.visible = !data.isWin;

    const lines: string[] = [];
    const base = data.baseScore ?? data.score;
    lines.push(`基础分: ${base.toLocaleString()}`);
    if (data.chainBonus && data.chainBonus > 0) {
      lines.push(`连锁加成: +${data.chainBonus.toLocaleString()}`);
    }
    if (data.timeBonus && data.timeBonus > 0) {
      lines.push(`时间奖励: +${data.timeBonus.toLocaleString()}`);
    }
    this.breakdownText.text = lines.join('\n');
  }

  private animateStars(count: number): void {
    this.starGraphics.forEach((star, i) => {
      star.alpha = 0.2;
      this.drawStar(star, 0, 0, 5, 18, 8, 0x666666);
    });

    for (let i = 0; i < count && i < 3; i++) {
      setTimeout(() => {
        this.starGraphics[i].alpha = 1;
        this.drawStar(this.starGraphics[i], 0, 0, 5, 18, 8, 0xffd700);
      }, (i + 1) * 300);
    }
  }

  show(screenWidth?: number, screenHeight?: number): void {
    this.currentScreenWidth = screenWidth || 800;
    this.currentScreenHeight = screenHeight || 600;
    this.initialize();
    this.visible = true;
    if (this.resultData) {
      this.animateStars(this.resultData.stars);
    }
  }

  hide(): void {
    this.visible = false;
  }
}
