import { describe, it, expect, vi } from 'vitest';
import { AudioManager } from '../src/core/AudioManager';

describe('AudioManager', () => {
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

  it('should not play when disabled', () => {
    const am = AudioManager.getInstance();
    am.setEnabled(false);
    expect(am.isEnabled()).toBe(false);
    expect(() => am.play('merge')).not.toThrow();
    am.setEnabled(true);
  });

  it('should toggle enabled state', () => {
    const am = AudioManager.getInstance();
    am.setEnabled(false);
    expect(am.isEnabled()).toBe(false);
    am.setEnabled(true);
    expect(am.isEnabled()).toBe(true);
  });

  it('should not throw for unknown sound when no AudioContext', () => {
    const am = AudioManager.getInstance();
    expect(() => am.play('unknown_sound')).not.toThrow();
  });
});
