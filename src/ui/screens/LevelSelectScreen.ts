import { Container, Graphics, Text, FederatedPointerEvent } from 'pixi.js';
import gsap from 'gsap';
import { Screen } from '../UIManager';
import { SaveManager } from '../../core/SaveManager';
import { LevelLoader } from '../../core/LevelLoader';

interface LevelCardData {
  id: number;
  name: string;
  objectiveType: string;
  objectiveTarget: number;
  stars: number[];
  unlocked: boolean;
  completed: boolean;
  bestScore: number;
  earnedStars: number;
}

export class LevelSelectScreen extends Screen {
  public container: Container;
  private title: Text;
  private backButton: Container;
  private levelCards: Container[] = [];
  private levelData: LevelCardData[] = [];
  private onBack: () => void;
  private onSelectLevel: (levelId: number) => void;
  private saveManager: SaveManager;
  private levelLoader: LevelLoader;
  public scrollContainer: Container;
  private scrollMask: Graphics;
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartScrollY: number = 0;
  private scrollIndicator: Graphics;
  private scrollIndicatorTrack: Graphics;
  private screenWidth: number = 800;
  private screenHeight: number = 600;

  constructor(
    onBack: () => void,
    onSelectLevel: (levelId: number) => void,
    saveManager: SaveManager,
    levelLoader: LevelLoader,
  ) {
    super();
    this.onBack = onBack;
    this.onSelectLevel = onSelectLevel;
    this.saveManager = saveManager;
    this.levelLoader = levelLoader;

    this.container = new Container();

    this.title = new Text({
      text: '选择关卡',
      style: {
        fontFamily: 'Arial',
        fontSize: 36,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    this.title.anchor.set(0.5);
    this.container.addChild(this.title);

    this.backButton = this.createBackButton();
    this.container.addChild(this.backButton);

    this.scrollMask = new Graphics();
    this.container.addChild(this.scrollMask);

    this.scrollContainer = new Container();
    this.container.addChild(this.scrollContainer);

    this.scrollIndicatorTrack = new Graphics();
    this.container.addChild(this.scrollIndicatorTrack);

    this.scrollIndicator = new Graphics();
    this.container.addChild(this.scrollIndicator);

    this.container.eventMode = 'static';
    this.container.on('pointerdown', this.onPointerDown.bind(this));
    this.container.on('pointermove', this.onPointerMove.bind(this));
    this.container.on('pointerup', this.onPointerUp.bind(this));
    this.container.on('pointerupoutside', this.onPointerUp.bind(this));

    this.addChild(this.container);

    this.loadLevelData();
  }

  private createBackButton(): Container {
    const btn = new Container();
    const bg = new Graphics();
    bg.roundRect(0, 0, 100, 40, 8);
    bg.fill({ color: 0x2d3436 });
    bg.stroke({ width: 2, color: 0x636e72 });
    btn.addChild(bg);

    const label = new Text({
      text: '← 返回',
      style: {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 0xffffff,
      },
    });
    label.anchor.set(0.5);
    label.x = 50;
    label.y = 20;
    btn.addChild(label);

    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => this.onBack());
    return btn;
  }

  private loadLevelData(): void {
    const allLevels = this.levelLoader.getAllLevelConfigsSync();
    this.levelData = allLevels.map((config) => {
      const progress = this.saveManager.getLevelProgress(config.id);
      const objectiveType = config.objective?.type || 'score';
      const objectiveTarget = config.objective?.target || 0;
      const stars = config.rewards?.stars || [0, 0, 0];

      return {
        id: config.id,
        name: config.name || `关卡 ${config.id}`,
        objectiveType,
        objectiveTarget,
        stars,
        unlocked: config.id === 1 || progress.unlocked || false,
        completed: progress.completed || false,
        bestScore: progress.highScore || 0,
        earnedStars: progress.stars || 0,
      };
    });
  }

  private createLevelCard(data: LevelCardData, index: number): Container {
    const card = new Container();
    const cardWidth = 340;
    const cardHeight = 110;
    const x = (this.screenWidth - cardWidth) / 2;
    const y = index * (cardHeight + 12);

    const bg = new Graphics();
    if (data.completed) {
      bg.roundRect(0, 0, cardWidth, cardHeight, 12);
      bg.fill({ color: 0x1a3a2a, alpha: 0.9 });
      bg.roundRect(0, 0, cardWidth, cardHeight, 12);
      bg.stroke({ width: 2, color: 0x4a9a5a, alpha: 0.6 });
    } else if (data.unlocked) {
      bg.roundRect(0, 0, cardWidth, cardHeight, 12);
      bg.fill({ color: 0x1a1a3a, alpha: 0.9 });
      bg.roundRect(0, 0, cardWidth, cardHeight, 12);
      bg.stroke({ width: 2, color: 0x4a4a8a, alpha: 0.6 });
    } else {
      bg.roundRect(0, 0, cardWidth, cardHeight, 12);
      bg.fill({ color: 0x1a1a1a, alpha: 0.8 });
      bg.roundRect(0, 0, cardWidth, cardHeight, 12);
      bg.stroke({ width: 2, color: 0x333333, alpha: 0.5 });
    }
    card.addChild(bg);

    const levelNum = new Text({
      text: `${data.id}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 22,
        fill: data.unlocked ? 0xffffff : 0x555555,
        fontWeight: 'bold',
      },
    });
    levelNum.x = 16;
    levelNum.y = 12;
    card.addChild(levelNum);

    const nameText = new Text({
      text: data.name,
      style: {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: data.unlocked ? 0xdddddd : 0x555555,
        fontWeight: 'bold',
      },
    });
    nameText.x = 50;
    nameText.y = 12;
    card.addChild(nameText);

    const objectiveIcon = data.objectiveType === 'score' ? '🎯' : data.objectiveType === 'target_merge' ? '🔮' : data.objectiveType === 'clear_obstacle' ? '💥' : '⏱';
    const objectiveLabel = data.objectiveType === 'score' ? '得分' : data.objectiveType === 'target_merge' ? '合成' : data.objectiveType === 'clear_obstacle' ? '清除障碍' : '生存';
    const objectiveUnit = data.objectiveType === 'clear_obstacle' ? '个' : data.objectiveType === 'survival' ? '秒' : '';
    const objectiveText = new Text({
      text: `${objectiveIcon} ${objectiveLabel}: ${data.objectiveTarget}${objectiveUnit}`,
      style: {
        fontFamily: 'Arial',
        fontSize: 13,
        fill: data.unlocked ? 0xaaaaaa : 0x444444,
      },
    });
    objectiveText.x = 16;
    objectiveText.y = 46;
    card.addChild(objectiveText);

    if (data.unlocked) {
      const bestText = new Text({
        text: `最佳: ${data.bestScore || '--'}`,
        style: {
          fontFamily: 'Arial',
          fontSize: 13,
          fill: 0xffd700,
        },
      });
      bestText.x = 16;
      bestText.y = 66;
      card.addChild(bestText);
    } else {
      const unlockHint = new Text({
        text: `🔒 通关关卡 ${data.id - 1} 解锁`,
        style: {
          fontFamily: 'Arial',
          fontSize: 13,
          fill: 0x666666,
        },
      });
      unlockHint.x = 16;
      unlockHint.y = 66;
      card.addChild(unlockHint);
    }

    const starsContainer = new Container();
    starsContainer.x = cardWidth - 100;
    starsContainer.y = 20;
    for (let i = 0; i < 3; i++) {
      const star = new Text({
        text: i < data.earnedStars ? '★' : '☆',
        style: {
          fontFamily: 'Arial',
          fontSize: 22,
          fill: i < data.earnedStars ? 0xffd700 : 0x444444,
        },
      });
      star.x = i * 28;
      starsContainer.addChild(star);
    }
    card.addChild(starsContainer);

    if (data.unlocked) {
      card.eventMode = 'static';
      card.cursor = 'pointer';
      card.on('pointerdown', () => this.onSelectLevel(data.id));
    }

    card.x = x;
    card.y = y;

    return card;
  }

  layout(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;

    this.title.x = screenWidth / 2;
    this.title.y = 30;

    this.backButton.x = 20;
    this.backButton.y = 10;

    this.scrollContainer.removeChildren();
    this.levelCards = [];

    const scrollTop = 80;
    const scrollBottom = screenHeight - 20;
    const visibleHeight = scrollBottom - scrollTop;

    this.scrollMask.clear();
    this.scrollMask.rect(0, scrollTop, screenWidth, visibleHeight);
    this.scrollMask.fill({ color: 0xffffff, alpha: 0.001 });

    this.scrollContainer.mask = this.scrollMask;

    this.levelData.forEach((data, index) => {
      const card = this.createLevelCard(data, index);
      this.scrollContainer.addChild(card);
      this.levelCards.push(card);
    });

    const lastCard = this.levelCards[this.levelCards.length - 1];
    if (lastCard) {
      const totalContentHeight = lastCard.y + 110 + 12;
      this.maxScrollY = Math.max(0, totalContentHeight - visibleHeight);
    }

    this.scrollIndicatorTrack.clear();
    this.scrollIndicatorTrack.rect(screenWidth - 8, scrollTop, 6, visibleHeight);
    this.scrollIndicatorTrack.fill({ color: 0x333333, alpha: 0.5 });

    this.updateScrollIndicator();
    this.scrollContainer.y = scrollTop - this.scrollY;
  }

  private updateScrollIndicator(): void {
    const scrollTop = 80;
    const visibleHeight = this.screenHeight - 100;
    if (this.maxScrollY <= 0) {
      this.scrollIndicator.visible = false;
      return;
    }

    const trackHeight = visibleHeight;
    const thumbHeight = Math.max(30, trackHeight * (visibleHeight / (visibleHeight + this.maxScrollY)));
    const thumbY = scrollTop + (this.scrollY / this.maxScrollY) * (trackHeight - thumbHeight);

    this.scrollIndicator.clear();
    this.scrollIndicator.roundRect(this.screenWidth - 8, thumbY, 6, thumbHeight, 3);
    this.scrollIndicator.fill({ color: 0x888888, alpha: 0.7 });
    this.scrollIndicator.visible = true;
  }

  private onPointerDown(e: FederatedPointerEvent): void {
    this.isDragging = true;
    this.dragStartY = e.global.y;
    this.dragStartScrollY = this.scrollY;
  }

  private onPointerMove(e: FederatedPointerEvent): void {
    if (!this.isDragging) return;
    const deltaY = this.dragStartY - e.global.y;
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.dragStartScrollY + deltaY));
    this.scrollContainer.y = 80 - this.scrollY;
    this.updateScrollIndicator();
  }

  private onPointerUp(): void {
    this.isDragging = false;
  }

  onShow(): void {
    this.loadLevelData();
    this.layout(this.screenWidth, this.screenHeight);
    this.container.alpha = 0;
    gsap.to(this.container, { alpha: 1, duration: 0.3 });
  }

  show(screenWidth?: number, screenHeight?: number): void {
    if (screenWidth !== undefined) this.screenWidth = screenWidth;
    if (screenHeight !== undefined) this.screenHeight = screenHeight;
    this.onShow();
  }

  updateLevelProgress(levelId: number, stars: number): void {
    const data = this.levelData.find(d => d.id === levelId);
    if (data) {
      data.earnedStars = Math.max(data.earnedStars, stars);
      data.completed = true;
    }
    this.layout(this.screenWidth, this.screenHeight);
  }

  onHide(): void {
    this.scrollY = 0;
    this.isDragging = false;
  }

  hide(): void {
    this.onHide();
  }

  update(): void {}

  destroy(): void {
    this.container.removeAllListeners();
    this.container.destroy({ children: true });
  }
}