import { logger } from '../utils/Logger';
import { eventBus, GameEvents } from '../utils/EventBus';

export interface SoundConfig {
  key: string;
  url: string;
  volume: number;
  loop: boolean;
}

export class AudioManager {
  private static instance: AudioManager | null = null;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private volumes: Map<string, number> = new Map();
  private masterVolume: number = 1;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.8;
  private isMuted: boolean = false;
  private currentMusic: string | null = null;
  private initialized: boolean = false;

  constructor() {
    this.setupEventListeners();
  }

  static setInstance(instance: AudioManager): void {
    AudioManager.instance = instance;
  }

  /** @deprecated 使用依赖注入代替，保留向后兼容 */
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private setupEventListeners(): void {
    eventBus.on(GameEvents.BLOCK_DROPPED, () => this.playSfx('spawn'));
    eventBus.on(GameEvents.BLOCK_MERGED, (data) => this.playMergeSound(data.newValue));
    eventBus.on(GameEvents.SCORE_UPDATED, (data) => this.playComboSound(data.chainCount));
    eventBus.on(GameEvents.PROPS_USED, (data) => this.playPropSound(data.type));
    eventBus.on(GameEvents.UI_BUTTON_CLICK, () => this.playSfx('click'));
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      if (typeof window !== 'undefined' && window.AudioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
    } catch (error) {
      logger.warn('AudioManager', '音频上下文初始化失败:', error);
    }
    this.initialized = true;
  }

  async loadSound(config: SoundConfig): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = config.url;
      audio.volume = config.volume;
      audio.loop = config.loop;
      
      audio.addEventListener('canplaythrough', () => {
        this.sounds.set(config.key, audio);
        this.volumes.set(config.key, config.volume);
        resolve();
      }, { once: true });
      
      audio.addEventListener('error', () => {
        logger.warn('AudioManager', `音效加载失败: ${config.key}`);
        resolve();
      }, { once: true });
      
      audio.load();
    });
  }

  async loadSounds(configs: SoundConfig[]): Promise<void> {
    await Promise.all(configs.map(config => this.loadSound(config)));
  }

  play(key: string, options?: { loop?: boolean; volume?: number }): void {
    if (this.isMuted) return;

    const audio = this.sounds.get(key);
    if (audio) {
      if (options?.loop !== undefined) {
        audio.loop = options.loop;
      }

      const volume = (options?.volume ?? this.volumes.get(key) ?? 1) * this.getEffectiveVolume(key);
      audio.volume = Math.max(0, Math.min(1, volume));

      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      this.playProceduralSfx(key, options?.volume);
    }
  }

  private playProceduralSfx(key: string, volumeOverride?: number): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const freq = this.getProceduralFrequency(key);
    if (freq <= 0) return;

    const volume = (volumeOverride ?? 0.3) * this.getEffectiveVolume(key);
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = key.includes('music') || key.includes('bgm') ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    gain.gain.value = Math.max(0, Math.min(1, volume));
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start(this.audioContext.currentTime);
    osc.stop(this.audioContext.currentTime + 0.15);
  }

  private getProceduralFrequency(key: string): number {
    const freqMap: Record<string, number> = {
      spawn: 440,
      drop: 330,
      click: 600,
      merge1: 523,
      merge2: 587,
      merge3: 659,
      merge4: 698,
      merge5: 784,
      combo: 880,
      comboGreat: 988,
      comboSuper: 1047,
      warning: 400,
      gameOver: 220,
      levelComplete: 784,
      bomb: 150,
      rainbow: 698,
      freeze: 440,
      shrink: 330,
      lucky: 880,
      propDefault: 500,
      score: 660,
    };
    return freqMap[key] || 0;
  }

  stop(key: string): void {
    const audio = this.sounds.get(key);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  stopAll(): void {
    this.sounds.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  private getEffectiveVolume(key: string): number {
    if (key.includes('music') || key.includes('bgm')) {
      return this.musicVolume * this.masterVolume;
    }
    return this.sfxVolume * this.masterVolume;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  private updateAllVolumes(): void {
    this.sounds.forEach((audio, key) => {
      const baseVolume = this.volumes.get(key) ?? 1;
      audio.volume = baseVolume * this.getEffectiveVolume(key);
    });
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopAll();
    }
    eventBus.emit(GameEvents.AUDIO_MUTE_CHANGED, { isMuted: muted });
  }

  isCurrentlyMuted(): boolean {
    return this.isMuted;
  }

  toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  playMusic(key: string): void {
    if (this.currentMusic) {
      this.stop(this.currentMusic);
    }
    this.currentMusic = key;
    this.play(key, { loop: true });
  }

  stopMusic(): void {
    if (this.currentMusic) {
      this.stop(this.currentMusic);
      this.currentMusic = null;
    }
  }

  private playSfx(key: string): void {
    logger.debug('AudioManager', `playSfx('${key}')`);
    this.play(key);
  }

  private playMergeSound(level: number): void {
    const sounds = ['merge1', 'merge2', 'merge3', 'merge4', 'merge5'];
    const index = Math.min(Math.floor(Math.log2(level)), sounds.length - 1);
    this.play(sounds[index]);
  }

  private playComboSound(count: number): void {
    if (count >= 10) {
      this.play('comboSuper');
    } else if (count >= 5) {
      this.play('comboGreat');
    } else {
      this.play('combo');
    }
  }

  private playPropSound(type: string): void {
    const soundMap: Record<string, string> = {
      'bomb': 'bomb',
      'rainbow': 'rainbow',
      'freeze': 'freeze',
      'shrink': 'shrink',
      'lucky': 'lucky',
    };
    this.play(soundMap[type] || 'propDefault');
  }

  resumeAudioContext(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  destroy(): void {
    this.stopAll();
    this.sounds.clear();
    this.volumes.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
