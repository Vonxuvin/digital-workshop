import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { PropType } from '../../src/gameplay/props/Prop';
import { ObjectiveDisplay } from '../../src/ui/components/ObjectiveDisplay';
import { LevelObjectiveOverlay } from '../../src/ui/screens/LevelObjectiveOverlay';
import { eventBus } from '../../src/utils/EventBus';

describe('Objective Display Integration', () => {
  describe('LevelSystem + ObjectiveDisplay integration', () => {
    let levelSystem: LevelSystem;
    let objectiveDisplay: ObjectiveDisplay;

    const scoreConfig: LevelConfig = {
      id: 1, name: '得分关卡', objective: { type: 'score', target: 500 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [200, 350, 500] },
    };

    const mergeConfig: LevelConfig = {
      id: 2, name: '合成关卡', objective: { type: 'target_merge', target: 32 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4, 8] },
      rewards: { stars: [100, 200, 300] },
    };

    const obstacleConfig: LevelConfig = {
      id: 3, name: '障碍关卡', objective: { type: 'clear_obstacle', target: 5 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [100, 200, 300] },
      obstacles: [
        { x: 100, y: 200, value: 2 },
        { x: 200, y: 300, value: 4 },
        { x: 150, y: 250, value: 2 },
        { x: 250, y: 350, value: 8 },
        { x: 300, y: 400, value: 2 },
      ],
    };

    const survivalConfig: LevelConfig = {
      id: 4, name: '生存关卡', objective: { type: 'survival', target: 60, timeLimit: 60 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [30, 40, 60] },
    };

    afterEach(() => {
      if (levelSystem) levelSystem.destroy();
      if (objectiveDisplay) objectiveDisplay.destroy();
    });

    it('should sync score objective from LevelSystem to ObjectiveDisplay', () => {
      levelSystem = new LevelSystem(scoreConfig);
      objectiveDisplay = new ObjectiveDisplay(200);
      levelSystem.start();

      objectiveDisplay.setObjective({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
      });

      expect(objectiveDisplay.getCurrentData()?.type).toBe('score');
      expect(objectiveDisplay.getCurrentData()?.target).toBe(500);
      expect(objectiveDisplay.progressBar.progress).toBe(0);

      eventBus.emit('score:updated', { totalScore: 250 });
      objectiveDisplay.updateProgress({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
      });

      expect(objectiveDisplay.progressBar.progress).toBeCloseTo(0.5);
    });

    it('should sync merge objective from LevelSystem to ObjectiveDisplay', () => {
      levelSystem = new LevelSystem(mergeConfig);
      objectiveDisplay = new ObjectiveDisplay(200);
      levelSystem.start();

      objectiveDisplay.setObjective({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
      });

      expect(objectiveDisplay.getCurrentData()?.type).toBe('target_merge');

      eventBus.emit('block:merged', { newValue: 16 });
      objectiveDisplay.updateProgress({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
      });

      expect(objectiveDisplay.progressBar.progress).toBeCloseTo(Math.log2(16) / Math.log2(32));
    });

    it('should sync obstacle objective from LevelSystem to ObjectiveDisplay', () => {
      levelSystem = new LevelSystem(obstacleConfig);
      objectiveDisplay = new ObjectiveDisplay(200);
      levelSystem.start();

      objectiveDisplay.setObjective({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
      });

      expect(objectiveDisplay.getCurrentData()?.type).toBe('clear_obstacle');

      eventBus.emit('obstacle:cleared', {});
      eventBus.emit('obstacle:cleared', {});
      eventBus.emit('obstacle:cleared', {});
      objectiveDisplay.updateProgress({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
      });

      expect(objectiveDisplay.progressBar.progress).toBeCloseTo(0.6);
    });

    it('should sync survival objective from LevelSystem to ObjectiveDisplay', () => {
      levelSystem = new LevelSystem(survivalConfig);
      objectiveDisplay = new ObjectiveDisplay(200);
      levelSystem.start();

      objectiveDisplay.setObjective({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
        timeLimit: levelSystem.getTimeLimit(),
      });

      expect(objectiveDisplay.getCurrentData()?.type).toBe('survival');

      levelSystem.update(30000);
      objectiveDisplay.updateProgress({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
        timeLimit: levelSystem.getTimeLimit(),
      });

      expect(objectiveDisplay.progressBar.progress).toBeCloseTo(0.5);
    });

    it('should show near complete when score reaches 80%', () => {
      levelSystem = new LevelSystem(scoreConfig);
      objectiveDisplay = new ObjectiveDisplay(200);
      levelSystem.start();

      objectiveDisplay.setObjective({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
      });

      eventBus.emit('score:updated', { totalScore: 420 });
      objectiveDisplay.updateProgress({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
      });

      expect(objectiveDisplay.isNearComplete()).toBe(true);
    });

    it('should show complete when score reaches target', () => {
      levelSystem = new LevelSystem(scoreConfig);
      objectiveDisplay = new ObjectiveDisplay(200);
      levelSystem.start();

      objectiveDisplay.setObjective({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
      });

      eventBus.emit('score:updated', { totalScore: 500 });
      objectiveDisplay.updateProgress({
        type: levelSystem.getObjectiveType(),
        target: levelSystem.getObjectiveTarget(),
        currentValue: levelSystem.getCurrentProgressValue(),
      });

      expect(objectiveDisplay.isNearComplete()).toBe(false);
      expect(objectiveDisplay.progressBar.progress).toBe(1);
    });
  });

  describe('GameHUD + LevelSystem integration', () => {
    let hud: GameHUD;
    let mockPropSystem: PropSystem;
    let levelSystem: LevelSystem;

    const scoreConfig: LevelConfig = {
      id: 1, name: '得分关卡', objective: { type: 'score', target: 300 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [100, 200, 300] },
    };

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
      if (levelSystem) levelSystem.destroy();
      hud.destroy();
    });

    it('should display objective info from LevelSystem config', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();

      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      const data = hud.objectiveDisplay.getCurrentData();
      expect(data?.type).toBe('score');
      expect(data?.target).toBe(300);
    });

    it('should update objective progress as score changes', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();

      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      eventBus.emit('score:updated', { totalScore: 150 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());

      expect(hud.objectiveDisplay.getCurrentData()?.currentValue).toBe(150);
    });

    it('should show near complete indicator at 80% progress', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();

      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      eventBus.emit('score:updated', { totalScore: 250 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());

      expect(hud.objectiveDisplay.isNearComplete()).toBe(true);
    });

    it('should reset objective display when level resets', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();

      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      eventBus.emit('score:updated', { totalScore: 150 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());

      hud.reset();
      expect(hud.objectiveDisplay.getCurrentData()).toBeNull();
    });
  });

  describe('LevelObjectiveOverlay + LevelConfig integration', () => {
    let overlay: LevelObjectiveOverlay;

    beforeEach(() => {
      overlay = new LevelObjectiveOverlay();
    });

    afterEach(() => {
      overlay.destroy();
    });

    it('should display correct info for score level', () => {
      const config: LevelConfig = {
        id: 1, name: '新手入门', objective: { type: 'score', target: 300 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [300, 400, 500] },
      };
      overlay.showObjective(config);
      expect(overlay.getConfig()?.objective.type).toBe('score');
      expect(overlay.getConfig()?.objective.target).toBe(300);
    });

    it('should display correct info for survival level with timeLimit', () => {
      const config: LevelConfig = {
        id: 10, name: '生存挑战', objective: { type: 'survival', target: 60, timeLimit: 60 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [30, 40, 60] },
      };
      overlay.showObjective(config);
      expect(overlay.getConfig()?.objective.timeLimit).toBe(60);
    });

    it('should emit LEVEL_OBJECTIVE_DISMISSED when clicked', () => {
      const config: LevelConfig = {
        id: 1, name: '新手入门', objective: { type: 'score', target: 300 },
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

    it('should handle multiple level configs sequentially', () => {
      const configs: LevelConfig[] = [
        {
          id: 1, name: '得分关卡', objective: { type: 'score', target: 300 },
          container: { width: 400, height: 600, shape: 'rectangle' },
          spawn: { availableNumbers: [1, 2, 4] },
          rewards: { stars: [300, 400, 500] },
        },
        {
          id: 2, name: '合成关卡', objective: { type: 'target_merge', target: 16 },
          container: { width: 400, height: 600, shape: 'rectangle' },
          spawn: { availableNumbers: [1, 2, 4, 8] },
          rewards: { stars: [100, 200, 300] },
        },
      ];

      for (const config of configs) {
        overlay.showObjective(config);
        expect(overlay.isVisible()).toBe(true);
        overlay.reset();
        expect(overlay.isVisible()).toBe(false);
      }
    });
  });

  describe('Full objective flow integration', () => {
    it('should complete full flow: overlay -> HUD display -> near complete -> complete', () => {
      const config: LevelConfig = {
        id: 1, name: '得分关卡', objective: { type: 'score', target: 100 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [50, 80, 100] },
      };

      const overlay = new LevelObjectiveOverlay();
      const mockPropSystem = {
        getPropCount: vi.fn().mockReturnValue(3),
        getAllProps: vi.fn().mockReturnValue([]),
        useProp: vi.fn(),
        getProp: vi.fn(),
        reset: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        destroy: vi.fn(),
      } as unknown as PropSystem;
      const hud = new GameHUD(mockPropSystem);
      const levelSystem = new LevelSystem(config);

      overlay.showObjective(config);
      expect(overlay.isVisible()).toBe(true);

      overlay.hide();

      levelSystem.start();
      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      eventBus.emit('score:updated', { totalScore: 50 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.getCurrentData()?.currentValue).toBe(50);

      eventBus.emit('score:updated', { totalScore: 85 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.isNearComplete()).toBe(true);

      eventBus.emit('score:updated', { totalScore: 100 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.isNearComplete()).toBe(false);
      expect(hud.objectiveDisplay.progressBar.progress).toBe(1);

      levelSystem.destroy();
      hud.destroy();
      overlay.destroy();
    });
  });

  describe('Single progress bar verification', () => {
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

    it('should have only one progress bar (ObjectiveDisplay.progressBar)', () => {
      expect((hud as any)._objectiveBar).toBeUndefined();
      expect(hud.objectiveDisplay.progressBar).toBeDefined();
    });

    it('should not have setObjectiveProgress method', () => {
      expect((hud as any).setObjectiveProgress).toBeUndefined();
    });

    it('should update progress only through updateObjectiveProgress', () => {
      hud.setObjectiveInfo('score', 200);
      hud.updateObjectiveProgress(100);
      expect(hud.objectiveDisplay.progressBar.progress).toBeCloseTo(0.5);
    });

    it('should have unified ObjectiveDisplay position', () => {
      hud.layout(800, 600);
      const expectedX = Math.max(10, (800 - (hud.objectiveDisplay.objectiveBarWidth || 280)) / 2);
      expect(hud.objectiveDisplay.x).toBe(expectedX);
      expect(hud.objectiveDisplay.y).toBe(5);
    });
  });

  describe('Progress refresh mechanism integration', () => {
    let levelSystem: LevelSystem;
    let hud: GameHUD;
    let mockPropSystem: PropSystem;

    const scoreConfig: LevelConfig = {
      id: 1, name: '得分关卡', objective: { type: 'score', target: 100 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [50, 80, 100] },
    };

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
      if (levelSystem) levelSystem.destroy();
      hud.destroy();
    });

    it('should refresh progress bar in real-time via updateObjectiveProgress', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();
      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      eventBus.emit('score:updated', { totalScore: 25 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.progressBar.progress).toBeCloseTo(0.25);

      eventBus.emit('score:updated', { totalScore: 50 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.progressBar.progress).toBeCloseTo(0.5);

      eventBus.emit('score:updated', { totalScore: 100 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.progressBar.progress).toBe(1);
    });

    it('should show near complete visual state when progress >= 80%', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();
      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      eventBus.emit('score:updated', { totalScore: 80 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.isNearComplete()).toBe(true);
    });

    it('should show complete visual state when progress reaches 100%', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();
      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      eventBus.emit('score:updated', { totalScore: 100 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.progressBar.progress).toBe(1);
      expect(hud.objectiveDisplay.isNearComplete()).toBe(false);
    });

    it('should display persistent objective info throughout gameplay', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();
      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      expect(hud.objectiveDisplay.getCurrentData()).not.toBeNull();

      eventBus.emit('score:updated', { totalScore: 50 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.getCurrentData()?.type).toBe('score');
      expect(hud.objectiveDisplay.getCurrentData()?.target).toBe(100);
    });
  });

  describe('Objective always visible integration', () => {
    let hud: GameHUD;
    let mockPropSystem: PropSystem;
    let levelSystem: LevelSystem;

    const scoreConfig: LevelConfig = {
      id: 1, name: '得分关卡', objective: { type: 'score', target: 100 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [50, 80, 100] },
    };

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
      if (levelSystem) levelSystem.destroy();
      hud.destroy();
    });

    it('should keep objective visible throughout gameplay', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();
      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      expect(hud.objectiveDisplay.getCurrentData()).not.toBeNull();
      expect(hud.objectiveDisplay.isAlwaysVisible()).toBe(true);

      eventBus.emit('score:updated', { totalScore: 50 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.getCurrentData()).not.toBeNull();

      eventBus.emit('score:updated', { totalScore: 100 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.getCurrentData()).not.toBeNull();
    });

    it('should restore objective info after reset and re-set', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();
      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      eventBus.emit('score:updated', { totalScore: 50 });
      hud.updateObjectiveProgress(levelSystem.getCurrentProgressValue());

      hud.reset();
      expect(hud.objectiveDisplay.getCurrentData()).toBeNull();

      hud.setObjectiveInfo('score', 100);
      expect(hud.objectiveDisplay.getCurrentData()).not.toBeNull();
      expect(hud.objectiveDisplay.getCurrentData()?.target).toBe(100);
    });

    it('should force update progress immediately', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();
      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      eventBus.emit('score:updated', { totalScore: 75 });
      hud.forceUpdateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.progressBar.progress).toBeCloseTo(0.75);
      expect(hud.objectiveDisplay.progressBar.displayProgressValue).toBeCloseTo(0.75);
    });
  });

  describe('Progress bar force refresh integration', () => {
    let levelSystem: LevelSystem;
    let hud: GameHUD;
    let mockPropSystem: PropSystem;

    const scoreConfig: LevelConfig = {
      id: 1, name: '得分关卡', objective: { type: 'score', target: 200 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [100, 150, 200] },
    };

    const survivalConfig: LevelConfig = {
      id: 2, name: '生存关卡', objective: { type: 'survival', target: 30, timeLimit: 30 },
      container: { width: 400, height: 600, shape: 'rectangle' },
      spawn: { availableNumbers: [1, 2, 4] },
      rewards: { stars: [10, 20, 30] },
    };

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
      if (levelSystem) levelSystem.destroy();
      hud.destroy();
    });

    it('should force refresh score progress bar accurately', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();
      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      eventBus.emit('score:updated', { totalScore: 100 });
      hud.forceUpdateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.progressBar.progress).toBeCloseTo(0.5);
      expect(hud.objectiveDisplay.progressBar.displayProgressValue).toBeCloseTo(0.5);
    });

    it('should force refresh survival progress bar accurately', () => {
      levelSystem = new LevelSystem(survivalConfig);
      levelSystem.start();
      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      levelSystem.update(15000);
      hud.forceUpdateObjectiveProgress(levelSystem.getCurrentProgressValue());
      expect(hud.objectiveDisplay.progressBar.progress).toBeCloseTo(0.5);
      expect(hud.objectiveDisplay.progressBar.displayProgressValue).toBeCloseTo(0.5);
    });

    it('should handle rapid force refresh without lag', () => {
      levelSystem = new LevelSystem(scoreConfig);
      levelSystem.start();
      hud.setObjectiveInfo(
        levelSystem.getObjectiveType(),
        levelSystem.getObjectiveTarget(),
        levelSystem.getTimeLimit(),
      );

      for (let s = 0; s <= 200; s += 20) {
        eventBus.emit('score:updated', { totalScore: s });
        hud.forceUpdateObjectiveProgress(levelSystem.getCurrentProgressValue());
        const expectedProgress = Math.min(s / 200, 1);
        expect(hud.objectiveDisplay.progressBar.progress).toBeCloseTo(expectedProgress);
        expect(hud.objectiveDisplay.progressBar.displayProgressValue).toBeCloseTo(expectedProgress);
      }
    });
  });

  describe('Layout integration with centered objective panel', () => {
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

    it('should center objective panel on standard screen', () => {
      hud.layout(800, 600);
      const display = hud.objectiveDisplay;
      const expectedX = Math.max(10, (800 - display.objectiveBarWidth) / 2);
      expect(display.x).toBe(expectedX);
      expect(display.y).toBe(5);
    });

    it('should center objective panel on wide screen', () => {
      hud.layout(1200, 800);
      const display = hud.objectiveDisplay;
      const expectedX = Math.max(10, (1200 - display.objectiveBarWidth) / 2);
      expect(display.x).toBe(expectedX);
      expect(display.y).toBe(5);
    });

    it('should center objective panel on narrow screen', () => {
      hud.layout(375, 667);
      const display = hud.objectiveDisplay;
      const expectedX = Math.max(10, (375 - display.objectiveBarWidth) / 2);
      expect(display.x).toBe(expectedX);
      expect(display.y).toBe(5);
    });

    it('should not overlap with score display', () => {
      hud.layout(800, 600);
      const display = hud.objectiveDisplay;
      expect(display.y).toBeLessThanOrEqual(10);
      expect(display.x).toBeGreaterThan(100);
    });

    it('should have background panel visible', () => {
      hud.layout(800, 600);
      expect(hud.objectiveDisplay.getBackgroundPanel()).toBeDefined();
    });
  });
});
