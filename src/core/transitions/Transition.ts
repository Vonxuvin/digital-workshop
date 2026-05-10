import { Container } from 'pixi.js';

export abstract class Transition {
  abstract run(fromScene: Container | null, toScene: Container, container: Container): Promise<void>;
}
