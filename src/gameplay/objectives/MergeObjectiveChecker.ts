import { ObjectiveChecker, ObjectiveContext } from './ObjectiveChecker';

export class MergeObjectiveChecker extends ObjectiveChecker {
  check(context: ObjectiveContext): boolean {
    return context.highestMergeValue >= context.targetValue;
  }

  getProgress(context: ObjectiveContext): number {
    if (context.targetValue <= 0) return 1;
    return Math.min(context.highestMergeValue / context.targetValue, 1);
  }
}
