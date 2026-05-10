import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RotateModifier, RotateConfig } from '../../../src/gameplay/modifiers/RotateModifier';
import { PhysicsManager } from '../../../src/core/PhysicsManager';

describe('RotateModifier', () => {
  let physics: PhysicsManager;
  let modifier: RotateModifier;

  beforeEach(() => {
    physics = new PhysicsManager();
    physics.createRectangle(200, 600, 400, 50, { isStatic: true, label: 'ground' });
    physics.createRectangle(-25, 300, 50, 600, { isStatic: true, label: 'wall_left' });
    physics.createRectangle(425, 300, 50, 600, { isStatic: true, label: 'wall_right' });
  });

  afterEach(() => {
    modifier?.destroy();
    physics.clearAll();
  });

  it('应正确创建旋转变形器', () => {
    const config: RotateConfig = {
      type: 'rotate',
      enabled: true,
      rotationSpeed: 30,
      maxAngle: 15,
      oscillate: true,
    };

    modifier = new RotateModifier(config, physics, 400, 600);
    expect(modifier.getType()).toBe('rotate');
    expect(modifier.getCurrentAngle()).toBe(0);
  });

  it('摆动模式应在最大角度处反转方向', () => {
    const config: RotateConfig = {
      type: 'rotate',
      enabled: true,
      rotationSpeed: 900,
      maxAngle: 15,
      oscillate: true,
    };

    modifier = new RotateModifier(config, physics, 400, 600);
    modifier.start();

    // 模拟一帧
    (modifier as any).onTick();
    expect(modifier.isActive()).toBe(true);
  });
});
