import { Container, Text, Graphics } from 'pixi.js';
import { eventBus } from '../../utils/EventBus';

export class GameHUD extends Container {
  private scoreText!: Text;
  private levelText!: Text;
  private pauseButton!: Container;

  constructor() {
    super();
    this.createScoreDisplay();
    this.createLevelDisplay();
    this.createPauseButton();
    this.setupEventListeners();
  }

  private createScoreDisplay(): void {
    this.scoreText = new Text({
      text: 'Score: 0',
      style: {
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 0xffffff,
      },
    });
    this.scoreText.x = 20;
    this.scoreText.y = 20;
    this.addChild(this.scoreText);
  }

  private createLevelDisplay(): void {
    this.levelText = new Text({
      text: 'Level 1',
      style: {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 0xcccccc,
      },
    });
    this.levelText.x = 20;
    this.levelText.y = 50;
    this.addChild(this.levelText);
  }

  private createPauseButton(): void {
    this.pauseButton = new Container();

    const bg = new Graphics();
    bg.circle(0, 0, 20);
    bg.fill(0x333333);
    this.pauseButton.addChild(bg);

    const icon = new Text({
      text: '⏸',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xffffff,
      },
    });
    icon.anchor.set(0.5);
    this.pauseButton.addChild(icon);

    this.pauseButton.x = 750;
    this.pauseButton.y = 40;
    this.pauseButton.eventMode = 'static';
    this.pauseButton.cursor = 'pointer';

    this.pauseButton.on('pointerdown', () => {
      eventBus.emit('ui:pause');
    });

    this.addChild(this.pauseButton);
  }

  private setupEventListeners(): void {
    eventBus.on('score:updated', (data: { totalScore: number }) => {
      this.scoreText.text = `Score: ${data.totalScore.toLocaleString()}`;
    });
  }

  updateLevel(levelId: number, levelName: string): void {
    this.levelText.text = `Level ${levelId}: ${levelName}`;
  }
}
