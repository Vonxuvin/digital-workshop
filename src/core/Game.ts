import { Application } from 'pixi.js';
import { PhysicsManager } from './PhysicsManager';
import { InputManager } from './InputManager';
import { Block, BLOCK_CONFIGS } from '../gameplay/Block';
import { BlockPreview } from '../gameplay/BlockPreview';
import { MergeSystem } from '../gameplay/MergeSystem';
import { createPlatformAdapter } from '../platform/PlatformFactory';
import { eventBus } from '../utils/EventBus';

export class Game {
  private app: Application;
  private physics: PhysicsManager;
  private input: InputManager;
  private preview: BlockPreview;
  private mergeSystem: MergeSystem;
  private blocks: Block[] = [];
  private currentValue: number = 1;
  private canDrop = true;
  private dropCooldown = 500;
  private groundY: number;

  constructor(canvas: HTMLCanvasElement) {
    this.app = new Application();
    this.physics = new PhysicsManager();
    this.preview = new BlockPreview();
    this.input = new InputManager(canvas);
    this.mergeSystem = new MergeSystem(this.physics);
    this.groundY = window.innerHeight - 50;
  }

  async init(): Promise<void> {
    const platform = createPlatformAdapter();
    await platform.init();
    const systemInfo = await platform.getSystemInfo();

    await this.app.init({
      canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
      resizeTo: window,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: systemInfo.pixelRatio || 1,
      autoDensity: true,
    });

    this.setupContainer();
    this.setupInput();
    this.setupMergeListener();
    this.app.stage.addChild(this.preview);

    this.app.ticker.add(this.update.bind(this));
    this.physics.start();

    console.log('[Game] 初始化完成');
  }

  private setupContainer(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.groundY = h - 50;

    this.physics.createRectangle(w / 2, this.groundY + 25, w, 50);
    this.physics.createRectangle(-25, h / 2, 50, h);
    this.physics.createRectangle(w + 25, h / 2, 50, h);
  }

  private setupInput(): void {
    const dropY = 80;

    this.input.onDown((state) => {
      if (!this.canDrop) return;
      this.preview.show(this.currentValue, state.position.x, dropY);
    });

    this.input.onMove((state) => {
      if (state.isDown && this.preview.visible) {
        this.preview.updatePosition(state.position.x);
      }
    });

    this.input.onUp(() => {
      if (this.preview.visible && this.canDrop) {
        this.dropBlock(this.preview.getTargetX(), dropY, this.currentValue);
        this.preview.hide();
        this.startCooldown();
      }
    });
  }

  private setupMergeListener(): void {
    eventBus.on('block:merged', (data: any) => {
      const { newBlock, destroyedBlocks } = data;

      for (const destroyed of destroyedBlocks) {
        const idx = this.blocks.indexOf(destroyed);
        if (idx > -1) {
          this.blocks.splice(idx, 1);
        }
      }

      this.app.stage.addChild(newBlock);
      this.blocks.push(newBlock);
    });
  }

  private dropBlock(x: number, y: number, value: number): void {
    const config = BLOCK_CONFIGS[value] || BLOCK_CONFIGS[1];
    const body = this.physics.createCircle(x, y, config.radius, {
      density: config.mass * 0.001,
    });
    const block = new Block(body, value);
    this.app.stage.addChild(block);
    this.blocks.push(block);
    this.mergeSystem.registerBlock(block);

    this.currentValue = this.getRandomValue();
    console.log(`[Game] 投放方块 ${value}，下一个: ${this.currentValue}`);
  }

  private getRandomValue(): number {
    const values = [1, 1, 1, 1, 2, 2, 2, 4, 4, 8];
    return values[Math.floor(Math.random() * values.length)];
  }

  private startCooldown(): void {
    this.canDrop = false;
    setTimeout(() => {
      this.canDrop = true;
    }, this.dropCooldown);
  }

  private update(): void {
    this.blocks.forEach(block => block.syncFromBody());

    this.blocks = this.blocks.filter(block => {
      if (block.y > this.app.screen.height + 100) {
        this.mergeSystem.unregisterBlock(block);
        this.physics.removeBody(block.body);
        block.destroy();
        return false;
      }
      return true;
    });
  }

  getApp(): Application {
    return this.app;
  }
}
