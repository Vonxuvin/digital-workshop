import { eventBus } from '../utils/EventBus';

export interface SoundConfig {
  key: string;
  url: string;
  volume: number;
  loop: boolean;
}

export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private volumes: Map<string, number> = new Map();
  private masterVolume: number = 1;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.8;
  private isMuted: boolean = false;
  private currentMusic: string | null = null;
  private initialized: boolean = false;

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private setupEventListeners(): void {
    eventBus.on('gameplay:blockSpawn', () => this.playSfx('spawn'));
    eventBus.on('gameplay:merge', (data: any) => this.playMergeSound(data.level));
    eventBus.on('gameplay:combo', (data: any) => this.playComboSound(data.count));
    eventBus.on('gameplay:gameOver', () => this.playSfx('gameOver'));
    eventBus.on('gameplay:levelComplete', () => this.playSfx('levelComplete'));
    eventBus.on('props:used', (data: any) => this.playPropSound(data.type));
    eventBus.on('ui:buttonClick', () => this.playSfx('click'));
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    
    try {
      if (typeof window !== 'undefined' && window.AudioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    } catch (error) {
      console.warn('[AudioManager] 音频上下文初始化失败:', error);
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
        console.warn(`[AudioManager] 音效加载失败: ${config.key}`);
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
    if (!audio) {
      return;
    }

    if (options?.loop !== undefined) {
      audio.loop = options.loop;
    }

    const volume = (options?.volume ?? this.volumes.get(key) ?? 1) * this.getEffectiveVolume(key);
    audio.volume = Math.max(0, Math.min(1, volume));

    audio.currentTime = 0;
    audio.play().catch(() => {});
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
    eventBus.emit('audio:muteChanged', { isMuted: muted });
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
