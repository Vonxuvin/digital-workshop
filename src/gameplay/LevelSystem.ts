import { eventBus } from '../utils/EventBus';
import type { ModifierConfig } from './modifiers/ContainerModifier';

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
  container: {
    width: number;
    height: number;
    shape: 'rectangle';
  };
  spawn: {
    availableNumbers: number[];
    spawnInterval?: number;
  };
  modifiers?: ModifierConfig[];
  obstacles?: Array<{ x: number; y: number; value: number }>;
  rewards: {
    stars: [number, number, number];
  };
}

export interface LevelCompletedData {
  levelId: number;
  score: number;
  time: number;
  highestMergeValue: number;
}

export class LevelSystem {
  private config: LevelConfig;
  private currentScore = 0;
  private obstaclesCleared = 0;
  private survivalTime = 0;
  private isCompleted = false;
  private isPaused = false;
  private timerElapsed: number = 0;
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
    this.checkObjective();
  }

  private handleObstacleCleared(): void {
    if (this.isCompleted) return;
    if (this.config.objective.type !== 'clear_obstacle') return;

    const maxObstacles = this.config.obstacles?.length ?? this.config.objective.target;
    this.obstaclesCleared++;
    if (this.obstaclesCleared >= maxObstacles) {
      this.checkObjective();
    }
  }

  start(): void {
    if (this.config.objective.timeLimit !== undefined && this.config.objective.timeLimit !== null) {
      this.timerElapsed = 0;
      this.survivalTime = 0;
    }
  }

  // 为了向后兼容，提供一些快捷方法
  get containerWidth(): number {
    return this.config.container.width;
  }

  get containerHeight(): number {
    return this.config.container.height;
  }

  get availableNumbers(): number[] {
    return this.config.spawn.availableNumbers;
  }

  get spawnInterval(): number | undefined {
    return this.config.spawn.spawnInterval;
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
      case 'target_merge':
        if (this.highestMergeValue >= objective.target) {
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
    const eventData: LevelCompletedData = {
      levelId: this.config.id,
      score: this.currentScore,
      time: this.survivalTime,
      highestMergeValue: this.highestMergeValue,
    };
    eventBus.emit('level:completed', eventData);
  }

  stopTimer(): void {
  }

  update(deltaMS: number): void {
    if (this.isPaused || this.isCompleted) return;

    if (this.config.objective.timeLimit !== undefined && this.config.objective.timeLimit !== null) {
      this.timerElapsed += deltaMS;
      const elapsedSeconds = Math.floor(this.timerElapsed / 1000);

      if (elapsedSeconds !== this.survivalTime) {
        this.survivalTime = elapsedSeconds;
        const remaining = Math.max(0, this.config.objective.timeLimit - this.survivalTime);
        eventBus.emit('level:timeUpdate', remaining);
      }

      if (this.survivalTime >= this.config.objective.timeLimit) {
        if (this.config.objective.type === 'survival') {
          this.completeLevel();
        } else {
          eventBus.emit('game:timeout');
        }
      }
    }
  }

  forceComplete(): void {
    this.isCompleted = true;
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
        if (this.highestMergeValue <= 1) return 0;
        return Math.min(Math.log2(this.highestMergeValue) / Math.log2(objective.target), 1);
      case 'clear_obstacle': {
        const maxObs = this.config.obstacles?.length ?? objective.target;
        return maxObs > 0 ? Math.min(this.obstaclesCleared / maxObs, 1) : 1;
      }
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

  getHighestMergeValue(): number {
    return this.highestMergeValue;
  }

  reset(): void {
    this.currentScore = 0;
    this.obstaclesCleared = 0;
    this.survivalTime = 0;
    this.timerElapsed = 0;
    this.isCompleted = false;
    this.isPaused = false;
    this.highestMergeValue = 0;
  }

  destroy(): void {
    eventBus.off('score:updated', this.onScoreUpdatedBound);
    eventBus.off('block:merged', this.onBlockMergedBound);
    eventBus.off('obstacle:cleared', this.onObstacleClearedBound);
  }
}
