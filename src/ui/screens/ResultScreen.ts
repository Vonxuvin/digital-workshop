import { Container, Text, Graphics } from 'pixi.js';
import { Screen } from '../UIManager';
import { eventBus } from '../../utils/EventBus';

export interface ResultData {
  isWin: boolean;
  score: number;
  stars: number;
  levelId: number;
}

export class ResultScreen extends Screen {
  private resultData: ResultData | null = null;
  private titleText!: Text;
  private scoreText!: Text;
  private starsText!: Text;
  private nextLevelButton!: Container;
  private restartButton!: Container;
  private menuButton!: Container;

  constructor() {
    super();
    this.createBackground();
    this.createTitle();
    this.createScoreDisplay();
    this.createStarsDisplay();
    this.createButtons();
  }

  private createBackground(): void {
    const bg = new Graphics();
    bg.rect(0, 0, 800, 600);
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
    this.titleText.x = 400;
    this.titleText.y = 120;
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
    this.scoreText.x = 400;
    this.scoreText.y = 200;
    this.addChild(this.scoreText);
  }

  private createStarsDisplay(): void {
    this.starsText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 30,
        fill: 0xffd700,
      },
    });
    this.starsText.anchor.set(0.5);
    this.starsText.x = 400;
    this.starsText.y = 260;
    this.addChild(this.starsText);
  }

  private createButtons(): void {
    this.nextLevelButton = this.createButton('下一关', 0x4ECDC4, () => {
      eventBus.emit('ui:nextLevel');
    });
    this.nextLevelButton.x = 400;
    this.nextLevelButton.y = 340;
    this.addChild(this.nextLevelButton);

    this.restartButton = this.createButton('重新开始', 0xFF6B6B, () => {
      eventBus.emit('ui:restart');
    });
    this.restartButton.x = 300;
    this.restartButton.y = 420;
    this.addChild(this.restartButton);

    this.menuButton = this.createButton('关卡选择', 0x95E1D3, () => {
      eventBus.emit('ui:levelSelect');
    });
    this.menuButton.x = 500;
    this.menuButton.y = 420;
    this.addChild(this.menuButton);
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
    this.titleText.text = data.isWin ? '关卡完成!' : '游戏结束';
    this.titleText.style.fill = data.isWin ? 0x4ECDC4 : 0xff4444;
    this.scoreText.text = `得分: ${data.score.toLocaleString()}`;
    this.starsText.text = '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars);
    this.nextLevelButton.visible = data.isWin;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}
