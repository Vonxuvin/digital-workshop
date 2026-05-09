import { eventBus } from '../utils/EventBus';

export type ObjectiveType = 'score' | 'target_merge' | 'clear_obstacle' | 'survival';

export interface LevelObjective {
  type: ObjectiveType;
  target: number;
  timeLimit?: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  objective: LevelObjective;
  containerWidth: number;
  containerHeight: number;
  availableNumbers: number[];
  spawnInterval?: number;
}

export class LevelSystem {
  private config: LevelConfig;
  private currentScore = 0;
  private obstaclesCleared = 0;
  private survivalTime = 0;
  private isCompleted = false;
  private timer: number | null = null;

  constructor(config: LevelConfig) {
    this.config = config;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('score:updated', (data: { totalScore: number }) => {
      this.currentScore = data.totalScore;
      this.checkObjective();
    });

    eventBus.on('block:merged', (data: { newValue: number }) => {
      if (this.config.objective.type === 'target_merge') {
        if (data.newValue >= this.config.objective.target) {
          this.completeLevel();
        }
      }
    });

    eventBus.on('obstacle:cleared', () => {
      this.obstaclesCleared++;
      this.checkObjective();
    });
  }

  start(): void {
    if (this.config.objective.timeLimit) {
      this.survivalTime = 0;
      this.timer = window.setInterval(() => {
        this.survivalTime++;
        if (this.config.objective.timeLimit && this.survivalTime >= this.config.objective.timeLimit) {
          if (this.config.objective.type === 'survival') {
            this.completeLevel();
          } else {
            eventBus.emit('game:timeout');
          }
        }
        eventBus.emit('level:timeUpdate', this.survivalTime);
      }, 1000);
    }
  }

  private checkObjective(): void {
    if (this.isCompleted) return;

    const objective = this.config.objective;
    switch (objective.type) {
      case 'score':
        if (this.currentScore >= objective.target) {
          this.completeLevel();
        }
        break;
      case 'clear_obstacle':
        if (this.obstaclesCleared >= objective.target) {
          this.completeLevel();
        }
        break;
    }
  }

  private completeLevel(): void {
    if (this.isCompleted) return;
    this.isCompleted = true;
    this.stopTimer();
    eventBus.emit('level:completed', {
      levelId: this.config.id,
      score: this.currentScore,
      time: this.survivalTime,
    });
  }

  stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getConfig(): LevelConfig {
    return this.config;
  }

  getProgress(): number {
    const objective = this.config.objective;
    switch (objective.type) {
      case 'score':
        return Math.min(this.currentScore / objective.target, 1);
      case 'target_merge':
        return 0;
      case 'clear_obstacle':
        return Math.min(this.obstaclesCleared / objective.target, 1);
      case 'survival':
        return objective.timeLimit ? this.survivalTime / objective.timeLimit : 0;
      default:
        return 0;
    }
  }

  isLevelCompleted(): boolean {
    return this.isCompleted;
  }

  reset(): void {
    this.currentScore = 0;
    this.obstaclesCleared = 0;
    this.survivalTime = 0;
    this.isCompleted = false;
    this.stopTimer();
  }
}
