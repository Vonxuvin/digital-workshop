import { Application, Graphics } from 'pixi.js';
import { PhysicsManager } from './PhysicsManager';
import { WarningLine } from '../ui/components/WarningLine';
import { BlockPreview } from '../gameplay/BlockPreview';
import { BlockSpawner } from '../gameplay/BlockSpawner';
import { PropEffectHandler } from './PropEffectHandler';
import { ScoreSystem } from '../gameplay/ScoreSystem';
import { LevelConfig } from '../gameplay/LevelSystem';
import Matter from 'matter-js';

export class ContainerRenderer {
  private app: Application;
  private physics: PhysicsManager;
  private containerWalls: Graphics | null = null;
  private physicsWalls: Matter.Body[] = [];
  private warningLine: WarningLine | null = null;
  private containerWidth = 0;
  private containerHeight = 0;
  private containerOffsetX = 0;
  private groundY = 0;

  constructor(app: Application, physics: PhysicsManager) {
    this.app = app;
    this.physics = physics;
  }

  setup(
    config: LevelConfig | null,
    screenW: number,
    screenH: number,
    preview: BlockPreview,
    blockSpawner: BlockSpawner,
    propEffectHandler: PropEffectHandler,
    scoreSystem: ScoreSystem,
  ): void {
    if (config) {
      this.containerWidth = Math.min(config.container.width, screenW);
      this.containerHeight = Math.min(config.container.height, screenH);
    } else {
      this.containerWidth = screenW;
      this.containerHeight = screenH;
    }
    this.containerOffsetX = (screenW - this.containerWidth) / 2;
    this.groundY = this.containerHeight - 50;

    this.rebuildPhysicsWalls();

    if (this.warningLine) {
      this.app.stage.removeChild(this.warningLine);
      this.warningLine.destroy();
    }
    const warningConfig = config?.warning;
    this.warningLine = new WarningLine(this.containerHeight, this.containerWidth, warningConfig);
    this.warningLine.x = this.containerOffsetX;
    this.warningLine.y = this.groundY * 0.8;
    this.warningLine.visible = false;
    this.app.stage.addChild(this.warningLine);
    propEffectHandler.setWarningLine(this.warningLine);
    propEffectHandler.setScoreSystem(scoreSystem);
    preview.setGroundY(this.groundY);
    preview.setBounds(this.containerOffsetX, this.containerOffsetX + this.containerWidth);
    blockSpawner.setContainerBounds(this.containerWidth, this.containerOffsetX);
  }

  rebuildPhysicsWalls(): void {
    for (const wall of this.physicsWalls) {
      this.physics.removeBody(wall);
    }
    this.physicsWalls = [];

    const w = this.containerWidth || this.app.screen.width;
    const h = this.containerHeight || this.app.screen.height;
    const offsetX = this.containerOffsetX || 0;

    const ground = this.physics.createRectangle(offsetX + w / 2, this.groundY + 25, w, 50);
    ground.label = 'ground';
    const leftWall = this.physics.createRectangle(offsetX - 22, h / 2, 50, h);
    leftWall.label = 'wall_left';
    const rightWall = this.physics.createRectangle(offsetX + w + 22, h / 2, 50, h);
    rightWall.label = 'wall_right';

    this.physicsWalls = [ground, leftWall, rightWall];
  }

  handleResize(
    config: LevelConfig | null,
    screenW: number,
    screenH: number,
    preview: BlockPreview,
    blockSpawner: BlockSpawner,
    gameHUD: { layout: (w: number, h: number) => void },
  ): void {
    if (config) {
      this.containerWidth = Math.min(config.container.width, screenW);
      this.containerHeight = Math.min(config.container.height, screenH);
    } else {
      this.containerWidth = screenW;
      this.containerHeight = screenH;
    }
    this.containerOffsetX = (screenW - this.containerWidth) / 2;
    this.groundY = this.containerHeight - 50;

    this.rebuildPhysicsWalls();
    this.drawContainerWalls();
    blockSpawner.setContainerBounds(this.containerWidth, this.containerOffsetX);

    if (this.warningLine) {
      this.warningLine.y = this.groundY * 0.8;
    }
    gameHUD.layout(screenW, screenH);
  }

  drawContainerWalls(): void {
    this.clearContainerWalls();
    const w = this.containerWidth || this.app.screen.width;
    const offsetX = this.containerOffsetX || 0;

    this.containerWalls = new Graphics();
    this.containerWalls.rect(offsetX, this.groundY, w, 50);
    this.containerWalls.fill({ color: 0x2d2d44 });
    this.containerWalls.rect(offsetX, 0, 6, this.groundY);
    this.containerWalls.fill({ color: 0x4a4a6a });
    this.containerWalls.rect(offsetX + w - 6, 0, 6, this.groundY);
    this.containerWalls.fill({ color: 0x4a4a6a });
    this.containerWalls.moveTo(offsetX, 0);
    this.containerWalls.lineTo(offsetX, this.groundY);
    this.containerWalls.stroke({ width: 2, color: 0x6a6a8a });
    this.containerWalls.moveTo(offsetX + 6, 0);
    this.containerWalls.lineTo(offsetX + 6, this.groundY);
    this.containerWalls.stroke({ width: 1, color: 0x5a5a7a });
    this.containerWalls.moveTo(offsetX + w - 6, 0);
    this.containerWalls.lineTo(offsetX + w - 6, this.groundY);
    this.containerWalls.stroke({ width: 1, color: 0x5a5a7a });
    this.containerWalls.moveTo(offsetX + w, 0);
    this.containerWalls.lineTo(offsetX + w, this.groundY);
    this.containerWalls.stroke({ width: 2, color: 0x6a6a8a });
    this.containerWalls.moveTo(offsetX, this.groundY);
    this.containerWalls.lineTo(offsetX + w, this.groundY);
    this.containerWalls.stroke({ width: 2, color: 0x6a6a8a });
    this.app.stage.addChild(this.containerWalls);
  }

  clearContainerWalls(): void {
    if (this.containerWalls) {
      this.app.stage.removeChild(this.containerWalls);
      this.containerWalls.destroy();
      this.containerWalls = null;
    }
  }

  getWarningLine(): WarningLine | null {
    return this.warningLine;
  }

  getContainerWidth(): number {
    return this.containerWidth;
  }

  getContainerHeight(): number {
    return this.containerHeight;
  }

  getContainerOffsetX(): number {
    return this.containerOffsetX;
  }

  getGroundY(): number {
    return this.groundY;
  }

  getPhysicsWalls(): Matter.Body[] {
    return this.physicsWalls;
  }

  destroy(): void {
    this.clearContainerWalls();
    for (const wall of this.physicsWalls) {
      this.physics.removeBody(wall);
    }
    this.physicsWalls = [];
    if (this.warningLine) {
      this.warningLine.destroy();
      this.warningLine = null;
    }
  }
}