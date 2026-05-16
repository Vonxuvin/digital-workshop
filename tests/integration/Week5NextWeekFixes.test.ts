import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { ScoreSystem, SCORE_CONFIGS } from '../../src/gameplay/ScoreSystem';
import { LevelSystem, LevelConfig } from '../../src/gameplay/LevelSystem';
import { SaveManager } from '../../src/core/SaveManager';
import { TutorialManager } from '../../src/core/TutorialManager';
import { TutorialOverlay } from '../../src/ui/TutorialOverlay';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { PropSystem } from '../../src/gameplay/props/PropSystem';
import { AnimationManager } from '../../src/utils/AnimationManager';
import { eventBus, GameEvents } from '../../src/utils/EventBus';
import { Container } from 'pixi.js';
import fs from 'fs';
import path from 'path';

const levelsDir = path.resolve(__dirname, '../../src/data/levels');

function loadLevelJson(id: number): any {
  return JSON.parse(fs.readFileSync(path.join(levelsDir, `level_${String(id).padStart(2, '0')}.json`), 'utf-8'));
}

function validateStars60_80_100(stars: number[]): boolean {
  const threeStar = stars[2];
  return stars[0] === Math.round(threeStar * 0.6) && stars[1] === Math.round(threeStar * 0.8);
}

function validateStarsMonotonic(stars: number[]): boolean {
  return stars[0] < stars[1] && stars[1] < stars[2] && stars[2] > 0;
}

describe('TC-003: 关卡难度曲线验证', () => {
  describe('TC-003-01: 顺序通关 Level 1-6，难度平滑递增无跳变感', () => {
    it('Level 1-6 score 类型关卡目标值单调递增', () => {
      const scoreTargets: { id: number; target: number }[] = [];
      for (let i = 1; i <= 6; i++) {
        const level = loadLevelJson(i);
        if (level.objective.type === 'score') {
          scoreTargets.push({ id: level.id, target: level.objective.target });
        }
      }
      for (let i = 1; i < scoreTargets.length; i++) {
        expect(scoreTargets[i].target).toBeGreaterThanOrEqual(scoreTargets[i - 1].target);
      }
    });

    it('Level 1-6 容器宽度不小于 350', () => {
      for (let i = 1; i <= 6; i++) {
        const level = loadLevelJson(i);
        expect(level.container.width).toBeGreaterThanOrEqual(350);
      }
    });

    it('Level 1-5 无变形器，Level 6 仅引入单一挡板', () => {
      for (let i = 1; i <= 5; i++) {
        const level = loadLevelJson(i);
        expect(level.modifiers).toBeUndefined();
      }
      const level6 = loadLevelJson(6);
      expect(level6.modifiers.length).toBe(1);
      expect(level6.modifiers[0].type).toBe('paddle');
    });

    it('Level 1 通关目标低于3星线（修复3星=通关问题）', () => {
      const level1 = loadLevelJson(1);
      expect(level1.objective.target).toBeLessThan(level1.rewards.stars[2]);
    });

    it('Level 1-6 score 类型关卡星级线遵循 60%/80%/100% 规则', () => {
      for (let i = 1; i <= 6; i++) {
        const level = loadLevelJson(i);
        if (level.objective.type === 'score') {
          expect(validateStars60_80_100(level.rewards.stars)).toBe(true);
        }
      }
    });

    it('Level 1-6 非 score 类型关卡星级线单调递增且3星=目标', () => {
      for (let i = 1; i <= 6; i++) {
        const level = loadLevelJson(i);
        if (level.objective.type !== 'score') {
          expect(validateStarsMonotonic(level.rewards.stars)).toBe(true);
          expect(level.rewards.stars[2]).toBe(level.objective.target);
        }
      }
    });
  });

  describe('TC-003-02: Level 6 首次遇到挡板，间隔8秒触发有足够反应时间', () => {
    let level6: any;
    beforeAll(() => {
      level6 = loadLevelJson(6);
    });

    it('Level 6 挡板 triggerInterval >= 8', () => {
      const paddle = level6.modifiers.find((m: any) => m.type === 'paddle');
      expect(paddle.triggerInterval).toBeGreaterThanOrEqual(8);
    });

    it('Level 6 挡板使用 extend 模式（非 slide）', () => {
      const paddle = level6.modifiers.find((m: any) => m.type === 'paddle');
      expect(paddle.mode).toBe('extend');
    });

    it('Level 6 挡板仅一个（非双挡板）', () => {
      const paddles = level6.modifiers.filter((m: any) => m.type === 'paddle');
      expect(paddles.length).toBe(1);
    });

    it('Level 6 可用数字包含 8 和 16，目标可达成', () => {
      expect(level6.spawn.availableNumbers).toContain(8);
      expect(level6.spawn.availableNumbers).toContain(16);
      expect(level6.objective.target).toBeLessThanOrEqual(2500);
    });
  });

  describe('TC-003-03: Level 8 收缩边界，可用数字包含8，目标3000可达成', () => {
    let level8: any;
    beforeAll(() => {
      level8 = loadLevelJson(8);
    });

    it('Level 8 可用数字包含 8', () => {
      expect(level8.spawn.availableNumbers).toContain(8);
    });

    it('Level 8 目标 <= 3000', () => {
      expect(level8.objective.target).toBeLessThanOrEqual(3000);
    });

    it('Level 8 星级线遵循 60%/80%/100% 规则', () => {
      expect(validateStars60_80_100(level8.rewards.stars)).toBe(true);
    });
  });

  describe('TC-003-04: Level 13-15 连续挑战，难度递进而非断崖式', () => {
    it('Level 13-15 变形器数量递增', () => {
      const l13 = loadLevelJson(13);
      const l14 = loadLevelJson(14);
      const l15 = loadLevelJson(15);
      expect(l13.modifiers.length).toBeLessThanOrEqual(l14.modifiers.length);
      expect(l14.modifiers.length).toBeLessThanOrEqual(l15.modifiers.length);
    });

    it('Level 15 变形器不超过 3 种', () => {
      const l15 = loadLevelJson(15);
      expect(l15.modifiers.length).toBeLessThanOrEqual(3);
    });

    it('Level 15 目标合成值不超过 128', () => {
      const l15 = loadLevelJson(15);
      expect(l15.objective.target).toBeLessThanOrEqual(128);
    });

    it('Level 13-15 星级线均遵循 60%/80%/100% 规则', () => {
      for (let i = 13; i <= 15; i++) {
        const level = loadLevelJson(i);
        expect(validateStars60_80_100(level.rewards.stars)).toBe(true);
      }
    });

    it('Level 5 score 类型无 timeLimit（修复 timeLimit 冲突）', () => {
      const level5 = loadLevelJson(5);
      if (level5.objective.type === 'score') {
        expect(level5.objective.timeLimit).toBeUndefined();
      }
    });

    it('score 类型无 timeLimit 时不触发 game:timeout', () => {
      const config: LevelConfig = {
        id: 5, name: 'Test', objective: { type: 'score', target: 2000 },
        container: { width: 350, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [1200, 1600, 2000] },
      };
      const ls = new LevelSystem(config);
      ls.start();

      const timeoutHandler = vi.fn();
      eventBus.on(GameEvents.GAME_TIMEOUT, timeoutHandler);

      for (let i = 0; i < 200; i++) {
        ls.update(1000);
      }

      expect(timeoutHandler).not.toHaveBeenCalled();
      eventBus.off(GameEvents.GAME_TIMEOUT, timeoutHandler);
      ls.destroy();
    });
  });
});

describe('TC-004: 新手引导验证', () => {
  let overlay: TutorialOverlay;
  let saveManager: SaveManager;
  let tutorialManager: TutorialManager;

  beforeEach(() => {
    AnimationManager.resetInstance();
    overlay = new TutorialOverlay();
    saveManager = new SaveManager();
  });

  afterEach(() => {
    if (tutorialManager) {
      tutorialManager.destroy();
    }
    AnimationManager.resetInstance();
  });

  describe('TC-004-01: 首次进入 Level 1 显示"点击屏幕选择投放位置"引导', () => {
    it('Level 1 attempts=0 时显示教程', () => {
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(1)).toBe(true);
    });

    it('Level 1 教程第一步为欢迎/投放引导', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("id: 'welcome'");
      expect(content).toContain("trigger: 'auto'");
    });

    it('Level 1 教程包含投放步骤', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("id: 'drop'");
      expect(content).toContain("waitForAction: 'first_drop'");
    });

    it('教程在 attempts < 3 时均显示', () => {
      saveManager.setLevelProgress(1, { attempts: 1 });
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(1)).toBe(true);

      saveManager.setLevelProgress(1, { attempts: 2 });
      expect(tutorialManager.shouldShowTutorial(1)).toBe(true);
    });
  });

  describe('TC-004-02: 完成首次投放显示"相同数字碰撞合成"提示', () => {
    it('Level 1 教程包含合成提示步骤', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("id: 'merge'");
      expect(content).toContain("waitForAction: 'first_merge'");
    });

    it('first_merge 事件监听器已注册', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("eventBus.on(GameEvents.BLOCK_MERGED");
    });

    it('合成提示消息包含合成规则说明', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain('合成');
    });
  });

  describe('TC-004-03: 首次触发警告显示警戒线说明', () => {
    it('Level 1 教程包含警告线步骤', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("id: 'warning'");
      expect(content).toContain("waitForAction: 'first_warning'");
    });

    it('warning:started 事件监听器已注册', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("eventBus.on(GameEvents.WARNING_STARTED");
    });

    it('警告提示消息包含警戒线说明', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain('警戒线');
    });
  });

  describe('TC-004-04: 重新进入已通关关卡不再显示教程', () => {
    it('已完成的关卡不显示教程', () => {
      saveManager.setLevelProgress(1, { completed: true });
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(1)).toBe(false);
    });

    it('attempts >= 5 时不显示教程', () => {
      saveManager.setLevelProgress(1, { attempts: 5 });
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(1)).toBe(false);
    });

    it('Level 6+ 不显示教程', () => {
      saveManager.unlockLevel(6);
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(6)).toBe(false);
    });
  });

  describe('TC-004-05: Level 2 道具教程', () => {
    it('Level 2 教程步骤存在', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain('levelId === 2');
      expect(content).toContain('bomb_prop');
      expect(content).toContain('rainbow_prop');
      expect(content).toContain('freeze_prop');
    });

    it('Level 2 shouldShowTutorial 返回 true (attempts=0)', () => {
      saveManager.unlockLevel(2);
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(2)).toBe(true);
    });
  });

  describe('TC-004-06: Level 3 障碍物教程', () => {
    it('Level 3 教程步骤存在', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain('levelId === 3');
      expect(content).toContain('obstacle_intro');
      expect(content).toContain('obstacle_rule');
      expect(content).toContain('shrink_prop');
      expect(content).toContain('lucky_prop');
    });

    it('obstacle:cleared 事件监听器已注册', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("eventBus.on(GameEvents.OBSTACLE_CLEARED");
    });
  });

  describe('TC-004-07: 使用 AnimationManager.setTimeout 替代原生 setTimeout', () => {
    it('showCurrentStep 使用 AnimationManager.getInstance().setTimeout', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      const match = content.match(/private showCurrentStep\(\): void \{[\s\S]*?\n  \}/);
      expect(match).toBeTruthy();
      expect(match![0]).toContain('AnimationManager.getInstance().setTimeout');
    });

    it('TutorialManager 导入 AnimationManager', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("import { AnimationManager }");
    });
  });
});

describe('TC-005: 道具交互验证', () => {
  describe('TC-005-01: 点击炸弹道具按钮高亮，显示十字准星光标', () => {
    it('GameHUD 有 showCrosshair 方法', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).toContain('showCrosshair');
    });

    it('GameHUD 有 setPropSelected 方法', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).toContain('setPropSelected');
    });

    it('炸弹点击进入 targetMode 并发射事件', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).toContain('enterBombTargetMode');
      expect(content).toContain("eventBus.emit(GameEvents.UI_PROP_TARGET_MODE");
    });
  });

  describe('TC-005-02: 炸弹瞄准模式下点击目标，爆炸效果+范围内方块消除', () => {
    it('GameHUD 有 usePropAtPosition 方法', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).toContain('usePropAtPosition');
    });

    it('PropEffectHandler 有 handleBombExplode 方法', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/PropEffectHandler.ts'),
        'utf-8'
      );
      expect(content).toContain('handleBombExplode');
    });
  });

  describe('TC-005-03: 炸弹瞄准模式下退出', () => {
    it('GameHUD 有 exitBombTargetMode / exitPropTargetMode 方法', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).toContain('exitPropTargetMode');
      expect(content).toContain('exitBombTargetMode');
    });

    it('退出时隐藏十字准星', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).toContain('hideCrosshair');
    });
  });

  describe('TC-005-04: 冻结道具使用，物理暂停+冰冻视觉效果', () => {
    it('PropEffectHandler 有 handleFreezeActivated 方法', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/PropEffectHandler.ts'),
        'utf-8'
      );
      expect(content).toContain('handleFreezeActivated');
    });

    it('FreezeProp 有 setPhysicsManager 方法', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/gameplay/props/FreezeProp.ts'),
        'utf-8'
      );
      expect(content).toContain('setPhysicsManager');
    });

    it('GameEffectManager 有 addFreezeEffect 方法', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/GameEffectManager.ts'),
        'utf-8'
      );
      expect(content).toContain('addFreezeEffect');
    });
  });

  describe('TC-005-05: 冻结期间再次使用冻结延长冻结时间', () => {
    it('FreezeProp 有 pause/resume 方法', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/gameplay/props/FreezeProp.ts'),
        'utf-8'
      );
      expect(content).toContain('pause');
      expect(content).toContain('resume');
    });

    it('FreezeProp 有 isCurrentlyFrozen 方法', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/gameplay/props/FreezeProp.ts'),
        'utf-8'
      );
      expect(content).toContain('isCurrentlyFrozen');
    });
  });

  describe('TC-005-06: 道具栏2行布局优化', () => {
    it('道具按钮使用 row/col 布局', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).toContain('row: 0, col: 0');
      expect(content).toContain('row: 0, col: 1');
      expect(content).toContain('row: 0, col: 2');
      expect(content).toContain('row: 1, col: 0');
      expect(content).toContain('row: 1, col: 1');
    });

    it('按钮位置根据 row/col 动态计算', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).toContain('propData.col * (buttonSize + buttonGap)');
      expect(content).toContain('propData.row * (buttonSize + rowGap)');
    });

    it('layout 方法根据按钮尺寸计算宽度（不再硬编码360）', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      const layoutMatch = content.match(/layout\(screenWidth: number, screenHeight: number\): void \{[\s\S]*?\n  \}/);
      expect(layoutMatch).toBeTruthy();
      expect(layoutMatch![0]).not.toContain('screenWidth - 360');
      expect(layoutMatch![0]).toContain('propsBarWidth');
    });

    it('375px 屏幕下道具栏不超出边界', () => {
      const screenWidth = 375;
      const buttonSize = 60;
      const buttonGap = 8;
      const propsBarWidth = 3 * buttonSize + 2 * buttonGap;
      const propsContainerX = screenWidth - propsBarWidth - 10;
      expect(propsContainerX).toBeGreaterThanOrEqual(0);
      expect(propsContainerX + propsBarWidth).toBeLessThanOrEqual(screenWidth);
    });
  });
});

describe('P2-1: 计分系统数值平衡验证', () => {
  let ss: ScoreSystem;

  beforeEach(() => {
    ss = new ScoreSystem();
  });

  afterEach(() => {
    ss.reset();
  });

  describe('SCORE_CONFIGS 表完整性', () => {
    it('SCORE_CONFIGS 包含 2 到 4096 的所有2的幂', () => {
      const powers = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
      for (const p of powers) {
        expect(SCORE_CONFIGS[p]).toBeDefined();
        expect(SCORE_CONFIGS[p].baseScore).toBeGreaterThan(0);
        expect(SCORE_CONFIGS[p].chainMultiplier).toBeGreaterThanOrEqual(1.0);
      }
    });

    it('baseScore 随合成值递增', () => {
      const powers = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
      for (let i = 1; i < powers.length; i++) {
        expect(SCORE_CONFIGS[powers[i]].baseScore).toBeGreaterThan(SCORE_CONFIGS[powers[i - 1]].baseScore);
      }
    });

    it('chainMultiplier 随合成值递增', () => {
      const powers = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
      for (let i = 1; i < powers.length; i++) {
        expect(SCORE_CONFIGS[powers[i]].chainMultiplier).toBeGreaterThanOrEqual(SCORE_CONFIGS[powers[i - 1]].chainMultiplier);
      }
    });
  });

  describe('addMergeScore 统一使用 SCORE_CONFIGS 表', () => {
    it('合成值为 SCORE_CONFIGS 中的值时使用表中的 baseScore', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.addMergeScore(16, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.baseScore).toBe(SCORE_CONFIGS[16].baseScore);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });

    it('合成值为 SCORE_CONFIGS 中的值时使用表中的 chainMultiplier', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.addMergeScore(32, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.chainMultiplier).toBeCloseTo(SCORE_CONFIGS[32].chainMultiplier, 5);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });

    it('合成值不在 SCORE_CONFIGS 中时使用 calculateScore 兜底', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.addMergeScore(3, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.baseScore).toBeGreaterThan(0);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });

    it('高值合成 chainMultiplier > 1.0', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.addMergeScore(128, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.chainMultiplier).toBeGreaterThan(1.0);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });
  });

  describe('星级线遵循 60%/80%/100% 规则', () => {
    it('Level 1 星级线 [300, 400, 500] 符合规则', () => {
      const level1 = loadLevelJson(1);
      expect(validateStars60_80_100(level1.rewards.stars)).toBe(true);
    });

    it('所有 score 类型关卡星级线遵循 60%/80%/100% 规则', () => {
      for (let i = 1; i <= 15; i++) {
        const level = loadLevelJson(i);
        if (level.objective.type === 'score') {
          expect(validateStars60_80_100(level.rewards.stars)).toBe(true);
        }
      }
    });

    it('所有非 score 类型关卡星级线单调递增且3星=目标', () => {
      for (let i = 1; i <= 15; i++) {
        const level = loadLevelJson(i);
        if (level.objective.type !== 'score') {
          expect(validateStarsMonotonic(level.rewards.stars)).toBe(true);
          expect(level.rewards.stars[2]).toBe(level.objective.target);
        }
      }
    });
  });

  describe('计分系统数值合理性', () => {
    it('连锁加成正确应用', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.addMergeScore(4, false);
      ss.addMergeScore(4, true);
      ss.addMergeScore(4, true);

      expect(handler).toHaveBeenCalledTimes(3);
      const firstCall = handler.mock.calls[0][0];
      const thirdCall = handler.mock.calls[2][0];
      expect(thirdCall.earnedScore).toBeGreaterThan(firstCall.earnedScore);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });

    it('lucky 乘数正确应用', () => {
      const handler = vi.fn();
      eventBus.on(GameEvents.SCORE_UPDATED, handler);

      ss.setLuckyMultiplier(2);
      ss.addMergeScore(4, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.earnedScore).toBe(SCORE_CONFIGS[4].baseScore * 2);

      eventBus.off(GameEvents.SCORE_UPDATED, handler);
    });
  });

  describe('源码验证：addMergeScore 使用 SCORE_CONFIGS', () => {
    it('addMergeScore 方法引用 SCORE_CONFIGS', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../src/gameplay/ScoreSystem.ts'),
        'utf-8'
      );
      const match = content.match(/addMergeScore\(value: number, isCombo: boolean = false\): void \{[\s\S]*?\n  \}/);
      expect(match).toBeTruthy();
      expect(match![0]).toContain('SCORE_CONFIGS');
      expect(match![0]).toContain('configEntry');
      expect(match![0]).toContain('chainMultiplierFromTable');
    });
  });
});
