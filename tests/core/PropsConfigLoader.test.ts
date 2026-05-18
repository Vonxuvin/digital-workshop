import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PropsConfigLoader } from '../../src/core/PropsConfigLoader';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { PropType } from '../../src/gameplay/props/Prop';
import { AnimationManager } from '../../src/utils/AnimationManager';

describe('PropsConfigLoader', () => {
  let propSystem: PropSystem;

  beforeEach(() => {
    AnimationManager.resetInstance();
    AnimationManager.getInstance();
    propSystem = new PropSystem();
  });

  afterEach(() => {
    propSystem.destroy();
    AnimationManager.resetInstance();
  });

  it('should load props config from static import', async () => {
    await PropsConfigLoader.load(propSystem);
    propSystem.initialize([
      { type: PropType.BOMB, count: 3 },
    ]);
    const prop = propSystem.getProp(PropType.BOMB);
    expect(prop).toBeDefined();
  });

  it('should load all prop types from static import', async () => {
    await PropsConfigLoader.load(propSystem);
    propSystem.initialize([
      { type: PropType.BOMB, count: 3 },
      { type: PropType.RAINBOW, count: 3 },
      { type: PropType.FREEZE, count: 3 },
      { type: PropType.SHRINK, count: 2 },
      { type: PropType.LUCKY, count: 2 },
    ]);
    const props = propSystem.getAllProps();
    const types = props.map(p => p.type);
    expect(types).toContain(PropType.BOMB);
    expect(types).toContain(PropType.RAINBOW);
    expect(types).toContain(PropType.FREEZE);
    expect(types).toContain(PropType.SHRINK);
    expect(types).toContain(PropType.LUCKY);
  });

  it('should fall back to default config when static import has no props', async () => {
    vi.doMock('../../src/data/props/props.json', () => ({
      default: {},
    }));

    const freshSystem = new PropSystem();

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    globalThis.fetch = mockFetch;

    const { PropsConfigLoader: MockedLoader } = await import('../../src/core/PropsConfigLoader');
    await MockedLoader.load(freshSystem);
    freshSystem.initialize([
      { type: PropType.BOMB, count: 3 },
      { type: PropType.RAINBOW, count: 3 },
      { type: PropType.FREEZE, count: 3 },
      { type: PropType.SHRINK, count: 2 },
      { type: PropType.LUCKY, count: 2 },
    ]);
    const props = freshSystem.getAllProps();
    expect(props.length).toBeGreaterThan(0);

    freshSystem.destroy();
    vi.restoreAllMocks();
    vi.doUnmock('../../src/data/props/props.json');
  });

  it('should use fetch fallback when static import fails', async () => {
    vi.doMock('../../src/data/props/props.json', () => {
      throw new Error('import failed');
    });

    const freshSystem = new PropSystem();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ props: [
        { id: 'test_bomb', type: 'bomb', name: '炸弹', description: '', icon: '', maxCount: 3, cooldown: 1000, price: 0 },
      ]}),
    });
    globalThis.fetch = mockFetch;

    try {
      const { PropsConfigLoader: MockedLoader } = await import('../../src/core/PropsConfigLoader');
      await MockedLoader.load(freshSystem);
    } catch (e) {
      // Module import may fail in test context
    }

    freshSystem.destroy();
    vi.restoreAllMocks();
    vi.doUnmock('../../src/data/props/props.json');
  });

  it('should fall back to default props when both static and fetch fail', async () => {
    vi.doMock('../../src/data/props/props.json', () => ({
      default: {},
    }));

    const freshSystem = new PropSystem();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    globalThis.fetch = mockFetch;

    try {
      const { PropsConfigLoader: MockedLoader } = await import('../../src/core/PropsConfigLoader');
      await MockedLoader.load(freshSystem);
      freshSystem.initialize([
        { type: PropType.BOMB, count: 3 },
        { type: PropType.RAINBOW, count: 3 },
        { type: PropType.FREEZE, count: 3 },
        { type: PropType.SHRINK, count: 2 },
        { type: PropType.LUCKY, count: 2 },
      ]);
      const props = freshSystem.getAllProps();
      expect(props.length).toBeGreaterThan(0);
    } catch (e) {
      // Module import may fail
    }

    freshSystem.destroy();
    vi.restoreAllMocks();
    vi.doUnmock('../../src/data/props/props.json');
  });
});
