import 'pixi.js/browser';
import { Game } from './core/Game';

async function init() {
  console.log('[main.ts] 步骤A: 获取canvas元素');
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('[main.ts] 错误: canvas元素不存在!');
    return;
  }
  console.log('[main.ts] 步骤B: 创建Game实例');
  const game = new Game(canvas);
  console.log('[main.ts] 步骤C: 调用game.init()');
  await game.init();
  console.log('[main.ts] 初始化完成!');
}

init().catch((err) => {
  console.error('[main.ts] 未捕获的初始化错误:', err);
});
