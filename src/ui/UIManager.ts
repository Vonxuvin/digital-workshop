import { Container, Application, Graphics } from 'pixi.js';
import { GameState } from '../core/GameStateMachine';

export abstract class Screen extends Container {
  abstract show(screenWidth?: number, screenHeight?: number): void;
  abstract hide(): void;
}

export type LayerName = 'background' | 'main' | 'popup' | 'overlay' | 'toast';

const LAYER_ORDER: LayerName[] = ['background', 'main', 'popup', 'overlay', 'toast'];

export class UIManager {
  private app: Application;
  private screens: Map<string, Screen> = new Map();
  private currentScreen: Screen | null = null;
  private layers: Map<string, Container> = new Map();
  private popupQueue: Screen[] = [];
  private modalOverlay: Graphics;
  private currentPopup: Screen | null = null;

  constructor(app: Application) {
    this.app = app;

    for (const name of LAYER_ORDER) {
      const layer = new Container();
      layer.label = name;
      this.layers.set(name, layer);
      this.app.stage.addChild(layer);
    }

    // 先创建 Graphics 对象，但不立即绘制（需要等 app.init() 后才有 screen 尺寸）
    this.modalOverlay = new Graphics();
    this.modalOverlay.eventMode = 'static';
    this.modalOverlay.visible = false;
    this.modalOverlay.on('pointerdown', () => {});
    this.getLayer('overlay').addChild(this.modalOverlay);
  }

  getLayer(name: LayerName): Container {
    const layer = this.layers.get(name);
    if (!layer) {
      throw new Error(`Layer "${name}" not found. Available layers: ${LAYER_ORDER.join(', ')}`);
    }
    return layer;
  }

  getScreens(): Map<string, Screen> {
    return this.screens;
  }

  registerScreen(name: string, screen: Screen): void {
    this.screens.set(name, screen);
    screen.visible = false;
    this.getLayer('main').addChild(screen);
  }

  showScreen(name: string): void {
    if (this.currentScreen) {
      this.currentScreen.hide();
      this.currentScreen.visible = false;
    }

    const screen = this.screens.get(name);
    if (screen) {
      screen.visible = true;
      screen.show(this.app.screen.width, this.app.screen.height);
      this.currentScreen = screen;
    }
  }

  hideCurrentScreen(): void {
    if (this.currentScreen) {
      this.currentScreen.hide();
      this.currentScreen.visible = false;
      this.currentScreen = null;
    }
  }

  showPopup(screen: Screen): void {
    this.popupQueue.push(screen);
    if (!this.currentPopup) {
      this.showNextPopup();
    }
  }

  hidePopup(): void {
    if (this.currentPopup) {
      this.currentPopup.hide();
      this.currentPopup.visible = false;
      this.getLayer('popup').removeChild(this.currentPopup);
      this.currentPopup = null;
      this.modalOverlay.visible = false;

      if (this.popupQueue.length > 0) {
        this.showNextPopup();
      }
    }
  }

  private showNextPopup(): void {
    this.ensureModalOverlayDrawn();
    const next = this.popupQueue.shift();
    if (!next) return;

    this.currentPopup = next;
    next.visible = true;
    next.show(this.app.screen.width, this.app.screen.height);
    this.getLayer('popup').addChild(next);
    this.modalOverlay.visible = true;
  }

  /** 确保 modalOverlay 已经绘制完成 */
  private ensureModalOverlayDrawn(): void {
    // 检查是否已经绘制过了（通过内部标志位）
    if ((this.modalOverlay as any)._drawn) {
      return;
    }
    this.modalOverlay.clear();
    this.modalOverlay.rect(0, 0, this.app.screen.width, this.app.screen.height);
    this.modalOverlay.fill({ color: 0x000000, alpha: 0.5 });
    (this.modalOverlay as any)._drawn = true;
  }

  getPopupQueueLength(): number {
    return this.popupQueue.length;
  }

  isModalOverlayVisible(): boolean {
    return this.modalOverlay.visible;
  }

  handleResize(width: number, height: number): void {
    if (this.currentScreen && 'resize' in this.currentScreen) {
      (this.currentScreen as any).resize(width, height);
    }
    (this.modalOverlay as any)._drawn = false;
    if (this.modalOverlay.visible) {
      this.ensureModalOverlayDrawn();
    }
  }

  destroy(): void {
    for (const screen of this.screens.values()) {
      if ((screen as any).destroy) (screen as any).destroy();
    }
    this.screens.clear();
    this.currentScreen = null;
    if (this.currentPopup) {
      if ((this.currentPopup as any).destroy) (this.currentPopup as any).destroy();
      this.currentPopup = null;
    }
    for (const queuedPopup of this.popupQueue) {
      if ((queuedPopup as any).destroy) (queuedPopup as any).destroy();
    }
    this.popupQueue = [];
    for (const layer of this.layers.values()) {
      layer.destroy({ children: true });
    }
    this.layers.clear();
  }
}
