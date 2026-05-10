import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from 'pixi.js';
import { SceneManager } from '../../src/core/SceneManager';
import { Scene } from '../../src/core/Scene';
import { Transition } from '../../src/core/transitions/Transition';

class MockScene extends Scene {
  lifecycle: string[] = [];
  lastDelta = 0;

  async preload(): Promise<void> {
    this.lifecycle.push('preload');
  }

  create(): void {
    this.lifecycle.push('create');
  }

  update(delta: number): void {
    this.lifecycle.push('update');
    this.lastDelta = delta;
  }

  pause(): void {
    this.lifecycle.push('pause');
  }

  resume(): void {
    this.lifecycle.push('resume');
  }

  destroy(): void {
    this.lifecycle.push('destroy');
    super.destroy();
  }
}

class MockTransition extends Transition {
  runCalls: Array<{ from: Container | null; to: Container; container: Container }> = [];

  async run(fromScene: Container | null, toScene: Container, container: Container): Promise<void> {
    this.runCalls.push({ from: fromScene, to: toScene, container });
    if (fromScene) {
      container.removeChild(fromScene);
    }
    container.addChild(toScene);
  }
}

describe('SceneManager', () => {
  let container: Container;
  let manager: SceneManager;

  beforeEach(() => {
    container = new Container();
    manager = new SceneManager(container);
  });

  describe('scene registration', () => {
    it('registers a scene factory', () => {
      manager.register('menu', () => new MockScene());
      expect(manager.getCurrentSceneName()).toBe('');
    });

    it('registers multiple scene factories', () => {
      manager.register('menu', () => new MockScene());
      manager.register('game', () => new MockScene());
      manager.register('result', () => new MockScene());
      expect(manager.getCurrentSceneName()).toBe('');
    });
  });

  describe('scene switching', () => {
    it('switches to a registered scene', async () => {
      let scene: MockScene;
      manager.register('menu', () => {
        scene = new MockScene();
        return scene;
      });

      await manager.switchTo('menu');

      expect(manager.getCurrentSceneName()).toBe('menu');
      expect(manager.getCurrentScene()).toBe(scene!);
      expect(scene!.lifecycle).toContain('preload');
      expect(scene!.lifecycle).toContain('create');
    });

    it('calls preload before create', async () => {
      let scene: MockScene;
      manager.register('menu', () => {
        scene = new MockScene();
        return scene;
      });

      await manager.switchTo('menu');

      const preloadIndex = scene!.lifecycle.indexOf('preload');
      const createIndex = scene!.lifecycle.indexOf('create');
      expect(preloadIndex).toBeLessThan(createIndex);
    });

    it('destroys previous scene when switching', async () => {
      let firstScene: MockScene;
      manager.register('menu', () => {
        firstScene = new MockScene();
        return firstScene;
      });
      manager.register('game', () => new MockScene());

      await manager.switchTo('menu');
      expect(firstScene!.lifecycle).not.toContain('destroy');

      await manager.switchTo('game');
      expect(firstScene!.lifecycle).toContain('destroy');
    });

    it('does nothing for unregistered scene', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await manager.switchTo('nonexistent');
      expect(manager.getCurrentScene()).toBeNull();
      expect(manager.getCurrentSceneName()).toBe('');
      errorSpy.mockRestore();
    });

    it('adds scene to game layer', async () => {
      manager.register('menu', () => new MockScene());
      await manager.switchTo('menu');
      expect(manager.getGameLayer().children.length).toBe(1);
    });

    it('removes old scene from game layer when switching', async () => {
      manager.register('menu', () => new MockScene());
      manager.register('game', () => new MockScene());
      await manager.switchTo('menu');
      expect(manager.getGameLayer().children.length).toBe(1);
      await manager.switchTo('game');
      expect(manager.getGameLayer().children.length).toBe(1);
    });
  });

  describe('scene switching with transition', () => {
    it('calls transition.run with correct arguments', async () => {
      let fromScene: MockScene;
      let toScene: MockScene;
      const transition = new MockTransition();

      manager.register('menu', () => {
        fromScene = new MockScene();
        return fromScene;
      });
      manager.register('game', () => {
        toScene = new MockScene();
        return toScene;
      });

      await manager.switchTo('menu');
      await manager.switchTo('game', transition);

      expect(transition.runCalls.length).toBe(1);
      expect(transition.runCalls[0].from).toBe(fromScene!);
      expect(transition.runCalls[0].to).toBe(toScene!);
      expect(transition.runCalls[0].container).toBe(manager.getGameLayer());
    });

    it('passes null fromScene for first switch with transition', async () => {
      const transition = new MockTransition();
      manager.register('menu', () => new MockScene());

      await manager.switchTo('menu', transition);

      expect(transition.runCalls.length).toBe(1);
      expect(transition.runCalls[0].from).toBeNull();
    });

    it('sets transitioning flag during transition', async () => {
      let transitionSawFlag = false;
      const checkTransition = new (class extends Transition {
        async run(): Promise<void> {
          transitionSawFlag = manager.isTransitioning();
        }
      })();

      manager.register('menu', () => new MockScene());
      manager.register('game', () => new MockScene());
      await manager.switchTo('menu');
      await manager.switchTo('game', checkTransition);

      expect(transitionSawFlag).toBe(true);
      expect(manager.isTransitioning()).toBe(false);
    });

    it('destroys fromScene after transition completes', async () => {
      let fromScene: MockScene;
      const transition = new MockTransition();

      manager.register('menu', () => {
        fromScene = new MockScene();
        return fromScene;
      });
      manager.register('game', () => new MockScene());

      await manager.switchTo('menu');
      await manager.switchTo('game', transition);

      expect(fromScene!.lifecycle).toContain('destroy');
    });

    it('blocks switchTo during transition', async () => {
      let resolvePreload: () => void;

      class SlowPreloadScene extends MockScene {
        async preload(): Promise<void> {
          await new Promise<void>((resolve) => {
            resolvePreload = resolve;
          });
        }
      }

      manager.register('menu', () => new MockScene());
      manager.register('game', () => new SlowPreloadScene());
      manager.register('result', () => new MockScene());
      await manager.switchTo('menu');

      const switchPromise = manager.switchTo('game');
      await manager.switchTo('result');
      expect(manager.getCurrentSceneName()).toBe('menu');

      resolvePreload!();
      await switchPromise;
      expect(manager.getCurrentSceneName()).toBe('game');
    });
  });

  describe('scene stack push', () => {
    it('pushes scene onto stack and pauses current', async () => {
      let menuScene: MockScene;
      manager.register('menu', () => {
        menuScene = new MockScene();
        return menuScene;
      });
      manager.register('pause', () => new MockScene());

      await manager.switchTo('menu');
      await manager.push('pause');

      expect(manager.getStackDepth()).toBe(1);
      expect(menuScene!.lifecycle).toContain('pause');
      expect(manager.getCurrentSceneName()).toBe('pause');
    });

    it('removes paused scene from game layer', async () => {
      manager.register('menu', () => new MockScene());
      manager.register('pause', () => new MockScene());

      await manager.switchTo('menu');
      await manager.push('pause');

      expect(manager.getGameLayer().children.length).toBe(1);
    });

    it('calls preload and create on pushed scene', async () => {
      let pauseScene: MockScene;
      manager.register('menu', () => new MockScene());
      manager.register('pause', () => {
        pauseScene = new MockScene();
        return pauseScene;
      });

      await manager.switchTo('menu');
      await manager.push('pause');

      expect(pauseScene!.lifecycle).toContain('preload');
      expect(pauseScene!.lifecycle).toContain('create');
    });

    it('does nothing for unregistered scene', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      manager.register('menu', () => new MockScene());
      await manager.switchTo('menu');
      await manager.push('nonexistent');
      expect(manager.getCurrentSceneName()).toBe('menu');
      expect(manager.getStackDepth()).toBe(0);
      errorSpy.mockRestore();
    });
  });

  describe('scene stack pop', () => {
    it('pops scene and resumes previous', async () => {
      let menuScene: MockScene;
      manager.register('menu', () => {
        menuScene = new MockScene();
        return menuScene;
      });
      manager.register('pause', () => new MockScene());

      await manager.switchTo('menu');
      await manager.push('pause');
      await manager.pop();

      expect(manager.getStackDepth()).toBe(0);
      expect(manager.getCurrentSceneName()).toBe('menu');
      expect(menuScene!.lifecycle).toContain('resume');
    });

    it('destroys current scene on pop', async () => {
      let pauseScene: MockScene;
      manager.register('menu', () => new MockScene());
      manager.register('pause', () => {
        pauseScene = new MockScene();
        return pauseScene;
      });

      await manager.switchTo('menu');
      await manager.push('pause');
      await manager.pop();

      expect(pauseScene!.lifecycle).toContain('destroy');
    });

    it('adds previous scene back to game layer', async () => {
      manager.register('menu', () => new MockScene());
      manager.register('pause', () => new MockScene());

      await manager.switchTo('menu');
      await manager.push('pause');
      await manager.pop();

      expect(manager.getGameLayer().children.length).toBe(1);
    });

    it('does nothing when stack is empty', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      manager.register('menu', () => new MockScene());
      await manager.switchTo('menu');
      await manager.pop();
      expect(manager.getCurrentSceneName()).toBe('menu');
      errorSpy.mockRestore();
    });
  });

  describe('max stack depth', () => {
    it('limits stack depth to 10', async () => {
      for (let i = 0; i <= 12; i++) {
        manager.register(`scene${i}`, () => new MockScene());
      }

      await manager.switchTo('scene0');
      for (let i = 1; i <= 10; i++) {
        await manager.push(`scene${i}`);
      }

      expect(manager.getStackDepth()).toBe(10);

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await manager.push('scene11');
      expect(manager.getStackDepth()).toBe(10);
      errorSpy.mockRestore();
    });
  });

  describe('switchTo clears stack', () => {
    it('destroys all scenes on stack when switching', async () => {
      const destroyedScenes: MockScene[] = [];
      manager.register('menu', () => {
        const s = new MockScene();
        return s;
      });
      manager.register('pause', () => {
        const s = new MockScene();
        destroyedScenes.push(s);
        return s;
      });
      manager.register('popup', () => {
        const s = new MockScene();
        destroyedScenes.push(s);
        return s;
      });
      manager.register('game', () => new MockScene());

      await manager.switchTo('menu');
      await manager.push('pause');
      await manager.push('popup');
      expect(manager.getStackDepth()).toBe(2);

      await manager.switchTo('game');
      expect(manager.getStackDepth()).toBe(0);
      expect(destroyedScenes.every(s => s.lifecycle.includes('destroy'))).toBe(true);
    });
  });

  describe('update', () => {
    it('calls update on current scene', async () => {
      let scene: MockScene;
      manager.register('menu', () => {
        scene = new MockScene();
        return scene;
      });

      await manager.switchTo('menu');
      manager.update(16);

      expect(scene!.lifecycle).toContain('update');
      expect(scene!.lastDelta).toBe(16);
    });

    it('does not call update when no current scene', () => {
      expect(() => manager.update(16)).not.toThrow();
    });

    it('does not call update during transition', async () => {
      let scene: MockScene;
      let resolvePreload: () => void;

      class SlowPreloadScene extends MockScene {
        async preload(): Promise<void> {
          await new Promise<void>((resolve) => {
            resolvePreload = resolve;
          });
        }
      }

      manager.register('menu', () => {
        scene = new MockScene();
        return scene;
      });
      manager.register('game', () => new SlowPreloadScene());

      await manager.switchTo('menu');
      scene!.lifecycle = [];

      const switchPromise = manager.switchTo('game');
      manager.update(16);
      expect(scene!.lifecycle).not.toContain('update');

      resolvePreload!();
      await switchPromise;
    });
  });

  describe('layer management', () => {
    it('creates four layers as children of container', () => {
      expect(container.children.length).toBe(4);
    });

    it('provides access to background layer', () => {
      expect(manager.getBackgroundLayer()).toBeInstanceOf(Container);
    });

    it('provides access to game layer', () => {
      expect(manager.getGameLayer()).toBeInstanceOf(Container);
    });

    it('provides access to ui layer', () => {
      expect(manager.getUILayer()).toBeInstanceOf(Container);
    });

    it('provides access to popup layer', () => {
      expect(manager.getPopupLayer()).toBeInstanceOf(Container);
    });

    it('layers are in correct order', () => {
      expect(container.children[0]).toBe(manager.getBackgroundLayer());
      expect(container.children[1]).toBe(manager.getGameLayer());
      expect(container.children[2]).toBe(manager.getUILayer());
      expect(container.children[3]).toBe(manager.getPopupLayer());
    });
  });

  describe('scene lifecycle', () => {
    it('follows preload -> create -> update order', async () => {
      let scene: MockScene;
      manager.register('game', () => {
        scene = new MockScene();
        return scene;
      });

      await manager.switchTo('game');
      manager.update(1);

      const preloadIdx = scene!.lifecycle.indexOf('preload');
      const createIdx = scene!.lifecycle.indexOf('create');
      const updateIdx = scene!.lifecycle.indexOf('update');

      expect(preloadIdx).toBeLessThan(createIdx);
      expect(createIdx).toBeLessThan(updateIdx);
    });

    it('follows pause -> resume order with push/pop', async () => {
      let menuScene: MockScene;
      manager.register('menu', () => {
        menuScene = new MockScene();
        return menuScene;
      });
      manager.register('pause', () => new MockScene());

      await manager.switchTo('menu');
      menuScene!.lifecycle = [];
      await manager.push('pause');
      await manager.pop();

      const pauseIdx = menuScene!.lifecycle.indexOf('pause');
      const resumeIdx = menuScene!.lifecycle.indexOf('resume');
      expect(pauseIdx).toBeLessThan(resumeIdx);
    });

    it('calls destroy on scene when switching away', async () => {
      let scene: MockScene;
      manager.register('menu', () => {
        scene = new MockScene();
        return scene;
      });
      manager.register('game', () => new MockScene());

      await manager.switchTo('menu');
      await manager.switchTo('game');

      expect(scene!.lifecycle).toContain('destroy');
    });
  });

  describe('destroy', () => {
    it('destroys current scene and clears stack', async () => {
      const scenes: MockScene[] = [];
      manager.register('menu', () => {
        const s = new MockScene();
        scenes.push(s);
        return s;
      });
      manager.register('pause', () => {
        const s = new MockScene();
        scenes.push(s);
        return s;
      });

      await manager.switchTo('menu');
      await manager.push('pause');
      manager.destroy();

      expect(scenes.every(s => s.lifecycle.includes('destroy'))).toBe(true);
    });

    it('clears factories', async () => {
      manager.register('menu', () => new MockScene());
      manager.destroy();
    });
  });
});
