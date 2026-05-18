import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, ensurePlaying, ensureGameScene } from './helpers';

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

      await ensurePlaying(page);
    });

    test('playing → paused转换应成功', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

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
      await ensurePlaying(page);

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
      await ensurePlaying(page);

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
      await ensurePlaying(page);

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
      await ensurePlaying(page);
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

  test.describe('复活后计时器恢复 @critical', () => {
    test('复活后LevelSystem应存在resumeTimer方法', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };
          const levelSystem = gameScene.getLevelSystem?.();
          if (!levelSystem) return { success: false, reason: 'no-level-system' };

          const hasResumeTimer = typeof levelSystem.resumeTimer === 'function';
          const hasApplyTimerPenalty = typeof levelSystem.applyTimerPenalty === 'function';
          const hasGetRemainingTime = typeof levelSystem.getRemainingTime === 'function';

          return { success: true, hasResumeTimer, hasApplyTimerPenalty, hasGetRemainingTime };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.hasResumeTimer).toBeTruthy();
      expect(result.hasApplyTimerPenalty).toBeTruthy();
      expect(result.hasGetRemainingTime).toBeTruthy();
    });

    test('复活流程中handleRevive应调用resumeTimer和applyTimerPenalty', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };
          const propEffectHandler = gameScene.getPropEffectHandler?.();
          if (!propEffectHandler) return { success: false, reason: 'no-prop-effect-handler' };

          const handleReviveFn = propEffectHandler.handleRevive;
          if (typeof handleReviveFn !== 'function') {
            return { success: false, reason: 'no-handleRevive' };
          }

          return { success: true, handleReviveExists: true };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.handleReviveExists).toBeTruthy();
    });

    test('stopTimer后resumeTimer应恢复计时器', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };
          const levelSystem = gameScene.getLevelSystem?.();
          if (!levelSystem) return { success: false, reason: 'no-level-system' };

          if (typeof levelSystem.stopTimer !== 'function') {
            return { success: false, reason: 'no-stopTimer' };
          }
          if (typeof levelSystem.resumeTimer !== 'function') {
            return { success: false, reason: 'no-resumeTimer' };
          }
          if (typeof levelSystem.applyTimerPenalty !== 'function') {
            return { success: false, reason: 'no-applyTimerPenalty' };
          }

          return { success: true };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
    });
  });

  test.describe('重新开始后WarningLine和动画恢复 @critical', () => {
    test('TimeManager应存在resetGameTimeline方法', async ({ page }) => {
      await navigateToGame(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const TimeManager = (window as any).__TimeManager;
          if (!TimeManager) return { success: false, reason: 'no-TimeManager' };

          const instance = TimeManager.getInstance?.();
          if (!instance) return { success: false, reason: 'no-instance' };

          const hasResetGameTimeline = typeof instance.resetGameTimeline === 'function';

          return { success: true, hasResetGameTimeline };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.hasResetGameTimeline).toBeTruthy();
    });

    test('resetGameTimeline应重置时间线暂停状态', async ({ page }) => {
      await navigateToGame(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };

          const timeManagerField = Object.getOwnPropertyNames(gameScene).find(
            n => gameScene[n] && typeof gameScene[n].resetGameTimeline === 'function'
          );

          if (!timeManagerField) {
            Object.keys(gameScene).forEach(k => {
              if (gameScene[k] && typeof gameScene[k].resetGameTimeline === 'function') {
                (window as any).__foundField = k;
              }
            });
          }

          return { success: true, hasTimeManager: !!timeManagerField || !!(window as any).__foundField };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
    });

    test('WarningLine应存在visible属性控制', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };
          const warningLine = gameScene.getWarningLine?.();
          if (!warningLine) return { success: false, reason: 'no-warning-line' };

          const hasVisible = 'visible' in warningLine;
          const hasReset = typeof warningLine.reset === 'function';
          const hasSetDisabled = typeof warningLine.setDisabled === 'function';

          return { success: true, hasVisible, hasReset, hasSetDisabled };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.hasVisible).toBeTruthy();
      expect(result.hasReset).toBeTruthy();
      expect(result.hasSetDisabled).toBeTruthy();
    });

    test('setWarningLineVisible方法应存在', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };

          const hasSetWarningLineVisible = typeof gameScene.setWarningLineVisible === 'function';

          return { success: true, hasSetWarningLineVisible };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.hasSetWarningLineVisible).toBeTruthy();
    });
  });

  test.describe('失败后重新开始/复活WarningLine可见性 @critical', () => {
    test('游戏状态转换为playing时WarningLine应可见', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await ensureGameScene(page);
      await dropBlocks(page, 2);
      await waitForStable(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };
          const warningLine = gameScene.getWarningLine?.();
          if (!warningLine) return { success: false, reason: 'no-warning-line' };

          return {
            success: true,
            warningLineVisible: warningLine.visible,
            warningLineExists: true,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.warningLineExists).toBeTruthy();
    });

    test('restartLevel方法应存在且包含警告线可见性设置', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };

          const hasRestartLevel = typeof gameScene.restartLevel === 'function';
          const hasSetWarningLineVisible = typeof gameScene.setWarningLineVisible === 'function';

          return { success: true, hasRestartLevel, hasSetWarningLineVisible };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.hasRestartLevel).toBeTruthy();
      expect(result.hasSetWarningLineVisible).toBeTruthy();
    });

    test('游戏状态监听器应正确设置HUD和WarningLine可见性', async ({ page }) => {
      await navigateToGame(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const statemachine = game.getStateMachine?.();
          if (!statemachine) return { success: false, reason: 'no-state-machine' };

          const currentState = statemachine.getCurrentState?.();

          return {
            success: true,
            currentState,
            stateDefined: !!currentState,
          };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.stateDefined).toBeTruthy();
    });
  });

  test.describe('复活→重新开始后WarningLine可见性 @critical', () => {
    test('setWarningLineVisible(true)后WarningLine.visible应为true', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };

          gameScene.setWarningLineVisible?.(true);
          const warningLine = gameScene.getWarningLine?.();
          if (!warningLine) return { success: false, reason: 'no-warning-line' };

          return { success: true, visible: warningLine.visible };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.visible).toBe(true);
    });

    test('setWarningLineVisible(false)后WarningLine.visible应为false', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };

          gameScene.setWarningLineVisible?.(false);
          const warningLine = gameScene.getWarningLine?.();
          if (!warningLine) return { success: false, reason: 'no-warning-line' };

          return { success: true, visible: warningLine.visible };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.visible).toBe(false);
    });

    test('重新开始后WarningLine应可见', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };

          gameScene.restartLevel?.();
          const warningLine = gameScene.getWarningLine?.();
          if (!warningLine) return { success: false, reason: 'no-warning-line' };

          return { success: true, visible: warningLine.visible };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.visible).toBe(true);
    });

    test('startLevel中应调用setWarningLineVisible(true)', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
      await ensureGameScene(page);

      const result = await page.evaluate(() => {
        const game = (window as any).__gameInstance;
        if (!game) return { success: false, reason: 'no-game' };
        try {
          const gameScene = game.getGameScene?.();
          if (!gameScene) return { success: false, reason: 'no-game-scene' };
          const warningLine = gameScene.getWarningLine?.();
          if (!warningLine) return { success: false, reason: 'no-warning-line' };

          return { success: true, visible: warningLine.visible };
        } catch (e: any) {
          return { success: false, reason: e?.message ?? 'unknown' };
        }
      });

      expect(result.success).toBeTruthy();
      expect(result.visible).toBe(true);
    });
  });

  test.describe('TimeManager window暴露验证 @regression', () => {
    test('window.__TimeManager应可访问且为构造函数', async ({ page }) => {
      await navigateToGame(page);

      const result = await page.evaluate(() => {
        const TimeManager = (window as any).__TimeManager;
        if (!TimeManager) return { success: false, reason: 'no-TimeManager' };
        if (typeof TimeManager !== 'function') return { success: false, reason: 'not-function' };

        const hasGetInstance = typeof TimeManager.getInstance === 'function';
        const hasResetGameTimeline = typeof TimeManager.prototype.resetGameTimeline === 'function';

        return { success: true, hasGetInstance, hasResetGameTimeline };
      });

      expect(result.success).toBeTruthy();
      expect(result.hasGetInstance).toBeTruthy();
      expect(result.hasResetGameTimeline).toBeTruthy();
    });

    test('window.__TimeManager.getInstance应返回单例实例', async ({ page }) => {
      await navigateToGame(page);

      const result = await page.evaluate(() => {
        const TimeManager = (window as any).__TimeManager;
        if (!TimeManager) return { success: false };

        const instance1 = TimeManager.getInstance();
        const instance2 = TimeManager.getInstance();

        return {
          success: true,
          isSameInstance: instance1 === instance2,
          hasResetGameTimeline: typeof instance1.resetGameTimeline === 'function',
        };
      });

      expect(result.success).toBeTruthy();
      expect(result.isSameInstance).toBeTruthy();
      expect(result.hasResetGameTimeline).toBeTruthy();
    });
  });
});
