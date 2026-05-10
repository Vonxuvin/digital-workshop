import { Container } from 'pixi.js';

export abstract class Scene extends Container {
  abstract preload(): Promise<void>;
  abstract create(): void;
  update(delta: number): void {}
  pause(): void {}
  resume(): void {}
  destroy(): void {
    super.destroy({ children: true });
  }
}
