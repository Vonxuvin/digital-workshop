export class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private enabled = true;

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async init(): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      this.loadSounds();
    } catch (error) {
      console.warn('[AudioManager] 音频初始化失败:', error);
    }
  }

  private loadSounds(): void {
    this.sounds.set('merge', this.generateTone(440, 0.1, 'sine'));
    this.sounds.set('drop', this.generateTone(220, 0.05, 'square'));
    this.sounds.set('gameover', this.generateTone(150, 0.5, 'sawtooth'));
    this.sounds.set('levelComplete', this.generateTone(880, 0.3, 'sine'));
  }

  private generateTone(frequency: number, duration: number, type: OscillatorType): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.max(0, 1 - t / duration);
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    }

    return buffer;
  }

  play(soundName: string): void {
    if (!this.enabled || !this.audioContext) return;

    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`[AudioManager] 音效未找到: ${soundName}`);
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
