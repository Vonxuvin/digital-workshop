import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WarningLine } from '../src/ui/components/WarningLine';
import { eventBus } from '../src/utils/EventBus';

describe('WarningLine', () => {
  let wl: WarningLine;

  beforeEach(() => {
    wl = new WarningLine(600);
    wl.y = 600 * 0.2;
  });

  it('should create with correct warning height', () => {
    expect(wl.getWarningHeight()).toBe(120);
  });

  it('should not warn when blocks are below line', () => {
    wl.update([{ y: 500, radius: 20, speed: 0 }], 16.67);
    expect(wl.getWarningDuration()).toBe(0);
  });

  it('should not warn when fast-moving block is above line', () => {
    const handler = vi.fn();
    eventBus.on('warning:started', handler);
    wl.update([{ y: 50, radius: 20, speed: 5 }], 16.67);
    expect(handler).not.toHaveBeenCalled();
    eventBus.off('warning:started', handler);
  });

  it('should start warning when stable block is above line', () => {
    const handler = vi.fn();
    eventBus.on('warning:started', handler);
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    expect(handler).toHaveBeenCalled();
    eventBus.off('warning:started', handler);
  });

  it('should emit warning:ended when block moves below line', () => {
    const handler = vi.fn();
    eventBus.on('warning:ended', handler);
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    wl.update([{ y: 500, radius: 20, speed: 0 }], 16.67);
    expect(handler).toHaveBeenCalled();
    eventBus.off('warning:ended', handler);
  });

  it('should emit game:over after threshold', () => {
    const handler = vi.fn();
    eventBus.on('game:over', handler);
    for (let i = 0; i < 200; i++) {
      wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    }
    expect(handler).toHaveBeenCalled();
    eventBus.off('game:over', handler);
  });

  it('should reset correctly', () => {
    wl.update([{ y: 50, radius: 20, speed: 0.5 }], 16.67);
    wl.reset();
    expect(wl.getWarningDuration()).toBe(0);
  });
});
