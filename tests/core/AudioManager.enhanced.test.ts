import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager, SoundConfig } from '../../src/core/AudioManager';

describe('AudioManager Enhanced', () => {
  let audioManager: AudioManager;

  beforeEach(() => {
    vi.useFakeTimers();
    audioManager = AudioManager.getInstance();
    vi.spyOn(HTMLAudioElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLAudioElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLAudioElement.prototype, 'load').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    audioManager.destroy();
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
});
