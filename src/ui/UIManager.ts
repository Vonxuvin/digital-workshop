import { Container, Application } from 'pixi.js';
import { GameState } from '../core/GameStateMachine';

export abstract class Screen extends Container {
  abstract show(): void;
  abstract hide(): void;
}

export class UIManager {
  private app: Application;
  private screens: Map<string, Screen> = new Map();
  private currentScreen: Screen | null = null;

  constructor(app: Application) {
    this.app = app;
  }

  registerScreen(name: string, screen: Screen): void {
    this.screens.set(name, screen);
    screen.visible = false;
    this.app.stage.addChild(screen);
  }

  showScreen(name: string): void {
    if (this.currentScreen) {
      this.currentScreen.hide();
    }

    const screen = this.screens.get(name);
    if (screen) {
      screen.visible = true;
      screen.show();
      this.currentScreen = screen;
    }
  }

  hideCurrentScreen(): void {
    if (this.currentScreen) {
      this.currentScreen.hide();
      this.currentScreen = null;
    }
  }
}
