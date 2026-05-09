import { describe, it, expect } from 'vitest';
import Matter from 'matter-js';
import { Block, BLOCK_CONFIGS } from '../src/gameplay/Block';

describe('Block', () => {
  it('should create block with correct value', () => {
    const body = Matter.Bodies.circle(100, 100, 20);
    const block = new Block(body, 4);
    expect(block.value).toBe(4);
  });

  it('should use correct config for value', () => {
    const body = Matter.Bodies.circle(100, 100, 20);
    const block = new Block(body, 8);
    const config = block.getConfig();
    expect(config.color).toBe(0x96CEB4);
    expect(config.radius).toBe(28);
  });

  it('should sync position from body', () => {
    const body = Matter.Bodies.circle(150, 200, 20);
    const block = new Block(body, 2);
    block.syncFromBody();
    expect(block.x).toBe(150);
    expect(block.y).toBe(200);
  });
});

describe('BLOCK_CONFIGS', () => {
  it('should have configs for values 1-64', () => {
    const values = [1, 2, 4, 8, 16, 32, 64];
    values.forEach(v => {
      expect(BLOCK_CONFIGS[v]).toBeDefined();
      expect(BLOCK_CONFIGS[v].value).toBe(v);
    });
  });
});
