import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WarningLine } from '../src/ui/components/WarningLine';
import { eventBus } from '../src/utils/EventBus';

describe('WarningLine', () => {
  let wl: WarningLine;

  beforeEach(() => {
    wl = new WarningLine(600);
  });

  it('should create with correct warning height', () => {
    expect(wl.getWarningHeight()).toBe(120);
  });

  it('should not warn when blocks are below line', () => {
    wl.update([{ y: 500, radius: 20 }], 1);
    expect(wl.getWarningDuration()).toBe(0);
  });

  it('should start warning when block is above line', () => {
    const handler = vi.fn();
    eventBus.on('warning:started', handler);
    wl.update([{ y: 50, radius: 20 }], 1);
    expect(handler).toHaveBeenCalled();
  });

  it('should emit warning:ended when block moves below line', () => {
    const handler = vi.fn();
    eventBus.on('warning:ended', handler);
    wl.update([{ y: 50, radius: 20 }], 1);
    wl.update([{ y: 500, radius: 20 }], 1);
    expect(handler).toHaveBeenCalled();
  });

  it('should emit game:over after threshold', () => {
    const handler = vi.fn();
    eventBus.on('game:over', handler);
    for (let i = 0; i < 200; i++) {
      wl.update([{ y: 50, radius: 20 }], 1);
    }
    expect(handler).toHaveBeenCalled();
  });

  it('should reset correctly', () => {
    wl.update([{ y: 50, radius: 20 }], 1);
    wl.reset();
    expect(wl.getWarningDuration()).toBe(0);
  });
});
