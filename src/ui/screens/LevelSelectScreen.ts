import { Container, Text, Graphics } from 'pixi.js';
import { Screen } from '../UIManager';
import { eventBus } from '../../utils/EventBus';

interface LevelInfo {
  id: number;
  name: string;
  stars: number;
  unlocked: boolean;
}

export class LevelSelectScreen extends Screen {
  private levels: LevelInfo[] = [
    { id: 1, name: '新手入门', stars: 0, unlocked: true },
    { id: 2, name: '合成挑战', stars: 0, unlocked: true },
    { id: 3, name: '障碍清除', stars: 0, unlocked: true },
    { id: 4, name: '限时生存', stars: 0, unlocked: true },
    { id: 5, name: '综合考验', stars: 0, unlocked: true },
  ];

  constructor() {
    super();
    this.createTitle();
    this.createLevelButtons();
    this.createBackButton();
  }

  private createTitle(): void {
    const title = new Text({
      text: '选择关卡',
      style: {
        fontFamily: 'Arial',
        fontSize: 32,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    title.anchor.set(0.5);
    title.x = 400;
    title.y = 80;
    this.addChild(title);
  }

  private createLevelButtons(): void {
    this.levels.forEach((level, index) => {
      const button = this.createLevelButton(level, index);
      this.addChild(button);
    });
  }

  private createLevelButton(level: LevelInfo, index: number): Container {
    const button = new Container();

    const col = index % 3;
    const row = Math.floor(index / 3);
    button.x = 200 + col * 200;
    button.y = 200 + row * 150;

    const bg = new Graphics();
    if (level.unlocked) {
      bg.roundRect(-70, -50, 140, 100, 10);
      bg.fill(0x333333);
    } else {
      bg.roundRect(-70, -50, 140, 100, 10);
      bg.fill(0x222222);
    }
    button.addChild(bg);

    const numberText = new Text({
      text: String(level.id),
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: level.unlocked ? 0xffffff : 0x666666,
        fontWeight: 'bold',
      },
    });
    numberText.anchor.set(0.5);
    numberText.y = -15;
    button.addChild(numberText);

    const nameText = new Text({
      text: level.name,
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: level.unlocked ? 0xcccccc : 0x666666,
      },
    });
    nameText.anchor.set(0.5);
    nameText.y = 15;
    button.addChild(nameText);

    const starsText = new Text({
      text: '★'.repeat(level.stars) + '☆'.repeat(3 - level.stars),
      style: {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xffd700,
      },
    });
    starsText.anchor.set(0.5);
    starsText.y = 35;
    button.addChild(starsText);

    if (level.unlocked) {
      button.eventMode = 'static';
      button.cursor = 'pointer';
      button.on('pointerdown', () => {
        eventBus.emit('ui:selectLevel', level.id);
      });
    }

    return button;
  }

  private createBackButton(): void {
    const button = new Container();

    const bg = new Graphics();
    bg.roundRect(-50, -20, 100, 40, 8);
    bg.fill(0x666666);
    button.addChild(bg);

    const label = new Text({
      text: '返回',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xffffff,
      },
    });
    label.anchor.set(0.5);
    button.addChild(label);

    button.x = 400;
    button.y = 520;
    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.on('pointerdown', () => {
      eventBus.emit('ui:backToMenu');
    });

    this.addChild(button);
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}
