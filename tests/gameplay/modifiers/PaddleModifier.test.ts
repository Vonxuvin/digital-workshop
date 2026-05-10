import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PaddleModifier, PaddleConfig } from '../../../src/gameplay/modifiers/PaddleModifier';
import { PhysicsManager } from '../../../src/core/PhysicsManager';

describe('PaddleModifier', () => {
  let physics: PhysicsManager;
  let modifier: PaddleModifier;

  beforeEach(() => {
    physics = new PhysicsManager();
  });

  afterEach(() => {
    modifier?.destroy();
    physics.clearAll();
  });

  it('应正确创建挡板变形器', () => {
    const config: PaddleConfig = {
      type: 'paddle',
      enabled: true,
      side: 'left',
      extendDuration: 0.5,
      retractDuration: 0.5,
      extendLength: 80,
      triggerInterval: 5,
    };

    modifier = new PaddleModifier(config, physics, 400, 600);
    expect(modifier.getType()).toBe('paddle');
    expect(modifier.isActive()).toBe(false);
  });

  it('启动后应变为激活状态', () => {
    const config: PaddleConfig = {
      type: 'paddle',
      enabled: true,
      side: 'left',
      extendDuration: 0.1,
      retractDuration: 0.1,
      extendLength: 80,
      triggerInterval: 5,
    };

    modifier = new PaddleModifier(config, physics, 400, 600);
    modifier.start();
    expect(modifier.isActive()).toBe(true);
  });

  it('应正确返回状态信息', () => {
    const config: PaddleConfig = {
      type: 'paddle',
      enabled: true,
      side: 'right',
      extendDuration: 1,
      retractDuration: 1,
      extendLength: 100,
      triggerInterval: 5,
    };

    modifier = new PaddleModifier(config, physics, 400, 600);
    const state = modifier.getState();
    expect(state.isActive).toBe(false);
    expect(state.progress).toBe(0);
  });
});
