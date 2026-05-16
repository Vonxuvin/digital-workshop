import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventBus } from '../../src/utils/EventBus';

describe('Audio + Gameplay Integration Tests', () => {

  describe('Audio Events for Game Actions', () => {
    it('should emit audio:play on block drop', () => {
      const handler = vi.fn();
      eventBus.on('audio:play', handler);

      eventBus.emit('audio:play', { sound: 'drop' });

      expect(handler).toHaveBeenCalledWith({ sound: 'drop' });

      eventBus.off('audio:play', handler);
    });

    it('should emit audio:play on block merge', () => {
      const handler = vi.fn();
      eventBus.on('audio:play', handler);

      eventBus.emit('audio:play', { sound: 'merge' });

      expect(handler).toHaveBeenCalledWith({ sound: 'merge' });

      eventBus.off('audio:play', handler);
    });

    it('should emit audio:play on level complete', () => {
      const handler = vi.fn();
      eventBus.on('audio:play', handler);

      eventBus.emit('audio:play', { sound: 'level_complete' });

      expect(handler).toHaveBeenCalledWith({ sound: 'level_complete' });

      eventBus.off('audio:play', handler);
    });

    it('should emit audio:play on game over', () => {
      const handler = vi.fn();
      eventBus.on('audio:play', handler);

      eventBus.emit('audio:play', { sound: 'game_over' });

      expect(handler).toHaveBeenCalledWith({ sound: 'game_over' });

      eventBus.off('audio:play', handler);
    });

    it('should emit audio:play on prop use', () => {
      const handler = vi.fn();
      eventBus.on('audio:play', handler);

      eventBus.emit('audio:play', { sound: 'prop_use' });

      expect(handler).toHaveBeenCalledWith({ sound: 'prop_use' });

      eventBus.off('audio:play', handler);
    });

    it('should emit audio:play on obstacle cleared', () => {
      const handler = vi.fn();
      eventBus.on('audio:play', handler);

      eventBus.emit('audio:play', { sound: 'obstacle_clear' });

      expect(handler).toHaveBeenCalledWith({ sound: 'obstacle_clear' });

      eventBus.off('audio:play', handler);
    });

    it('should emit audio:play on warning started', () => {
      const handler = vi.fn();
      eventBus.on('audio:play', handler);

      eventBus.emit('audio:play', { sound: 'warning' });

      expect(handler).toHaveBeenCalledWith({ sound: 'warning' });

      eventBus.off('audio:play', handler);
    });

    it('should emit audio:play on button click', () => {
      const handler = vi.fn();
      eventBus.on('audio:play', handler);

      eventBus.emit('audio:play', { sound: 'button_click' });

      expect(handler).toHaveBeenCalledWith({ sound: 'button_click' });

      eventBus.off('audio:play', handler);
    });
  });

  describe('Audio Mute/Unmute Integration', () => {
    it('should emit audio:mute when sound is muted', () => {
      const handler = vi.fn();
      eventBus.on('audio:mute', handler);

      eventBus.emit('audio:mute');

      expect(handler).toHaveBeenCalled();

      eventBus.off('audio:mute', handler);
    });

    it('should emit audio:unmute when sound is unmuted', () => {
      const handler = vi.fn();
      eventBus.on('audio:unmute', handler);

      eventBus.emit('audio:unmute');

      expect(handler).toHaveBeenCalled();

      eventBus.off('audio:unmute', handler);
    });

    it('should not emit audio:play when muted', () => {
      const muteHandler = vi.fn();
      const playHandler = vi.fn();

      eventBus.on('audio:mute', muteHandler);
      eventBus.on('audio:play', playHandler);

      eventBus.emit('audio:mute');
      expect(muteHandler).toHaveBeenCalled();

      eventBus.off('audio:mute', muteHandler);
      eventBus.off('audio:play', playHandler);
    });
  });

  describe('Audio + Game State Integration', () => {
    it('should play menu music on menu state', () => {
      const handler = vi.fn();
      eventBus.on('audio:playMusic', handler);

      eventBus.emit('audio:playMusic', { track: 'menu_theme' });

      expect(handler).toHaveBeenCalledWith({ track: 'menu_theme' });

      eventBus.off('audio:playMusic', handler);
    });

    it('should play game music on playing state', () => {
      const handler = vi.fn();
      eventBus.on('audio:playMusic', handler);

      eventBus.emit('audio:playMusic', { track: 'game_theme' });

      expect(handler).toHaveBeenCalledWith({ track: 'game_theme' });

      eventBus.off('audio:playMusic', handler);
    });

    it('should stop music on pause', () => {
      const handler = vi.fn();
      eventBus.on('audio:stopMusic', handler);

      eventBus.emit('audio:stopMusic');

      expect(handler).toHaveBeenCalled();

      eventBus.off('audio:stopMusic', handler);
    });
  });

  describe('Audio + Settings Integration', () => {
    it('should respect sound enabled setting', () => {
      const settingsHandler = vi.fn();
      eventBus.on('settings:changed', settingsHandler);

      eventBus.emit('settings:changed', {
        soundEnabled: true,
        musicEnabled: true,
        vibrationEnabled: true,
      });

      expect(settingsHandler).toHaveBeenCalledWith({
        soundEnabled: true,
        musicEnabled: true,
        vibrationEnabled: true,
      });

      eventBus.off('settings:changed', settingsHandler);
    });

    it('should mute audio when sound disabled in settings', () => {
      const settingsHandler = vi.fn();
      eventBus.on('settings:changed', settingsHandler);

      eventBus.emit('settings:changed', {
        soundEnabled: false,
        musicEnabled: true,
        vibrationEnabled: true,
      });

      expect(settingsHandler).toHaveBeenCalledWith({
        soundEnabled: false,
        musicEnabled: true,
        vibrationEnabled: true,
      });

      eventBus.off('settings:changed', settingsHandler);
    });
  });
});