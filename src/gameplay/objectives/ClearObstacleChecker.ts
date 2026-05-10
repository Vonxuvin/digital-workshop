import { ObjectiveChecker, ObjectiveContext } from './ObjectiveChecker';

export class ClearObstacleChecker extends ObjectiveChecker {
  check(context: ObjectiveContext): boolean {
    return context.obstaclesCleared >= context.targetValue;
  }

  getProgress(context: ObjectiveContext): number {
    if (context.targetValue <= 0) return 1;
    return Math.min(context.obstaclesCleared / context.targetValue, 1);
  }
}
