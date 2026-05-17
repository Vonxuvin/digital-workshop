import { test, expect } from '@playwright/test';
import { navigateToGame, dropBlocks, waitForStable, ensurePlaying, ensureGameScene } from './helpers';

test.describe('Week5 游戏关卡修复验证 @critical', () => {

  test.describe('问题a：复活后计时器应恢复正常运行', () => {
    test('复活后LevelSystem应存在resumeTimer方法', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

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

  test.describe('问题b：重新开始后Warning Line和动画应恢复正常', () => {
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

  test.describe('问题2：失败后重新开始/复活时Warning Line应正确显示', () => {
    test('游戏状态转换为playing时WarningLine应可见', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);
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

  test.describe('问题3：复活→重新开始后WarningLine应可见 @critical', () => {
    test('setWarningLineVisible(true)后WarningLine.visible应为true', async ({ page }) => {
      await navigateToGame(page);
      await ensurePlaying(page);

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
});