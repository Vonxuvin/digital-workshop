import { Page } from '@playwright/test';

export const GAME_URL = '/';
export const LEVEL_EDITOR_URL = '/tools/level-editor/index.html';

export async function navigateToGame(page: Page, startPlaying = true) {
  await page.goto(GAME_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#game-canvas', { timeout: 10000 });
  await page.waitForTimeout(3000);
  if (startPlaying) {
    await page.evaluate(() => {
      const game = (window as any).__gameInstance;
      if (!game) return;
      const sm = game.getSceneManager?.();
      if (sm) {
        sm.startLevelById?.(1);
      }
    });
    await page.waitForTimeout(1000);
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
    await clickCanvasCenter(page);
    await page.waitForTimeout(intervalMs);
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
        current = current[part]();
      } else {
        current = current[part];
      }
    }
    return current;
  }, path);
}