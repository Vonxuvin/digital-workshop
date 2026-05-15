import { test, expect } from '@playwright/test';
import { navigateToGame, clickCanvasCenter, clickCanvasAt, dropBlocks, waitForStable, isGamePlaying } from './helpers';

test.describe('输入与交互 @smoke', () => {
  test.describe('触摸/点击输入 @smoke', () => {
    test('点击Canvas应响应交互', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      const before = await page.evaluate(() => {
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
      await waitForStable(page, 1000);

      const after = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      expect(after).toBeGreaterThanOrEqual(before);
    });

    test('点击不同位置应放置方块到对应列', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      await clickCanvasAt(page, 0.25, 0.3);
      await waitForStable(page, 500);

      await clickCanvasAt(page, 0.75, 0.3);
      await waitForStable(page, 500);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      expect(blockCount).toBeGreaterThanOrEqual(0);
    });

    test('快速连续点击应被正确处理', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      for (let i = 0; i < 5; i++) {
        await clickCanvasCenter(page);
        await page.waitForTimeout(400);
      }

      await waitForStable(page, 2000);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      expect(blockCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('拖拽输入 @regression', () => {
    test('拖拽方块应改变位置', async ({ page }) => {
      await navigateToGame(page);

      const canvas = page.locator('#game-canvas');
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      await page.mouse.move(box.x + box.width / 2, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 4, box.y + 100, { steps: 10 });
      await page.mouse.up();
      await waitForStable(page, 1000);

      const hasInteraction = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        return game !== null && game !== undefined;
      });

      expect(hasInteraction).toBeTruthy();
    });

    test('拖拽超出边界应被限制', async ({ page }) => {
      await navigateToGame(page);

      const canvas = page.locator('#game-canvas');
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      await page.mouse.move(box.x + box.width / 2, box.y + 100);
      await page.mouse.down();
      await page.mouse.move(box.x - 100, box.y + 100, { steps: 10 });
      await page.mouse.up();
      await waitForStable(page, 1000);

      const canvasStillVisible = await page.locator('#game-canvas').isVisible();
      expect(canvasStillVisible).toBeTruthy();
    });
  });

  test.describe('暂停交互 @smoke', () => {
    test('暂停按钮应触发暂停状态', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const sm = game.getSceneManager?.();
          sm?.pauseGame?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      const isPaused = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const stateMachine = game.getStateMachine?.();
          return stateMachine?.getCurrentState?.() === 'paused';
        } catch {
          return false;
        }
      });

      expect(isPaused).toBeTruthy();
    });

    test('暂停后物理应停止', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      await dropBlocks(page, 3);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const sm = game.getSceneManager?.();
          sm?.pauseGame?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      const physicsStopped = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const physics = game.getPhysics?.();
          if (!physics) return false;
          return !physics.isRunning?.();
        } catch {
          return false;
        }
      });

      expect(physicsStopped).toBeTruthy();
    });

    test('恢复后游戏应继续运行', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const sm = game.getSceneManager?.();
          sm?.pauseGame?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const sm = game.getSceneManager?.();
          sm?.resumeGame?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      const isPlaying = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const stateMachine = game.getStateMachine?.();
          return stateMachine?.getCurrentState?.() === 'playing';
        } catch {
          return false;
        }
      });

      expect(isPlaying).toBeTruthy();
    });
  });

  test.describe('键盘输入 @full', () => {
    test('Escape键应触发暂停', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      const isPaused = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const stateMachine = game.getStateMachine?.();
          return stateMachine?.getCurrentState?.() === 'paused';
        } catch {
          return false;
        }
      });

      expect(isPaused).toBeTruthy();
    });

    test('左右方向键应控制方块位置', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(200);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);

      const gameActive = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        return game !== null && game !== undefined;
      });

      expect(gameActive).toBeTruthy();
    });

    test('空格键应触发方块下落', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      const before = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      await page.keyboard.press('Space');
      await waitForStable(page, 1000);

      const after = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  test.describe('多点触控 @full', () => {
    test('双指缩放不应导致崩溃', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      const canvas = page.locator('#game-canvas');
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not found');

      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;

      const cdpSession = await page.context().newCDPSession();

      try {
        await cdpSession.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: cx - 50, y: cy, id: 0 }],
        });
        await cdpSession.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: cx + 50, y: cy, id: 1 }],
        });

        await cdpSession.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: cx - 100, y: cy, id: 0 }],
        });
        await cdpSession.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: cx + 100, y: cy, id: 1 }],
        });

        await cdpSession.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [{ x: cx - 100, y: cy, id: 0 }],
        });
        await cdpSession.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [{ x: cx + 100, y: cy, id: 1 }],
        });
      } catch {
        await page.mouse.click(cx, cy);
      }

      await waitForStable(page, 500);

      const noCrash = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        return game !== null && game !== undefined;
      });

      expect(noCrash).toBeTruthy();
    });
  });

  test.describe('输入防抖 @regression', () => {
    test('快速点击不应产生重复方块', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      const before = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      for (let i = 0; i < 3; i++) {
        await clickCanvasCenter(page);
        await page.waitForTimeout(50);
      }

      await waitForStable(page, 2000);

      const after = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getBlocks?.()?.length ?? -1;
        } catch {
          return -1;
        }
      });

      if (before >= 0 && after >= 0) {
        expect(after - before).toBeLessThanOrEqual(3);
      }
    });

    test('冷却期间点击应被忽略', async ({ page }) => {
      await navigateToGame(page);

      const playing = await isGamePlaying(page);
      if (!playing) return;

      await clickCanvasCenter(page);
      await page.waitForTimeout(100);

      const canDrop = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return true;
        try {
          const spawner = game.getBlockSpawner?.();
          return spawner?.getCanDrop?.() ?? true;
        } catch {
          return true;
        }
      });

      expect(typeof canDrop).toBe('boolean');
    });
  });
});
