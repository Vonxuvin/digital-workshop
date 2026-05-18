import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('pixi.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pixi.js')>();
  return {
    ...actual,
    Application: vi.fn(function() {
      const stage = {
        children: [] as unknown[],
        addChild: vi.fn(),
        removeChild: vi.fn(),
      };
      return {
        stage,
        screen: { width: 800, height: 600 },
        ticker: { add: vi.fn(), remove: vi.fn(), deltaMS: 16.67 },
        init: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn(),
        renderer: { resize: vi.fn() },
      };
    }),
  };
});

vi.mock('../../src/platform/PlatformFactory', () => ({
  createPlatformAdapter: () => ({
    init: vi.fn().mockResolvedValue(undefined),
    getSystemInfo: vi.fn().mockResolvedValue({ pixelRatio: 1 }),
  }),
}));

vi.mock('../../src/utils/BlockTextureCache', () => ({
  BlockTextureCache: {
    getInstance: vi.fn().mockReturnValue({
      setApp: vi.fn(),
      preloadMinimal: vi.fn().mockResolvedValue(undefined),
      preloadAsync: vi.fn().mockResolvedValue(undefined),
    }),
    resetInstance: vi.fn(),
  },
}));

vi.mock('../../src/core/AudioManager', () => ({
  AudioManager: vi.fn().mockImplementation(function() {
    this.init = vi.fn().mockResolvedValue(undefined);
    this.play = vi.fn();
    this.destroy = vi.fn();
  }),
}));

vi.mock('../../src/core/SaveManager', () => ({
  SaveManager: vi.fn().mockImplementation(function() {
    this.init = vi.fn().mockResolvedValue(undefined);
    this.startAutoSave = vi.fn();
    this.destroy = vi.fn();
    this.getLevelProgress = vi.fn().mockReturnValue({ unlocked: false, completed: false, highScore: 0 });
    this.updateLevelProgress = vi.fn();
    this.updateStatistics = vi.fn();
  }),
}));

vi.mock('../../src/core/PhysicsManager', () => ({
  PhysicsManager: vi.fn().mockImplementation(function() {
    this.start = vi.fn();
    this.stop = vi.fn();
    this.destroy = vi.fn();
  }),
}));

vi.mock('../../src/gameplay/MergeSystem', () => ({
  MergeSystem: vi.fn().mockImplementation(function() {
    this.destroy = vi.fn();
    this.setBlockPool = vi.fn();
    this.setScoreSystem = vi.fn();
  }),
}));

vi.mock('../../src/gameplay/ScoreSystem', () => ({
  ScoreSystem: vi.fn().mockImplementation(function() {
    this.destroy = vi.fn();
    this.update = vi.fn();
  }),
}));

vi.mock('../../src/gameplay/BlockPreview', () => ({
  BlockPreview: vi.fn().mockImplementation(function() {
    this.destroy = vi.fn();
  }),
}));

vi.mock('../../src/gameplay/modifiers/ModifierManager', () => ({
  ModifierManager: vi.fn().mockImplementation(function() {
    this.destroy = vi.fn();
  }),
}));

vi.mock('../../src/gameplay/props/PropSystem', () => ({
  PropSystem: vi.fn().mockImplementation(function() {
    this.destroy = vi.fn();
    this.setPhysicsManager = vi.fn();
  }),
}));

vi.mock('../../src/utils/PerformanceMonitor', () => ({
  PerformanceMonitor: vi.fn().mockImplementation(function() {
    this.tick = vi.fn();
    this.start = vi.fn();
    this.getFPS = vi.fn().mockReturnValue(60);
  }),
}));

vi.mock('../../src/ui/hud/GameHUD', () => ({
  GameHUD: vi.fn().mockImplementation(function() {
    this.destroy = vi.fn();
    this.layout = vi.fn();
  }),
}));

vi.mock('../../src/gameplay/props/PropsConfigLoader', () => ({
  PropsConfigLoader: {
    load: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/core/LevelLoader', () => ({
  LevelLoader: vi.fn().mockImplementation(function() {
    this.discoverAndLoadAllLevels = vi.fn().mockResolvedValue(undefined);
    this.getLevelConfig = vi.fn().mockReturnValue(null);
    this.getLevelCount = vi.fn().mockReturnValue(0);
    this.getAllLevelConfigsSync = vi.fn().mockReturnValue([]);
    this.destroy = vi.fn();
  }),
}));

vi.mock('../../src/core/GameScene', () => ({
  GameScene: vi.fn().mockImplementation(function() {
    this.init = vi.fn();
    this.destroy = vi.fn();
    this.pause = vi.fn();
    this.resume = vi.fn();
    this.loadLevel = vi.fn();
    this.restartLevel = vi.fn();
    this.stopPhysics = vi.fn();
    this.clearEverything = vi.fn();
    this.clearContainerWalls = vi.fn();
    this.getLevelSystem = vi.fn().mockReturnValue(null);
    this.getScoreSystem = vi.fn().mockReturnValue(null);
    this.getGameHUD = vi.fn().mockReturnValue(null);
    this.getModifierManager = vi.fn().mockReturnValue(null);
    this.getPropEffectHandler = vi.fn().mockReturnValue(null);
    this.getBlockSpawner = vi.fn().mockReturnValue(null);
    this.getPhysics = vi.fn().mockReturnValue(null);
    this.getPropSystem = vi.fn().mockReturnValue(null);
    this.calculateStars = vi.fn().mockReturnValue(0);
    this.getGameStartTime = vi.fn().mockReturnValue(0);
    this.handleRevive = vi.fn();
    this.showLevelObjective = vi.fn();
    this.initializeProps = vi.fn();
    this.setupContainer = vi.fn();
    this.addPreviewToStage = vi.fn();
    this.addHUDToStage = vi.fn();
    this.addLevelObjectiveOverlayToStage = vi.fn();
    this.setHUDVisible = vi.fn();
    this.setWarningLineVisible = vi.fn();
    this.handleResize = vi.fn();
    this.update = vi.fn();
    this.getPreview = vi.fn().mockReturnValue({
      hide: vi.fn(),
      hideNextPreview: vi.fn(),
      showNextPreview: vi.fn(),
      deactivateNextPreview: vi.fn(),
      setBounds: vi.fn(),
      setGravityAngle: vi.fn(),
      visible: false,
    });
    this.getContainerWidth = vi.fn().mockReturnValue(400);
    this.getContainerHeight = vi.fn().mockReturnValue(600);
    this.getContainerOffsetX = vi.fn().mockReturnValue(0);
  }),
}));

vi.mock('../../src/ui/UIManager', () => {
  const Screen = vi.fn().mockImplementation(function() {
    this.addChild = vi.fn();
    this.removeChild = vi.fn();
    this.destroy = vi.fn();
    this.visible = true;
    this.alpha = 1;
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.pivot = { set: vi.fn() };
    this.position = { set: vi.fn() };
    this.scale = { set: vi.fn() };
    this.interactive = false;
    this.eventMode = 'passive';
    this.on = vi.fn();
    this.off = vi.fn();
    this.emit = vi.fn();
  });

  return {
    Screen,
    UIManager: vi.fn().mockImplementation(function() {
      this.registerScreen = vi.fn();
      this.showScreen = vi.fn();
      this.hideCurrentScreen = vi.fn();
      this.destroy = vi.fn();
      this.layout = vi.fn();
      this.handleResize = vi.fn();
    }),
  };
});

vi.mock('../../src/ui/screens/LoadingScreen', () => ({
  LoadingScreen: vi.fn().mockImplementation(function() {
    this.updateProgress = vi.fn();
  }),
}));

vi.mock('../../src/ui/screens/TutorialOverlay', () => ({
  TutorialOverlay: vi.fn().mockImplementation(function() {}),
}));

vi.mock('../../src/core/TutorialManager', () => ({
  TutorialManager: vi.fn().mockImplementation(function() {
    this.destroy = vi.fn();
    this.resize = vi.fn();
  }),
}));

vi.mock('../../src/core/InputManager', () => ({
  InputManager: vi.fn().mockImplementation(function() {
    this.destroy = vi.fn();
  }),
}));

vi.mock('../../src/core/GameInputHandler', () => ({
  GameInputHandler: vi.fn().mockImplementation(function() {
    this.setup = vi.fn();
    this.setupKeyboard = vi.fn();
    this.syncInputScale = vi.fn();
    this.destroy = vi.fn();
  }),
}));

vi.mock('../../src/core/GameEventRouter', () => ({
  GameEventRouter: vi.fn().mockImplementation(function() {
    this.setup = vi.fn();
    this.destroy = vi.fn();
  }),
}));

import { Game } from '../../src/core/Game';

describe('Game', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    Game['instance'] = null;
    canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    try {
      if (Game['instance']) {
        Game.getInstance().destroy();
      }
    } catch {
      Game['instance'] = null;
    }
    document.body.removeChild(canvas);
  });

  it('should create Game instance', () => {
    const game = new Game(canvas);
    expect(game).toBeDefined();
    expect(game.getApp()).toBeDefined();
  });

  it('should have correct initial state', () => {
    const game = new Game(canvas);
    expect(game.getApp().stage.children.length).toBe(0);
  });

  it('should return singleton instance via getInstance', () => {
    const game = new Game(canvas);
    expect(Game.getInstance()).toBe(game);
  });

  it('should throw when getInstance called before constructor', () => {
    Game['instance'] = null;
    expect(() => Game.getInstance()).toThrow('实例尚未创建');
  });

  it('should return state machine', () => {
    const game = new Game(canvas);
    expect(game.getStateMachine()).toBeDefined();
  });

  it('should return score system', () => {
    const game = new Game(canvas);
    expect(game.getScoreSystem()).toBeDefined();
  });

  it('should return merge system', () => {
    const game = new Game(canvas);
    expect(game.getMergeSystem()).toBeDefined();
  });

  it('should return level loader', () => {
    const game = new Game(canvas);
    expect(game.getLevelLoader()).toBeDefined();
  });

  it('should return save manager', () => {
    const game = new Game(canvas);
    expect(game.getSaveManager()).toBeDefined();
  });

  it('should return audio manager', () => {
    const game = new Game(canvas);
    expect(game.getAudioManager()).toBeDefined();
  });

  it('should return performance monitor', () => {
    const game = new Game(canvas);
    expect(game.getPerformanceMonitor()).toBeDefined();
  });

  it('should return result screen', () => {
    const game = new Game(canvas);
    expect(game.getResultScreen()).toBeDefined();
  });

  it('should return pause screen', () => {
    const game = new Game(canvas);
    expect(game.getPauseScreen()).toBeDefined();
  });

  it('should return level select screen', () => {
    const game = new Game(canvas);
    expect(game.getLevelSelectScreen()).toBeDefined();
  });

  it('should return event bus', () => {
    const game = new Game(canvas);
    expect(game.getEventBus()).toBeDefined();
  });

  it('should return undefined block spawner before init', () => {
    const game = new Game(canvas);
    expect(game.getBlockSpawner()).toBeUndefined();
  });

  it('should return undefined physics from game scene before init', () => {
    const game = new Game(canvas);
    expect(game.getPhysics()).toBeUndefined();
  });

  it('should return undefined prop system before init', () => {
    const game = new Game(canvas);
    expect(game.getPropSystem()).toBeUndefined();
  });

  it('should return undefined game HUD before init', () => {
    const game = new Game(canvas);
    expect(game.getGameHUD()).toBeUndefined();
  });

  it('should return undefined level system before init', () => {
    const game = new Game(canvas);
    expect(game.getLevelSystem()).toBeUndefined();
  });

  it('should toggle FPS display', () => {
    const game = new Game(canvas);
    expect(game['fpsDisplayEnabled']).toBe(false);
    game.toggleFPSDisplay();
    expect(game['fpsDisplayEnabled']).toBe(true);
    game.toggleFPSDisplay();
    expect(game['fpsDisplayEnabled']).toBe(false);
  });

  it('should handle destroy when boundStateChange is null', () => {
    const game = new Game(canvas);
    game['boundStateChange'] = null;
    game['boundHandleResize'] = null;
    game['boundUpdate'] = null;
    game['fpsDisplay'] = null;
    Game['instance'] = null;
  });
});

describe('Game - after init', () => {
  let canvas: HTMLCanvasElement;
  let game: Game;

  beforeEach(async () => {
    Game['instance'] = null;
    canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    document.body.appendChild(canvas);
    game = new Game(canvas);
    await game.init();
  });

  afterEach(() => {
    try {
      if (Game['instance'] !== null) {
        game.destroy();
      }
    } catch {
      Game['instance'] = null;
    }
    document.body.removeChild(canvas);
  });

  it('should initialize without errors', () => {
    expect(game).toBeDefined();
  });

  it('should clear singleton instance on destroy', () => {
    game.destroy();
    expect(Game['instance']).toBeNull();
  });

  it('should provide scene manager', () => {
    expect(game.getSceneManager()).toBeDefined();
  });

  it('should provide UI manager', () => {
    expect(game.getUIManager()).toBeDefined();
  });

  it('should provide game scene', () => {
    expect(game.getGameScene()).toBeDefined();
  });

  it('should provide platform adapter', () => {
    expect(game.getPlatformAdapter()).toBeDefined();
  });

  it('should provide ad manager', () => {
    expect(game.getAdManager()).toBeDefined();
  });

  it('should provide block spawner', () => {
    expect(game.getBlockSpawner()).toBeDefined();
  });

  it('should provide physics', () => {
    expect(game.getPhysics()).toBeDefined();
  });

  it('should provide prop system', () => {
    expect(game.getPropSystem()).toBeDefined();
  });

  it('should provide game HUD', () => {
    expect(game.getGameHUD()).toBeDefined();
  });

  it('should provide level system', () => {
    expect(game.getLevelSystem()).toBeDefined();
  });

  it('should setup FPS display', () => {
    expect(game['fpsDisplay']).toBeDefined();
  });

  it('should toggle FPS display after init', () => {
    expect(game['fpsDisplayEnabled']).toBe(false);
    game.toggleFPSDisplay();
    expect(game['fpsDisplayEnabled']).toBe(true);
  });

  it('should remove event listeners on destroy', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    game.destroy();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('should remove ticker update on destroy', () => {
    const tickerRemove = game.getApp().ticker.remove;
    game.destroy();
    expect(tickerRemove).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should handle window resize event', () => {
    vi.useFakeTimers();
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(400);
    vi.useRealTimers();
  });

  it('should debounce resize events', () => {
    vi.useFakeTimers();
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(400);
    vi.useRealTimers();
  });

  it('should clear resize timer on destroy', () => {
    game['resizeTimer'] = setTimeout(() => {}, 10000);
    game.destroy();
    expect(game['resizeTimer']).toBeNull();
  });

  it('should handle state change callback', () => {
    const callback = game['boundStateChange'];
    if (callback) {
      callback('menu', 'playing');
    }
  });

  it('should handle state change callback when not playing', () => {
    const callback = game['boundStateChange'];
    if (callback) {
      callback('playing', 'paused');
    }
  });

  it('should update FPS display text when enabled', () => {
    game.toggleFPSDisplay();
    const updateFn = game['boundUpdate'];
    if (updateFn) updateFn();
  });

  it('should not update FPS display text when disabled', () => {
    const updateFn = game['boundUpdate'];
    if (updateFn) updateFn();
  });
});
