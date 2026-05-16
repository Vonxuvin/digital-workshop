import { Container, Text } from 'pixi.js';
import { eventBus, GameEvents } from '../../utils/EventBus';

export class ScoreBoard extends Container {
  private scoreText: Text;
  private chainText: Text;
  private currentScore = 0;
  private displayScore = 0;
  private onScoreUpdatedBound: (data: { totalScore: number; earnedScore: number; chainCount: number }) => void;

  constructor() {
    super();

    this.scoreText = new Text({
      text: 'Score: 0',
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.addChild(this.scoreText);

    this.chainText = new Text({
      text: '',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xffd700,
      },
    });
    this.chainText.y = 30;
    this.addChild(this.chainText);

    this.onScoreUpdatedBound = this.handleScoreUpdated.bind(this);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on(GameEvents.SCORE_UPDATED, this.onScoreUpdatedBound);
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
