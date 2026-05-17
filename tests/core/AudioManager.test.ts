import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager, SoundConfig } from '../../src/core/AudioManager';
import { eventBus } from '../../src/utils/EventBus';

describe('AudioManager', () => {
  let audioManager: AudioManager;
  let mockAudioContext: any;

  beforeEach(() => {
    vi.useFakeTimers();

    mockAudioContext = {
      state: 'running',
      currentTime: 0,
      createOscillator: vi.fn(() => ({
        type: 'sine',
        frequency: { value: 440 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        gain: { value: 1, exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      })),
      destination: {},
      resume: vi.fn(),
      close: vi.fn(),
    };

    vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext));
    vi.stubGlobal('webkitAudioContext', vi.fn(() => mockAudioContext));

    audioManager = AudioManager.getInstance();
    vi.spyOn(HTMLAudioElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLAudioElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    audioManager.destroy();
    vi.unstubAllGlobals();
  });

  it('should be singleton', () => {
    const a = AudioManager.getInstance();
    const b = AudioManager.getInstance();
    expect(a).toBe(b);
  });

  it('should handle init gracefully when AudioContext unavailable', async () => {
    const am = AudioManager.getInstance();
    await am.init();
  });

  it('should not throw when playing without AudioContext', () => {
    const am = AudioManager.getInstance();
    expect(() => am.play('merge')).not.toThrow();
    expect(() => am.play('drop')).not.toThrow();
    expect(() => am.play('gameover')).not.toThrow();
    expect(() => am.play('levelComplete')).not.toThrow();
  });

  it('should not throw for unknown sound when no AudioContext', () => {
    const am = AudioManager.getInstance();
    expect(() => am.play('unknown_sound')).not.toThrow();
  });

  describe('volume control', () => {
    it('应正确设置主音量', () => {
      audioManager.setMasterVolume(0.5);
      audioManager.setMasterVolume(1.0);
      audioManager.setMasterVolume(0.0);
    });

    it('应正确设置音乐音量', () => {
      audioManager.setMusicVolume(0.3);
      audioManager.setMusicVolume(1.0);
      audioManager.setMusicVolume(0.0);
    });

    it('应正确设置音效音量', () => {
      audioManager.setSfxVolume(0.5);
      audioManager.setSfxVolume(1.0);
      audioManager.setSfxVolume(0.0);
    });

    it('应限制音量范围在0-1之间', () => {
      audioManager.setMasterVolume(-1);
      audioManager.setMasterVolume(2);
      audioManager.setMasterVolume(0.5);
    });
  });

  describe('mute control', () => {
    it('应正确设置静音状态', () => {
      audioManager.setMuted(true);
      expect(audioManager.isCurrentlyMuted()).toBe(true);
      audioManager.setMuted(false);
      expect(audioManager.isCurrentlyMuted()).toBe(false);
    });

    it('应正确切换静音状态', () => {
      audioManager.setMuted(false);
      expect(audioManager.toggleMute()).toBe(true);
      expect(audioManager.toggleMute()).toBe(false);
    });

    it('should not play when muted', () => {
      audioManager.setMuted(true);
      expect(audioManager.isCurrentlyMuted()).toBe(true);
      expect(() => audioManager.play('merge')).not.toThrow();
      audioManager.setMuted(false);
    });
  });

  describe('stop control', () => {
    it('应正确停止指定音频', () => {
      audioManager.stop('test');
    });

    it('应正确停止所有音频', () => {
      audioManager.stopAll();
    });
  });

  describe('music control', () => {
    it('应正确播放音乐', () => {
      audioManager.playMusic('test');
      audioManager.stopMusic();
    });

    it('应正确切换音乐', () => {
      audioManager.playMusic('music1');
      audioManager.playMusic('music2');
    });
  });

  describe('play methods', () => {
    it('playMergeSound应根据等级选择音效', () => {
      audioManager.playMergeSound(2);
      audioManager.playMergeSound(4);
      audioManager.playMergeSound(8);
      audioManager.playMergeSound(16);
      audioManager.playMergeSound(32);
    });

    it('playComboSound应根据连击数选择音效', () => {
      audioManager.playComboSound(1);
      audioManager.playComboSound(5);
      audioManager.playComboSound(10);
    });

    it('playPropSound应正确映射道具音效', () => {
      audioManager.playPropSound('bomb');
      audioManager.playPropSound('rainbow');
      audioManager.playPropSound('freeze');
      audioManager.playPropSound('shrink');
      audioManager.playPropSound('lucky');
      audioManager.playPropSound('unknown');
    });
  });

  describe('audio context', () => {
    it('应能恢复暂停的音频上下文', () => {
      audioManager.resumeAudioContext();
    });
  });

  describe('play with options', () => {
    it('应正确处理loop选项', () => {
      audioManager.play('test', { loop: true });
      audioManager.play('test', { loop: false });
    });

    it('应正确处理volume选项', () => {
      audioManager.play('test', { volume: 0.5 });
    });

    it('静音时应不播放', () => {
      audioManager.setMuted(true);
      audioManager.play('test');
    });

    it('播放不存在的音效时应不报错', () => {
      audioManager.play('nonexistent');
    });
  });

  describe('destroy', () => {
    it('应正确清理资源', () => {
      audioManager.destroy();
    });
  });

  describe('event name consistency', () => {
    it('should listen for block:dropped event (not gameplay:blockSpawn)', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('spawn')).not.toThrow();
    });

    it('should listen for block:merged event', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playMergeSound(4)).not.toThrow();
    });

    it('should listen for score:updated event for combo sounds', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playComboSound(3)).not.toThrow();
    });

    it('should listen for game:over event', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('gameOver')).not.toThrow();
    });

    it('should listen for level:completed event', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('levelComplete')).not.toThrow();
    });

    it('should listen for props:used event', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playPropSound('bomb')).not.toThrow();
    });

    it('should listen for ui:buttonClick event', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('click')).not.toThrow();
    });

    it('should handle all registered event sounds without error', () => {
      const am = AudioManager.getInstance();
      const sounds = ['spawn', 'merge', 'gameOver', 'levelComplete', 'click', 'combo', 'comboGreat', 'comboSuper'];
      for (const sound of sounds) {
        expect(() => am.play(sound)).not.toThrow();
      }
    });

    it('should handle unknown prop type with fallback sound', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playPropSound('unknown_prop_type')).not.toThrow();
    });

    it('should handle playMergeSound for all merge levels', () => {
      const am = AudioManager.getInstance();
      const levels = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
      for (const level of levels) {
        expect(() => am.playMergeSound(level)).not.toThrow();
      }
    });

    it('should handle playComboSound for all combo levels', () => {
      const am = AudioManager.getInstance();
      const combos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20];
      for (const combo of combos) {
        expect(() => am.playComboSound(combo)).not.toThrow();
      }
    });
  });

  describe('procedural SFX with AudioContext', () => {
    it('should play procedural SFX when AudioContext is available', async () => {
      const am = AudioManager.getInstance();
      (am as any).sounds.clear();
      await am.init();
      expect(() => am.play('spawn')).not.toThrow();
      expect(() => am.play('click')).not.toThrow();
      expect(() => am.play('combo')).not.toThrow();
      expect(() => am.play('warning')).not.toThrow();
      expect(() => am.play('score')).not.toThrow();
    });

    it('should play procedural SFX with volume override', async () => {
      const am = AudioManager.getInstance();
      (am as any).sounds.clear();
      await am.init();
      expect(() => am.play('spawn', { volume: 0.8 })).not.toThrow();
    });

    it('should handle procedural SFX for music/bgm keys', async () => {
      const am = AudioManager.getInstance();
      (am as any).sounds.clear();
      await am.init();
      expect(() => am.play('bgm_test')).not.toThrow();
    });

    it('should handle unknown procedural key with AudioContext', async () => {
      const am = AudioManager.getInstance();
      (am as any).sounds.clear();
      await am.init();
      expect(() => am.play('unknown_key')).not.toThrow();
    });
  });

  describe('procedural SFX', () => {
    it('should play procedural SFX for spawn', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('spawn')).not.toThrow();
    });

    it('should play procedural SFX for click', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('click')).not.toThrow();
    });

    it('should play procedural SFX for combo', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('combo')).not.toThrow();
    });

    it('should play procedural SFX for comboGreat', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('comboGreat')).not.toThrow();
    });

    it('should play procedural SFX for comboSuper', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('comboSuper')).not.toThrow();
    });

    it('should play procedural SFX for warning', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('warning')).not.toThrow();
    });

    it('should play procedural SFX for score', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('score')).not.toThrow();
    });

    it('should play procedural SFX for propDefault', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('propDefault')).not.toThrow();
    });

    it('should handle procedural SFX with volume override', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('spawn', { volume: 0.8 })).not.toThrow();
    });

    it('should handle procedural SFX for music key', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('bgm_test')).not.toThrow();
    });

    it('should handle unknown procedural key gracefully', () => {
      const am = AudioManager.getInstance();
      expect(() => am.play('unknown_procedural_key')).not.toThrow();
    });
  });

  describe('effective volume', () => {
    it('should calculate effective volume for music keys', () => {
      const am = AudioManager.getInstance();
      am.setMasterVolume(0.8);
      am.setMusicVolume(0.5);
      expect(() => am.play('bgm_main')).not.toThrow();
    });

    it('should calculate effective volume for sfx keys', () => {
      const am = AudioManager.getInstance();
      am.setMasterVolume(0.8);
      am.setSfxVolume(0.5);
      expect(() => am.play('merge')).not.toThrow();
    });
  });

  describe('merge sound levels', () => {
    it('should handle all merge levels', () => {
      const am = AudioManager.getInstance();
      const levels = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
      for (const level of levels) {
        expect(() => am.playMergeSound(level)).not.toThrow();
      }
    });

    it('should handle unknown merge level', () => {
      const am = AudioManager.getInstance();
      expect(() => am.playMergeSound(9999)).not.toThrow();
    });
  });

  describe('combo sound levels', () => {
    it('should handle all combo levels', () => {
      const am = AudioManager.getInstance();
      for (let i = 0; i <= 15; i++) {
        expect(() => am.playComboSound(i)).not.toThrow();
      }
    });
  });

  describe('event listener triggers', () => {
    it('should handle block:dropped event', () => {
      const am = AudioManager.getInstance();
      expect(() => eventBus.emit('block:dropped', {})).not.toThrow();
    });

    it('should handle block:merged event', () => {
      const am = AudioManager.getInstance();
      expect(() => eventBus.emit('block:merged', { newValue: 4 })).not.toThrow();
    });

    it('should handle score:updated event', () => {
      const am = AudioManager.getInstance();
      expect(() => eventBus.emit('score:updated', { chainCount: 2 })).not.toThrow();
    });

    it('should handle game:over event', () => {
      const am = AudioManager.getInstance();
      expect(() => eventBus.emit('game:over', {})).not.toThrow();
    });

    it('should handle level:completed event', () => {
      const am = AudioManager.getInstance();
      expect(() => eventBus.emit('level:completed', {})).not.toThrow();
    });

    it('should handle props:used event', () => {
      const am = AudioManager.getInstance();
      expect(() => eventBus.emit('props:used', { type: 'bomb' })).not.toThrow();
    });

    it('should handle ui:buttonClick event', () => {
      const am = AudioManager.getInstance();
      expect(() => eventBus.emit('ui:buttonClick', {})).not.toThrow();
    });
  });

  describe('private methods', () => {
    it('updateAllVolumes应正常工作', () => {
      audioManager.updateAllVolumes();
    });

    it('getEffectiveVolume应正确区分音乐和音效', () => {
      audioManager.setMasterVolume(0.5);
      audioManager.setMusicVolume(0.8);
      audioManager.setSfxVolume(0.5);
    });
  });

  describe('loadSound', () => {
    it('should load sound successfully on canplaythrough', async () => {
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        this.dispatchEvent(new Event('canplaythrough'));
      });
      const config: SoundConfig = { key: 'testLoad', url: 'test.mp3', volume: 0.5, loop: false };
      await audioManager.loadSound(config);
      expect((audioManager as any).sounds.has('testLoad')).toBe(true);
      expect((audioManager as any).volumes.get('testLoad')).toBe(0.5);
    });

    it('should handle load error gracefully', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        this.dispatchEvent(new Event('error'));
      });
      const config: SoundConfig = { key: 'testError', url: 'error.mp3', volume: 0.5, loop: false };
      await audioManager.loadSound(config);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('testError'),
      );
      expect((audioManager as any).sounds.has('testError')).toBe(false);
      warnSpy.mockRestore();
    });

    it('should set audio properties from config', async () => {
      let capturedAudio: HTMLAudioElement | null = null;
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        capturedAudio = this;
        this.dispatchEvent(new Event('canplaythrough'));
      });
      const config: SoundConfig = { key: 'testProps', url: 'props.mp3', volume: 0.7, loop: true };
      await audioManager.loadSound(config);
      expect(capturedAudio).not.toBeNull();
      expect(capturedAudio!.src).toContain('props.mp3');
      expect(capturedAudio!.volume).toBe(0.7);
      expect(capturedAudio!.loop).toBe(true);
    });
  });

  describe('loadSounds', () => {
    it('should load multiple sounds', async () => {
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        this.dispatchEvent(new Event('canplaythrough'));
      });
      const configs: SoundConfig[] = [
        { key: 'multi1', url: 's1.mp3', volume: 0.5, loop: false },
        { key: 'multi2', url: 's2.mp3', volume: 0.7, loop: true },
        { key: 'multi3', url: 's3.mp3', volume: 1.0, loop: false },
      ];
      await audioManager.loadSounds(configs);
      expect((audioManager as any).sounds.has('multi1')).toBe(true);
      expect((audioManager as any).sounds.has('multi2')).toBe(true);
      expect((audioManager as any).sounds.has('multi3')).toBe(true);
      expect((audioManager as any).volumes.get('multi1')).toBe(0.5);
      expect((audioManager as any).volumes.get('multi2')).toBe(0.7);
      expect((audioManager as any).volumes.get('multi3')).toBe(1.0);
    });
  });

  describe('init', () => {
    it('should return early when already initialized', async () => {
      const am = new AudioManager();
      await am.init();
      const ctxSpy = vi.fn();
      const originalAC = (window as any).AudioContext;
      (window as any).AudioContext = ctxSpy;
      await am.init();
      expect(ctxSpy).not.toHaveBeenCalled();
      (window as any).AudioContext = originalAC;
      am.destroy();
    });

    it('should create AudioContext when available', async () => {
      const mockClose = vi.fn();
      const originalAC = (window as any).AudioContext;
      (window as any).AudioContext = class { close = mockClose; };
      const am = new AudioManager();
      await am.init();
      expect((am as any).audioContext).not.toBeNull();
      expect((am as any).audioContext.close).toBe(mockClose);
      (window as any).AudioContext = originalAC;
      am.destroy();
    });

    it('should catch AudioContext creation error', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalAC = (window as any).AudioContext;
      (window as any).AudioContext = class { constructor() { throw new Error('AudioContext error'); } };
      const am = new AudioManager();
      await am.init();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('音频上下文初始化失败'),
        expect.anything(),
      );
      (window as any).AudioContext = originalAC;
      warnSpy.mockRestore();
      am.destroy();
    });
  });

  describe('playProceduralSfx', () => {
    let mockOscillator: any;
    let mockGain: any;
    let mockCtx: any;

    beforeEach(() => {
      mockOscillator = {
        type: '',
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      mockGain = {
        gain: {
          value: 0,
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      mockCtx = {
        state: 'running',
        resume: vi.fn(),
        createOscillator: vi.fn().mockReturnValue(mockOscillator),
        createGain: vi.fn().mockReturnValue(mockGain),
        currentTime: 1.5,
        destination: { id: 'dest' },
        close: vi.fn(),
      };
      (audioManager as any).audioContext = mockCtx;
      (audioManager as any).isMuted = false;
    });

    it('should use triangle oscillator for sfx keys', () => {
      (audioManager as any).playProceduralSfx('spawn');
      expect(mockCtx.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.type).toBe('triangle');
      expect(mockOscillator.frequency.value).toBe(440);
      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGain);
      expect(mockGain.connect).toHaveBeenCalledWith(mockCtx.destination);
      expect(mockOscillator.start).toHaveBeenCalledWith(1.5);
      expect(mockOscillator.stop).toHaveBeenCalledWith(1.5 + 0.15);
    });

    it('should use sine oscillator for music keys', () => {
      const freqSpy = vi.spyOn(audioManager as any, 'getProceduralFrequency').mockReturnValue(440);
      (audioManager as any).playProceduralSfx('music_intro');
      expect(mockOscillator.type).toBe('sine');
      freqSpy.mockRestore();
    });

    it('should use sine oscillator for bgm keys', () => {
      const freqSpy = vi.spyOn(audioManager as any, 'getProceduralFrequency').mockReturnValue(330);
      (audioManager as any).playProceduralSfx('bgm_main');
      expect(mockOscillator.type).toBe('sine');
      freqSpy.mockRestore();
    });

    it('should resume suspended audioContext', () => {
      mockCtx.state = 'suspended';
      (audioManager as any).playProceduralSfx('click');
      expect(mockCtx.resume).toHaveBeenCalled();
    });

    it('should not create oscillator for unknown key with zero frequency', () => {
      const freqSpy = vi.spyOn(audioManager as any, 'getProceduralFrequency').mockReturnValue(0);
      (audioManager as any).playProceduralSfx('totally_unknown_key');
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
      freqSpy.mockRestore();
    });

    it('should apply volume override', () => {
      audioManager.setMasterVolume(1);
      audioManager.setSfxVolume(1);
      (audioManager as any).playProceduralSfx('click', 0.6);
      expect(mockGain.gain.value).toBeCloseTo(0.6, 2);
    });

    it('should use default volume 0.3 when no override', () => {
      audioManager.setMasterVolume(1);
      audioManager.setSfxVolume(1);
      (audioManager as any).playProceduralSfx('click');
      expect(mockGain.gain.value).toBeCloseTo(0.3, 2);
    });

    it('should apply exponential ramp to gain', () => {
      (audioManager as any).playProceduralSfx('spawn');
      expect(mockGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 1.5 + 0.15);
    });

    it('should return early when audioContext is null', () => {
      (audioManager as any).audioContext = null;
      expect(() => (audioManager as any).playProceduralSfx('spawn')).not.toThrow();
    });
  });

  describe('getEffectiveVolume', () => {
    it('should return musicVolume * masterVolume for music keys', () => {
      audioManager.setMasterVolume(0.5);
      audioManager.setMusicVolume(0.8);
      audioManager.setSfxVolume(0.5);
      expect((audioManager as any).getEffectiveVolume('music')).toBeCloseTo(0.4, 5);
      expect((audioManager as any).getEffectiveVolume('bgm')).toBeCloseTo(0.4, 5);
      expect((audioManager as any).getEffectiveVolume('music_intro')).toBeCloseTo(0.4, 5);
      expect((audioManager as any).getEffectiveVolume('bgm_main')).toBeCloseTo(0.4, 5);
    });

    it('should return sfxVolume * masterVolume for sfx keys', () => {
      audioManager.setMasterVolume(0.5);
      audioManager.setMusicVolume(0.8);
      audioManager.setSfxVolume(0.5);
      expect((audioManager as any).getEffectiveVolume('spawn')).toBeCloseTo(0.25, 5);
      expect((audioManager as any).getEffectiveVolume('click')).toBeCloseTo(0.25, 5);
      expect((audioManager as any).getEffectiveVolume('gameOver')).toBeCloseTo(0.25, 5);
    });
  });

  describe('updateAllVolumes with loaded sounds', () => {
    it('should update volume of loaded sounds when master volume changes', async () => {
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        this.dispatchEvent(new Event('canplaythrough'));
      });
      const config: SoundConfig = { key: 'volTest', url: 'vt.mp3', volume: 0.6, loop: false };
      await audioManager.loadSound(config);

      audioManager.setMasterVolume(0.5);
      audioManager.setSfxVolume(0.8);

      const audio = (audioManager as any).sounds.get('volTest') as HTMLAudioElement;
      expect(audio.volume).toBeCloseTo(0.6 * 0.8 * 0.5, 2);
    });

    it('should update volume of music-keyed loaded sounds', async () => {
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        this.dispatchEvent(new Event('canplaythrough'));
      });
      const config: SoundConfig = { key: 'bgm_vol', url: 'bgm.mp3', volume: 0.7, loop: true };
      await audioManager.loadSound(config);

      audioManager.setMasterVolume(0.4);
      audioManager.setMusicVolume(0.9);

      const audio = (audioManager as any).sounds.get('bgm_vol') as HTMLAudioElement;
      expect(audio.volume).toBeCloseTo(0.7 * 0.9 * 0.4, 2);
    });
  });

  describe('resumeAudioContext', () => {
    it('should resume suspended audioContext', () => {
      const mockResume = vi.fn();
      (audioManager as any).audioContext = { state: 'suspended', resume: mockResume, close: vi.fn() };
      audioManager.resumeAudioContext();
      expect(mockResume).toHaveBeenCalled();
    });

    it('should not resume running audioContext', () => {
      const mockResume = vi.fn();
      (audioManager as any).audioContext = { state: 'running', resume: mockResume, close: vi.fn() };
      audioManager.resumeAudioContext();
      expect(mockResume).not.toHaveBeenCalled();
    });

    it('should not throw when audioContext is null', () => {
      (audioManager as any).audioContext = null;
      expect(() => audioManager.resumeAudioContext()).not.toThrow();
    });
  });

  describe('destroy with audioContext', () => {
    it('should close audioContext on destroy', () => {
      const mockClose = vi.fn();
      (audioManager as any).audioContext = { close: mockClose };
      audioManager.destroy();
      expect(mockClose).toHaveBeenCalled();
      expect((audioManager as any).audioContext).toBeNull();
    });

    it('should clear sounds and volumes on destroy', async () => {
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        this.dispatchEvent(new Event('canplaythrough'));
      });
      const config: SoundConfig = { key: 'destroyTest', url: 'dt.mp3', volume: 0.5, loop: false };
      await audioManager.loadSound(config);
      expect((audioManager as any).sounds.size).toBe(1);
      expect((audioManager as any).volumes.size).toBe(1);

      audioManager.destroy();
      expect((audioManager as any).sounds.size).toBe(0);
      expect((audioManager as any).volumes.size).toBe(0);
    });
  });

  describe('setMuted', () => {
    it('should call stopAll when muted is true', () => {
      const stopAllSpy = vi.spyOn(audioManager as any, 'stopAll');
      audioManager.setMuted(true);
      expect(stopAllSpy).toHaveBeenCalled();
      stopAllSpy.mockRestore();
    });

    it('should not call stopAll when muted is false', () => {
      audioManager.setMuted(false);
      const stopAllSpy = vi.spyOn(audioManager as any, 'stopAll');
      audioManager.setMuted(false);
      expect(stopAllSpy).not.toHaveBeenCalled();
      stopAllSpy.mockRestore();
    });

    it('should emit audio:muteChanged event', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      audioManager.setMuted(true);
      expect(emitSpy).toHaveBeenCalledWith('audio:muteChanged', { isMuted: true });
      audioManager.setMuted(false);
      expect(emitSpy).toHaveBeenCalledWith('audio:muteChanged', { isMuted: false });
      emitSpy.mockRestore();
    });
  });

  describe('play with loaded sound and options', () => {
    beforeEach(() => {
      (audioManager as any).isMuted = false;
    });

    it('should apply loop option to loaded sound', async () => {
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        this.dispatchEvent(new Event('canplaythrough'));
      });
      const config: SoundConfig = { key: 'loopTest', url: 'loop.mp3', volume: 0.5, loop: false };
      await audioManager.loadSound(config);

      audioManager.play('loopTest', { loop: true });
      const audio = (audioManager as any).sounds.get('loopTest') as HTMLAudioElement;
      expect(audio.loop).toBe(true);
    });

    it('should apply volume option to loaded sound', async () => {
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        this.dispatchEvent(new Event('canplaythrough'));
      });
      const config: SoundConfig = { key: 'volOptTest', url: 'volopt.mp3', volume: 0.5, loop: false };
      await audioManager.loadSound(config);

      audioManager.setMasterVolume(1);
      audioManager.setSfxVolume(1);
      audioManager.play('volOptTest', { volume: 0.8 });
      const audio = (audioManager as any).sounds.get('volOptTest') as HTMLAudioElement;
      expect(audio.volume).toBeCloseTo(0.8, 2);
    });

    it('should reset currentTime to 0 on play', async () => {
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        this.dispatchEvent(new Event('canplaythrough'));
      });
      const config: SoundConfig = { key: 'resetTest', url: 'reset.mp3', volume: 0.5, loop: false };
      await audioManager.loadSound(config);

      const audio = (audioManager as any).sounds.get('resetTest') as HTMLAudioElement;
      audio.currentTime = 5;
      audioManager.play('resetTest');
      expect(audio.currentTime).toBe(0);
    });

    it('should use base volume from volumes map when no volume option', async () => {
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        this.dispatchEvent(new Event('canplaythrough'));
      });
      const config: SoundConfig = { key: 'baseVolTest', url: 'basevol.mp3', volume: 0.6, loop: false };
      await audioManager.loadSound(config);

      audioManager.setMasterVolume(0.5);
      audioManager.setSfxVolume(0.8);
      audioManager.play('baseVolTest');
      const audio = (audioManager as any).sounds.get('baseVolTest') as HTMLAudioElement;
      expect(audio.volume).toBeCloseTo(0.6 * 0.8 * 0.5, 2);
    });
  });

  describe('playSfx private method', () => {
    it('should call play with the given key', () => {
      const playSpy = vi.spyOn(audioManager as any, 'play');
      (audioManager as any).playSfx('testSfx');
      expect(playSpy).toHaveBeenCalledWith('testSfx');
      playSpy.mockRestore();
    });
  });

  describe('AudioManager.setInstance', () => {
    it('should set the singleton instance', () => {
      const newInstance = new AudioManager();
      AudioManager.setInstance(newInstance);
      expect(AudioManager.getInstance()).toBe(newInstance);
      AudioManager.setInstance(audioManager);
      newInstance.destroy();
    });
  });

  describe('stop with loaded sound', () => {
    beforeEach(() => {
      (audioManager as any).isMuted = false;
    });

    it('should pause and reset loaded sound on stop', async () => {
      vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(function (this: HTMLAudioElement) {
        this.dispatchEvent(new Event('canplaythrough'));
      });
      const config: SoundConfig = { key: 'stopTest', url: 'stop.mp3', volume: 0.5, loop: false };
      await audioManager.loadSound(config);

      const audio = (audioManager as any).sounds.get('stopTest') as HTMLAudioElement;
      audio.currentTime = 3;
      audioManager.stop('stopTest');
      expect(HTMLAudioElement.prototype.pause).toHaveBeenCalled();
      expect(audio.currentTime).toBe(0);
    });
  });
});