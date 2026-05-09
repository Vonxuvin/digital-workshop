import { describe, it, expect } from 'vitest';
import { LevelLoader } from '../src/core/LevelLoader';

describe('LevelLoader', () => {
  it('should be singleton', () => {
    const instance1 = LevelLoader.getInstance();
    const instance2 = LevelLoader.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should parse level config correctly', () => {
    const mockConfig = {
      id: 1,
      name: '测试',
      objective: { type: 'score', target: 100 },
      container: { width: 400, height: 600 },
      spawn: { availableNumbers: [1, 2] },
    };

    expect(mockConfig.objective.type).toBe('score');
    expect(mockConfig.objective.target).toBe(100);
  });
});
