import { Container, Text, Graphics } from 'pixi.js';
import { eventBus } from '../../utils/EventBus';

export class GameHUD extends Container {
  private scoreText!: Text;
  private chainText!: Text;
  private levelText!: Text;
  private pauseButton!: Container;
  private currentScore = 0;
  private displayScore = 0;
  private onScoreUpdatedBound: (data: { totalScore: number; earnedScore: number; chainCount: number }) => void;

  constructor() {
    super();
    this.onScoreUpdatedBound = this.handleScoreUpdated.bind(this);
    this.createScoreDisplay();
    this.createChainDisplay();
    this.createLevelDisplay();
    this.createPauseButton();
    this.setupEventListeners();
  }

  private createScoreDisplay(): void {
    this.scoreText = new Text({
      text: 'Score: 0',
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.scoreText.x = 20;
    this.scoreText.y = 20;
    this.addChild(this.scoreText);
  }

  private createChainDisplay(): void {
    this.chainText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xffd700,
      },
    });
    this.chainText.x = 20;
    this.chainText.y = 55;
    this.addChild(this.chainText);
  }

  private createLevelDisplay(): void {
    this.levelText = new Text({
      text: 'Level 1',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0x999999,
      },
    });
    this.levelText.x = 20;
    this.levelText.y = 80;
    this.addChild(this.levelText);
  }

  private createPauseButton(): void {
    this.pauseButton = new Container();

    const bg = new Graphics();
    bg.circle(0, 0, 25);
    bg.fill(0x333333);
    this.pauseButton.addChild(bg);

    const icon = new Text({
      text: '⏸',
      style: {
        fontFamily: 'Arial',
        fontSize: 20,
        fill: 0xffffff,
      },
    });
    icon.anchor.set(0.5);
    this.pauseButton.addChild(icon);

    this.pauseButton.x = 750;
    this.pauseButton.y = 45;
    this.pauseButton.eventMode = 'static';
    this.pauseButton.cursor = 'pointer';

    this.pauseButton.on('pointerdown', () => {
      eventBus.emit('ui:pause');
    });

    this.addChild(this.pauseButton);
  }

  private setupEventListeners(): void {
    eventBus.on('score:updated', this.onScoreUpdatedBound);
  }

  private handleScoreUpdated(data: { totalScore: number; earnedScore: number; chainCount: number }): void {
    this.currentScore = data.totalScore;
    if (data.chainCount > 1) {
      this.chainText.text = `连锁 x${data.chainCount}!`;
    } else {
      this.chainText.text = '';
    }
  }

  update(delta: number): void {
    if (this.displayScore < this.currentScore) {
      const diff = this.currentScore - this.displayScore;
      this.displayScore += Math.ceil(diff * 0.1 * delta);
      if (this.displayScore > this.currentScore) {
        this.displayScore = this.currentScore;
      }
      this.scoreText.text = `Score: ${this.displayScore.toLocaleString()}`;
    }
  }

  updateLevel(levelId: number, levelName: string): void {
    this.levelText.text = `Level ${levelId}: ${levelName}`;
  }

  reset(): void {
    this.currentScore = 0;
    this.displayScore = 0;
    this.scoreText.text = 'Score: 0';
    this.chainText.text = '';
  }

  destroy(): void {
    eventBus.off('score:updated', this.onScoreUpdatedBound);
    super.destroy();
  }
}
