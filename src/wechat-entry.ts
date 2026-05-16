import { Game } from './core/Game';

declare const wx: any;
declare const GameGlobal: any;

async function initWechatGame(): Promise<void> {
  try {
    const canvas = wx.createCanvas();
    const systemInfo = wx.getSystemInfoSync();
    const dpr = systemInfo.pixelRatio || 1;
    canvas.width = systemInfo.windowWidth * dpr;
    canvas.height = systemInfo.windowHeight * dpr;

    GameGlobal.canvas = canvas;

    const game = new Game(canvas as unknown as HTMLCanvasElement);
    await game.init();
    console.log('[WeChatEntry] 微信小游戏初始化完成');
  } catch (err) {
    console.error('[WeChatEntry] 初始化失败:', err);
  }
}

initWechatGame();
