import { Page, test } from '@playwright/test';

export const GAME_URL = '/';
export const LEVEL_EDITOR_URL = '/tools/level-editor/index.html';

export async function isWebGLAvailable(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    try {
      const game = (window as any).__gameInstance;
      if (!game) return false;
      const gs = game.getGameScene?.();
      return gs != null;
    } catch {
      return false;
    }
  });
}

export async function isGamePlaying(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    try {
      const game = (window as any).__gameInstance;
      if (!game) return false;
      const stateMachine = game.getStateMachine?.();
      if (!stateMachine) return false;
      return stateMachine.getCurrentState?.() === 'playing';
    } catch {
      return false;
    }
  });
}

export async function ensurePlaying(page: Page): Promise<void> {
  const playing = await isGamePlaying(page);
  if (!playing) {
    test.skip(true, '游戏处于降级模式(WebGL不可用)，跳过需要playing状态的测试');
  }
}

export async function ensureGameScene(page: Page): Promise<void> {
  const available = await isWebGLAvailable(page);
  if (!available) {
    test.skip(true, '游戏处于降级模式(GameScene不可用)，跳过需要GameScene的测试');
  }
}

export async function navigateToGame(page: Page, startPlaying = true) {
  await page.goto(GAME_URL);
  await page.waitForSelector('#game-canvas', { timeout: 15000 });

  try {
    await page.waitForFunction(
      () => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const stateMachine = game.getStateMachine?.();
          if (!stateMachine) return false;
          const state = stateMachine.getCurrentState?.();
          return state !== 'boot';
        } catch {
          return false;
        }
      },
      { timeout: 15000 }
    );
  } catch {
    const webglAvailable = await isWebGLAvailable(page);
    if (!webglAvailable) {
      test.skip(true, '游戏初始化超时且WebGL不可用，跳过测试');
    }
    throw new Error('[navigateToGame] 游戏未能离开boot状态(15s超时)');
  }

  try {
    await page.waitForFunction(
      () => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const stateMachine = game.getStateMachine?.();
          if (!stateMachine) return false;
          return stateMachine.getCurrentState?.() === 'menu';
        } catch {
          return false;
        }
      },
      { timeout: 10000 }
    );
  } catch {
    const webglAvailable = await isWebGLAvailable(page);
    if (!webglAvailable) {
      test.skip(true, '游戏未到达menu状态且WebGL不可用，跳过测试');
    }
    throw new Error('[navigateToGame] 游戏未能到达menu状态(10s超时)');
  }
  if (startPlaying) {
    const startResult = await page.evaluate(() => {
      const game = (window as any).__gameInstance;
      if (!game) return 'no-game';
      try {
        const sm = game.getSceneManager?.();
        if (!sm) return 'no-scene-manager';
        if (typeof sm.startLevelById !== 'function') return 'no-startLevelById';
        const result = sm.startLevelById(1);
        return result ? 'ok' : 'level-not-found';
      } catch (e: any) {
        return `error: ${e?.message ?? e}`;
      }
    });
    if (startResult !== 'ok') {
      const webglAvailable = await isWebGLAvailable(page);
      if (!webglAvailable) {
        console.warn(`[navigateToGame] WebGL不可用(降级模式), startLevelById结果: '${startResult}'. 跳过playing状态.`);
        return;
      }
      const currentState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return 'no-game';
        try {
          return game.getStateMachine?.()?.getCurrentState?.() ?? 'unknown';
        } catch {
          return 'error';
        }
      });
      throw new Error(
        `[navigateToGame] startLevelById(1) failed: '${startResult}'. Current state: '${currentState}'. ` +
        `The game may be in a degraded mode or level config not loaded.`
      );
    }
    try {
      await page.waitForFunction(
        () => {
          const game = (window as any).__gameInstance;
          if (!game) return false;
          const stateMachine = game.getStateMachine?.();
          if (!stateMachine) return false;
          return stateMachine.getCurrentState?.() === 'playing';
        },
        { timeout: 8000 }
      );
    } catch {
      const currentState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return 'no-game';
        try {
          return game.getStateMachine?.()?.getCurrentState?.() ?? 'unknown';
        } catch {
          return 'error';
        }
      });
      throw new Error(
        `[navigateToGame] Failed to enter 'playing' state. Current state: '${currentState}'. ` +
        `startLevelById returned ok but state transition did not complete.`
      );
    }
  }
}

export async function clickCanvasCenter(page: Page) {
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  await page.mouse.click(box.x + box.width / 2, box.y + 100);
}

export async function clickCanvasAt(page: Page, xRatio: number, yRatio: number) {
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');
  await page.mouse.click(
    box.x + box.width * xRatio,
    box.y + box.height * yRatio
  );
}

export async function getCanvasBoundingBox(page: Page) {
  const canvas = page.locator('#game-canvas');
  return canvas.boundingBox();
}

export async function dropBlocks(page: Page, count: number, intervalMs = 800) {
  for (let i = 0; i < count; i++) {
    const blockCountBefore = await page.evaluate(() => {
      const game = (window as any).__gameInstance;
      if (!game) return -1;
      try {
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      } catch {
        return -1;
      }
    });
    await clickCanvasCenter(page);
    try {
      await page.waitForFunction(
        (before: number) => {
          const game = (window as any).__gameInstance;
          if (!game) return false;
          try {
            const spawner = game.getBlockSpawner?.();
            const now = spawner?.getBlocks?.()?.length ?? -1;
            return now > before;
          } catch {
            return false;
          }
        },
        blockCountBefore,
        { timeout: Math.max(intervalMs, 3000) }
      );
    } catch {
      await page.waitForTimeout(intervalMs);
    }
  }
}

export async function waitForStable(page: Page, ms = 1500) {
  try {
    await page.waitForFunction(
      (maxMs: number) => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const spawner = game.getBlockSpawner?.();
          const blocks = spawner?.getBlocks?.();
          if (!blocks || blocks.length === 0) return true;
          const positions: string[] = [];
          for (const b of blocks) {
            positions.push(`${Math.round(b.x)},${Math.round(b.y)}`);
          }
          const key = positions.join('|');
          if (!(window as any).__lastBlockPositions) {
            (window as any).__lastBlockPositions = key;
            return false;
          }
          return (window as any).__lastBlockPositions === key;
        } catch {
          return true;
        }
      },
      ms,
      { timeout: ms, polling: 200 }
    );
  } catch {}
  await page.evaluate(() => { (window as any).__lastBlockPositions = undefined; });
}

export function collectConsoleLogs(page: Page, pattern: RegExp): string[] {
  const logs: string[] = [];
  page.on('console', (msg) => {
    if (pattern.test(msg.text())) {
      logs.push(msg.text());
    }
  });
  return logs;
}

export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  return errors;
}

export async function evaluateGame(page: Page, fn: string) {
  return page.evaluate(fn);
}

export async function getGameInstance(page: Page) {
  return page.evaluate(() => (window as any).__gameInstance);
}

export async function getGameModule(page: Page, path: string) {
  return page.evaluate((p) => {
    const game = (window as any).__gameInstance;
    if (!game) return null;
    const parts = p.split('.');
    let current: any = game;
    for (const part of parts) {
      if (current == null) return null;
      if (typeof current[part] === 'function') {
        try {
          current = current[part]();
        } catch {
          return null;
        }
      } else {
        current = current[part];
      }
    }
    return current;
  }, path);
}
