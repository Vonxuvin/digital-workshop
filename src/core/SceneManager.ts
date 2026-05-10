import { Container } from 'pixi.js';
import { Scene } from './Scene';
import { Transition } from './transitions/Transition';

const MAX_STACK_DEPTH = 10;

interface StackEntry {
  scene: Scene;
  name: string;
}

export class SceneManager {
  private factories: Map<string, () => Scene> = new Map();
  private sceneStack: StackEntry[] = [];
  private currentScene: Scene | null = null;
  private currentName: string = '';
  private container: Container;
  private backgroundLayer: Container;
  private gameLayer: Container;
  private uiLayer: Container;
  private popupLayer: Container;
  private _transitioning = false;

  constructor(container: Container) {
    this.container = container;
    this.backgroundLayer = new Container();
    this.gameLayer = new Container();
    this.uiLayer = new Container();
    this.popupLayer = new Container();
    container.addChild(this.backgroundLayer);
    container.addChild(this.gameLayer);
    container.addChild(this.uiLayer);
    container.addChild(this.popupLayer);
  }

  register(name: string, factory: () => Scene): void {
    this.factories.set(name, factory);
  }

  async switchTo(name: string, transition?: Transition): Promise<void> {
    if (this._transitioning) return;
    this._transitioning = true;

    try {
      const factory = this.factories.get(name);
      if (!factory) {
        console.error(`[SceneManager] 场景 "${name}" 未注册`);
        return;
      }

      const fromScene = this.currentScene;
      const toScene = factory();

      await toScene.preload();
      toScene.create();

      this.sceneStack.forEach(entry => entry.scene.destroy());
      this.sceneStack = [];

      if (transition) {
        await transition.run(fromScene, toScene, this.gameLayer);
        if (fromScene) {
          fromScene.destroy();
        }
      } else {
        if (fromScene) {
          this.gameLayer.removeChild(fromScene);
          fromScene.destroy();
        }
        this.gameLayer.addChild(toScene);
      }

      this.currentScene = toScene;
      this.currentName = name;
    } finally {
      this._transitioning = false;
    }
  }

  async push(name: string): Promise<void> {
    if (this._transitioning) return;
    this._transitioning = true;

    try {
      if (this.sceneStack.length >= MAX_STACK_DEPTH) {
        console.error(`[SceneManager] 场景栈已达最大深度 ${MAX_STACK_DEPTH}`);
        return;
      }

      const factory = this.factories.get(name);
      if (!factory) {
        console.error(`[SceneManager] 场景 "${name}" 未注册`);
        return;
      }

      if (this.currentScene) {
        this.currentScene.pause();
        this.sceneStack.push({ scene: this.currentScene, name: this.currentName });
        this.gameLayer.removeChild(this.currentScene);
      }

      const newScene = factory();
      this.currentScene = newScene;
      this.currentName = name;
      this.gameLayer.addChild(newScene);
      await newScene.preload();
      newScene.create();
    } finally {
      this._transitioning = false;
    }
  }

  async pop(): Promise<void> {
    if (this._transitioning) return;
    this._transitioning = true;

    try {
      if (this.sceneStack.length === 0) {
        console.error('[SceneManager] 场景栈为空，无法弹出');
        return;
      }

      if (this.currentScene) {
        this.gameLayer.removeChild(this.currentScene);
        this.currentScene.destroy();
      }

      const entry = this.sceneStack.pop()!;
      this.currentScene = entry.scene;
      this.currentName = entry.name;
      this.gameLayer.addChild(entry.scene);
      entry.scene.resume();
    } finally {
      this._transitioning = false;
    }
  }

  update(delta: number): void {
    if (this.currentScene && !this._transitioning) {
      this.currentScene.update(delta);
    }
  }

  getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  getCurrentSceneName(): string {
    return this.currentName;
  }

  getStackDepth(): number {
    return this.sceneStack.length;
  }

  isTransitioning(): boolean {
    return this._transitioning;
  }

  getBackgroundLayer(): Container {
    return this.backgroundLayer;
  }

  getGameLayer(): Container {
    return this.gameLayer;
  }

  getUILayer(): Container {
    return this.uiLayer;
  }

  getPopupLayer(): Container {
    return this.popupLayer;
  }

  destroy(): void {
    if (this.currentScene) {
      this.gameLayer.removeChild(this.currentScene);
      this.currentScene.destroy();
    }
    this.sceneStack.forEach(entry => entry.scene.destroy());
    this.sceneStack = [];
    this.factories.clear();
    this.container.destroy({ children: true });
  }
}
