import { Page } from '@playwright/test';

export const GAME_URL = '/';
export const LEVEL_EDITOR_URL = '/tools/level-editor/index.html';

export async function navigateToGame(page: Page, startPlaying = true) {
  await page.goto(GAME_URL);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('#game-canvas', { timeout: 20000 });
  await page.waitForFunction(
    () => {
      const game = (window as any).__gameInstance;
      if (!game) return false;
      try {
        const stateMachine = game.getStateMachine?.();
        if (!stateMachine) return false;
        const state = stateMachine.getCurrentState?.();
        return state === 'menu' || state === 'loading';
      } catch {
        return false;
      }
    },
    { timeout: 30000 }
  );
  if (startPlaying) {
    await page.evaluate(() => {
      const game = (window as any).__gameInstance;
      if (!game) return;
      try {
        const sm = game.getSceneManager?.();
        if (sm) {
          sm.startLevelById?.(1);
        }
      } catch (e) {
        console.warn('[helpers] startLevelById failed:', e);
      }
    });
    try {
      await page.waitForFunction(
        () => {
          const game = (window as any).__gameInstance;
          if (!game) return false;
          const stateMachine = game.getStateMachine?.();
          if (!stateMachine) return false;
          return stateMachine.getCurrentState?.() === 'playing';
        },
        { timeout: 10000 }
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
      console.warn(`[helpers] Failed to enter playing state. Current: ${currentState}. Waiting 2s...`);
      await page.waitForTimeout(2000);
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

export async function waitForStable(page: Page, ms = 2000) {
  await page.waitForTimeout(ms);
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
