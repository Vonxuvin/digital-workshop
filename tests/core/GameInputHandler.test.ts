import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameInputHandler } from '../../src/core/GameInputHandler';
import { GameStateMachine } from '../../src/core/GameStateMachine';

function createMockApp() {
  return {
    screen: { width: 400, height: 600 },
  };
}

function createMockInput() {
  const downCbs: Function[] = [];
  const moveCbs: Function[] = [];
  const upCbs: Function[] = [];
  return {
    onDown: vi.fn((cb) => downCbs.push(cb)),
    onMove: vi.fn((cb) => moveCbs.push(cb)),
    onUp: vi.fn((cb) => upCbs.push(cb)),
    getState: vi.fn(() => ({ position: { x: 200, y: 300 }, isDown: true })),
    setScale: vi.fn(),
    _downCbs: downCbs,
    _moveCbs: moveCbs,
    _upCbs: upCbs,
  };
}

function createMockGameScene() {
  const preview = {
    visible: false,
    show: vi.fn(function(this: any, value: number, x: number, dropY: number) { this.visible = true; }),
    updatePosition: vi.fn(),
    hide: vi.fn(function(this: any) { this.visible = false; }),
    getTargetX: vi.fn(() => 200),
    y: 80,
    setNextValue: vi.fn(),
  };
  const blockSpawner = {
    getCanDrop: vi.fn(() => true),
    getCurrentValue: vi.fn(() => 2),
    startCooldown: vi.fn(),
  };
  return {
    getBlockSpawner: vi.fn(() => blockSpawner),
    getPreview: vi.fn(() => preview),
    getBombTargetMode: vi.fn(() => false),
    usePropAtPosition: vi.fn(),
    dropBlockWithShrinkCheck: vi.fn(),
    getContainerOffsetX: vi.fn(() => 0),
    getContainerWidth: vi.fn(() => 400),
    getContainerHeight: vi.fn(() => 600),
    getGroundY: vi.fn(() => 550),
    _preview: preview,
    _blockSpawner: blockSpawner,
  };
}

function createMockSceneManager() {
  return {
    isPlaying: vi.fn(() => true),
    pauseGame: vi.fn(),
    resumeGame: vi.fn(),
  };
}

function createMockGameHUD() {
  return {
    showCrosshair: vi.fn(),
    updateCrosshair: vi.fn(),
    hideCrosshair: vi.fn(),
    consumePropButtonClick: vi.fn(() => false),
  };
}

function createMockCanvas() {
  return {
    getBoundingClientRect: vi.fn(() => ({ width: 400, height: 600, x: 0, y: 0 })),
  };
}

describe('GameInputHandler', () => {
  let handler: GameInputHandler;
  let app: ReturnType<typeof createMockApp>;
  let input: ReturnType<typeof createMockInput>;
  let gameScene: ReturnType<typeof createMockGameScene>;
  let sceneManager: ReturnType<typeof createMockSceneManager>;
  let stateMachine: GameStateMachine;
  let gameHUD: ReturnType<typeof createMockGameHUD>;
  let canvas: ReturnType<typeof createMockCanvas>;

  beforeEach(() => {
    app = createMockApp();
    input = createMockInput();
    gameScene = createMockGameScene();
    sceneManager = createMockSceneManager();
    stateMachine = new GameStateMachine();
    gameHUD = createMockGameHUD();
    canvas = createMockCanvas();

    handler = new GameInputHandler(
      app as any,
      input as any,
      gameScene as any,
      sceneManager as any,
      stateMachine,
      gameHUD as any,
      canvas as any,
    );
  });

  afterEach(() => {
    handler.destroy();
  });

  it('should setup input listeners', () => {
    handler.setup();
    expect(input.onDown).toHaveBeenCalled();
    expect(input.onMove).toHaveBeenCalled();
    expect(input.onUp).toHaveBeenCalled();
  });

  it('should sync input scale on setup', () => {
    handler.setup();
    expect(input.setScale).toHaveBeenCalled();
  });

  it('should show preview on input down', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    expect(gameScene._preview.show).toHaveBeenCalled();
  });

  it('should update preview position on move', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    input._moveCbs[0]({ position: { x: 250, y: 300 }, isDown: true });
    expect(gameScene._preview.updatePosition).toHaveBeenCalledWith(250);
  });

  it('should drop block on input up', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    input._upCbs[0]();
    expect(gameScene.dropBlockWithShrinkCheck).toHaveBeenCalled();
    expect(gameScene._preview.hide).toHaveBeenCalled();
  });

  it('should handle bomb target mode on down', () => {
    gameScene.getBombTargetMode.mockReturnValue(true);
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    expect(gameHUD.showCrosshair).toHaveBeenCalled();
  });

  it('should handle bomb target mode on up', () => {
    gameScene.getBombTargetMode.mockReturnValue(true);
    handler.setup();
    input._upCbs[0]();
    expect(gameScene.usePropAtPosition).toHaveBeenCalled();
    expect(gameHUD.hideCrosshair).toHaveBeenCalled();
  });

  it('should update crosshair on move in bomb target mode', () => {
    gameScene.getBombTargetMode.mockReturnValue(true);
    handler.setup();
    input._moveCbs[0]({ position: { x: 250, y: 350 }, isDown: true });
    expect(gameHUD.updateCrosshair).toHaveBeenCalledWith(250, 350);
  });

  it('should setup keyboard listeners', () => {
    handler.setupKeyboard();
  });

  it('should sync input scale', () => {
    handler.syncInputScale();
    expect(input.setScale).toHaveBeenCalledWith(1, 1);
  });

  it('should destroy and remove keyboard listener', () => {
    handler.setupKeyboard();
    handler.destroy();
  });

  it('should not show preview when cannot drop', () => {
    gameScene._blockSpawner.getCanDrop.mockReturnValue(false);
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    expect(gameScene._preview.show).not.toHaveBeenCalled();
  });

  it('should not show preview when not playing', () => {
    sceneManager.isPlaying.mockReturnValue(false);
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    expect(gameScene._preview.show).not.toHaveBeenCalled();
  });

  it('should not update preview when not down', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    input._moveCbs[0]({ position: { x: 250, y: 300 }, isDown: false });
    expect(gameScene._preview.updatePosition).not.toHaveBeenCalled();
  });

  it('should start cooldown after drop', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    input._upCbs[0]();
    expect(gameScene._blockSpawner.startCooldown).toHaveBeenCalled();
  });

  it('should set next value after drop', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    input._upCbs[0]();
    expect(gameScene._preview.setNextValue).toHaveBeenCalled();
  });

  it('should skip onUp processing when prop button was just clicked', () => {
    gameHUD.consumePropButtonClick.mockReturnValue(true);
    handler.setup();
    input._upCbs[0]();
    expect(gameScene.dropBlockWithShrinkCheck).not.toHaveBeenCalled();
    expect(gameScene.usePropAtPosition).not.toHaveBeenCalled();
  });

  it('should show crosshair in bomb target mode even when cannot drop', () => {
    gameScene.getBombTargetMode.mockReturnValue(true);
    gameScene._blockSpawner.getCanDrop.mockReturnValue(false);
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    expect(gameHUD.showCrosshair).toHaveBeenCalledWith(200, 300);
  });

  it('should not show preview in bomb target mode when cannot drop', () => {
    gameScene._blockSpawner.getCanDrop.mockReturnValue(false);
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    expect(gameScene._preview.show).not.toHaveBeenCalled();
  });

  it('should process bomb target mode onDown before canDrop check', () => {
    gameScene.getBombTargetMode.mockReturnValue(true);
    gameScene._blockSpawner.getCanDrop.mockReturnValue(false);
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    expect(gameHUD.showCrosshair).toHaveBeenCalled();
  });

  it('should not process onUp bomb target mode when prop button just clicked', () => {
    gameScene.getBombTargetMode.mockReturnValue(true);
    gameHUD.consumePropButtonClick.mockReturnValue(true);
    handler.setup();
    input._upCbs[0]();
    expect(gameScene.usePropAtPosition).not.toHaveBeenCalled();
  });

  it('should not show preview when touch starts outside container', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 500, y: 300 }, isDown: true });
    expect(gameScene._preview.show).not.toHaveBeenCalled();
  });

  it('should show preview when touch starts inside container', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    expect(gameScene._preview.show).toHaveBeenCalled();
  });

  it('should clamp preview at edge when dragging outside container', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    expect(gameScene._preview.show).toHaveBeenCalled();
    input._moveCbs[0]({ position: { x: 500, y: 300 }, isDown: true });
    expect(gameScene._preview.updatePosition).toHaveBeenCalledWith(500);
    expect(gameScene._preview.hide).not.toHaveBeenCalled();
  });

  it('should keep preview visible when dragging out and back in', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    expect(gameScene._preview.show).toHaveBeenCalledTimes(1);
    input._moveCbs[0]({ position: { x: 500, y: 300 }, isDown: true });
    expect(gameScene._preview.hide).not.toHaveBeenCalled();
    input._moveCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    expect(gameScene._preview.updatePosition).toHaveBeenCalledWith(200);
    expect(gameScene._preview.show).toHaveBeenCalledTimes(1);
  });

  it('should drop block from edge when released outside container', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    input.getState.mockReturnValue({ position: { x: 500, y: 300 }, isDown: false });
    input._upCbs[0]();
    expect(gameScene.dropBlockWithShrinkCheck).toHaveBeenCalled();
    expect(gameScene._blockSpawner.startCooldown).toHaveBeenCalled();
  });

  it('should drop block when released inside container', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    input.getState.mockReturnValue({ position: { x: 200, y: 300 }, isDown: false });
    input._upCbs[0]();
    expect(gameScene.dropBlockWithShrinkCheck).toHaveBeenCalled();
    expect(gameScene._blockSpawner.startCooldown).toHaveBeenCalled();
  });

  it('should not drop block when touch started outside container even if moved inside', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 500, y: 300 }, isDown: true });
    input._moveCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    input.getState.mockReturnValue({ position: { x: 200, y: 300 }, isDown: false });
    input._upCbs[0]();
    expect(gameScene.dropBlockWithShrinkCheck).not.toHaveBeenCalled();
  });

  it('should respect container offset when checking bounds', () => {
    gameScene.getContainerOffsetX.mockReturnValue(100);
    gameScene.getContainerWidth.mockReturnValue(200);
    handler.setup();
    input._downCbs[0]({ position: { x: 50, y: 300 }, isDown: true });
    expect(gameScene._preview.show).not.toHaveBeenCalled();
    input._downCbs[0]({ position: { x: 150, y: 300 }, isDown: true });
    expect(gameScene._preview.show).toHaveBeenCalled();
  });

  it('should not show preview when touching ground area', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 550 }, isDown: true });
    expect(gameScene._preview.show).not.toHaveBeenCalled();
  });

  it('should not show preview when touching below ground area', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 580 }, isDown: true });
    expect(gameScene._preview.show).not.toHaveBeenCalled();
  });

  it('should show preview when touching above container', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: -10 }, isDown: true });
    expect(gameScene._preview.show).toHaveBeenCalled();
  });

  it('should not drop when touch starts on ground even if moved to valid zone', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 550 }, isDown: true });
    input._moveCbs[0]({ position: { x: 200, y: 300 }, isDown: true });
    input.getState.mockReturnValue({ position: { x: 200, y: 300 }, isDown: false });
    input._upCbs[0]();
    expect(gameScene.dropBlockWithShrinkCheck).not.toHaveBeenCalled();
  });

  it('should keep preview when dragging from valid zone to ground area', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 200 }, isDown: true });
    expect(gameScene._preview.show).toHaveBeenCalled();
    input._moveCbs[0]({ position: { x: 200, y: 560 }, isDown: true });
    expect(gameScene._preview.updatePosition).toHaveBeenCalledWith(200);
    expect(gameScene._preview.hide).not.toHaveBeenCalled();
  });

  it('should still drop when dragging from valid zone to ground area and releasing', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 200 }, isDown: true });
    input.getState.mockReturnValue({ position: { x: 200, y: 560 }, isDown: false });
    input._upCbs[0]();
    expect(gameScene.dropBlockWithShrinkCheck).toHaveBeenCalled();
  });

  it('should not show preview when X is valid but Y is at ground exactly', () => {
    handler.setup();
    input._downCbs[0]({ position: { x: 200, y: 500 }, isDown: true });
    expect(gameScene._preview.show).toHaveBeenCalled();
    input._downCbs[0]({ position: { x: 200, y: 550 }, isDown: true });
    expect(gameScene._preview.show).toHaveBeenCalledTimes(1);
  });
});
