import { Container, Text, Graphics } from 'pixi.js';
import { Screen } from '../UIManager';
import { eventBus } from '../../utils/EventBus';

export class SettingsScreen extends Screen {
  private contentContainer!: Container;
  private title!: Text;
  private closeButton!: Container;
  private overlay!: Graphics;
  private currentScreenWidth = 800;
  private currentScreenHeight = 600;
  private initialized = false;

  constructor() {
    super();
    this.visible = false;
  }

  private initialize(): void {
    if (this.initialized) return;
    this.createOverlay();
    this.createContent();
    this.initialized = true;
  }

  private createOverlay(): void {
    this.overlay = new Graphics();
    this.overlay.rect(0, 0, this.currentScreenWidth, this.currentScreenHeight);
    this.overlay.fill({ color: 0x000000, alpha: 0.5 });
    this.addChild(this.overlay);
  }

  private createContent(): void {
    this.contentContainer = new Container();

    const bg = new Graphics();
    bg.roundRect(0, 0, 400, 300, 16);
    bg.fill({ color: 0x2C3E50 });
    this.contentContainer.addChild(bg);

    this.title = new Text({
      text: '设置',
      style: { fontSize: 28, fill: 0xFFFFFF, fontWeight: 'bold' },
    });
    this.title.anchor.set(0.5);
    this.title.position.set(200, 40);
    this.contentContainer.addChild(this.title);

    this.closeButton = this.createButton('关闭', 0xE74C3C, () => {
      this.hide();
      eventBus.emit('ui:settingsClosed');
    });
    this.closeButton.position.set(200, 240);
    this.contentContainer.addChild(this.closeButton);

    this.addChild(this.contentContainer);
  }

  private createButton(label: string, color: number, callback: () => void): Container {
    const container = new Container();
    const bg = new Graphics();
    bg.roundRect(-80, -20, 160, 40, 8);
    bg.fill({ color });
    container.addChild(bg);

    const text = new Text({
      text: label,
      style: { fontSize: 18, fill: 0xFFFFFF },
    });
    text.anchor.set(0.5);
    container.addChild(text);

    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', callback);

    return container;
  }

  show(screenWidth?: number, screenHeight?: number): void {
    this.initialize();
    if (screenWidth) this.currentScreenWidth = screenWidth;
    if (screenHeight) this.currentScreenHeight = screenHeight;
    this.overlay.width = this.currentScreenWidth;
    this.overlay.height = this.currentScreenHeight;
    this.contentContainer.position.set(
      (this.currentScreenWidth - 400) / 2,
      (this.currentScreenHeight - 300) / 2,
    );
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}
