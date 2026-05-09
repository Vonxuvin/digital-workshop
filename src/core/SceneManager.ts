import { Container } from 'pixi.js';

export interface Scene {
  init(): Promise<void>;
  update(delta: number): void;
  destroy(): void;
}

export class SceneManager {
  private scenes: Map<string, Scene> = new Map();
  private currentScene: Scene | null = null;
  private currentName: string = '';
  private container: Container;

  constructor(container: Container) {
    this.container = container;
  }

  register(name: string, scene: Scene): void {
    this.scenes.set(name, scene);
  }

  async switchTo(name: string): Promise<void> {
    if (this.currentScene) {
      this.currentScene.destroy();
      this.container.removeChildren();
    }

    const scene = this.scenes.get(name);
    if (!scene) {
      console.error(`[SceneManager] 场景 "${name}" 未注册`);
      return;
    }

    this.currentScene = scene;
    this.currentName = name;
    await scene.init();
  }

  update(delta: number): void {
    if (this.currentScene) {
      this.currentScene.update(delta);
    }
  }

  getCurrentSceneName(): string {
    return this.currentName;
  }

  getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  destroy(): void {
    if (this.currentScene) {
      this.currentScene.destroy();
    }
    this.scenes.clear();
    this.container.destroy();
  }
}
