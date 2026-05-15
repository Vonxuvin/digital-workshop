import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MainMenuScreen } from '../../../src/ui/screens/MainMenuScreen';
import { eventBus } from '../../../src/utils/EventBus';
import { AudioManager } from '../../../src/core/AudioManager';

describe('MainMenuScreen', () => {
  let screen: MainMenuScreen;

  beforeEach(() => {
    const audioManager = new AudioManager();
    screen = new MainMenuScreen(audioManager);
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