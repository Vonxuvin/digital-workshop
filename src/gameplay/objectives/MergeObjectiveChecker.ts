import { ObjectiveChecker, ObjectiveContext } from './ObjectiveChecker';

export class MergeObjectiveChecker extends ObjectiveChecker {
  check(context: ObjectiveContext): boolean {
    return context.highestMergeValue >= context.targetValue;
  }

  getProgress(context: ObjectiveContext): number {
    if (context.targetValue <= 0) return 1;
    if (context.highestMergeValue <= 1) return 0;
    return Math.min(Math.log2(context.highestMergeValue) / Math.log2(context.targetValue), 1);
  }
}
