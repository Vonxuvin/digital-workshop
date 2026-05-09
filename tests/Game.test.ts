import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Game } from '../src/core/Game';

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
