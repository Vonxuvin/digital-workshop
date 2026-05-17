import { logger } from './utils/Logger';
import { Game } from './core/Game';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const wx: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    logger.info('WeChatEntry', '微信小游戏初始化完成');
  } catch (err) {
    logger.error('WeChatEntry', '初始化失败:', err);
  }
}

initWechatGame();
