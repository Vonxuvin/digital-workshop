import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameScene } from '../../src/core/GameScene';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { ScoreSystem } from '../../src/gameplay/ScoreSystem';
import { MergeSystem } from '../../src/gameplay/MergeSystem';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';

vi.mock('../../src/core/ContainerRenderer', () => {
  return {
    ContainerRenderer: vi.fn().mockImplementation(function() {
      this.setup = vi.fn();
      this.handleResize = vi.fn();
      this.getContainerWidth = vi.fn().mockReturnValue(400);
      this.getContainerHeight = vi.fn().mockReturnValue(600);
      this.getContainerOffsetX = vi.fn().mockReturnValue(0);
      this.getGroundY = vi.fn().mockReturnValue(550);
      this.getWarningLine = vi.fn().mockReturnValue(null);
      this.drawContainerWalls = vi.fn();
      this.rebuildPhysicsWalls = vi.fn();
      this.clearContainerWalls = vi.fn();
      this.destroy = vi.fn();
    }),
  };
});

vi.mock('../../src/core/GameEffectManager', () => {
  return {
    GameEffectManager: vi.fn().mockImplementation(function() {
      this.setPerformanceMonitor = vi.fn();
      this.addMergeEffect = vi.fn();
      this.clearAll = vi.fn();
      this.cleanup = vi.fn();
      this.destroy = vi.fn();
    }),
  };
});

vi.mock('../../src/core/PropEffectHandler', () => {
  return {
    PropEffectHandler: vi.fn().mockImplementation(function() {
      this.setLevelSystem = vi.fn();
      this.setContainerBounds = vi.fn();
      this.isShrinkActive = vi.fn().mockReturnValue(false);
      this.applyShrinkToBlock = vi.fn();
      this.initializeProps = vi.fn();
      this.reset = vi.fn();
      this.pause = vi.fn();
      this.resume = vi.fn();
      this.handleBombExplode = vi.fn();
      this.handleFreezeActivated = vi.fn();
      this.handleFreezeDeactivated = vi.fn();
      this.handleShrinkActivate = vi.fn();
      this.handleShrinkDeactivate = vi.fn();
      this.handleLuckyActivate = vi.fn();
      this.handleLuckyDeactivate = vi.fn();
      this.handlePropTargetMode = vi.fn();
      this.handleNextRainbowBlock = vi.fn();
      this.handleRainbowConsumed = vi.fn();
      this.handleRevive = vi.fn();
      this.getBombTargetMode = vi.fn().mockReturnValue(false);
      this.clearBombTargetMode = vi.fn();
    }),
  };
});

vi.mock('../../src/gameplay/BlockSpawner', () => {
  return {
    BlockSpawner: vi.fn().mockImplementation(function() {
      this.setOnBlockDropped = vi.fn();
      this.getBlockPool = vi.fn().mockReturnValue({});
      this.setLevelConfig = vi.fn();
      this.setContainerBounds = vi.fn();
      this.dropBlock = vi.fn();
      this.spawnObstacles = vi.fn();
      this.startAutoSpawn = vi.fn();
      this.stopAutoSpawn = vi.fn();
      this.pause = vi.fn();
      this.resume = vi.fn();
      this.reset = vi.fn();
      this.clearBlocks = vi.fn();
      this.clearObstacles = vi.fn();
      this.update = vi.fn();
      this.cleanupOutOfBounds = vi.fn();
      this.syncAllBlocks = vi.fn();
      this.getIsAutoDropping = vi.fn().mockReturnValue(false);
      this.getCanDrop = vi.fn().mockReturnValue(true);
      this.getBlocks = vi.fn().mockReturnValue([]);
      this.getObstacleBlocks = vi.fn().mockReturnValue([]);
      this.getCurrentValue = vi.fn().mockReturnValue(1);
      this.addBlock = vi.fn();
      this.removeBlock = vi.fn();
    }),
  };
});

vi.mock('../../src/gameplay/BlockPreview', () => {
  return {
    BlockPreview: vi.fn().mockImplementation(function() {
      this.hide = vi.fn();
      this.hideNextPreview = vi.fn();
      this.showNextPreview = vi.fn();
      this.deactivateNextPreview = vi.fn();
      this.setBounds = vi.fn();
      this.setGravityAngle = vi.fn();
      this.visible = false;
    }),
  };
});

vi.mock('../../src/ui/hud/GameHUD', () => {
  return {
    GameHUD: vi.fn().mockImplementation(function() {
      this.updateLevel = vi.fn();
      this.setObjectiveInfo = vi.fn();
      this.updateObjectiveProgress = vi.fn();
      this.reset = vi.fn();
      this.updatePropButtons = vi.fn();
      this.update = vi.fn();
      this.skipAnimation = vi.fn();
      this.layout = vi.fn();
      this.visible = false;
      this.usePropAtPosition = vi.fn();
    }),
  };
});

vi.mock('../../src/ui/screens/LevelObjectiveOverlay', () => {
  return {
    LevelObjectiveOverlay: vi.fn().mockImplementation(function() {
      this.showObjective = vi.fn();
      this.hide = vi.fn();
      this.isVisible = vi.fn().mockReturnValue(false);
      this.layout = vi.fn();
    }),
  };
});

vi.mock('../../src/utils/TimeManager', () => {
  return {
    TimeManager: {
      getInstance: vi.fn().mockReturnValue({
        resetGameTimeline: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      }),
    },
  };
});

describe('GameScene', () => {
  let gameScene: GameScene;
  let mockApp: any;
  let mockPhysics: any;
  let mockMergeSystem: any;
  let mockScoreSystem: any;
  let mockPreview: any;
  let mockGameHUD: any;
  let mockModifierManager: any;
  let mockPropSystem: any;
  let mockPerformanceMonitor: any;

  beforeEach(() => {
    mockApp = {
      stage: {
        children: [],
        addChild: vi.fn(),
        removeChild: vi.fn(),
      },
      screen: { width: 800, height: 600 },
      ticker: { add: vi.fn(), remove: vi.fn(), deltaMS: 16.67 },
    };

    mockPhysics = {
      start: vi.fn(),
      stop: vi.fn(),
      fixedUpdate: vi.fn().mockReturnValue(0),
      createCircle: vi.fn().mockReturnValue({ label: '' }),
      removeBody: vi.fn(),
      destroy: vi.fn(),
    };

    mockMergeSystem = {
      setBlockPool: vi.fn(),
      registerBlock: vi.fn(),
      registerObstacle: vi.fn(),
      unregisterBlock: vi.fn(),
      destroy: vi.fn(),
    };

    mockScoreSystem = {
      getScore: vi.fn().mockReturnValue(0),
      getMaxChainCount: vi.fn().mockReturnValue(0),
      reset: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
    };

    mockPreview = {
      hide: vi.fn(),
      hideNextPreview: vi.fn(),
      showNextPreview: vi.fn(),
      deactivateNextPreview: vi.fn(),
      setBounds: vi.fn(),
      setGravityAngle: vi.fn(),
      visible: false,
    };

    mockGameHUD = {
      updateLevel: vi.fn(),
      setObjectiveInfo: vi.fn(),
      updateObjectiveProgress: vi.fn(),
      reset: vi.fn(),
      updatePropButtons: vi.fn(),
      update: vi.fn(),
      skipAnimation: vi.fn(),
      layout: vi.fn(),
      visible: false,
      usePropAtPosition: vi.fn(),
    };

    mockModifierManager = {
      setContainerSize: vi.fn(),
      setStageContainer: vi.fn(),
      loadFromLevelConfig: vi.fn(),
      startAll: vi.fn(),
      stopAll: vi.fn(),
      pauseAll: vi.fn(),
      resumeAll: vi.fn(),
      clearAll: vi.fn(),
      getModifier: vi.fn().mockReturnValue(null),
      destroy: vi.fn(),
    };

    mockPropSystem = {
      setPhysicsManager: vi.fn(),
      reset: vi.fn(),
      destroy: vi.fn(),
    };

    mockPerformanceMonitor = {
      tick: vi.fn(),
      start: vi.fn(),
      getFPS: vi.fn().mockReturnValue(60),
    };

    gameScene = new GameScene(
      mockApp,
      mockPhysics,
      mockMergeSystem,
      mockScoreSystem,
      mockPreview,
      mockGameHUD,
      mockModifierManager,
      mockPropSystem,
      mockPerformanceMonitor,
    );
  });

  describe('constructor and init', () => {
    it('should create GameScene instance', () => {
      expect(gameScene).toBeDefined();
    });

    it('should return app', () => {
      expect(gameScene.getApp()).toBe(mockApp);
    });

    it('should return physics', () => {
      expect(gameScene.getPhysics()).toBe(mockPhysics);
    });

    it('should return score system', () => {
      expect(gameScene.getScoreSystem()).toBe(mockScoreSystem);
    });

    it('should return game HUD', () => {
      expect(gameScene.getGameHUD()).toBe(mockGameHUD);
    });

    it('should return prop system', () => {
      expect(gameScene.getPropSystem()).toBe(mockPropSystem);
    });

    it('should return performance monitor', () => {
      expect(gameScene.getPerformanceMonitor()).toBe(mockPerformanceMonitor);
    });

    it('should return modifier manager', () => {
      expect(gameScene.getModifierManager()).toBe(mockModifierManager);
    });

    it('should return null level system initially', () => {
      expect(gameScene.getLevelSystem()).toBeNull();
    });

    it('should return null current level config initially', () => {
      expect(gameScene.getCurrentLevelConfig()).toBeNull();
    });

    it('should return default container offset', () => {
      expect(gameScene.getContainerOffsetX()).toBe(0);
    });

    it('should return default container width', () => {
      expect(gameScene.getContainerWidth()).toBe(0);
    });

    it('should return default container height', () => {
      expect(gameScene.getContainerHeight()).toBe(0);
    });

    it('should return default ground Y', () => {
      expect(gameScene.getGroundY()).toBe(550);
    });

    it('should return default game start time', () => {
      expect(gameScene.getGameStartTime()).toBe(0);
    });

    it('should return container dimensions', () => {
      const container = gameScene.getContainer();
      expect(container).toEqual({ width: 0, height: 0 });
    });

    it('should return preview', () => {
      expect(gameScene.getPreview()).toBe(mockPreview);
    });

    it('should init and create block spawner', () => {
      gameScene.init();
      expect(gameScene.getBlockSpawner()).toBeDefined();
    });

    it('should init and create effect manager', () => {
      gameScene.init();
      expect(gameScene.getEffectManager()).toBeDefined();
    });

    it('should init and create prop effect handler', () => {
      gameScene.init();
      expect(gameScene.getPropEffectHandler()).toBeDefined();
    });

    it('should call propSystem.setPhysicsManager on init', () => {
      gameScene.init();
      expect(mockPropSystem.setPhysicsManager).toHaveBeenCalledWith(mockPhysics);
    });
  });

  describe('calculateStars', () => {
    it('should return 3 stars when score meets highest threshold', () => {
      const config: LevelConfig = {
        id: 1,
        name: 'Test',
        objective: { type: 'score', target: 1000 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [500, 800, 1000] },
      };
      const levelSystem = new LevelSystem(config);
      (gameScene as any).levelSystem = levelSystem;
      expect(gameScene.calculateStars(1000, 1)).toBe(3);
    });

    it('should return 2 stars when score meets middle threshold', () => {
      const config: LevelConfig = {
        id: 1,
        name: 'Test',
        objective: { type: 'score', target: 1000 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [500, 800, 1000] },
      };
      const levelSystem = new LevelSystem(config);
      (gameScene as any).levelSystem = levelSystem;
      expect(gameScene.calculateStars(800, 1)).toBe(2);
    });

    it('should return 1 star when score meets lowest threshold', () => {
      const config: LevelConfig = {
        id: 1,
        name: 'Test',
        objective: { type: 'score', target: 1000 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [500, 800, 1000] },
      };
      const levelSystem = new LevelSystem(config);
      (gameScene as any).levelSystem = levelSystem;
      expect(gameScene.calculateStars(500, 1)).toBe(1);
    });

    it('should return 0 stars when score below all thresholds', () => {
      const config: LevelConfig = {
        id: 1,
        name: 'Test',
        objective: { type: 'score', target: 1000 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [500, 800, 1000] },
      };
      const levelSystem = new LevelSystem(config);
      (gameScene as any).levelSystem = levelSystem;
      expect(gameScene.calculateStars(50, 1)).toBe(0);
    });

    it('should use target_merge thresholds', () => {
      const config: LevelConfig = {
        id: 1,
        name: 'Test',
        objective: { type: 'target_merge', target: 64 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [500, 800, 1000] },
      };
      const levelSystem = new LevelSystem(config);
      (gameScene as any).levelSystem = levelSystem;
      (levelSystem as any).config = { ...config, rewards: { stars: [] as any } };
      expect(gameScene.calculateStars(64 * 30, 1)).toBe(3);
      expect(gameScene.calculateStars(64 * 20, 1)).toBe(2);
      expect(gameScene.calculateStars(64 * 10, 1)).toBe(1);
    });

    it('should use default thresholds when no level system', () => {
      (gameScene as any).levelSystem = null;
      expect(gameScene.calculateStars(1000, 1)).toBe(3);
      expect(gameScene.calculateStars(500, 1)).toBe(2);
      expect(gameScene.calculateStars(100, 1)).toBe(1);
      expect(gameScene.calculateStars(50, 1)).toBe(0);
    });

    it('should use default thresholds when rewards stars is empty', () => {
      const config: LevelConfig = {
        id: 1,
        name: 'Test',
        objective: { type: 'score', target: 1000 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [500, 800, 1000] },
      };
      const levelSystem = new LevelSystem(config);
      (gameScene as any).levelSystem = levelSystem;
      (levelSystem as any).config = { ...config, rewards: { stars: [] as any } };
      expect(gameScene.calculateStars(1000, 1)).toBe(3);
    });
  });

  describe('stopPhysics and startPhysics', () => {
    it('should stop physics', () => {
      gameScene.stopPhysics();
      expect(mockPhysics.stop).toHaveBeenCalled();
    });

    it('should start physics', () => {
      gameScene.startPhysics();
      expect(mockPhysics.start).toHaveBeenCalled();
    });
  });

  describe('clearEverything', () => {
    it('should clear everything without error', () => {
      gameScene.init();
      expect(() => gameScene.clearEverything()).not.toThrow();
    });
  });

  describe('clearContainerWalls', () => {
    it('should clear container walls', () => {
      gameScene.init();
      const containerRenderer = (gameScene as any).containerRenderer;
      gameScene.clearContainerWalls();
      expect(containerRenderer.clearContainerWalls).toHaveBeenCalled();
    });
  });

  describe('setHUDVisible', () => {
    it('should set HUD visible', () => {
      gameScene.setHUDVisible(true);
      expect(mockGameHUD.visible).toBe(true);
    });

    it('should set HUD invisible', () => {
      gameScene.setHUDVisible(false);
      expect(mockGameHUD.visible).toBe(false);
    });
  });

  describe('setWarningLineVisible', () => {
    it('should not throw when warning line is null', () => {
      gameScene.init();
      expect(() => gameScene.setWarningLineVisible(true)).not.toThrow();
    });
  });

  describe('checkWarningLine', () => {
    it('should return false when no warning line', () => {
      gameScene.init();
      expect(gameScene.checkWarningLine()).toBe(false);
    });
  });

  describe('getWarningLine', () => {
    it('should return null when no warning line', () => {
      gameScene.init();
      expect(gameScene.getWarningLine()).toBeNull();
    });
  });

  describe('dropBlockWithShrinkCheck', () => {
    it('should delegate to block spawner', () => {
      gameScene.init();
      gameScene.dropBlockWithShrinkCheck(200, 80, 1);
      expect(gameScene.getBlockSpawner().dropBlock).toHaveBeenCalledWith(200, 80, 1);
    });
  });

  describe('getShrinkModifier', () => {
    it('should return null when no shrink modifier', () => {
      expect(gameScene.getShrinkModifier()).toBeNull();
    });
  });

  describe('addPreviewToStage', () => {
    it('should add preview to stage', () => {
      gameScene.addPreviewToStage();
      expect(mockApp.stage.addChild).toHaveBeenCalledWith(mockPreview);
    });
  });

  describe('addHUDToStage', () => {
    it('should add HUD to stage', () => {
      gameScene.addHUDToStage();
      expect(mockApp.stage.addChild).toHaveBeenCalledWith(mockGameHUD);
    });
  });

  describe('addLevelObjectiveOverlayToStage', () => {
    it('should add overlay to stage', () => {
      gameScene.init();
      gameScene.addLevelObjectiveOverlayToStage();
      expect(mockApp.stage.addChild).toHaveBeenCalled();
    });
  });

  describe('showLevelObjective', () => {
    it('should show level objective', () => {
      gameScene.init();
      const config: LevelConfig = {
        id: 1,
        name: 'Test',
        objective: { type: 'score', target: 1000 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [500, 800, 1000] },
      };
      gameScene.showLevelObjective(config);
      const overlay = gameScene.getLevelObjectiveOverlay();
      expect(overlay.showObjective).toHaveBeenCalledWith(config);
    });
  });

  describe('hideLevelObjective', () => {
    it('should hide level objective', () => {
      gameScene.init();
      gameScene.hideLevelObjective();
      const overlay = gameScene.getLevelObjectiveOverlay();
      expect(overlay.hide).toHaveBeenCalled();
    });
  });

  describe('isLevelObjectiveVisible', () => {
    it('should return visibility from overlay', () => {
      gameScene.init();
      expect(gameScene.isLevelObjectiveVisible()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should destroy without error', () => {
      gameScene.init();
      expect(() => gameScene.destroy()).not.toThrow();
    });

    it('should stop physics on destroy', () => {
      gameScene.init();
      gameScene.destroy();
      expect(mockPhysics.stop).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should not throw when not playing', () => {
      gameScene.init();
      expect(() => gameScene.update(16.67, false)).not.toThrow();
    });

    it('should update when playing', () => {
      gameScene.init();
      expect(() => gameScene.update(16.67, true)).not.toThrow();
    });
  });

  describe('pause and resume', () => {
    it('should pause without error', () => {
      gameScene.init();
      expect(() => gameScene.pause()).not.toThrow();
    });

    it('should resume without error', () => {
      gameScene.init();
      expect(() => gameScene.resume()).not.toThrow();
    });
  });

  describe('handleBlockMerged', () => {
    it('should handle block merged event', () => {
      gameScene.init();
      const mockBlock = { body: {}, value: 4, isDestroyed: false } as any;
      const data = {
        newValue: 4,
        position: { x: 200, y: 300 },
        chainCount: 1,
        newBlock: mockBlock,
        destroyedBlocks: [],
      };
      expect(() => gameScene.handleBlockMerged(data)).not.toThrow();
    });
  });

  describe('prop handlers', () => {
    beforeEach(() => {
      gameScene.init();
    });

    it('should handle bomb explode', () => {
      expect(() => gameScene.handleBombExplode({ x: 200, y: 300, radius: 100 })).not.toThrow();
    });

    it('should handle freeze activated', () => {
      expect(() => gameScene.handleFreezeActivated({ duration: 5000 })).not.toThrow();
    });

    it('should handle freeze deactivated', () => {
      expect(() => gameScene.handleFreezeDeactivated()).not.toThrow();
    });

    it('should handle shrink activate', () => {
      expect(() => gameScene.handleShrinkActivate({ factor: 0.5, duration: 5000 })).not.toThrow();
    });

    it('should handle shrink deactivate', () => {
      expect(() => gameScene.handleShrinkDeactivate()).not.toThrow();
    });

    it('should handle lucky activate', () => {
      expect(() => gameScene.handleLuckyActivate({ multiplier: 2, remainingDrops: 5 })).not.toThrow();
    });

    it('should handle lucky deactivate', () => {
      expect(() => gameScene.handleLuckyDeactivate()).not.toThrow();
    });

    it('should handle prop target mode', () => {
      expect(() => gameScene.handlePropTargetMode({ enabled: true })).not.toThrow();
    });

    it('should handle next rainbow block', () => {
      expect(() => gameScene.handleNextRainbowBlock({ isRainbow: true, remaining: 3 })).not.toThrow();
    });

    it('should handle rainbow consumed', () => {
      expect(() => gameScene.handleRainbowConsumed({ remainingBlocks: 2 })).not.toThrow();
    });

    it('should handle revive', () => {
      expect(() => gameScene.handleRevive()).not.toThrow();
    });

    it('should initialize props', () => {
      expect(() => gameScene.initializeProps()).not.toThrow();
    });

    it('should get bomb target mode', () => {
      expect(gameScene.getBombTargetMode()).toBe(false);
    });

    it('should use prop at position', () => {
      expect(() => gameScene.usePropAtPosition(200, 300)).not.toThrow();
    });
  });
});
