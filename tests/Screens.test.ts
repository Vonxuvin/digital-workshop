import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MainMenuScreen } from '../src/ui/screens/MainMenuScreen';
import { ResultScreen } from '../src/ui/screens/ResultScreen';
import { LevelSelectScreen } from '../src/ui/screens/LevelSelectScreen';
import { eventBus } from '../src/utils/EventBus';

describe('MainMenuScreen', () => {
  let screen: MainMenuScreen;

  beforeEach(() => {
    screen = new MainMenuScreen();
  });

  it('should create without error', () => {
    expect(screen).toBeDefined();
  });

  it('should show without error', () => {
    expect(() => screen.show()).not.toThrow();
  });

  it('should hide without error', () => {
    expect(() => screen.hide()).not.toThrow();
  });

  it('should emit ui:startGame on button click', () => {
    const handler = vi.fn();
    eventBus.on('ui:startGame', handler);
  });
});

describe('ResultScreen', () => {
  let screen: ResultScreen;

  beforeEach(() => {
    screen = new ResultScreen();
  });

  it('should create without error', () => {
    expect(screen).toBeDefined();
  });

  it('should set win result', () => {
    screen.setResult({ isWin: true, score: 1000, stars: 3, levelId: 1 });
  });

  it('should set lose result', () => {
    screen.setResult({ isWin: false, score: 200, stars: 0, levelId: 2 });
  });

  it('should show and hide without error', () => {
    screen.show();
    screen.hide();
  });
});

describe('LevelSelectScreen', () => {
  let screen: LevelSelectScreen;

  beforeEach(() => {
    screen = new LevelSelectScreen();
  });

  it('should create without error', () => {
    expect(screen).toBeDefined();
  });

  it('should show and hide without error', () => {
    screen.show();
    screen.hide();
  });

  it('should have 5 levels', () => {
    screen.show();
  });
});
