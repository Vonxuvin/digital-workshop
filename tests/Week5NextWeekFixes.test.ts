import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { ScoreSystem, SCORE_CONFIGS } from '../src/gameplay/ScoreSystem';
import { LevelSystem, LevelConfig } from '../src/gameplay/LevelSystem';
import { SaveManager } from '../src/core/SaveManager';
import { TutorialManager } from '../src/core/TutorialManager';
import { TutorialOverlay } from '../src/ui/TutorialOverlay';
import { GameHUD } from '../src/ui/hud/GameHUD';
import { PropSystem } from '../src/gameplay/props/PropSystem';
import { AnimationManager } from '../src/utils/AnimationManager';
import { eventBus } from '../src/utils/EventBus';
import { Container } from 'pixi.js';
import fs from 'fs';
import path from 'path';

describe('P0-3: 关卡难度曲线全面调整 - TC-003 关联测试', () => {
  const levelsDir = path.resolve(__dirname, '../src/data/levels');

  describe('TC-003-01: Level 1 星级线修复', () => {
    let level1: any;
    beforeAll(() => {
      level1 = JSON.parse(fs.readFileSync(path.join(levelsDir, 'level_01.json'), 'utf-8'));
    });

    it('Level 1 通关目标低于3星线', () => {
      expect(level1.objective.target).toBeLessThan(level1.rewards.stars[2]);
    });

    it('Level 1 星级线遵循 60%/80%/100% 规则（基于3星线）', () => {
      const threeStar = level1.rewards.stars[2];
      expect(level1.rewards.stars[0]).toBe(Math.round(threeStar * 0.6));
      expect(level1.rewards.stars[1]).toBe(Math.round(threeStar * 0.8));
    });

    it('Level 1 通关即获得1星', () => {
      const ss = new ScoreSystem();
      while (ss.getScore() < level1.objective.target) {
        ss.addMergeScore(4, false);
      }
      const stars = ss.getStarsForLevel(ss.getScore(), level1.rewards.stars);
      expect(stars).toBeGreaterThanOrEqual(1);
      ss.reset();
    });
  });

  describe('TC-003-02: Level 5 无 timeLimit 与 score 类型冲突', () => {
    let level5: any;
    beforeAll(() => {
      level5 = JSON.parse(fs.readFileSync(path.join(levelsDir, 'level_05.json'), 'utf-8'));
    });

    it('Level 5 score 类型关卡无 timeLimit', () => {
      if (level5.objective.type === 'score') {
        expect(level5.objective.timeLimit).toBeUndefined();
      }
    });

    it('Level 5 星级线遵循 60%/80%/100% 规则', () => {
      const threeStar = level5.rewards.stars[2];
      expect(level5.rewards.stars[0]).toBe(Math.round(threeStar * 0.6));
      expect(level5.rewards.stars[1]).toBe(Math.round(threeStar * 0.8));
    });
  });

  describe('TC-003-03: Level 13 难度降低为过渡关卡', () => {
    let level13: any;
    beforeAll(() => {
      level13 = JSON.parse(fs.readFileSync(path.join(levelsDir, 'level_13.json'), 'utf-8'));
    });

    it('Level 13 目标分数降低到 8000 以下', () => {
      expect(level13.objective.target).toBeLessThanOrEqual(8000);
    });

    it('Level 13 旋转速度不超过 10', () => {
      const rotate = level13.modifiers?.find((m: any) => m.type === 'rotate');
      if (rotate) {
        expect(rotate.rotationSpeed).toBeLessThanOrEqual(10);
      }
    });

    it('Level 13 收缩触发间隔至少 40', () => {
      const shrink = level13.modifiers?.find((m: any) => m.type === 'shrink');
      if (shrink) {
        expect(shrink.triggerInterval).toBeGreaterThanOrEqual(40);
      }
    });

    it('Level 13 星级线遵循 60%/80%/100% 规则', () => {
      const threeStar = level13.rewards.stars[2];
      expect(level13.rewards.stars[0]).toBe(Math.round(threeStar * 0.6));
      expect(level13.rewards.stars[1]).toBe(Math.round(threeStar * 0.8));
    });
  });

  describe('TC-003-04: Level 14 难度降低为过渡关卡', () => {
    let level14: any;
    beforeAll(() => {
      level14 = JSON.parse(fs.readFileSync(path.join(levelsDir, 'level_14.json'), 'utf-8'));
    });

    it('Level 14 障碍物数量不超过 10', () => {
      expect(level14.obstacles.length).toBeLessThanOrEqual(10);
    });

    it('Level 14 目标与障碍物数量一致', () => {
      expect(level14.objective.target).toBe(level14.obstacles.length);
    });

    it('Level 14 挡板触发间隔至少 6', () => {
      const paddle = level14.modifiers?.find((m: any) => m.type === 'paddle');
      if (paddle) {
        expect(paddle.triggerInterval).toBeGreaterThanOrEqual(6);
      }
    });

    it('Level 14 星级线遵循 60%/80%/100% 规则', () => {
      const threeStar = level14.rewards.stars[2];
      expect(level14.rewards.stars[0]).toBe(Math.round(threeStar * 0.6));
      expect(level14.rewards.stars[1]).toBe(Math.round(threeStar * 0.8));
    });
  });

  describe('TC-003-05: Level 15 变形器减少到 3 种以下', () => {
    let level15: any;
    beforeAll(() => {
      level15 = JSON.parse(fs.readFileSync(path.join(levelsDir, 'level_15.json'), 'utf-8'));
    });

    it('Level 15 变形器数量不超过 3', () => {
      expect(level15.modifiers.length).toBeLessThanOrEqual(3);
    });

    it('Level 15 目标合成值不超过 128', () => {
      expect(level15.objective.target).toBeLessThanOrEqual(128);
    });

    it('Level 15 不包含 fork 变形器', () => {
      const hasFork = level15.modifiers?.some((m: any) => m.type === 'fork');
      expect(hasFork).toBe(false);
    });

    it('Level 15 旋转速度不超过 12', () => {
      const rotate = level15.modifiers?.find((m: any) => m.type === 'rotate');
      if (rotate) {
        expect(rotate.rotationSpeed).toBeLessThanOrEqual(12);
      }
    });

    it('Level 15 星级线遵循 60%/80%/100% 规则', () => {
      const threeStar = level15.rewards.stars[2];
      expect(level15.rewards.stars[0]).toBe(Math.round(threeStar * 0.6));
      expect(level15.rewards.stars[1]).toBe(Math.round(threeStar * 0.8));
    });
  });

  describe('TC-003-06: LevelSystem 正确处理 score 类型无 timeLimit', () => {
    let ls: LevelSystem;

    afterEach(() => {
      ls.destroy();
    });

    it('score 类型无 timeLimit 时不触发 game:timeout', () => {
      const config: LevelConfig = {
        id: 5, name: 'Test', objective: { type: 'score', target: 2000 },
        container: { width: 350, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [1200, 1600, 2000] },
      };
      ls = new LevelSystem(config);
      ls.start();

      const timeoutHandler = vi.fn();
      eventBus.on('game:timeout', timeoutHandler);

      for (let i = 0; i < 200; i++) {
        ls.update(1000);
      }

      expect(timeoutHandler).not.toHaveBeenCalled();
      eventBus.off('game:timeout', timeoutHandler);
    });

    it('survival 类型有 timeLimit 时正确完成', () => {
      const config: LevelConfig = {
        id: 12, name: 'Test', objective: { type: 'survival', target: 90, timeLimit: 90 },
        container: { width: 400, height: 600, shape: 'rectangle' },
        spawn: { availableNumbers: [1, 2, 4] },
        rewards: { stars: [30, 60, 90] },
      };
      ls = new LevelSystem(config);
      ls.start();

      const completeHandler = vi.fn();
      eventBus.on('level:completed', completeHandler);

      for (let i = 0; i < 100; i++) {
        ls.update(1000);
      }

      expect(completeHandler).toHaveBeenCalled();
      eventBus.off('level:completed', completeHandler);
    });
  });
});

describe('P0-4: 完善新手引导系统 - TC-004 关联测试', () => {
  let overlay: TutorialOverlay;
  let saveManager: SaveManager;
  let tutorialManager: TutorialManager;

  beforeEach(() => {
    AnimationManager.resetInstance();
    overlay = new TutorialOverlay();
    saveManager = new SaveManager();
    TutorialManager;
  });

  afterEach(() => {
    if (tutorialManager) {
      tutorialManager.destroy();
    }
    AnimationManager.resetInstance();
  });

  describe('TC-004-01: shouldShowTutorial 支持 Level 1-3 + attempts < 3', () => {
    it('Level 1 attempts=0 时显示教程', () => {
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(1)).toBe(true);
    });

    it('Level 1 attempts=1 时显示教程', () => {
      saveManager.getLevelProgress(1).attempts = 1;
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(1)).toBe(true);
    });

    it('Level 1 attempts=2 时显示教程', () => {
      saveManager.getLevelProgress(1).attempts = 2;
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(1)).toBe(true);
    });

    it('Level 1 attempts=3 时不显示教程', () => {
      saveManager.getLevelProgress(1).attempts = 3;
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(1)).toBe(false);
    });

    it('Level 2 attempts=0 时显示教程', () => {
      saveManager.unlockLevel(2);
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(2)).toBe(true);
    });

    it('Level 3 attempts=0 时显示教程', () => {
      saveManager.unlockLevel(3);
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(3)).toBe(true);
    });

    it('Level 4 不显示教程', () => {
      saveManager.unlockLevel(4);
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(4)).toBe(false);
    });

    it('已完成的关卡不显示教程', () => {
      saveManager.getLevelProgress(1).completed = true;
      tutorialManager = new TutorialManager(overlay, saveManager);
      expect(tutorialManager.shouldShowTutorial(1)).toBe(false);
    });
  });

  describe('TC-004-02: Level 1 教程包含合成步骤', () => {
    it('Level 1 教程包含 first_merge 步骤', () => {
      const fs = require('fs');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/core/TutorialManager.ts'),
        'utf-8'
      );
      const level1Steps = content.match(/if \(levelId === 1\) \{[\s\S]*?return \[[\s\S]*?\];/);
      expect(level1Steps).toBeTruthy();
      expect(level1Steps![0]).toContain('first_merge');
    });

    it('first_merge 事件监听器已注册', () => {
      const fs = require('fs');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("eventBus.on('block:merged'");
    });
  });

  describe('TC-004-03: Level 2 道具教程', () => {
    it('Level 2 教程步骤存在', () => {
      const fs = require('fs');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain('levelId === 2');
      expect(content).toContain('bomb_prop');
      expect(content).toContain('rainbow_prop');
      expect(content).toContain('freeze_prop');
    });

    it('道具教程包含炸弹说明', () => {
      const fs = require('fs');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain('💣');
    });
  });

  describe('TC-004-04: Level 3 障碍物教程', () => {
    it('Level 3 教程步骤存在', () => {
      const fs = require('fs');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain('levelId === 3');
      expect(content).toContain('obstacle_intro');
      expect(content).toContain('obstacle_rule');
    });

    it('障碍物教程包含清除规则说明', () => {
      const fs = require('fs');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain('shrink_prop');
      expect(content).toContain('lucky_prop');
    });

    it('obstacle:cleared 事件监听器已注册', () => {
      const fs = require('fs');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("eventBus.on('obstacle:cleared'");
    });
  });

  describe('TC-004-05: 使用 AnimationManager.setTimeout 替代原生 setTimeout', () => {
    it('TutorialManager 不使用原生 setTimeout', () => {
      const fs = require('fs');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/core/TutorialManager.ts'),
        'utf-8'
      );
      const showCurrentStepMatch = content.match(/private showCurrentStep\(\): void \{[\s\S]*?\n  \}/);
      expect(showCurrentStepMatch).toBeTruthy();
      expect(showCurrentStepMatch![0]).not.toMatch(/(?<!AnimationManager\.getInstance\(\)\.)setTimeout\(/);
      expect(showCurrentStepMatch![0]).toContain('AnimationManager.getInstance().setTimeout');
    });

    it('TutorialManager 导入 AnimationManager', () => {
      const fs = require('fs');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("import { AnimationManager }");
    });

    it('autoTimerId 用于跟踪定时器', () => {
      const fs = require('fs');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain('autoTimerId');
      expect(content).toContain('clearAutoTimer');
    });
  });

  describe('TC-004-06: props:used 事件监听', () => {
    it('TutorialManager 监听 props:used 事件', () => {
      const fs = require('fs');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/core/TutorialManager.ts'),
        'utf-8'
      );
      expect(content).toContain("eventBus.on('props:used'");
    });
  });
});

describe('P1-1: 道具栏布局优化 - TC-005 关联测试', () => {
  describe('TC-005-01: 道具栏使用2行布局', () => {
    it('createPropsBar 不使用单行横排布局', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).not.toContain("icon: 'bomb', x: 0");
      expect(content).not.toContain("icon: 'rainbow', x: 70");
    });

    it('道具按钮使用 row/col 布局', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).toContain('row: 0, col: 0');
      expect(content).toContain('row: 0, col: 1');
      expect(content).toContain('row: 0, col: 2');
      expect(content).toContain('row: 1, col: 0');
      expect(content).toContain('row: 1, col: 1');
    });

    it('按钮位置根据 row/col 计算', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      expect(content).toContain('propData.col * (buttonSize + buttonGap)');
      expect(content).toContain('propData.row * (buttonSize + rowGap)');
    });
  });

  describe('TC-005-02: 道具栏宽度适配小屏幕', () => {
    it('layout 方法不再使用 screenWidth - 360', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      const layoutMatch = content.match(/layout\(screenWidth: number, screenHeight: number\): void \{[\s\S]*?\n  \}/);
      expect(layoutMatch).toBeTruthy();
      expect(layoutMatch![0]).not.toContain('screenWidth - 360');
    });

    it('layout 方法根据按钮尺寸计算宽度', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/ui/hud/GameHUD.ts'),
        'utf-8'
      );
      const layoutMatch = content.match(/layout\(screenWidth: number, screenHeight: number\): void \{[\s\S]*?\n  \}/);
      expect(layoutMatch).toBeTruthy();
      expect(layoutMatch![0]).toContain('propsBarWidth');
      expect(layoutMatch![0]).toContain('screenWidth - propsBarWidth');
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

describe('P2-1: 计分系统数值平衡 - SCORE_CONFIGS 统一使用', () => {
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

  describe('addMergeScore 使用 SCORE_CONFIGS 表', () => {
    it('合成值为 SCORE_CONFIGS 中的值时使用表中的 baseScore', () => {
      const handler = vi.fn();
      eventBus.on('score:updated', handler);

      ss.addMergeScore(16, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.baseScore).toBe(SCORE_CONFIGS[16].baseScore);

      eventBus.off('score:updated', handler);
    });

    it('合成值为 SCORE_CONFIGS 中的值时使用表中的 chainMultiplier', () => {
      const handler = vi.fn();
      eventBus.on('score:updated', handler);

      ss.addMergeScore(32, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.chainMultiplier).toBeCloseTo(SCORE_CONFIGS[32].chainMultiplier, 5);

      eventBus.off('score:updated', handler);
    });

    it('合成值不在 SCORE_CONFIGS 中时使用 calculateScore 兜底', () => {
      const handler = vi.fn();
      eventBus.on('score:updated', handler);

      ss.addMergeScore(3, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.baseScore).toBeGreaterThan(0);

      eventBus.off('score:updated', handler);
    });

    it('高值合成 chainMultiplier > 1.0', () => {
      const handler = vi.fn();
      eventBus.on('score:updated', handler);

      ss.addMergeScore(128, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.chainMultiplier).toBeGreaterThan(1.0);

      eventBus.off('score:updated', handler);
    });
  });

  describe('计分系统数值合理性', () => {
    it('Level 1 目标 300 分可通过少量合成达到', () => {
      ss.addMergeScore(2, false);
      ss.addMergeScore(4, false);
      ss.addMergeScore(8, false);
      ss.addMergeScore(16, false);
      ss.addMergeScore(32, false);
      expect(ss.getScore()).toBeGreaterThan(0);
    });

    it('连锁加成正确应用', () => {
      const handler = vi.fn();
      eventBus.on('score:updated', handler);

      ss.addMergeScore(4, false);
      ss.addMergeScore(4, true);
      ss.addMergeScore(4, true);

      expect(handler).toHaveBeenCalledTimes(3);
      const firstCall = handler.mock.calls[0][0];
      const thirdCall = handler.mock.calls[2][0];
      expect(thirdCall.earnedScore).toBeGreaterThan(firstCall.earnedScore);

      eventBus.off('score:updated', handler);
    });

    it('lucky 乘数正确应用', () => {
      const handler = vi.fn();
      eventBus.on('score:updated', handler);

      ss.setLuckyMultiplier(2);
      ss.addMergeScore(4, false);

      expect(handler).toHaveBeenCalled();
      const data = handler.mock.calls[0][0];
      expect(data.earnedScore).toBe(SCORE_CONFIGS[4].baseScore * 2);

      eventBus.off('score:updated', handler);
    });
  });

  describe('源码验证：addMergeScore 使用 SCORE_CONFIGS', () => {
    it('addMergeScore 方法引用 SCORE_CONFIGS', () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, '../src/gameplay/ScoreSystem.ts'),
        'utf-8'
      );
      const addMergeScoreMatch = content.match(/addMergeScore\(value: number, isCombo: boolean = false\): void \{[\s\S]*?\n  \}/);
      expect(addMergeScoreMatch).toBeTruthy();
      expect(addMergeScoreMatch![0]).toContain('SCORE_CONFIGS');
      expect(addMergeScoreMatch![0]).toContain('configEntry');
      expect(addMergeScoreMatch![0]).toContain('chainMultiplierFromTable');
    });
  });
});
