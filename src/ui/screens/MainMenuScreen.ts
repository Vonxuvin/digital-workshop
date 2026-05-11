import { Container, Text, Graphics } from 'pixi.js';
import { Screen } from '../UIManager';
import { eventBus } from '../../utils/EventBus';
import { Layout } from '../layout/Layout';
import { AudioManager } from '../../core/AudioManager';

export class MainMenuScreen extends Screen {
  private titleText!: Text;
  private startButton!: Container;
  private levelSelectButton!: Container;
  private settingsButton!: Container;
  private soundToggleButton!: Container;
  private versionText!: Text;
  private soundIcon!: Text;
  private allButtons: Container[] = [];
  private buttonTargetY: number[] = [];
  private currentScreenWidth = 800;
  private currentScreenHeight = 600;
  private initialized = false;

  constructor() {
    super();
  }

  private initialize(): void {
    if (this.initialized) return;
    this.createTitle();
    this.createButtons();
    this.createSoundToggle();
    this.createVersionText();
    this.initialized = true;
  }

  private createTitle(): void {
    if (this.titleText) {
      this.removeChild(this.titleText);
      this.titleText.destroy();
    }
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
    const pos = Layout.anchor(
      { x: 0, y: 0, width: 200, height: 60 },
      { width: this.currentScreenWidth, height: this.currentScreenHeight },
      'center',
      'top',
      0,
      120,
    );
    this.titleText.x = pos.x;
    this.titleText.y = pos.y;
    this.addChild(this.titleText);
  }

  private createButtons(): void {
    this.allButtons.forEach(btn => {
      this.removeChild(btn);
      btn.destroy();
    });
    this.allButtons = [];

    this.startButton = this.createButton('开始游戏', 0x4ECDC4, () => {
      eventBus.emit('ui:startGame');
    });

    this.levelSelectButton = this.createButton('关卡选择', 0x45B7D1, () => {
      eventBus.emit('ui:levelSelect');
    });

    this.settingsButton = this.createButton('设置', 0x95E1D3, () => {
      eventBus.emit('ui:settings');
    });

    this.allButtons = [this.startButton, this.levelSelectButton, this.settingsButton];

    const positions = Layout.flex(
      this.allButtons.map(() => ({ width: 200, height: 60 })),
      'column',
      20,
      0,
      0,
    );

    const offsetY = 260;
    this.allButtons.forEach((btn, i) => {
      btn.x = this.currentScreenWidth / 2;
      btn.y = offsetY + positions[i].y;
      this.addChild(btn);
    });
  }

  private createButton(label: string, color: number, onClick: () => void): Container {
    const button = new Container();

    const bg = new Graphics();
    bg.roundRect(-100, -30, 200, 60, 15);
    bg.fill(color);
    button.addChild(bg);

    const text = new Text({
      text: label,
      style: {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xffffff,
        fontWeight: 'bold',
      },
    });
    text.anchor.set(0.5);
    button.addChild(text);

    button.eventMode = 'static';
    button.cursor = 'pointer';
    button.on('pointerdown', onClick);
    button.on('pointerover', () => { bg.scale.set(1.05); });
    button.on('pointerout', () => { bg.scale.set(1); });

    return button;
  }

  private createSoundToggle(): void {
    if (this.soundToggleButton) {
      this.removeChild(this.soundToggleButton);
      this.soundToggleButton.destroy();
    }
    this.soundToggleButton = new Container();

    const bg = new Graphics();
    bg.circle(0, 0, 20);
    bg.fill({ color: 0x333333 });
    this.soundToggleButton.addChild(bg);

    const audioManager = AudioManager.getInstance();
    this.soundIcon = new Text({
      text: audioManager.isCurrentlyMuted() ? '🔇' : '🔊',
      style: {
        fontFamily: 'Arial',
        fontSize: 18,
        fill: 0xffffff,
      },
    });
    this.soundIcon.anchor.set(0.5);
    this.soundToggleButton.addChild(this.soundIcon);

    const pos = Layout.anchor(
      { x: 0, y: 0, width: 40, height: 40 },
      { width: this.currentScreenWidth, height: this.currentScreenHeight },
      'right',
      'top',
      20,
      20,
    );
    this.soundToggleButton.x = pos.x;
    this.soundToggleButton.y = pos.y;

    this.soundToggleButton.eventMode = 'static';
    this.soundToggleButton.cursor = 'pointer';
    this.soundToggleButton.on('pointerdown', () => {
      const am = AudioManager.getInstance();
      const isMuted = am.toggleMute();
      this.soundIcon.text = isMuted ? '🔇' : '🔊';
    });

    this.addChild(this.soundToggleButton);
  }

  private createVersionText(): void {
    if (this.versionText) {
      this.removeChild(this.versionText);
      this.versionText.destroy();
    }
    this.versionText = new Text({
      text: 'v0.1.0',
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0x666666,
      },
    });
    this.versionText.anchor.set(0.5);
    const pos = Layout.anchor(
      { x: 0, y: 0, width: 60, height: 20 },
      { width: this.currentScreenWidth, height: this.currentScreenHeight },
      'center',
      'bottom',
      0,
      20,
    );
    this.versionText.x = pos.x;
    this.versionText.y = pos.y;
    this.addChild(this.versionText);
  }

  show(screenWidth?: number, screenHeight?: number): void {
    this.currentScreenWidth = screenWidth || 800;
    this.currentScreenHeight = screenHeight || 600;
    this.initialize();

    this.visible = true;
    this.alpha = 0;

    this.allButtons.forEach((btn, i) => {
      const targetY = btn.y;
      btn.y = targetY + 80;
      btn.alpha = 0;
      this.buttonTargetY[i] = targetY;
    });

    let fadeIn = 0;
    const animate = () => {
      fadeIn += 0.05;
      this.alpha = Math.min(fadeIn, 1);
      if (fadeIn < 1) {
        requestAnimationFrame(animate);
      }
    };
    animate();

    this.allButtons.forEach((btn, i) => {
      setTimeout(() => {
        const targetY = this.buttonTargetY[i];
        let progress = 0;
        const slideIn = () => {
          progress += 0.08;
          if (progress >= 1) {
            btn.y = targetY;
            btn.alpha = 1;
            return;
          }
          btn.y = targetY + 80 * (1 - progress);
          btn.alpha = progress;
          requestAnimationFrame(slideIn);
        };
        slideIn();
      }, i * 100);
    });
  }

  hide(): void {
    this.visible = false;
  }
}
