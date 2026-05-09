import { eventBus } from '../utils/EventBus';

export interface ScoreConfig {
  baseScore: number;
  chainMultiplier: number;
}

export const SCORE_CONFIGS: Record<number, ScoreConfig> = {
  2: { baseScore: 2, chainMultiplier: 1.0 },
  4: { baseScore: 8, chainMultiplier: 1.2 },
  8: { baseScore: 32, chainMultiplier: 1.5 },
  16: { baseScore: 128, chainMultiplier: 2.0 },
  32: { baseScore: 512, chainMultiplier: 2.5 },
  64: { baseScore: 2048, chainMultiplier: 3.0 },
  128: { baseScore: 8192, chainMultiplier: 4.0 },
  256: { baseScore: 32768, chainMultiplier: 5.0 },
};

export interface ScoreResult {
  totalScore: number;
  chainCount: number;
  chainMultiplier: number;
  baseScore: number;
}

export class ScoreSystem {
  private currentScore = 0;
  private chainCount = 0;
  private chainTimer: number | null = null;
  private readonly chainTimeout = 2000;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('block:merged', (data: { newValue: number; chainCount: number }) => {
      this.handleMerge(data.newValue, data.chainCount);
    });
  }

  private handleMerge(newValue: number, chainCount: number): void {
    const config = SCORE_CONFIGS[newValue] || { baseScore: newValue * 10, chainMultiplier: 1.0 };

    this.chainCount++;

    const chainBonus = 1 + (this.chainCount - 1) * 0.1;
    const earnedScore = Math.floor(config.baseScore * config.chainMultiplier * chainBonus);

    this.currentScore += earnedScore;

    if (this.chainTimer) {
      clearTimeout(this.chainTimer);
    }
    this.chainTimer = window.setTimeout(() => {
      this.chainCount = 0;
    }, this.chainTimeout);

    eventBus.emit('score:updated', {
      totalScore: this.currentScore,
      earnedScore,
      chainCount: this.chainCount,
      chainMultiplier: config.chainMultiplier,
      baseScore: config.baseScore,
    });

    console.log(`[ScoreSystem] 合成 ${newValue}，获得 ${earnedScore} 分，连锁 x${this.chainCount}`);
  }

  getCurrentScore(): number {
    return this.currentScore;
  }

  getChainCount(): number {
    return this.chainCount;
  }

  reset(): void {
    this.currentScore = 0;
    this.chainCount = 0;
    if (this.chainTimer) {
      clearTimeout(this.chainTimer);
      this.chainTimer = null;
    }
  }
}
