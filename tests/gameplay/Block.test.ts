import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsManager } from '../../src/core/PhysicsManager';
import { Block, BLOCK_CONFIGS } from '../../src/gameplay/Block';

describe('Block', () => {
  let physics: PhysicsManager;

  beforeEach(() => {
    physics = new PhysicsManager();
  });

  it('should create block with correct value', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    expect(block.value).toBe(1);
  });

  it('should sync position from body', () => {
    const body = physics.createCircle(150, 250, 20);
    const block = new Block(body, 2);
    expect(block.x).toBe(150);
    expect(block.y).toBe(250);
  });

  it('should return correct config', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 4);
    const config = block.getConfig();
    expect(config.value).toBe(4);
    expect(config.color).toBe(BLOCK_CONFIGS[4].color);
    expect(config.radius).toBe(BLOCK_CONFIGS[4].radius);
  });

  it('should generate dynamic config for unknown power-of-2 value', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 4096);
    const config = block.getConfig();
    expect(config.value).toBe(4096);
    expect(config.radius).toBeGreaterThan(0);
  });

  it('should fallback to config 1 for invalid value 0', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 0);
    const config = block.getConfig();
    expect(config.value).toBe(1);
  });

  it('should fallback to config 1 for negative value', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, -5);
    const config = block.getConfig();
    expect(config.value).toBe(1);
  });

  it('should mark as destroyed on destroy', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    expect(block.isDestroyed).toBe(false);
    block.destroy();
    expect(block.isDestroyed).toBe(true);
  });

  it('should not throw on double destroy', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    block.destroy();
    expect(() => block.destroy()).not.toThrow();
  });

  it('should skip syncFromBody when destroyed', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    block.destroy();
    expect(() => block.syncFromBody()).not.toThrow();
  });

  it('should have body reference', () => {
    const body = physics.createCircle(100, 200, 20);
    const block = new Block(body, 1);
    expect(block.body).toBe(body);
  });
});

describe('BLOCK_CONFIGS', () => {
  it('should have configs for values 1, 2, 4, 8, 16, 32, 64', () => {
    [1, 2, 4, 8, 16, 32, 64].forEach(v => {
      expect(BLOCK_CONFIGS[v]).toBeDefined();
      expect(BLOCK_CONFIGS[v].value).toBe(v);
      expect(BLOCK_CONFIGS[v].color).toBeGreaterThan(0);
      expect(BLOCK_CONFIGS[v].radius).toBeGreaterThan(0);
      expect(BLOCK_CONFIGS[v].mass).toBeGreaterThan(0);
    });
  });

  it('should have increasing radius for higher values', () => {
    const values = [1, 2, 4, 8, 16, 32, 64];
    for (let i = 1; i < values.length; i++) {
      expect(BLOCK_CONFIGS[values[i]].radius).toBeGreaterThan(
        BLOCK_CONFIGS[values[i - 1]].radius
      );
    }
  });
});
