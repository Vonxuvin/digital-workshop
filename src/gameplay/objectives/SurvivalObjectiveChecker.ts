import { ObjectiveChecker, ObjectiveContext } from './ObjectiveChecker';

export class SurvivalObjectiveChecker extends ObjectiveChecker {
  check(context: ObjectiveContext): boolean {
    return context.survivalTime >= context.targetValue;
  }

  getProgress(context: ObjectiveContext): number {
    if (context.targetValue <= 0) return 0;
    return Math.min(context.survivalTime / context.targetValue, 1);
  }
}
