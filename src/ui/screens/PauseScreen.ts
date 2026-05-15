import { Container, Text, Graphics } from 'pixi.js';
import { Screen } from '../UIManager';
import { eventBus } from '../../utils/EventBus';

export class PauseScreen extends Screen {
  private contentContainer!: Container;
  private title!: Text;
  private continueButton!: Container;
  private restartButton!: Container;
  private menuButton!: Container;
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
    this.overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.addChild(this.overlay);
  }

  private createContent(): void {
    this.contentContainer = new Container();
    this.contentContainer.x = this.currentScreenWidth / 2;
    this.contentContainer.y = this.currentScreenHeight / 2;

    this.title = new Text({
      text: '游戏暂停',
      style: {
        fontFamily: 'Arial',
        fontSize: 48,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.title.anchor.set(0.5);
    this.title.y = -80;
    this.contentContainer.addChild(this.title);

    this.continueButton = this.createButton('继续游戏', 0x4ECDC4);
    this.continueButton.y = 0;
    this.continueButton.on('pointerdown', () => {
      eventBus.emit('ui:resume');
    });
    this.contentContainer.addChild(this.continueButton);

    this.restartButton = this.createButton('重新开始', 0xFF6B6B);
    this.restartButton.y = 60;
    this.restartButton.on('pointerdown', () => {
      eventBus.emit('ui:restart');
    });
    this.contentContainer.addChild(this.restartButton);

    this.menuButton = this.createButton('返回主菜单', 0x95E1D3);
    this.menuButton.y = 120;
    this.menuButton.on('pointerdown', () => {
      eventBus.emit('ui:backToMenu');
    });
    this.contentContainer.addChild(this.menuButton);

    this.addChild(this.contentContainer);
  }

  private createButton(text: string, color: number): Container {
    const btn = new Container();
    btn.eventMode = 'static';
    btn.cursor = 'pointer';

    const bg = new Graphics();
    bg.roundRect(-100, -20, 200, 40, 10);
    bg.fill(color);
    btn.addChild(bg);

    const label = new Text({
      text,
      style: {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    label.anchor.set(0.5);
    btn.addChild(label);

    btn.on('pointerover', () => {
      bg.scale.set(1.05);
    });

    btn.on('pointerout', () => {
      bg.scale.set(1);
    });

    return btn;
  }

  show(screenWidth?: number, screenHeight?: number): void {
    this.currentScreenWidth = screenWidth || 800;
    this.currentScreenHeight = screenHeight || 600;
    this.initialize();
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  getRestartButton(): Container | undefined {
    return this.restartButton;
  }

  getMenuButton(): Container | undefined {
    return this.menuButton;
  }

  getContinueButton(): Container | undefined {
    return this.continueButton;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
