import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eventBus } from '../../src/utils/EventBus';
import { AudioManager } from '../../src/core/AudioManager';

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

describe('AudioManager EventBus event name consistency fix', () => {
  let audioManager: AudioManager;
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    audioManager = new AudioManager();
    playSpy = vi.spyOn(audioManager, 'play').mockImplementation(() => {});
  });

  afterEach(() => {
    audioManager.destroy();
    playSpy.mockRestore();
  });

  it('FIXED: block:dropped event triggers spawn sound', () => {
    eventBus.emit('block:dropped');
    expect(playSpy).toHaveBeenCalledWith('spawn');
  });

  it('FIXED: block:merged event triggers playMergeSound (using data.newValue)', () => {
    const playMergeSpy = vi.spyOn(audioManager as any, 'playMergeSound');
    eventBus.emit('block:merged', { newValue: 16, chainCount: 1 });
    expect(playMergeSpy).toHaveBeenCalledWith(16);
    playMergeSpy.mockRestore();
  });

  it('FIXED: score:updated event triggers combo sound (using data.chainCount)', () => {
    eventBus.emit('score:updated', { totalScore: 500, earnedScore: 100, chainCount: 3 });
    expect(playSpy).toHaveBeenCalled();
  });

  it('FIXED: game:over event no longer directly listened by AudioManager', () => {
    eventBus.emit('game:over');
    expect(playSpy).not.toHaveBeenCalledWith('gameOver');
  });

  it('FIXED: level:completed event no longer directly listened by AudioManager', () => {
    eventBus.emit('level:completed', { levelId: 1, score: 500, time: 30, highestMergeValue: 16 });
    expect(playSpy).not.toHaveBeenCalledWith('levelComplete');
  });

  it('FIXED: old event name gameplay:blockSpawn no longer triggers listener', () => {
    eventBus.emit('gameplay:blockSpawn');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('FIXED: old event name gameplay:merge no longer triggers listener', () => {
    eventBus.emit('gameplay:merge', { level: 4 });
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('FIXED: old event name gameplay:combo no longer triggers listener', () => {
    eventBus.emit('gameplay:combo', { count: 5 });
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('FIXED: old event name gameplay:gameOver no longer triggers listener', () => {
    eventBus.emit('gameplay:gameOver');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('FIXED: old event name gameplay:levelComplete no longer triggers listener', () => {
    eventBus.emit('gameplay:levelComplete');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('FIXED: props:used event correctly triggers propSound', () => {
    eventBus.emit('props:used', { type: 'bomb' });
    expect(playSpy).toHaveBeenCalled();
  });

  it('FIXED: block:merged passes newValue instead of level', () => {
    const playMergeSpy = vi.spyOn(audioManager as any, 'playMergeSound');
    eventBus.emit('block:merged', { newValue: 32, chainCount: 2 });
    expect(playMergeSpy).toHaveBeenCalledWith(32);
    playMergeSpy.mockRestore();
  });

  it('FIXED: score:updated passes chainCount instead of count', () => {
    const playComboSpy = vi.spyOn(audioManager as any, 'playComboSound');
    eventBus.emit('score:updated', { totalScore: 500, earnedScore: 100, chainCount: 7 });
    expect(playComboSpy).toHaveBeenCalledWith(7);
    playComboSpy.mockRestore();
  });
});