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
  obstacles?: Array<{ x: number; y: number; value: number }>;
  rewards?: { stars: number[] };
}

export class LevelSystem {
  private config: LevelConfig;
  private currentScore = 0;
  private obstaclesCleared = 0;
  private survivalTime = 0;
  private isCompleted = false;
  private isPaused = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private highestMergeValue = 0;
  private onScoreUpdatedBound: (data: { totalScore: number }) => void;
  private onBlockMergedBound: (data: { newValue: number }) => void;
  private onObstacleClearedBound: () => void;

  constructor(config: LevelConfig) {
    this.config = config;
    this.onScoreUpdatedBound = this.handleScoreUpdated.bind(this);
    this.onBlockMergedBound = this.handleBlockMerged.bind(this);
    this.onObstacleClearedBound = this.handleObstacleCleared.bind(this);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('score:updated', this.onScoreUpdatedBound);
    eventBus.on('block:merged', this.onBlockMergedBound);
    eventBus.on('obstacle:cleared', this.onObstacleClearedBound);
  }

  private handleScoreUpdated(data: { totalScore: number }): void {
    this.currentScore = data.totalScore;
    this.checkObjective();
  }

  private handleBlockMerged(data: { newValue: number }): void {
    if (data.newValue > this.highestMergeValue) {
      this.highestMergeValue = data.newValue;
    }
    if (this.config.objective.type === 'target_merge') {
      if (data.newValue >= this.config.objective.target) {
        this.completeLevel();
      }
    }
  }

  private handleObstacleCleared(): void {
    if (this.isCompleted) return;
    const maxObstacles = this.config.obstacles?.length ?? this.config.objective.target;
    if (this.obstaclesCleared >= maxObstacles) return;
    this.obstaclesCleared++;
    this.checkObjective();
  }

  start(): void {
    if (this.config.objective.timeLimit !== undefined && this.config.objective.timeLimit !== null) {
      this.survivalTime = 0;
      this.startTimer();
    }
  }

  private startTimer(): void {
    this.timer = window.setInterval(() => {
      if (this.isPaused || this.isCompleted) return;
      this.survivalTime++;
      if (this.config.objective.timeLimit !== undefined && this.config.objective.timeLimit !== null && this.survivalTime >= this.config.objective.timeLimit) {
        if (this.config.objective.type === 'survival') {
          this.completeLevel();
        } else {
          eventBus.emit('game:timeout');
        }
      }
      eventBus.emit('level:timeUpdate', this.survivalTime);
    }, 1000);
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
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
        return objective.target > 0 ? Math.min(this.currentScore / objective.target, 1) : 1;
      case 'target_merge':
        if (objective.target <= 0) return 1;
        return Math.min(this.highestMergeValue / objective.target, 1);
      case 'clear_obstacle':
        return objective.target > 0 ? Math.min(this.obstaclesCleared / objective.target, 1) : 1;
      case 'survival':
        return (objective.timeLimit !== undefined && objective.timeLimit !== null && objective.timeLimit > 0)
          ? Math.min(this.survivalTime / objective.timeLimit, 1)
          : 0;
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
    this.isPaused = false;
    this.highestMergeValue = 0;
    this.stopTimer();
  }

  destroy(): void {
    eventBus.off('score:updated', this.onScoreUpdatedBound);
    eventBus.off('block:merged', this.onBlockMergedBound);
    eventBus.off('obstacle:cleared', this.onObstacleClearedBound);
    this.stopTimer();
  }
}
