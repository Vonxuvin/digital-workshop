import { Container, Text, Graphics } from 'pixi.js';
import { Screen } from '../UIManager';
import { eventBus } from '../../utils/EventBus';

export class MainMenuScreen extends Screen {
  private titleText!: Text;
  private startButton!: Container;

  constructor() {
    super();
    this.createTitle();
    this.createStartButton();
  }

  private createTitle(): void {
    this.titleText = new Text({
      text: '数字工坊',
      style: {
        fontFamily: 'Arial',
        fontSize: 48,
        fill: 0xffffff,
        fontWeight: 'bold',
        dropShadow: {
          color: 0x000000,
          blur: 4,
          angle: Math.PI / 6,
          distance: 6,
        },
      },
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = 400;
    this.titleText.y = 200;
    this.addChild(this.titleText);
  }

  private createStartButton(): void {
    this.startButton = new Container();

    const bg = new Graphics();
    bg.roundRect(-100, -30, 200, 60, 15);
    bg.fill(0x4ECDC4);
    this.startButton.addChild(bg);

    const label = new Text({
      text: '开始游戏',
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    label.anchor.set(0.5);
    this.startButton.addChild(label);

    this.startButton.x = 400;
    this.startButton.y = 350;
    this.startButton.eventMode = 'static';
    this.startButton.cursor = 'pointer';

    this.startButton.on('pointerdown', () => {
      eventBus.emit('ui:startGame');
    });

    this.addChild(this.startButton);
  }

  show(): void {
    this.visible = true;
    this.alpha = 0;
    let fadeIn = 0;
    const animate = () => {
      fadeIn += 0.05;
      this.alpha = Math.min(fadeIn, 1);
      if (fadeIn < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  hide(): void {
    this.visible = false;
  }
}
