import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObjectiveDisplay, ObjectiveDisplayData } from '../../src/ui/components/ObjectiveDisplay';
import { LevelObjectiveOverlay } from '../../src/ui/screens/LevelObjectiveOverlay';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { PropType } from '../../src/gameplay/props/Prop';
import { eventBus } from '../../src/utils/EventBus';

describe('ObjectiveDisplay', () => {
  let display: ObjectiveDisplay;

  beforeEach(() => {
    display = new ObjectiveDisplay(200);
  });

  afterEach(() => {
    display.destroy();
  });

  it('should create without error', () => {
    expect(display).toBeDefined();
  });

  it('should set score objective correctly', () => {
    const data: ObjectiveDisplayData = { type: 'score', target: 300, currentValue: 0 };
    display.setObjective(data);
    expect(display.getCurrentData()).toEqual(data);
  });

  it('should set target_merge objective correctly', () => {
    const data: ObjectiveDisplayData = { type: 'target_merge', target: 16, currentValue: 0 };
    display.setObjective(data);
    expect(display.getCurrentData()).toEqual(data);
  });

  it('should set clear_obstacle objective correctly', () => {
    const data: ObjectiveDisplayData = { type: 'clear_obstacle', target: 5, currentValue: 0 };
    display.setObjective(data);
    expect(display.getCurrentData()).toEqual(data);
  });

  it('should set survival objective correctly', () => {
    const data: ObjectiveDisplayData = { type: 'survival', target: 30, currentValue: 0, timeLimit: 30 };
    display.setObjective(data);
    expect(display.getCurrentData()).toEqual(data);
  });

  it('should update progress for score type', () => {
    const data: ObjectiveDisplayData = { type: 'score', target: 300, currentValue: 150 };
    display.updateProgress(data);
    expect(display.getCurrentData()?.currentValue).toBe(150);
  });

  it('should calculate score progress correctly', () => {
    const data: ObjectiveDisplayData = { type: 'score', target: 300, currentValue: 150 };
    display.setObjective(data);
    const bar = display.progressBar;
    expect(bar.progress).toBeCloseTo(0.5);
  });

  it('should calculate target_merge progress correctly', () => {
    const data: ObjectiveDisplayData = { type: 'target_merge', target: 16, currentValue: 8 };
    display.setObjective(data);
    const bar = display.progressBar;
    expect(bar.progress).toBeCloseTo(Math.log2(8) / Math.log2(16));
  });

  it('should calculate clear_obstacle progress correctly', () => {
    const data: ObjectiveDisplayData = { type: 'clear_obstacle', target: 5, currentValue: 3 };
    display.setObjective(data);
    const bar = display.progressBar;
    expect(bar.progress).toBeCloseTo(0.6);
  });

  it('should calculate survival progress correctly', () => {
    const data: ObjectiveDisplayData = { type: 'survival', target: 30, currentValue: 15, timeLimit: 30 };
    display.setObjective(data);
    const bar = display.progressBar;
    expect(bar.progress).toBeCloseTo(0.5);
  });

  it('should detect near complete state (>=80%)', () => {
    const data: ObjectiveDisplayData = { type: 'score', target: 100, currentValue: 80 };
    display.setObjective(data);
    expect(display.isNearComplete()).toBe(true);
  });

  it('should not be near complete when progress < 80%', () => {
    const data: ObjectiveDisplayData = { type: 'score', target: 100, currentValue: 50 };
    display.setObjective(data);
    expect(display.isNearComplete()).toBe(false);
  });

  it('should not be near complete when progress is 100%', () => {
    const data: ObjectiveDisplayData = { type: 'score', target: 100, currentValue: 100 };
    display.setObjective(data);
    expect(display.isNearComplete()).toBe(false);
  });

  it('should transition from normal to near complete', () => {
    const data1: ObjectiveDisplayData = { type: 'score', target: 100, currentValue: 50 };
    display.setObjective(data1);
    expect(display.isNearComplete()).toBe(false);

    const data2: ObjectiveDisplayData = { type: 'score', target: 100, currentValue: 85 };
    display.updateProgress(data2);
    expect(display.isNearComplete()).toBe(true);
  });

  it('should transition from near complete to complete', () => {
    const data1: ObjectiveDisplayData = { type: 'score', target: 100, currentValue: 85 };
    display.setObjective(data1);
    expect(display.isNearComplete()).toBe(true);

    const data2: ObjectiveDisplayData = { type: 'score', target: 100, currentValue: 100 };
    display.updateProgress(data2);
    expect(display.isNearComplete()).toBe(false);
  });

  it('should transition from near complete back to normal', () => {
    const data1: ObjectiveDisplayData = { type: 'score', target: 100, currentValue: 85 };
    display.setObjective(data1);
    expect(display.isNearComplete()).toBe(true);

    const data2: ObjectiveDisplayData = { type: 'score', target: 200, currentValue: 85 };
    display.updateProgress(data2);
    expect(display.isNearComplete()).toBe(false);
  });

  it('should reset correctly', () => {
    const data: ObjectiveDisplayData = { type: 'score', target: 100, currentValue: 85 };
    display.setObjective(data);
    display.reset();
    expect(display.getCurrentData()).toBeNull();
    expect(display.isNearComplete()).toBe(false);
  });

  it('should handle zero target as complete', () => {
    const data: ObjectiveDisplayData = { type: 'score', target: 0, currentValue: 0 };
    display.setObjective(data);
    const bar = display.progressBar;
    expect(bar.progress).toBe(1);
  });

  it('should cap progress at 1', () => {
    const data: ObjectiveDisplayData = { type: 'score', target: 100, currentValue: 200 };
    display.setObjective(data);
    const bar = display.progressBar;
    expect(bar.progress).toBe(1);
  });

  describe('getObjectDescription', () => {
    it('should return score description', () => {
      const data: ObjectiveDisplayData = { type: 'score', target: 300, currentValue: 0 };
      const desc = display.getObjectiveDescription(data);
      expect(desc).toContain('得分');
      expect(desc).toContain('300');
    });

    it('should return target_merge description', () => {
      const data: ObjectiveDisplayData = { type: 'target_merge', target: 16, currentValue: 0 };
      const desc = display.getObjectiveDescription(data);
      expect(desc).toContain('合成');
      expect(desc).toContain('16');
    });

    it('should return clear_obstacle description', () => {
      const data: ObjectiveDisplayData = { type: 'clear_obstacle', target: 5, currentValue: 0 };
      const desc = display.getObjectiveDescription(data);
      expect(desc).toContain('清除障碍');
      expect(desc).toContain('5');
    });

    it('should return survival description', () => {
      const data: ObjectiveDisplayData = { type: 'survival', target: 30, currentValue: 0, timeLimit: 30 };
      const desc = display.getObjectiveDescription(data);
      expect(desc).toContain('生存');
      expect(desc).toContain('30秒');
    });
  });

  describe('static methods', () => {
    it('should return correct objective labels', () => {
      expect(ObjectiveDisplay.getObjectiveLabel('score')).toBe('得分');
      expect(ObjectiveDisplay.getObjectiveLabel('target_merge')).toBe('合成');
      expect(ObjectiveDisplay.getObjectiveLabel('clear_obstacle')).toBe('清除障碍');
      expect(ObjectiveDisplay.getObjectiveLabel('survival')).toBe('生存');
    });

    it('should return correct objective icons', () => {
      expect(ObjectiveDisplay.getObjectiveIcon('score')).toBe('🎯');
      expect(ObjectiveDisplay.getObjectiveIcon('target_merge')).toBe('🔮');
      expect(ObjectiveDisplay.getObjectiveIcon('clear_obstacle')).toBe('💥');
      expect(ObjectiveDisplay.getObjectiveIcon('survival')).toBe('⏱');
    });

    it('should return correct static objective descriptions', () => {
      expect(ObjectiveDisplay.getObjectiveDescription('score', 300)).toContain('300');
      expect(ObjectiveDisplay.getObjectiveDescription('target_merge', 16)).toContain('16');
      expect(ObjectiveDisplay.getObjectiveDescription('clear_obstacle', 5)).toContain('5个');
      expect(ObjectiveDisplay.getObjectiveDescription('survival', 30, 30)).toContain('30秒');
    });
  });

  describe('progress updates for different types', () => {
    it('should update score progress from 0 to target', () => {
      display.setObjective({ type: 'score', target: 500, currentValue: 0 });
      expect(display.progressBar.progress).toBe(0);

      display.updateProgress({ type: 'score', target: 500, currentValue: 250 });
      expect(display.progressBar.progress).toBeCloseTo(0.5);

      display.updateProgress({ type: 'score', target: 500, currentValue: 500 });
      expect(display.progressBar.progress).toBe(1);
    });

    it('should update target_merge progress logarithmically', () => {
      display.setObjective({ type: 'target_merge', target: 64, currentValue: 0 });
      expect(display.progressBar.progress).toBe(0);

      display.updateProgress({ type: 'target_merge', target: 64, currentValue: 8 });
      expect(display.progressBar.progress).toBeCloseTo(Math.log2(8) / Math.log2(64));

      display.updateProgress({ type: 'target_merge', target: 64, currentValue: 64 });
      expect(display.progressBar.progress).toBe(1);
    });

    it('should update clear_obstacle progress linearly', () => {
      display.setObjective({ type: 'clear_obstacle', target: 10, currentValue: 0 });
      expect(display.progressBar.progress).toBe(0);

      display.updateProgress({ type: 'clear_obstacle', target: 10, currentValue: 5 });
      expect(display.progressBar.progress).toBeCloseTo(0.5);

      display.updateProgress({ type: 'clear_obstacle', target: 10, currentValue: 10 });
      expect(display.progressBar.progress).toBe(1);
    });

    it('should update survival progress based on timeLimit', () => {
      display.setObjective({ type: 'survival', target: 60, currentValue: 0, timeLimit: 60 });
      expect(display.progressBar.progress).toBe(0);

      display.updateProgress({ type: 'survival', target: 60, currentValue: 30, timeLimit: 60 });
      expect(display.progressBar.progress).toBeCloseTo(0.5);

      display.updateProgress({ type: 'survival', target: 60, currentValue: 60, timeLimit: 60 });
      expect(display.progressBar.progress).toBe(1);
    });

    it('should handle survival without timeLimit returning 0 progress', () => {
      display.setObjective({ type: 'survival', target: 60, currentValue: 30 });
      expect(display.progressBar.progress).toBe(0);
    });

    it('should handle target_merge with currentValue <= 1 as 0 progress', () => {
      display.setObjective({ type: 'target_merge', target: 16, currentValue: 1 });
      expect(display.progressBar.progress).toBe(0);
    });
  });
});

describe('LevelObjectiveOverlay', () => {
  let overlay: LevelObjectiveOverlay;

  beforeEach(() => {
    overlay = new LevelObjectiveOverlay();
  });

  afterEach(() => {
    overlay.destroy();
  });

  it('should create without error', () => {
    expect(overlay).toBeDefined();
  });

  it('should not be visible initially', () => {
    expect(overlay.isVisible()).toBe(false);
  });

  it('should show objective for a level config', () => {
    const config: LevelConfig = {
      id: 1,
      name: '新手入门',
      objective: { type: 'score', target: 300 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [300, 400, 500] },
    };
    overlay.showObjective(config);
    expect(overlay.isVisible()).toBe(true);
    expect(overlay.getConfig()).toBe(config);
  });

  it('should hide the overlay', () => {
    const config: LevelConfig = {
      id: 1,
      name: '新手入门',
      objective: { type: 'score', target: 300 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [300, 400, 500] },
    };
    overlay.showObjective(config);
    overlay.hide();
  });

  it('should reset correctly', () => {
    const config: LevelConfig = {
      id: 1,
      name: '新手入门',
      objective: { type: 'score', target: 300 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [300, 400, 500] },
    };
    overlay.showObjective(config);
    overlay.reset();
    expect(overlay.isVisible()).toBe(false);
    expect(overlay.getConfig()).toBeNull();
  });

  it('should emit LEVEL_OBJECTIVE_DISMISSED on click', () => {
    const config: LevelConfig = {
      id: 1,
      name: '新手入门',
      objective: { type: 'score', target: 300 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [300, 400, 500] },
    };
    overlay.showObjective(config);

    const handler = vi.fn();
    eventBus.on('level:objectiveDismissed', handler);
    overlay.emit('pointerdown');
    expect(handler).toHaveBeenCalled();
    eventBus.off('level:objectiveDismissed', handler);
  });

  it('should layout correctly', () => {
    overlay.layout(800, 600);
  });

  it('should show different objective types', () => {
    const configs: LevelConfig[] = [
      {
        id: 1, name: '得分关卡', objective: { type: 'score', target: 500 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [100, 200, 300] },
      },
      {
        id: 2, name: '合成关卡', objective: { type: 'target_merge', target: 32 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4, 8] },
        rewards: { stars: [100, 200, 300] },
      },
      {
        id: 3, name: '障碍关卡', objective: { type: 'clear_obstacle', target: 5 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [100, 200, 300] },
      },
      {
        id: 4, name: '生存关卡', objective: { type: 'survival', target: 60, timeLimit: 60 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [100, 200, 300] },
      },
    ];

    for (const config of configs) {
      overlay.showObjective(config);
      expect(overlay.isVisible()).toBe(true);
      expect(overlay.getConfig()).toBe(config);
      overlay.reset();
    }
  });
});

describe('GameHUD ObjectiveDisplay Integration', () => {
  let hud: GameHUD;
  let mockPropSystem: PropSystem;

  beforeEach(() => {
    mockPropSystem = {
      getPropCount: vi.fn().mockReturnValue(3),
      getAllProps: vi.fn().mockReturnValue([]),
      useProp: vi.fn(),
      getProp: vi.fn(),
      reset: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      destroy: vi.fn(),
    } as unknown as PropSystem;
    hud = new GameHUD(mockPropSystem);
  });

  afterEach(() => {
    hud.destroy();
  });

  it('should have objectiveDisplay getter', () => {
    expect(hud.objectiveDisplay).toBeDefined();
  });

  it('should set objective info', () => {
    hud.setObjectiveInfo('score', 300);
    const display = hud.objectiveDisplay;
    const data = display.getCurrentData();
    expect(data).not.toBeNull();
    expect(data?.type).toBe('score');
    expect(data?.target).toBe(300);
  });

  it('should set objective info with timeLimit', () => {
    hud.setObjectiveInfo('survival', 60, 60);
    const display = hud.objectiveDisplay;
    const data = display.getCurrentData();
    expect(data?.type).toBe('survival');
    expect(data?.timeLimit).toBe(60);
  });

  it('should update objective progress', () => {
    hud.setObjectiveInfo('score', 300);
    hud.updateObjectiveProgress(150);
    const display = hud.objectiveDisplay;
    const data = display.getCurrentData();
    expect(data?.currentValue).toBe(150);
  });

  it('should not update objective progress when no objective set', () => {
    hud.updateObjectiveProgress(100);
    const display = hud.objectiveDisplay;
    expect(display.getCurrentData()).toBeNull();
  });

  it('should reset objective display on reset', () => {
    hud.setObjectiveInfo('score', 300);
    hud.updateObjectiveProgress(150);
    hud.reset();
    const display = hud.objectiveDisplay;
    expect(display.getCurrentData()).toBeNull();
  });

  it('should position objectiveDisplay in layout', () => {
    hud.layout(800, 600);
    const display = hud.objectiveDisplay;
    expect(display.x).toBe(550);
    expect(display.y).toBe(105);
  });

  it('should handle all objective types', () => {
    hud.setObjectiveInfo('score', 500);
    expect(hud.objectiveDisplay.getCurrentData()?.type).toBe('score');

    hud.setObjectiveInfo('target_merge', 32);
    expect(hud.objectiveDisplay.getCurrentData()?.type).toBe('target_merge');

    hud.setObjectiveInfo('clear_obstacle', 10);
    expect(hud.objectiveDisplay.getCurrentData()?.type).toBe('clear_obstacle');

    hud.setObjectiveInfo('survival', 60, 60);
    expect(hud.objectiveDisplay.getCurrentData()?.type).toBe('survival');
  });

  it('should show near complete indicator when progress >= 80%', () => {
    hud.setObjectiveInfo('score', 100);
    hud.updateObjectiveProgress(85);
    expect(hud.objectiveDisplay.isNearComplete()).toBe(true);
  });

  it('should show complete state when progress = 100%', () => {
    hud.setObjectiveInfo('score', 100);
    hud.updateObjectiveProgress(100);
    expect(hud.objectiveDisplay.isNearComplete()).toBe(false);
  });
});

describe('LevelSystem new methods', () => {
  let ls: LevelSystem;

  const scoreConfig: LevelConfig = {
    id: 1, name: '分数关卡', objective: { type: 'score', target: 100 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2, 4] },
    rewards: { stars: [50, 80, 100] },
  };

  const mergeConfig: LevelConfig = {
    id: 2, name: '合成关卡', objective: { type: 'target_merge', target: 16 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2, 4, 8] },
    rewards: { stars: [50, 80, 100] },
  };

  const obstacleConfig: LevelConfig = {
    id: 3, name: '障碍关卡', objective: { type: 'clear_obstacle', target: 3 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2, 4] },
    rewards: { stars: [50, 80, 100] },
  };

  const survivalConfig: LevelConfig = {
    id: 4, name: '生存关卡', objective: { type: 'survival', target: 10, timeLimit: 10 },
    container: { width: 400, height: 600, shape: 'rectangle' },
    spawn: { availableNumbers: [1, 2, 4] },
    rewards: { stars: [50, 80, 100] },
  };

  afterEach(() => {
    if (ls) ls.destroy();
  });

  it('should return objective target', () => {
    ls = new LevelSystem(scoreConfig);
    expect(ls.getObjectiveTarget()).toBe(100);
  });

  it('should return current progress value for score', () => {
    ls = new LevelSystem(scoreConfig);
    ls.start();
    expect(ls.getCurrentProgressValue()).toBe(0);
    eventBus.emit('score:updated', { totalScore: 50 });
    expect(ls.getCurrentProgressValue()).toBe(50);
  });

  it('should return current progress value for target_merge', () => {
    ls = new LevelSystem(mergeConfig);
    ls.start();
    expect(ls.getCurrentProgressValue()).toBe(0);
    eventBus.emit('block:merged', { newValue: 8 });
    expect(ls.getCurrentProgressValue()).toBe(8);
  });

  it('should return current progress value for clear_obstacle', () => {
    ls = new LevelSystem(obstacleConfig);
    ls.start();
    expect(ls.getCurrentProgressValue()).toBe(0);
    eventBus.emit('obstacle:cleared', {});
    expect(ls.getCurrentProgressValue()).toBe(1);
  });

  it('should return current progress value for survival', () => {
    ls = new LevelSystem(survivalConfig);
    ls.start();
    expect(ls.getCurrentProgressValue()).toBe(0);
    ls.update(5000);
    expect(ls.getCurrentProgressValue()).toBe(5);
  });

  it('should return timeLimit', () => {
    ls = new LevelSystem(survivalConfig);
    expect(ls.getTimeLimit()).toBe(10);
  });

  it('should return undefined timeLimit for configs without it', () => {
    ls = new LevelSystem(scoreConfig);
    expect(ls.getTimeLimit()).toBeUndefined();
  });

  it('should reset current progress value', () => {
    ls = new LevelSystem(scoreConfig);
    ls.start();
    eventBus.emit('score:updated', { totalScore: 50 });
    expect(ls.getCurrentProgressValue()).toBe(50);
    ls.reset();
    expect(ls.getCurrentProgressValue()).toBe(0);
  });
});
