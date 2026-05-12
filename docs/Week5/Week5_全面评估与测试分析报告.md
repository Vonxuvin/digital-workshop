# 《数字工坊》Week1-Week5 全面评估与测试分析报告

> **版本**：V1.0  
> **日期**：2026-05-12  
> **评估范围**：Week1 至 Week5 已实现的所有游戏机制与交互系统  
> **技术栈**：PixiJS v8.6.3 / Matter.js 0.20.0 / GSAP 3.12.5 / Vite + Vitest  

---

## 一、项目现状概述

### 1.1 开发进度与质量差距

| 维度 | 计划目标 | 实际状态 | 差距 |
|------|----------|----------|------|
| 关卡数量 | Week5 应完成 30 关 | 仅完成 15 关 | **50% 滞后** |
| 成长系统 | Week6 应实现天赋/成就/皮肤 | 全部未开始 | **整体滞后 1 周** |
| 变现系统 | Week7-8 应实现广告/内购 | 全部未开始 | **整体滞后 2 周** |
| 新手引导 | Week10 应优化 | 无任何引导系统 | **严重缺失** |
| 音效资源 | Week4 应完成 | 仍缺失所有 mp3 文件 | **持续滞后** |
| 道具系统 | 5 种道具完整实现 | ShrinkProp/LuckyProp 功能不完整 | **部分缺失** |

### 1.2 测试状态

- **单元测试**：544 个测试全部通过，TypeScript 类型检查通过
- **测试覆盖偏向**：单元层面为主，缺乏端到端集成测试和用户体验测试
- **已知兼容性问题**：GSAP 动画在 jsdom 测试环境中存在兼容性问题

### 1.3 各周遗留问题汇总

| 来源 | 遗留问题 | 状态 |
|------|----------|------|
| Week1 | 连锁合成偶尔漏检 | 已在 Week3 修复 |
| Week2 | 大量方块时帧率下降 | 已通过休眠机制缓解 |
| Week2 | 音效在部分浏览器不自动播放 | 未解决 |
| Week3 | MergeSystem 覆盖率偏低 | 部分改善 |
| Week3 | UI 动画测试困难 | 未解决 |
| Week3 | 微信平台适配器未测试 | 未解决 |
| Week4 | 缩小射线道具未实现 | Week5 部分实现 |
| Week4 | 幸运投放道具未实现 | Week5 部分实现 |
| Week4 | 音效资源文件缺失 | 未解决 |
| Week4 | GSAP 动画兼容性问题 | 未解决 |
| Week5 | 缩小射线/幸运投放道具未完整 | 延至 Week6 |
| Week5 | 音效资源文件缺失 | 延至 Week6 |

---

## 二、问题清单（按严重程度分类）

### 🔴 P0 — 严重问题（影响核心游戏体验）

---

#### P0-1：投放操作缺乏直觉性

**问题描述**：

当前输入逻辑为 `onDown` 显示预览 → `onMove` 更新位置 → `onUp` 投放方块，存在以下反直觉设计：

1. 用户按下屏幕时预览立即出现在 `dropY=80` 的位置，手指遮挡预览区域
2. 投放 Y 坐标硬编码为 `80`，未考虑屏幕尺寸和容器偏移
3. 200ms 防抖（`actionDebounceMs`）在快速操作时造成明显延迟感，第二次操作被吞掉

**代码位置**：[Game.ts:218-253](file:///workspace/src/core/Game.ts#L218-253)

**复现步骤**：
1. 进入任意关卡
2. 快速点击屏幕不同位置 → 预览出现位置与手指位置不一致
3. 快速连续点击 → 第二次操作被防抖吞掉

**影响范围**：所有关卡的投放操作  
**严重程度**：P0 — 核心操作体验

**根本原因**：
- `dropY` 硬编码未适配不同屏幕
- 防抖逻辑使用时间戳而非输入状态判断
- 未实现"拖拽预览→松手投放"的直觉操作模式

**技术解决方案**：

```typescript
// Game.ts - setupInput() 改进
private setupInput(): void {
  const dropY = this.calculateDropY();

  this.input.onDown((state) => {
    if (!this.gameScene.getBlockSpawner().getCanDrop() || !this.sceneManager.isPlaying()) return;
    if (this.gameScene.getBombTargetMode()) return;
    this.gameScene.getPreview().show(
      this.gameScene.getBlockSpawner().getCurrentValue(),
      state.position.x,
      dropY
    );
  });

  this.input.onMove((state) => {
    if (state.isDown && this.gameScene.getPreview().visible && this.sceneManager.isPlaying()) {
      this.gameScene.getPreview().updatePosition(state.position.x);
    }
  });

  this.input.onUp(() => {
    if (this.gameScene.getPreview().visible
      && this.gameScene.getBlockSpawner().getCanDrop()
      && this.sceneManager.isPlaying()) {
      const targetX = this.gameScene.getPreview().getTargetX();
      this.gameScene.getBlockSpawner().dropBlock(targetX, dropY,
        this.gameScene.getBlockSpawner().getCurrentValue());
      this.gameScene.getPreview().hide();
      this.gameScene.getBlockSpawner().startCooldown();
    }
  });
}

private calculateDropY(): number {
  return Math.max(60, this.gameScene.getContainerOffsetX() > 0 ? 80 : 60);
}
```

**实施步骤**：

| 步骤 | 操作 | 涉及文件 | 预计时间 |
|------|------|----------|----------|
| 1 | 移除 `actionDebounceMs` 防抖，改用 `canDrop` 状态 | `Game.ts` | 0.5h |
| 2 | `dropY` 改为动态计算，考虑容器偏移 | `Game.ts` | 0.5h |
| 3 | 添加触摸偏移补偿（手指上方 30px 显示预览） | `Game.ts`, `BlockPreview.ts` | 1h |
| 4 | 添加投放确认动画（方块从预览位置下落） | `BlockSpawner.ts` | 1h |

---

#### P0-2：警告线机制过于严苛，缺乏缓冲体验

**问题描述**：

1. `WARNING_THRESHOLD = 3000ms`（3 秒），方块超过警戒线仅 3 秒即判定游戏结束
2. `SPEED_THRESHOLD = 5` 的速度阈值过低，方块在缓慢滑动时也会触发警告
3. `GRACE_PERIOD = 500ms` 的宽限期过短，方块短暂越过警戒线即开始计时
4. 警告线闪烁效果（`alpha = 0.3 + sin * 0.3`）在 0.3–0.6 之间变化，视觉冲击力不足

**代码位置**：[WarningLine.ts](file:///workspace/src/ui/components/WarningLine.ts)

**复现步骤**：
1. 进入关卡，投放多个方块使堆叠接近警戒线
2. 方块缓慢滑过警戒线 → 立即触发警告计时
3. 微小振动的方块也被计入 → 3 秒后游戏结束
4. 闪烁效果不明显，玩家可能未注意到

**影响范围**：所有关卡的游戏结束判定  
**严重程度**：P0 — 核心游戏循环

**根本原因**：
- 警告参数硬编码，未根据关卡难度调整
- 速度阈值未考虑物理引擎的微小振动
- 缺乏"危险 → 警告 → 结束"的渐进反馈

**技术解决方案**：

```typescript
// WarningLine.ts 改进
interface WarningConfig {
  warningThreshold: number;
  speedThreshold: number;
  gracePeriod: number;
}

const DEFAULT_WARNING_CONFIG: WarningConfig = {
  warningThreshold: 5000,
  speedThreshold: 2,
  gracePeriod: 1000,
};

private updateVisualFeedback(): void {
  const progress = this.warningDuration / this.WARNING_THRESHOLD;
  if (progress < 0.3) {
    this.graphics.alpha = 0.5 + Math.sin(this.flashTimer * 2) * 0.2;
  } else if (progress < 0.7) {
    this.graphics.alpha = 0.4 + Math.sin(this.flashTimer * 4) * 0.4;
  } else {
    this.graphics.alpha = 0.3 + Math.sin(this.flashTimer * 8) * 0.5;
  }
}
```

**实施步骤**：

| 步骤 | 操作 | 涉及文件 | 预计时间 |
|------|------|----------|----------|
| 1 | 警告参数改为可配置，增加默认阈值 | `WarningLine.ts` | 1h |
| 2 | 实现渐进式视觉反馈（黄 → 橙 → 红） | `WarningLine.ts` | 1.5h |
| 3 | 添加倒计时显示 | `WarningLine.ts`, `GameHUD.ts` | 1h |
| 4 | 关卡配置中添加警告参数字段 | `LevelConfig`, `level_*.json` | 0.5h |

---

#### P0-3：关卡难度曲线断裂 — Level 5→6 难度跳变过大

**问题描述**：

15 个关卡的难度分析如下：

| 关卡 | 目标类型 | 目标值 | 容器宽度 | 可用数字 | 变形器 | 难度评估 |
|------|----------|--------|----------|----------|--------|----------|
| 1 | score | 500 | 400 | 1,2,4 | 无 | ★☆☆☆☆ |
| 2 | target_merge | 16 | 400 | 1,2,4,8 | 无 | ★☆☆☆☆ |
| 3 | clear_obstacle | 5 | 400 | 1,2,4 | 无 | ★★☆☆☆ |
| 4 | survival | 60s | 400 | 1,2,4,8 | 无(自动掉落 5s) | ★★☆☆☆ |
| 5 | score | 2000 | **350** | 1,2,4,8,16 | 无 | ★★★☆☆ |
| **6** | **score** | **3000** | 400 | **1,2,4** | **双挡板(滑动)** | **★★★★☆** |
| 7 | target_merge | 64 | 400 | 1,2,4,8 | 旋转 | ★★★☆☆ |
| 8 | score | 5000 | 400 | **1,2,4** | 收缩 | ★★★★☆ |
| 9 | clear_obstacle | 8 | 400 | 1,2,4,8 | 分叉+8 障碍 | ★★★☆☆ |
| 10 | score | 8000 | 400 | 1,2,4,8,16 | 挡板+旋转 | ★★★★☆ |
| 11 | target_merge | 128 | **350** | 1,2,4,8,16 | 收缩 | ★★★★★ |
| 12 | survival | 90s | 400 | 1,2,4,8 | 挡板(3s 自动掉落) | ★★★★☆ |
| 13 | score | 12000 | 400 | 1,2,4,8,16,32 | 旋转+收缩 | ★★★★★ |
| 14 | clear_obstacle | 12 | 400 | 1,2,4,8,16 | 分叉+挡板+12 障碍 | ★★★★★ |
| 15 | target_merge | 256 | 400 | 1-64 | **全部 4 种** | ★★★★★ |

**关键问题**：
1. **Level 5→6 跳变**：Level 5 首次引入 16 号方块和缩小容器，Level 6 突然引入双滑动挡板且可用数字退回 [1,2,4]，目标分数从 2000 跳至 3000
2. **Level 6 挡板配置异常**：两个挡板都是 `mode: "slide"`，`duration: 999`（永久存在），`triggerInterval: 0`（立即触发），新手完全没有适应期
3. **Level 8 可用数字过少**：只有 [1,2,4] 却要求 5000 分，在收缩边界下几乎不可能完成
4. **Level 13-15 难度爆炸**：连续 3 个极难关卡，缺乏过渡

**影响范围**：关卡 6–15 的可玩性  
**严重程度**：P0 — 关卡难度曲线

**技术解决方案**：

```json
{
  "id": 6,
  "name": "挡板初体验",
  "objective": { "type": "score", "target": 2000 },
  "container": { "width": 400, "height": 600 },
  "spawn": { "availableNumbers": [1, 2, 4, 8] },
  "modifiers": [
    {
      "type": "paddle",
      "enabled": true,
      "mode": "extend",
      "side": "left",
      "extendDuration": 3,
      "retractDuration": 2,
      "extendLength": 80,
      "triggerInterval": 8,
      "yPosition": 350
    }
  ],
  "rewards": { "stars": [800, 1400, 2000] }
}
```

**实施步骤**：

| 步骤 | 操作 | 涉及文件 | 预计时间 |
|------|------|----------|----------|
| 1 | 重新设计 Level 6-8 为"变形机制教学关" | `level_06-08.json` | 1h |
| 2 | Level 6 改为单挡板 + 伸出/缩回模式，间隔 8 秒触发 | `level_06.json` | 0.5h |
| 3 | Level 8 增加可用数字到 [1,2,4,8]，降低目标到 3000 | `level_08.json` | 0.5h |
| 4 | 在 Level 13-15 之间插入过渡关卡 | 新增 `level_13b.json` | 1h |
| 5 | 全面测试调整后的难度曲线 | 测试 | 1h |

---

#### P0-4：缺乏新手引导系统

**问题描述**：

1. 当前游戏从主菜单直接进入关卡选择，无任何教程或引导
2. 玩家需要自行理解：投放机制、合成规则、警戒线含义、道具使用方式、变形器效果
3. Level 1 作为"新手入门"，目标为 500 分，但没有解释如何得分
4. 道具栏始终显示 5 个道具按钮，但未解释各自功能

**影响范围**：新用户首次体验  
**严重程度**：P0 — 用户留存

**技术解决方案**：

```typescript
export class TutorialManager {
  private currentStep: number = 0;
  private steps: TutorialStep[] = [];

  interface TutorialStep {
    id: string;
    message: string;
    highlightArea?: { x: number; y: number; width: number; height: number };
    trigger: 'auto' | 'tap' | 'drop' | 'merge';
    waitForAction?: string;
  }

  private level1Tutorial: TutorialStep[] = [
    { id: 'welcome', message: '点击屏幕选择投放位置', trigger: 'auto' },
    { id: 'drop', message: '松开手指投放方块', trigger: 'tap', waitForAction: 'first_drop' },
    { id: 'merge_hint', message: '相同数字的方块碰撞会合成更大的数字！', trigger: 'auto' },
    { id: 'warning', message: '注意红色警戒线！方块堆太高会游戏结束', trigger: 'auto' },
  ];
}
```

**实施步骤**：

| 步骤 | 操作 | 涉及文件 | 预计时间 |
|------|------|----------|----------|
| 1 | 创建 `TutorialManager` 类 | 新增 `TutorialManager.ts` | 2h |
| 2 | 设计 Level 1-3 教程步骤数据 | 新增 `tutorial_steps.json` | 1h |
| 3 | 实现高亮遮罩和引导箭头 UI | 新增 `TutorialOverlay.ts` | 2h |
| 4 | 集成到 `GameScene.loadLevel()` | `GameScene.ts` | 1h |

---

### 🟠 P1 — 重要问题（影响游戏体验流畅性）

---

#### P1-1：道具系统交互设计反直觉

**问题描述**：

1. 炸弹道具需要"先点击道具按钮 → 进入瞄准模式 → 再点击目标位置"两步操作，但无视觉提示告知用户已进入瞄准模式
2. 瞄准模式下 `preview.hide()` 隐藏了投放预览，但没有显示炸弹瞄准光标
3. 道具栏位于屏幕右侧（`propsContainer.x = screenWidth - 360`），5 个按钮横排排列，在小屏设备上可能被截断
4. 道具按钮使用文字图标（'bomb', 'rainbow' 等），而非直观的图形图标

**代码位置**：[GameHUD.ts:87-154](file:///workspace/src/ui/hud/GameHUD.ts#L87-154)

**技术解决方案**：
1. 炸弹瞄准模式添加十字准星光标
2. 道具按钮添加选中高亮状态
3. 道具栏改为垂直排列或 2 行布局
4. 添加道具使用提示浮窗

---

#### P1-2：连锁合成反馈不充分

**问题描述**：

1. 连锁合成时仅 `chainText` 显示"连锁 xN!"，无其他视觉反馈
2. `ComboDisplay` 组件存在但未在 `GameHUD` 中使用
3. 合成特效仅通过 `addMergeEffect()` 添加，效果类型单一
4. 连锁计数 2 秒超时（`chainTimeout = 2000`），在物理合成游戏中 2 秒可能太短

**代码位置**：[ScoreSystem.ts:31](file:///workspace/src/gameplay/ScoreSystem.ts#L31), [GameHUD.ts:59-71](file:///workspace/src/ui/hud/GameHUD.ts#L59-71)

**技术解决方案**：
1. 将 `ComboDisplay` 集成到 `GameHUD`
2. 连锁时屏幕轻微震动效果
3. 高连锁时背景色变化
4. 连锁超时从 2 秒增加到 3 秒

---

#### P1-3：投放预览轨迹过于简陋

**问题描述**：

1. `BlockPreview` 仅绘制虚线垂直下落轨迹，不考虑物理碰撞后的实际路径
2. 预览圆环使用虚线弧段，视觉辨识度低
3. 不显示下一个将出现的方块

**代码位置**：[BlockPreview.ts](file:///workspace/src/gameplay/BlockPreview.ts)

**技术解决方案**：
1. 添加"下一个方块"预览区域
2. 轨迹线添加渐变透明效果
3. 在轨迹终点添加落点标记

---

#### P1-4：游戏暂停/恢复时状态不一致

**问题描述**：

1. `GameScene.pause()` 暂停了物理和 GSAP，但 `BlockSpawner` 的自动掉落计时器（`autoSpawnElapsed`）未暂停
2. 恢复时 `FreezeProp` 的冻结计时器通过 `AnimationManager.pause/resume` 控制，但全局暂停可能影响其他动画
3. 暂停时 `preview.hide()` 但未清除炸弹瞄准模式状态

**代码位置**：[GameScene.ts:235-249](file:///workspace/src/core/GameScene.ts#L235-249)

**技术解决方案**：
1. `BlockSpawner` 添加 `pause()/resume()` 方法
2. 暂停时清除炸弹瞄准模式
3. 使用独立的时间管理器而非 GSAP 全局暂停

---

#### P1-5：关卡选择界面缺乏信息

**问题描述**：

1. `LevelSelectScreen` 仅显示关卡编号、名称和星级
2. 不显示关卡目标类型（分数/合成/消除/生存）
3. 不显示最佳分数
4. 锁定关卡无解锁条件提示
5. 滚动区域固定高度（130-490），15 关以上需要滚动但无滚动指示器

**代码位置**：[LevelSelectScreen.ts](file:///workspace/src/ui/screens/LevelSelectScreen.ts)

**技术解决方案**：
1. 每个关卡按钮添加目标类型图标
2. 显示最佳分数
3. 锁定关卡显示"通关第 N 关解锁"
4. 添加滚动条指示器

---

### 🟡 P2 — 一般问题（影响体验细节）

---

#### P2-1：计分系统数值膨胀严重

**问题描述**：
- 合成 256 的基础分为 32768，乘以 5 倍连锁乘数和连锁加成，单次合成可得数十万分
- Level 1 目标仅 500 分，但 Level 13 目标 12000 分，分数增长与关卡难度不匹配
- Level 1 的 3 星线为 500（与通关线相同），意味着只要通关就是 3 星

**代码位置**：[ScoreSystem.ts](file:///workspace/src/gameplay/ScoreSystem.ts)

**技术解决方案**：
1. 重新平衡基础分数表，降低高阶合成的基础分
2. 星级分数线改为通关分的 60%/80%/100%
3. 添加分数上限防止数值溢出

---

#### P2-2：障碍物合成判定逻辑不直观

**问题描述**：
- `MergeSystem` 中障碍物碰撞判定要求 `obstacle.value === player.value`
- 即只有与障碍物数字相同的方块碰到障碍物才能清除，但这个规则从未向玩家说明
- 障碍物是静态的（`isStatic: true`），视觉上与普通方块无异，容易误导

**代码位置**：[MergeSystem.ts:80-91](file:///workspace/src/gameplay/MergeSystem.ts#L80-91)

**技术解决方案**：
1. 障碍物使用不同视觉样式（边框、半透明等）
2. 添加障碍物清除规则提示
3. 障碍物上方显示所需匹配数字

---

#### P2-3：容器变形器缺乏视觉预告

**问题描述**：
- 挡板伸出/收缩、容器旋转、边界收缩等变形均无预告
- 玩家无法预判变形发生时机，导致方块意外被推到警戒线以上
- 特别是 `PaddleModifier` 的 `slide` 模式，挡板持续来回移动，玩家难以规划投放策略

**技术解决方案**：
1. 变形触发前 3 秒添加视觉预告（挡板位置虚影、收缩方向箭头等）
2. 旋转前添加旋转方向指示
3. 收缩前显示目标宽度预览线

---

#### P2-4：ResultScreen 信息展示不完整

**问题描述**：
- `baseScore`/`chainBonus`/`timeBonus` 字段在 `SceneManager.completeLevel()` 中未传入
- 结果界面只显示"基础分：XXX"，连锁加成和时间奖励始终为 0
- 失败时显示"看广告复活"按钮，但广告系统未实现，点击无实际效果
- 星星动画使用 `setTimeout` 而非 GSAP，与项目动画规范不一致

**代码位置**：[ResultScreen.ts](file:///workspace/src/ui/screens/ResultScreen.ts), [SceneManager.ts](file:///workspace/src/core/SceneManager.ts)

**技术解决方案**：
1. 在 `SceneManager.completeLevel()` 中计算并传入完整分数明细
2. 广告复活按钮在广告系统未就绪时隐藏或改为"道具复活"
3. 星星动画改用 GSAP

---

#### P2-5：物理参数缺乏关卡差异化

**问题描述**：
- `PhysicsManager` 中所有方块使用相同的物理参数（`restitution: 0.3`, `friction: 0.5`, `frictionAir: 0.01`）
- 不同关卡无法调整重力、弹性等物理参数
- `BlockSpawner.dropBlock()` 中方块密度计算为 `0.003 + config.mass * 0.0005`，高数值方块密度过大

**代码位置**：[PhysicsManager.ts](file:///workspace/src/core/PhysicsManager.ts)

**技术解决方案**：
1. `LevelConfig` 添加 `physics` 配置字段
2. `PhysicsManager` 支持动态调整物理参数
3. 方块密度改为固定值或更平缓的缩放

---

#### P2-6：ShrinkProp 缩小道具恢复时位置重置问题

**问题描述**：
- `handleShrinkDeactivate()` 将方块位置重置为缩小前的原始位置
- 方块在缩小期间可能已经移动，但恢复时被强制拉回原位
- `Matter.Body.scale()` 连续调用可能导致物理形状变形

**代码位置**：[PropEffectHandler.ts:111-128](file:///workspace/src/core/PropEffectHandler.ts#L111-128)

**技术解决方案**：
1. 恢复时仅重置缩放比例，不重置位置
2. 记录缩放前的 `circleRadius` 而非整个位置
3. 使用 `Matter.Body.set()` 而非多次 `scale()`

---

#### P2-7：音效系统形同虚设

**问题描述**：
- `AudioManager` 已实现但所有音效文件缺失
- `sounds.json` 配置存在但无实际音频文件
- `GameEventRouter` 中调用 `audioManager.play('merge')` 等均无实际效果

**技术解决方案**：
1. 使用 Web Audio API 生成程序化音效（合成音、爆炸音等）
2. 优先添加核心音效：投放、合成、连锁、警告、游戏结束
3. 音效文件使用 MP3 格式，单文件 < 50KB

---

## 三、解决方案与实施计划

### 3.1 优先级排序与实施路线图

| 阶段 | 问题编号 | 预计工时 | 目标 |
|------|----------|----------|------|
| **Phase A（紧急修复）** | P0-1, P0-2 | 2 天 | 修复核心操作体验 |
| **Phase B（关键优化）** | P0-3, P0-4, P1-4 | 3 天 | 修复难度曲线 + 添加引导 |
| **Phase C（体验提升）** | P1-1, P1-2, P1-3, P1-5 | 3 天 | 改善交互反馈 |
| **Phase D（细节打磨）** | P2-1 ~ P2-7 | 4 天 | 数值平衡 + 细节优化 |

---

## 四、测试计划

### 4.1 测试环境

| 环境 | 配置 | 用途 |
|------|------|------|
| 开发环境 | Chrome + DevTools | 功能调试 |
| 微信开发者工具 | 最新稳定版 | 平台兼容性验证 |
| Vitest 单元测试 | jsdom 环境 | 回归测试 |
| 手动测试 | 多尺寸屏幕 | UI 适配验证 |

### 4.2 功能验证测试用例

#### TC-001：投放操作改进验证

| 用例 ID | 测试步骤 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| TC-001-01 | 点击屏幕任意位置 | 预览出现在手指上方 30px 处 | P0 |
| TC-001-02 | 按住并拖动 | 预览跟随手指水平移动 | P0 |
| TC-001-03 | 松开手指 | 方块从预览位置下落 | P0 |
| TC-001-04 | 快速连续点击（间隔 < 200ms） | 第二次点击不被吞掉，而是受 cooldown 控制 | P0 |
| TC-001-05 | 点击容器边界外 | 预览自动限制在容器范围内 | P1 |

#### TC-002：警告线改进验证

| 用例 ID | 测试步骤 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| TC-002-01 | 方块超过警戒线 0-30% 时间 | 黄色轻微闪烁 | P0 |
| TC-002-02 | 方块超过警戒线 30-70% 时间 | 橙色快速闪烁 | P0 |
| TC-002-03 | 方块超过警戒线 70-100% 时间 | 红色剧烈闪烁 + 倒计时 | P0 |
| TC-002-04 | 方块短暂越过警戒线后回落 | 1 秒宽限期内不触发警告 | P0 |
| TC-002-05 | 方块缓慢滑动越过警戒线 | 速度 < 2 时不触发警告 | P1 |

#### TC-003：关卡难度曲线验证

| 用例 ID | 测试步骤 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| TC-003-01 | 顺序通关 Level 1-6 | 难度平滑递增，无跳变感 | P0 |
| TC-003-02 | Level 6 首次遇到挡板 | 挡板间隔 8 秒触发，有足够反应时间 | P0 |
| TC-003-03 | Level 8 收缩边界 | 可用数字包含 8，目标 3000 分可达成 | P0 |
| TC-003-04 | Level 13-15 连续挑战 | 难度递进而非断崖式 | P1 |

#### TC-004：新手引导验证

| 用例 ID | 测试步骤 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| TC-004-01 | 首次进入 Level 1 | 显示"点击屏幕选择投放位置"引导 | P0 |
| TC-004-02 | 完成首次投放 | 显示"相同数字碰撞合成"提示 | P0 |
| TC-004-03 | 首次触发警告 | 显示警戒线说明 | P0 |
| TC-004-04 | 重新进入已通关关卡 | 不再显示教程 | P1 |

#### TC-005：道具交互验证

| 用例 ID | 测试步骤 | 预期结果 | 优先级 |
|---------|----------|----------|--------|
| TC-005-01 | 点击炸弹道具 | 按钮高亮，显示十字准星光标 | P1 |
| TC-005-02 | 炸弹瞄准模式下点击目标 | 爆炸效果 + 范围内方块消除 | P1 |
| TC-005-03 | 炸弹瞄准模式下按 ESC/返回 | 退出瞄准模式 | P1 |
| TC-005-04 | 冻结道具使用 | 物理暂停 + 冰冻视觉效果 | P1 |
| TC-005-05 | 冻结期间再次使用冻结 | 延长冻结时间而非无效 | P1 |

### 4.3 用户体验测试用例

| 用例 ID | 测试维度 | 测试方法 | 通过标准 |
|---------|----------|----------|----------|
| UX-001 | 操作直觉性 | 5 名新用户首次游玩，不给予任何说明 | 80% 能在 30 秒内完成首次投放 |
| UX-002 | 难度感知 | 记录每关首次通关尝试次数 | Level 1-5 平均 < 3 次，Level 6-10 平均 < 5 次 |
| UX-003 | 警告线可理解性 | 观察用户对警告线的反应 | 90% 用户在警告出现后主动调整策略 |
| UX-004 | 道具可发现性 | 记录用户首次使用道具的时间 | 70% 用户在 3 关内尝试使用道具 |
| UX-005 | 连锁反馈满意度 | 5 名用户评价连锁合成体验 | 平均评分 ≥ 4/5 |

### 4.4 回归测试矩阵

| 修改模块 | 需回归测试的功能点 | 对应测试文件 |
|----------|-------------------|-------------|
| Game.ts (输入逻辑) | 投放、预览、防抖 | `Game.test.ts` |
| WarningLine.ts | 警告触发、游戏结束判定 | `WarningLine.test.ts` |
| level_*.json | 关卡加载、目标判定 | `LevelLoader.test.ts`, `LevelSystem.enhanced.test.ts` |
| GameHUD.ts | 分数显示、道具栏、计时器 | `UIManager.test.ts`, `ComboDisplay.test.ts` |
| MergeSystem.ts | 合成逻辑、连锁检测 | `MergeSystem.enhanced.test.ts` |
| PhysicsManager.ts | 物理模拟、碰撞检测 | `PhysicsManager.test.ts` |
| PropEffectHandler.ts | 道具效果 | `CriticalFixes.test.ts` |

### 4.5 验收标准

| 指标 | 当前值 | 目标值 | 测量方式 |
|------|--------|--------|----------|
| Level 1 首次通关率 | 未知 | > 90% | 新用户测试 |
| Level 6 首次通关率 | 预估 < 30% | > 60% | 新用户测试 |
| 操作误触率 | 未知 | < 5% | 操作日志分析 |
| 平均每局时长 | 未知 | 2-4 分钟 | 游戏时长统计 |
| 警告线误触发率 | 预估 > 20% | < 5% | 游戏日志分析 |
| 新手引导完成率 | 0% | > 90% | 引导步骤完成率 |

---

## 五、优化建议

### 5.1 体验优化方向

1. **程序化音效系统**：使用 Web Audio API 生成即时音效，无需等待音效资源文件
2. **方块投放动画**：方块从预览位置"弹出"而非直接出现，增加投放手感
3. **智能方块推荐**：在方块堆叠密集时，预览轨迹高亮显示"最佳投放位置"
4. **成就弹窗系统**：合成高阶数字时弹出成就提示，增加成就感
5. **关卡内提示系统**：长时间未操作时显示提示

### 5.2 技术实现优化

1. **对象池优化**：`Block` 对象当前每次创建新实例，应使用对象池复用
2. **物理休眠优化**：已启用 `enableSleeping` 但 `sleepThreshold: 60` 帧过高，建议降低到 30
3. **渲染批处理**：方块使用独立 `Sprite`，应改用 `ParticleContainer` 批量渲染
4. **事件总线优化**：`EventBus` 使用字符串事件名，建议改用枚举类型确保类型安全
5. **内存泄漏防护**：`Game.destroy()` 中部分组件可能未完全清理

---

## 六、风险评估

### 6.1 实施风险

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| 关卡配置修改导致存档不兼容 | 中 | 高 | 添加配置版本号，实现存档迁移 |
| 新手引导系统增加首包大小 | 低 | 中 | 引导资源按需加载 |
| 物理参数调整影响现有关卡平衡 | 高 | 高 | 参数调整后全关卡回归测试 |
| 警告线参数放宽导致游戏过于简单 | 中 | 中 | A/B 测试不同参数组合 |
| GSAP 全局暂停与道具计时器冲突 | 高 | 中 | 重构时间管理为独立系统 |

### 6.2 技术债务

| 债务项 | 累积原因 | 偿还计划 |
|--------|----------|----------|
| 音效系统空转 | 资源文件持续未添加 | Phase D 使用程序化音效 |
| 道具系统不完整 | ShrinkProp/LuckyProp 延后 | Phase C 完善 |
| 测试覆盖偏向单元层 | 集成测试编写复杂 | Phase B-D 添加 E2E 测试 |
| 硬编码魔法数字 | 快速迭代中未抽取常量 | Phase A-D 逐步重构 |
| 事件总线缺乏类型安全 | 字符串事件名无编译检查 | Phase D 引入枚举事件 |

---

## 七、总结

### 7.1 核心发现

本项目当前最大的问题不是技术实现能力，而是**游戏设计层面的反直觉问题**：

1. **操作层**：投放机制缺乏手指补偿和直觉反馈，防抖逻辑过于粗暴
2. **反馈层**：警告线、连锁合成、道具效果等关键反馈均不够醒目
3. **难度层**：关卡 6 开始出现断崖式难度跳变，缺乏教学过渡
4. **引导层**：完全缺失新手引导，玩家需要自行摸索所有机制
5. **信息层**：障碍物规则、道具功能、关卡目标等关键信息缺乏展示

### 7.2 优先行动项

1. **立即修复**（1-2 天）：投放操作改进（P0-1）+ 警告线参数调整（P0-2）
2. **本周完成**（3-5 天）：关卡难度曲线重调（P0-3）+ 新手引导系统（P0-4）
3. **下周完成**（3-5 天）：道具交互改进（P1-1）+ 连锁反馈增强（P1-2）+ 暂停状态修复（P1-4）
4. **持续优化**（1-2 周）：数值平衡（P2-1）+ 音效系统（P2-7）+ 细节打磨

### 7.3 可量化改进目标

| 指标 | 当前预估 | 2 周后目标 | 4 周后目标 |
|------|----------|-----------|-----------|
| 新用户 5 分钟内理解核心玩法率 | < 30% | > 70% | > 90% |
| Level 1-5 首次通关率 | ~60% | > 80% | > 90% |
| Level 6-10 首次通关率 | ~30% | > 50% | > 65% |
| 操作误触率 | ~15% | < 8% | < 5% |
| 用户平均单局时长 | 未知 | 2-4 分钟 | 2-4 分钟 |
| 测试覆盖率（行为级） | ~40% | > 60% | > 80% |
