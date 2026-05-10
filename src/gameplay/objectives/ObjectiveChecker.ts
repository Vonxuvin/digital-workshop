export abstract class ObjectiveChecker {
  abstract check(context: ObjectiveContext): boolean;
  abstract getProgress(context: ObjectiveContext): number;
}

export interface ObjectiveContext {
  currentScore: number;
  highestMergeValue: number;
  obstaclesCleared: number;
  survivalTime: number;
  targetValue: number;
}
