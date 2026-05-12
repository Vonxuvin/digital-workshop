import { Container, Text, Graphics } from 'pixi.js';
import { Screen } from '../UIManager';
import { eventBus } from '../../utils/EventBus';
import { SaveManager } from '../../core/SaveManager';
import { LevelLoader } from '../../core/LevelLoader';

interface LevelInfo {
  id: number;
  name: string;
  stars: number;
  unlocked: boolean;
}

export class LevelSelectScreen extends Screen {
  private levels: LevelInfo[] = [];
  private levelButtons: Container[] = [];
  private saveManager: SaveManager;
  private levelLoader: LevelLoader;
  private title!: Text;
  private backButton!: Container;
  private currentScreenWidth = 800;
  private currentScreenHeight = 600;
  private initialized = false;
  private scrollContainer!: Container;
  private scrollMask!: Graphics;
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private scrollStartY: number = 0;
  private readonly contentTop: number = 130;
  private readonly contentBottom: number = 490;
  private readonly rowHeight: number = 150;

  constructor(saveManager: SaveManager, levelLoader: LevelLoader) {
    super();
    this.saveManager = saveManager;
    this.levelLoader = levelLoader;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loadLevelsFromConfig();
    this.loadSavedProgress();
    this.createTitle();
    this.createScrollContainer();
    this.createLevelButtons();
    this.createBackButton();
    this.setupScrollInput();
    this.initialized = true;
  }

  private async loadLevelsFromConfig(): Promise<void> {
    const configs = await this.levelLoader.getAllLevelConfigs();
    this.levels = configs.map(config => ({
      id: config.id,
      name: config.name,
      stars: 0,
      unlocked: config.id === 1,
    }));
  }

  private async loadSavedProgress(): Promise<void> {
    await this.saveManager.load();
    for (const level of this.levels) {
      const progress = this.saveManager.getLevelProgress(level.id);
      level.stars = progress.stars;
      level.unlocked = progress.unlocked;
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
    this.saveManager.updateLevelProgress(levelId, 0, 0, stars, stars > 0);
    this.saveManager.save();
    this.refreshLevelButtons();
  }

  private refreshLevelButtons(): void {
    this.levelButtons.forEach(btn => {
      this.scrollContainer.removeChild(btn);
      btn.destroy();
    });
    this.levelButtons = [];
    this.createLevelButtons();
    this.updateMaxScrollY();
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

  private createScrollContainer(): void {
    this.scrollContainer = new Container();
    this.scrollContainer.y = this.contentTop;
    this.addChild(this.scrollContainer);

    this.scrollMask = new Graphics();
    this.scrollMask.rect(0, this.contentTop, this.currentScreenWidth, this.contentBottom - this.contentTop);
    this.scrollMask.fill({ color: 0xffffff });
    this.addChild(this.scrollMask);
    this.scrollContainer.mask = this.scrollMask;
  }

  private createLevelButtons(): void {
    this.levels.forEach((level, index) => {
      const button = this.createLevelButton(level, index);
      this.scrollContainer.addChild(button);
      this.levelButtons.push(button);
    });
    this.updateMaxScrollY();
  }

  private updateMaxScrollY(): void {
    const totalRows = Math.ceil(this.levels.length / 3);
    const totalContentHeight = totalRows * this.rowHeight;
    const visibleHeight = this.contentBottom - this.contentTop;
    this.maxScrollY = Math.max(0, totalContentHeight - visibleHeight);
    this.scrollY = Math.min(this.scrollY, this.maxScrollY);
    this.applyScrollPosition();
  }

  private createLevelButton(level: LevelInfo, index: number): Container {
    const button = new Container();

    const col = index % 3;
    const row = Math.floor(index / 3);
    button.x = this.currentScreenWidth / 2 - 200 + col * 200;
    button.y = row * this.rowHeight;

    const bg = new Graphics();
    if (level.unlocked) {
      bg.roundRect(-70, -50, 140, 100, 10);
      bg.fill({ color: 0x333333 });
    } else {
      bg.roundRect(-70, -50, 140, 100, 10);
      bg.fill({ color: 0x222222 });
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

  private setupScrollInput(): void {
    this.eventMode = 'static';
    this.hitArea = {
      contains: (x: number, y: number) => {
        return x >= 0 && x <= this.currentScreenWidth &&
               y >= this.contentTop && y <= this.contentBottom;
      },
    };

    this.on('pointerdown', (e: any) => {
      this.isDragging = true;
      this.dragStartY = e.global.y;
      this.scrollStartY = this.scrollY;
    });

    this.on('pointermove', (e: any) => {
      if (!this.isDragging) return;
      const deltaY = this.dragStartY - e.global.y;
      this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollStartY + deltaY));
      this.applyScrollPosition();
    });

    this.on('pointerup', () => {
      this.isDragging = false;
    });

    this.on('pointerupoutside', () => {
      this.isDragging = false;
    });
  }

  private applyScrollPosition(): void {
    this.scrollContainer.y = this.contentTop - this.scrollY;
  }

  private createBackButton(): void {
    this.backButton = new Container();

    const bg = new Graphics();
    bg.roundRect(-50, -20, 100, 40, 8);
    bg.fill({ color: 0x666666 });
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
    this.backButton.y = this.currentScreenHeight - 50;
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
    this.initialize().then(() => {
      this.loadSavedProgress();
      this.refreshLevelButtons();
      this.visible = true;
    });
  }

  hide(): void {
    this.visible = false;
  }
}
