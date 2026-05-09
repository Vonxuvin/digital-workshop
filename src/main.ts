import { Application, Graphics, Text } from 'pixi.js';

async function init() {
  const app = new Application();
  await app.init({
    canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
    resizeTo: window,
    backgroundColor: 0x1a1a2e,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  const graphics = new Graphics();
  graphics.circle(0, 0, 50);
  graphics.fill(0x4ECDC4);
  graphics.x = app.screen.width / 2;
  graphics.y = app.screen.height / 2;
  app.stage.addChild(graphics);

  const text = new Text({
    text: '数字工坊 - 项目已初始化',
    style: {
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 0xffffff,
    },
  });
  text.anchor.set(0.5);
  text.x = app.screen.width / 2;
  text.y = app.screen.height / 2 + 80;
  app.stage.addChild(text);

  console.log('[Digital Workshop] 项目初始化完成', {
    renderer: app.renderer.type === 2 ? 'WebGL' : 'Canvas',
    width: app.screen.width,
    height: app.screen.height,
  });
}

init().catch(console.error);
