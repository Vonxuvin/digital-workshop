import { Container, Text, Graphics } from 'pixi.js';
import { Screen } from '../UIManager';
import { eventBus } from '../../utils/EventBus';

export class PauseScreen extends Screen {
  constructor() {
    super();
    this.visible = false;
    this.createOverlay();
    this.createContent();
  }

  private createOverlay(): void {
    const overlay = new Graphics();
    overlay.rect(0, 0, 800, 600);
    overlay.fill(0x000000, 0.7);
    this.addChild(overlay);
  }

  private createContent(): void {
    const container = new Container();
    container.x = 400;
    container.y = 300;

    const title = new Text({
      text: '游戏暂停',
      style: {
        fontFamily: 'Arial',
        fontSize: 48,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    title.anchor.set(0.5);
    title.y = -80;
    container.addChild(title);

    const continueBtn = this.createButton('继续游戏', 0x4ECDC4);
    continueBtn.y = 0;
    continueBtn.on('pointerdown', () => {
      eventBus.emit('ui:resume');
    });
    container.addChild(continueBtn);

    const restartBtn = this.createButton('重新开始', 0xFF6B6B);
    restartBtn.y = 60;
    restartBtn.on('pointerdown', () => {
      eventBus.emit('ui:restart');
    });
    container.addChild(restartBtn);

    const menuBtn = this.createButton('返回主菜单', 0x95E1D3);
    menuBtn.y = 120;
    menuBtn.on('pointerdown', () => {
      eventBus.emit('ui:backToMenu');
    });
    container.addChild(menuBtn);

    this.addChild(container);
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

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}
