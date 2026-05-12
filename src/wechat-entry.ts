import { Game } from './core/Game';

declare const wx: any;
declare const GameGlobal: any;

async function initWechatGame(): Promise<void> {
  const canvas = wx.createCanvas();
  const systemInfo = wx.getSystemInfoSync();
  canvas.width = systemInfo.windowWidth;
  canvas.height = systemInfo.windowHeight;

  const game = new Game(canvas as unknown as HTMLCanvasElement);
  await game.init();
  console.log('[WeChatEntry] 微信小游戏初始化完成');
}

initWechatGame().catch((err) => {
  console.error('[WeChatEntry] 初始化失败:', err);
});
