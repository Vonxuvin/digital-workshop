import { Game } from './core/Game';

async function init() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const game = new Game(canvas);
  await game.init();
  console.log('[Day 4] 核心原型完成：点击屏幕投放方块');
}

init().catch(console.error);
