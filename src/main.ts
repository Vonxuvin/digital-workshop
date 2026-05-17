import { logger, LogLevel } from './utils/Logger';
import 'pixi.js/browser';
import { Game } from './core/Game';

declare global {
  interface Window {
    __gameInstance?: Game;
    __TimeManager?: typeof import('./utils/TimeManager').TimeManager;
  }
}

async function init() {
  logger.setLevel(LogLevel.INFO);
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    logger.error('main', '错误: canvas元素不存在!');
    return;
  }
  const game = new Game(canvas);
  window.__gameInstance = game;
  window.__TimeManager = (await import('./utils/TimeManager')).TimeManager;
  await game.init();
}

init().catch((err) => {
  logger.error('main', '未捕获的初始化错误:', err);
});
