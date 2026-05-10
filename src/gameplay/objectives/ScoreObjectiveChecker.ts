import { ObjectiveChecker, ObjectiveContext } from './ObjectiveChecker';

export class ScoreObjectiveChecker extends ObjectiveChecker {
  check(context: ObjectiveContext): boolean {
    return context.currentScore >= context.targetValue;
  }

  getProgress(context: ObjectiveContext): number {
    return Math.min(context.currentScore / context.targetValue, 1);
  }
}
