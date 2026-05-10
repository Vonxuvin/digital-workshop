import { Container, Text, Graphics } from 'pixi.js';
import { Screen } from '../UIManager';
import { eventBus } from '../../utils/EventBus';
import { SaveManager } from '../../gameplay/SaveManager';

interface LevelInfo {
  id: number;
  name: string;
  stars: number;
  unlocked: boolean;
}

export class LevelSelectScreen extends Screen {
  private levels: LevelInfo[] = [
    { id: 1, name: '新手入门', stars: 0, unlocked: true },
    { id: 2, name: '合成挑战', stars: 0, unlocked: false },
    { id: 3, name: '障碍清除', stars: 0, unlocked: false },
    { id: 4, name: '限时生存', stars: 0, unlocked: false },
    { id: 5, name: '综合考验', stars: 0, unlocked: false },
  ];
  private levelButtons: Container[] = [];
  private saveManager: SaveManager;
  private title!: Text;
  private backButton!: Container;
  private currentScreenWidth = 800;
  private currentScreenHeight = 600;
  private initialized = false;

  constructor() {
    super();
    this.saveManager = SaveManager.getInstance();
  }

  private initialize(): void {
    if (this.initialized) return;
    this.loadSavedProgress();
    this.createTitle();
    this.createLevelButtons();
    this.createBackButton();
    this.initialized = true;
  }

  private loadSavedProgress(): void {
    this.saveManager.load();
    for (const level of this.levels) {
      const progress = this.saveManager.getLevelProgress(level.id);
      level.stars = progress.stars;
      level.unlocked = this.saveManager.isLevelUnlocked(level.id);
    }
  }

  updateLevelProgress(levelId: number, stars: number): void {
    const level = this.levels.find(l => l.id === levelId);
    if (level && stars > level.stars) {
      level.stars = stars;
    }
    const nextLevel = this.levels.find(l => l.id === levelId + 1);
    if (nextLevel) {
      nextLevel.unlocked = true;
    }
    const score = 0;
    this.saveManager.updateLevelProgress(levelId, stars, score);
    for (const l of this.levels) {
      const progress = this.saveManager.getLevelProgress(l.id);
      if (l.stars > progress.stars) {
        this.saveManager.updateLevelProgress(l.id, l.stars, progress.highScore);
      }
    }
    this.refreshLevelButtons();
  }

  private refreshLevelButtons(): void {
    this.levelButtons.forEach(btn => {
      this.removeChild(btn);
      btn.destroy();
    });
    this.levelButtons = [];
    this.createLevelButtons();
  }

  private createTitle(): void {
    this.title = new Text({
      text: '选择关卡',
      style: {
        fontFamily: 'Arial',
        fontSize: 32,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.title.anchor.set(0.5);
    this.title.x = this.currentScreenWidth / 2;
    this.title.y = 80;
    this.addChild(this.title);
  }

  private createLevelButtons(): void {
    this.levels.forEach((level, index) => {
      const button = this.createLevelButton(level, index);
      this.addChild(button);
      this.levelButtons.push(button);
    });
  }

  private createLevelButton(level: LevelInfo, index: number): Container {
    const button = new Container();

    const col = index % 3;
    const row = Math.floor(index / 3);
    button.x = this.currentScreenWidth / 2 - 200 + col * 200;
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
    this.backButton = new Container();

    const bg = new Graphics();
    bg.roundRect(-50, -20, 100, 40, 8);
    bg.fill(0x666666);
    this.backButton.addChild(bg);

    const label = new Text({
      text: '返回',
      style: {
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xffffff,
      },
    });
    label.anchor.set(0.5);
    this.backButton.addChild(label);

    this.backButton.x = this.currentScreenWidth / 2;
    this.backButton.y = 520;
    this.backButton.eventMode = 'static';
    this.backButton.cursor = 'pointer';
    this.backButton.on('pointerdown', () => {
      eventBus.emit('ui:backToMenu');
    });

    this.addChild(this.backButton);
  }

  show(screenWidth?: number, screenHeight?: number): void {
    this.currentScreenWidth = screenWidth || 800;
    this.currentScreenHeight = screenHeight || 600;
    this.initialize();
    this.loadSavedProgress();
    this.refreshLevelButtons();
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}
