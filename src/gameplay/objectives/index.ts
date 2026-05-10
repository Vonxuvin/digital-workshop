import { ObjectiveType } from '../LevelSystem';
import { ObjectiveChecker } from './ObjectiveChecker';
import { ScoreObjectiveChecker } from './ScoreObjectiveChecker';
import { MergeObjectiveChecker } from './MergeObjectiveChecker';
import { ClearObstacleChecker } from './ClearObstacleChecker';
import { SurvivalObjectiveChecker } from './SurvivalObjectiveChecker';

export function createObjectiveChecker(type: ObjectiveType): ObjectiveChecker {
  switch (type) {
    case 'score': return new ScoreObjectiveChecker();
    case 'target_merge': return new MergeObjectiveChecker();
    case 'clear_obstacle': return new ClearObstacleChecker();
    case 'survival': return new SurvivalObjectiveChecker();
  }
}
