import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MainMenuScreen } from '../../../src/ui/screens/MainMenuScreen';
import { eventBus } from '../../../src/utils/EventBus';
import { AudioManager } from '../../../src/core/AudioManager';

describe('MainMenuScreen', () => {
  let screen: MainMenuScreen;
  let audioManager: AudioManager;

  beforeEach(() => {
    audioManager = new AudioManager();
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
    screen.show();
    const startButton = (screen as any).startButton;
    if (startButton) {
      startButton.emit('pointerdown');
    }
    expect(handler).toHaveBeenCalled();
    eventBus.off('ui:startGame', handler);
  });

  it('should emit ui:levelSelect on level select button click', () => {
    const handler = vi.fn();
    eventBus.on('ui:levelSelect', handler);
    screen.show();
    const levelSelectButton = (screen as any).levelSelectButton;
    if (levelSelectButton) {
      levelSelectButton.emit('pointerdown');
    }
    expect(handler).toHaveBeenCalled();
    eventBus.off('ui:levelSelect', handler);
  });

  it('should emit ui:settings on settings button click', () => {
    const handler = vi.fn();
    eventBus.on('ui:settings', handler);
    screen.show();
    const settingsButton = (screen as any).settingsButton;
    if (settingsButton) {
      settingsButton.emit('pointerdown');
    }
    expect(handler).toHaveBeenCalled();
    eventBus.off('ui:settings', handler);
  });

  it('should toggle sound on sound button click', () => {
    screen.show();
    const soundToggleButton = (screen as any).soundToggleButton;
    if (soundToggleButton) {
      const initialMuted = audioManager.isCurrentlyMuted();
      soundToggleButton.emit('pointerdown');
      expect(audioManager.isCurrentlyMuted()).toBe(!initialMuted);
    }
  });

  it('should handle button hover effects', () => {
    screen.show();
    const startButton = (screen as any).startButton;
    if (startButton) {
      expect(() => startButton.emit('pointerover')).not.toThrow();
      expect(() => startButton.emit('pointerout')).not.toThrow();
    }
  });

  it('should initialize only once', () => {
    screen.show();
    expect((screen as any).initialized).toBe(true);
    screen.show();
    expect((screen as any).initialized).toBe(true);
  });

  it('should have title text', () => {
    screen.show();
    const titleText = (screen as any).titleText;
    expect(titleText).toBeDefined();
    expect(titleText.text).toBe('数字工坊');
  });

  it('should have version text', () => {
    screen.show();
    const versionText = (screen as any).versionText;
    expect(versionText).toBeDefined();
  });

  it('should have sound icon', () => {
    screen.show();
    const soundIcon = (screen as any).soundIcon;
    expect(soundIcon).toBeDefined();
  });

  it('should handle destroy', () => {
    screen.show();
    expect(() => screen.destroy()).not.toThrow();
  });

  it('should handle multiple show/hide cycles', () => {
    screen.show();
    screen.hide();
    screen.show();
    screen.hide();
  });

  it('should reinitialize on dimension change', () => {
    screen.show(800, 600);
    expect((screen as any).initialized).toBe(true);
    screen.show(1024, 768);
    expect((screen as any).currentScreenWidth).toBe(1024);
    expect((screen as any).currentScreenHeight).toBe(768);
  });

  it('should use nullish coalescing for zero values', () => {
    screen.show(0, 0);
    expect((screen as any).currentScreenWidth).toBe(0);
    expect((screen as any).currentScreenHeight).toBe(0);
  });

  it('should have correct button count after reinitialize', () => {
    screen.show(800, 600);
    const buttons = (screen as any).allButtons;
    expect(buttons.length).toBe(3);
  });

  it('should handle multiple show with same dimensions', () => {
    screen.show(800, 600);
    screen.hide();
    screen.show(800, 600);
    expect((screen as any).initialized).toBe(true);
  });

  it('should update sound icon on toggle', () => {
    screen.show();
    const soundToggleButton = (screen as any).soundToggleButton;
    if (soundToggleButton) {
      soundToggleButton.emit('pointerdown');
      const soundIcon = (screen as any).soundIcon;
      expect(['🔇', '🔊']).toContain(soundIcon.text);
    }
  });

  it('should handle re-initialization on second show', () => {
    screen.show(800, 600);
    expect(() => screen.show(1024, 768)).not.toThrow();
    expect((screen as any).initialized).toBe(true);
  });

  it('should handle show with default dimensions', () => {
    expect(() => screen.show()).not.toThrow();
    expect((screen as any).currentScreenWidth).toBe(800);
    expect((screen as any).currentScreenHeight).toBe(600);
  });

  it('should handle show with custom dimensions', () => {
    screen.show(1024, 768);
    expect((screen as any).currentScreenWidth).toBe(1024);
    expect((screen as any).currentScreenHeight).toBe(768);
  });

  it('should handle show with partial dimensions', () => {
    screen.show(undefined, 700);
    expect((screen as any).currentScreenWidth).toBe(800);
    expect((screen as any).currentScreenHeight).toBe(700);
  });

  it('should handle show with zero dimensions', () => {
    screen.show(0, 0);
    expect((screen as any).currentScreenWidth).toBe(0);
    expect((screen as any).currentScreenHeight).toBe(0);
  });

  it('should handle button pointerover and pointerout', () => {
    screen.show();
    const startButton = (screen as any).startButton;
    if (startButton) {
      expect(() => startButton.emit('pointerover')).not.toThrow();
      expect(() => startButton.emit('pointerout')).not.toThrow();
    }
  });

  it('should handle all buttons hover', () => {
    screen.show();
    const buttons = (screen as any).allButtons || [];
    for (const btn of buttons) {
      expect(() => btn.emit('pointerover')).not.toThrow();
      expect(() => btn.emit('pointerout')).not.toThrow();
    }
  });
});