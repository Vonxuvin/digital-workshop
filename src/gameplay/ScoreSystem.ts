import { eventBus, GameEvents } from '../utils/EventBus';

export interface ScoreConfig {
  baseMultiplier: number;
  chainBonusPerLevel: number;
  maxChainBonus: number;
}

const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  baseMultiplier: 1.0,
  chainBonusPerLevel: 0.5,
  maxChainBonus: 5.0,
};

export const SCORE_CONFIGS: Record<number, { baseScore: number; chainMultiplier: number }> = {
  2: { baseScore: 1, chainMultiplier: 1.0 },
  4: { baseScore: 2, chainMultiplier: 1.0 },
  8: { baseScore: 4, chainMultiplier: 1.0 },
  16: { baseScore: 8, chainMultiplier: 1.1 },
  32: { baseScore: 16, chainMultiplier: 1.2 },
  64: { baseScore: 32, chainMultiplier: 1.3 },
  128: { baseScore: 64, chainMultiplier: 1.4 },
  256: { baseScore: 128, chainMultiplier: 1.5 },
  512: { baseScore: 256, chainMultiplier: 1.6 },
  1024: { baseScore: 512, chainMultiplier: 1.7 },
  2048: { baseScore: 1024, chainMultiplier: 1.8 },
  4096: { baseScore: 2048, chainMultiplier: 1.9 },
};

export class ScoreSystem {
  private score: number = 0;
  private chainCount: number = 0;
  private maxChainCount: number = 0;
  private chainTimer: number = 0;
  private readonly CHAIN_TIMEOUT = 3000;
  private config: ScoreConfig;
  private luckyMultiplier: number = 1;

  constructor(config?: Partial<ScoreConfig>) {
    this.config = { ...DEFAULT_SCORE_CONFIG, ...config };
  }

  setLuckyMultiplier(multiplier: number): void {
    this.luckyMultiplier = multiplier;
  }

  addMergeScore(value: number, isCombo: boolean = false): void {
    if (value <= 0) return;
    const configEntry = SCORE_CONFIGS[value];
    let baseScore: number;
    let chainMultiplierFromTable: number;

    if (configEntry) {
      baseScore = configEntry.baseScore;
      chainMultiplierFromTable = configEntry.chainMultiplier;
    } else {
      baseScore = this.calculateScore(value);
      chainMultiplierFromTable = 1.0;
    }

    let chainMultiplier = isCombo ? 1 + Math.min(this.chainCount * this.config.chainBonusPerLevel, this.config.maxChainBonus) : 1;
    chainMultiplier *= this.config.baseMultiplier * chainMultiplierFromTable;
    const finalScore = Math.round(baseScore * chainMultiplier * this.luckyMultiplier);

    this.score += finalScore;
    this.chainCount++;
    if (this.chainCount > this.maxChainCount) {
      this.maxChainCount = this.chainCount;
    }
    this.chainTimer = this.CHAIN_TIMEOUT;

    eventBus.emit(GameEvents.SCORE_UPDATED, {
      totalScore: this.score,
      earnedScore: finalScore,
      chainCount: this.chainCount,
      baseScore,
      chainMultiplier,
    });
  }

  update(deltaMS: number): void {
    if (this.chainTimer > 0) {
      this.chainTimer -= deltaMS;
      if (this.chainTimer <= 0) {
        this.chainTimer = 0;
        this.chainCount = 0;
        eventBus.emit(GameEvents.SCORE_CHAIN_ENDED);
      }
    }
  }

  private calculateScore(value: number): number {
    if (value <= 2) return 1;
    const tier = Math.log2(value);
    if (!Number.isFinite(tier)) return 1;
    return Math.round(Math.pow(2, tier - 1));
  }

  getScore(): number {
    return this.score;
  }

  getCurrentScore(): number {
    return this.score;
  }

  getTotalScore(): number {
    return this.score;
  }

  getCombo(): number {
    return this.chainCount;
  }

  getChainCount(): number {
    return this.chainCount;
  }

  getComboMultiplier(): number {
    return 1 + Math.min(this.chainCount * this.config.chainBonusPerLevel, this.config.maxChainBonus);
  }

  resetCombo(): void {
    this.chainCount = 0;
    this.chainTimer = 0;
    eventBus.emit(GameEvents.SCORE_CHAIN_ENDED);
  }

  getMaxChainCount(): number {
    return this.maxChainCount;
  }

  reset(): void {
    this.score = 0;
    this.chainCount = 0;
    this.maxChainCount = 0;
    this.chainTimer = 0;
    this.luckyMultiplier = 1;
  }

  destroy(): void {
    this.chainTimer = 0;
  }

  getStarsForLevel(score: number, levelStars: number[]): number {
    let stars = 0;
    for (let i = 0; i < levelStars.length; i++) {
      if (score >= levelStars[i]) {
        stars = i + 1;
      }
    }
    return stars;
  }
}
