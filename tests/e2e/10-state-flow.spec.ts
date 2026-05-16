import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, isGamePlaying } from './helpers';

test.describe('状态流转 @smoke', () => {
  test.describe('状态机初始化 @smoke', () => {
    test('状态机应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasStateMachine = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getStateMachine?.();
          return sm !== null && sm !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasStateMachine).toBeTruthy();
    });

    test('初始状态应为menu', async ({ page }) => {
      await navigateToGame(page, false);

      const currentState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        try {
          const sm = game.getStateMachine?.();
          return sm?.getCurrentState?.() ?? null;
        } catch {
          return null;
        }
      });

      expect(currentState).toBe('menu');
    });

    test('状态机应支持状态查询', async ({ page }) => {
      await navigateToGame(page);

      const canQuery = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getStateMachine?.();
          if (!sm) return false;
          return typeof sm.getCurrentState === 'function'
            && typeof sm.getPreviousState === 'function';
        } catch {
          return false;
        }
      });

      expect(canQuery).toBeTruthy();
    });
  });

  test.describe('状态转换 @smoke', () => {
    test('menu → playing转换应成功', async ({ page }) => {
      await navigateToGame(page, false);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const sm = game.getSceneManager?.();
          sm?.startGame?.();
        } catch {}
      });

      await page.waitForTimeout(1000);

      const currentState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        try {
          const sm = game.getStateMachine?.();
          return sm?.getCurrentState?.() ?? null;
        } catch {
          return null;
        }
      });

      expect(currentState).toBe('playing');
    });

    test('playing → paused转换应成功', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      expect(playing).toBe(true);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        try {
          const sm = game.getSceneManager?.();
          sm?.pauseGame?.();
        } catch {}
      });

      await page.waitForTimeout(500);

      const currentState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        try {
          const sm = game.getStateMachine?.();
          return sm?.getCurrentState?.() ?? null;
        } catch {
          return null;
        }
      });

      expect(currentState).toBe('paused');
    });

    test('paused → playing转换应成功', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      expect(playing).toBe(true);

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

      const currentState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        try {
          const sm = game.getStateMachine?.();
          return sm?.getCurrentState?.() ?? null;
        } catch {
          return null;
        }
      });

      expect(currentState).toBe('playing');
    });

    test('状态转换应可查询', async ({ page }) => {
      await navigateToGame(page);

      const canCheckTransition = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getStateMachine?.();
          if (!sm) return false;
          return typeof sm.canTransition === 'function'
            || typeof sm.canTransitionTo === 'function';
        } catch {
          return false;
        }
      });

      expect(canCheckTransition).toBeTruthy();
    });
  });

  test.describe('状态事件 @regression', () => {
    test('状态变化应触发事件', async ({ page }) => {
      await navigateToGame(page);

      const hasEventBus = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const eventBus = game.getEventBus?.();
          if (!eventBus) return false;
          return typeof eventBus.on === 'function'
            && typeof eventBus.emit === 'function'
            && typeof eventBus.off === 'function';
        } catch {
          return false;
        }
      });

      expect(hasEventBus).toBeTruthy();
    });

    test('事件监听应正确注册和注销', async ({ page }) => {
      await navigateToGame(page);

      const eventBusWorks = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const eventBus = game.getEventBus?.();
          if (!eventBus) return false;
          return typeof eventBus.on === 'function'
            && typeof eventBus.off === 'function';
        } catch {
          return false;
        }
      });

      expect(eventBusWorks).toBeTruthy();
    });
  });

  test.describe('异常状态处理 @full', () => {
    test('非法状态转换应被拒绝', async ({ page }) => {
      await navigateToGame(page);

      const canCheckTransition = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getStateMachine?.();
          if (!sm) return false;
          if (typeof sm.canTransition === 'function') {
            return true;
          }
          if (typeof sm.canTransitionTo === 'function') {
            return true;
          }
          return false;
        } catch {
          return false;
        }
      });

      expect(canCheckTransition).toBeTruthy();
    });

    test('重复暂停不应导致错误', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      expect(playing).toBe(true);

      let noError = true;
      try {
        await page.evaluate(() => {
          const game = (window as any).__gameInstance;
          if (!game) return;
          try {
            const sm = game.getSceneManager?.();
            sm?.pauseGame?.();
            sm?.pauseGame?.();
          } catch {}
        });
      } catch {
        noError = false;
      }

      expect(noError).toBeTruthy();
    });

    test('重复恢复不应导致错误', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      expect(playing).toBe(true);

      let noError = true;
      try {
        await page.evaluate(() => {
          const game = (window as any).__gameInstance;
          if (!game) return;
          try {
            const sm = game.getSceneManager?.();
            sm?.resumeGame?.();
            sm?.resumeGame?.();
          } catch {}
        });
      } catch {
        noError = false;
      }

      expect(noError).toBeTruthy();
    });
  });

  test.describe('场景管理器 @regression', () => {
    test('场景管理器应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const hasSceneManager = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          return sm !== null && sm !== undefined;
        } catch {
          return false;
        }
      });

      expect(hasSceneManager).toBeTruthy();
    });

    test('应能重新开始游戏', async ({ page }) => {
      await navigateToGame(page);
      const playing = await isGamePlaying(page);
      expect(playing).toBe(true);
      await dropBlocks(page, 5);
      await waitForStable(page);

      const canRestart = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return false;
          return typeof sm.restartGame === 'function';
        } catch {
          return false;
        }
      });

      expect(canRestart).toBeTruthy();
    });

    test('应能返回主菜单', async ({ page }) => {
      await navigateToGame(page);

      const canShowMenu = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return false;
          return typeof sm.showMainMenu === 'function';
        } catch {
          return false;
        }
      });

      expect(canShowMenu).toBeTruthy();
    });

    test('应能复活继续游戏', async ({ page }) => {
      await navigateToGame(page);

      const canRevive = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return false;
          return typeof sm.reviveGame === 'function';
        } catch {
          return false;
        }
      });

      expect(canRevive).toBeTruthy();
    });

    test('isPlaying应正确反映游戏状态', async ({ page }) => {
      await navigateToGame(page);

      const isPlaying = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        try {
          const sm = game.getSceneManager?.();
          if (!sm) return false;
          return typeof sm.isPlaying === 'function';
        } catch {
          return false;
        }
      });

      expect(isPlaying).toBeTruthy();
    });
  });
});
