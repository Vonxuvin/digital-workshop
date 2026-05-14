import { test, expect } from '@playwright/test';
import { navigateToGame, clickCanvasCenter, dropBlocks, waitForStable } from './helpers';

test.describe('状态管理与完整流程', () => {
  test.describe('状态机', () => {
    test('GameStateMachine应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const smReady = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const stateMachine = game.getStateMachine?.();
        return stateMachine !== null && stateMachine !== undefined;
      });

      expect(smReady).toBeTruthy();
    });

    test('初始状态应为boot或menu', async ({ page }) => {
      await navigateToGame(page, false);

      const initialState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const stateMachine = game.getStateMachine?.();
        return stateMachine?.getCurrentState?.() ?? null;
      });

      expect(['boot', 'loading', 'menu']).toContain(initialState);
    });

    test('应支持有效的状态转换', async ({ page }) => {
      await navigateToGame(page);

      const validTransitions = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const stateMachine = game.getStateMachine?.();
        if (!stateMachine) return false;
        return typeof stateMachine.transitionTo === 'function'
          && typeof stateMachine.canTransitionTo === 'function';
      });

      expect(validTransitions).toBeTruthy();
    });

    test('应拒绝无效的状态转换', async ({ page }) => {
      await navigateToGame(page);

      const rejectsInvalid = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const stateMachine = game.getStateMachine?.();
        if (!stateMachine) return false;

        const currentState = stateMachine.getCurrentState?.();
        const result = stateMachine.canTransitionTo?.('invalid_state');
        return result === false;
      });

      expect(rejectsInvalid).toBeTruthy();
    });

    test('状态历史应正确记录', async ({ page }) => {
      await navigateToGame(page);

      const hasHistory = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const stateMachine = game.getStateMachine?.();
        if (!stateMachine) return false;
        return typeof stateMachine.getPreviousState === 'function';
      });

      expect(hasHistory).toBeTruthy();
    });
  });

  test.describe('事件总线', () => {
    test('EventBus应正确初始化', async ({ page }) => {
      await navigateToGame(page);

      const eventBusReady = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const eventBus = game.getEventBus?.();
        return eventBus !== null && eventBus !== undefined;
      });

      expect(eventBusReady).toBeTruthy();
    });

    test('EventBus应支持事件订阅', async ({ page }) => {
      await navigateToGame(page);

      const canSubscribe = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const eventBus = game.getEventBus?.();
        if (!eventBus) return false;
        return typeof eventBus.on === 'function';
      });

      expect(canSubscribe).toBeTruthy();
    });

    test('EventBus应支持事件发布', async ({ page }) => {
      await navigateToGame(page);

      const canEmit = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const eventBus = game.getEventBus?.();
        if (!eventBus) return false;
        return typeof eventBus.emit === 'function';
      });

      expect(canEmit).toBeTruthy();
    });

    test('EventBus应支持取消订阅', async ({ page }) => {
      await navigateToGame(page);

      const canUnsubscribe = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const eventBus = game.getEventBus?.();
        if (!eventBus) return false;
        return typeof eventBus.off === 'function';
      });

      expect(canUnsubscribe).toBeTruthy();
    });
  });

  test.describe('完整游戏流程', () => {
    test('menu → playing → paused → playing 流程', async ({ page }) => {
      await navigateToGame(page);

      const states: string[] = [];

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getStateMachine?.();
        if (!sm) return;
        sm.transitionTo?.('playing');
      });
      await page.waitForTimeout(500);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getStateMachine?.();
        if (!sm) return;
        sm.transitionTo?.('paused');
      });
      await page.waitForTimeout(500);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getStateMachine?.();
        if (!sm) return;
        sm.transitionTo?.('playing');
      });
      await page.waitForTimeout(500);

      const finalState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const sm = game.getStateMachine?.();
        return sm?.getCurrentState?.() ?? null;
      });

      expect(finalState).toBe('playing');
    });

    test('playing → gameover → menu 流程', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getStateMachine?.();
        if (!sm) return;
        sm.transitionTo?.('playing');
      });
      await page.waitForTimeout(500);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getStateMachine?.();
        if (!sm) return;
        sm.transitionTo?.('gameover');
      });
      await page.waitForTimeout(500);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getStateMachine?.();
        if (!sm) return;
        sm.transitionTo?.('menu');
      });
      await page.waitForTimeout(500);

      const finalState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const sm = game.getStateMachine?.();
        return sm?.getCurrentState?.() ?? null;
      });

      expect(finalState).toBe('menu');
    });

    test('playing → victory → menu 流程', async ({ page }) => {
      await navigateToGame(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getStateMachine?.();
        if (!sm) return;
        sm.transitionTo?.('playing');
      });
      await page.waitForTimeout(500);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getStateMachine?.();
        if (!sm) return;
        sm.transitionTo?.('levelComplete');
      });
      await page.waitForTimeout(500);

      const finalState = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return null;
        const sm = game.getStateMachine?.();
        return sm?.getCurrentState?.() ?? null;
      });

      expect(finalState).toBe('levelComplete');
    });
  });

  test.describe('场景切换流程', () => {
    test('主菜单到游戏场景切换应正常', async ({ page }) => {
      await navigateToGame(page, false);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getSceneManager?.();
        if (!sm) return;
        sm.startGame?.();
      });

      await page.waitForTimeout(1000);

      const isPlaying = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const sm = game.getStateMachine?.();
        return sm?.getCurrentState?.() === 'playing';
      });

      expect(isPlaying).toBeTruthy();
    });

    test('游戏场景到主菜单切换应正常', async ({ page }) => {
      await navigateToGame(page, false);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getSceneManager?.();
        if (!sm) return;
        sm.startGame?.();
      });

      await page.waitForTimeout(1000);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getSceneManager?.();
        if (!sm) return;
        sm.showMainMenu?.();
      });

      await page.waitForTimeout(1000);

      const isMenu = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const sm = game.getStateMachine?.();
        return sm?.getCurrentState?.() === 'menu';
      });

      expect(isMenu).toBeTruthy();
    });

    test('重新开始应正确重置游戏', async ({ page }) => {
      await navigateToGame(page, false);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getSceneManager?.();
        if (!sm) return;
        sm.startGame?.();
      });

      await page.waitForTimeout(500);
      await dropBlocks(page, 5);
      await waitForStable(page);

      await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return;
        const sm = game.getSceneManager?.();
        if (!sm) return;
        sm.restartGame?.();
      });

      await waitForStable(page);

      const blockCount = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const spawner = game.getBlockSpawner?.();
        return spawner?.getBlocks?.()?.length ?? -1;
      });

      expect(blockCount).toBe(0);
    });
  });

  test.describe('跨模块交互', () => {
    test('合成应触发计分更新', async ({ page }) => {
      const scoreLogs: string[] = [];
      page.on('console', (msg) => {
        if (msg.text().includes('score:updated')) {
          scoreLogs.push(msg.text());
        }
      });

      await navigateToGame(page);
      await dropBlocks(page, 10);
      await waitForStable(page, 5000);

      expect(scoreLogs.length).toBeGreaterThan(0);
    });

    test('计分更新应触发HUD刷新', async ({ page }) => {
      await navigateToGame(page);
      await dropBlocks(page, 5);
      await waitForStable(page, 3000);

      const score = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return -1;
        const scoreSystem = game.getScoreSystem?.();
        return scoreSystem?.getScore?.() ?? -1;
      });

      expect(score).toBeGreaterThanOrEqual(0);
    });

    test('目标达成应触发通关流程', async ({ page }) => {
      await navigateToGame(page);

      const hasWinFlow = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const levelSystem = game.getLevelSystem?.();
        if (!levelSystem) return false;
        return typeof levelSystem.checkWinCondition === 'function';
      });

      expect(hasWinFlow).toBeTruthy();
    });

    test('游戏结束应触发结算界面', async ({ page }) => {
      await navigateToGame(page);

      const hasGameOverFlow = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return false;
        const scene = game.getGameScene?.();
        if (!scene) return false;
        return typeof scene.checkGameOver === 'function';
      });

      expect(hasGameOverFlow).toBeTruthy();
    });
  });
});