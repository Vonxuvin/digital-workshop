import 'pixi.js/browser';
import { Game } from './core/Game';

async function init() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('[main.ts] 错误: canvas元素不存在!');
    return;
  }
  const game = new Game(canvas);
  (window as any).__gameInstance = game;
  await game.init();
}

init().catch((err) => {
  console.error('[main.ts] 未捕获的初始化错误:', err);
});
