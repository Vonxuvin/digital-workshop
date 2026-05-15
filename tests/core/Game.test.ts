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
        ticker: { add: vi.fn(), deltaMS: 16.67 },
        init: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn(),
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

import { Game } from '../../src/core/Game';

describe('Game', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    document.body.removeChild(canvas);
  });

  it('should create Game instance', () => {
    const game = new Game(canvas);
    expect(game).toBeDefined();
    expect(game.getApp()).toBeDefined();
  });

  it('should initialize without errors', async () => {
    const game = new Game(canvas);
    await expect(game.init()).resolves.not.toThrow();
  });

  it('should have correct initial state', () => {
    const game = new Game(canvas);
    expect(game.getApp().stage.children.length).toBe(0);
  });
});
