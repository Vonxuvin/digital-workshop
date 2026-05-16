export interface Vector2 {
  x: number;
  y: number;
}

export interface BlockData {
  value: number;
  color: number;
  radius: number;
  mass: number;
}

export interface ModifierConfig {
  type: 'paddle' | 'rotate' | 'shrink';
  enabled: boolean;
  side?: 'left' | 'right';
  extendDuration?: number;
  retractDuration?: number;
  extendLength?: number;
  triggerInterval?: number;
  yPosition?: number;
  mode?: 'extend';
  rotationSpeed?: number;
  maxAngle?: number;
  oscillate?: boolean;
  duration?: number;
  containerOffsetX?: number;
  shrinkAmount?: number;
}

export interface LevelConfig {
  id: number;
  name: string;
  objective: {
    type: 'score' | 'target_merge' | 'clear_obstacle' | 'survival';
    target: number;
    timeLimit?: number;
  };
  container: {
    width: number;
    height: number;
    shape?: 'rectangle' | 'circle' | 'custom';
  };
  spawn: {
    availableNumbers: number[];
    initialBlocks?: Array<{ x: number; y: number; value: number }>;
    spawnInterval?: number;
  };
  modifiers?: ModifierConfig[];
  obstacles?: Array<{ x: number; y: number; value: number }>;
  rewards?: {
    stars?: number[];
    firstClear?: Record<string, unknown>;
    blueprintFragments?: number;
  };
}
