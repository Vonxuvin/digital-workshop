# 《数字工坊》Week5 未解决问题完整清单

> **版本**：V1.0  
> **日期**：2026-05-13  
> **基于文档**：Week5_全面评估与测试分析报告.md  
> **审查范围**：报告已识别问题 + 代码深度审查新发现问题  
> **技术栈**：PixiJS v8.6.3 / Matter.js 0.20.0 / GSAP 3.12.5 / Vite + Vitest  

---

## 一、P0 — 严重问题（影响核心游戏体验）

---

### P0-1：投放操作直觉性不足（部分修复，仍有遗留）

**当前状态**：报告建议的 `calculateDropY()` 和 `TOUCH_OFFSET_Y` 已实现，但仍有以下遗留问题：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| `calculateDropY()` 中 `touchY - 30` 可能导致预览出现在容器外（触摸屏幕底部时 dropY 会超出容器） | P0 | `Game.ts:306-309` | 未解决 |
| 投放时 `dropY` 取自 `preview.y`（`Game.ts:298`），但预览的 `y` 可能因 `setGroundY()` 被覆盖为 `groundY - 30`，与用户触摸位置不一致 | P0 | `Game.ts:298` | 未解决 |
| `cooldownRemaining = 500ms` 仍然偏长，快速操作仍有延迟感 | P1 | `BlockSpawner.ts:21` | 未解决 |
| 投放后无"方块从预览位置弹出"的动画，方块直接出现在投放点 | P1 | `BlockSpawner.ts:51-81` | 未解决 |

**根本原因**：`dropY` 计算逻辑在 `Game.setupInput()` 和 `BlockPreview.setGroundY()` 之间存在冲突——前者使用触摸位置偏移，后者使用 `groundY - 30`，两者语义不同。

**解决方案**：统一 `dropY` 计算逻辑，添加边界约束 `Math.min(dropY, containerTop + maxDropOffset)`，将冷却时间降至 300ms，添加投放弹出动画。

**关联测试用例**：TC-001-01 ~ TC-001-05

---

### P0-2：警告线机制（已部分修复，参数已调整但仍有问题）

**当前状态**：`WarningConfig` 已实现，默认阈值已从 3000ms 改为 5000ms，渐进式视觉反馈已实现。但仍有以下遗留问题：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| 警告参数不可按关卡配置，所有关卡使用相同默认值 | P0 | `GameScene.ts:114` | 未解决 |
| `graphics.tint` 在 PixiJS v8 中对 `Graphics` 对象可能不生效（v8 中 Graphics 不再自动应用 tint 到所有绘制内容） | P0 | `WarningLine.ts:121-129` | 未解决 |
| `speedThreshold = 2` 仍然过低，物理引擎微小振动（速度 1-2）仍可能误触发 | P1 | `WarningLine.ts:11` | 未解决 |

**根本原因**：
1. `GameScene.setupContainer()` 创建 `WarningLine` 时未传入关卡配置
2. PixiJS v8 的 `Graphics` 对象的 `tint` 行为与 v7 不同，需要改用 `fill()` 中直接设置颜色

**解决方案**：
1. `LevelConfig` 添加 `warning` 配置字段，`GameScene.setupContainer()` 传入关卡警告参数
2. 渐进反馈改为直接重绘线条颜色，而非依赖 `tint`
3. `speedThreshold` 提高到 3-5，或添加"方块静止检测"（速度 < 1 且持续 200ms）

**关联测试用例**：TC-002-01 ~ TC-002-05

---

### P0-3：关卡难度曲线断裂（Level 6 已修复，其他仍有问题）

**当前状态**：Level 6 已从双滑动挡板改为单挡板伸出/缩回模式，Level 8 已增加可用数字到 [1,2,4,8] 并降低目标到 3000。但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| Level 5 有 `timeLimit: 120` 但 `objective.type` 是 `score`，非 `survival`——这导致 120 秒后游戏超时失败，但玩家以为是得分关卡 | P0 | `level_05.json` | 未解决 |
| Level 13-15 仍为连续极难关卡，缺乏过渡 | P0 | `level_13-15.json` | 未解决 |
| Level 15 的 `target_merge: 256` 需要 8 次连续合成，在 5 种变形器同时激活下几乎不可能 | P0 | `level_15.json` | 未解决 |
| Level 1 星级线 `[300, 400, 500]`，3 星线 = 通关线，意味着只要通关就是 3 星 | P1 | `level_01.json` | 未解决 |

**根本原因**：关卡设计缺乏系统化的难度评估框架，`timeLimit` 字段与 `objective.type` 语义冲突——`score` 类型不应有 `timeLimit`（会导致超时失败）。

**解决方案**：
1. Level 5 移除 `timeLimit` 或改为 `survival` 类型
2. 在 Level 12-13 之间插入过渡关卡
3. Level 15 减少变形器种类到 2-3 种
4. 所有关卡星级线改为通关分的 60%/80%/100%

**关联测试用例**：TC-003-01 ~ TC-003-04

---

### P0-4：新手引导系统（已实现但功能不完整）

**当前状态**：`TutorialManager` 和 `TutorialOverlay` 已创建，Level 1 有 4 步教程。但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| 教程仅在 Level 1 且 `attempts === 0` 时触发，首次失败后不再显示 | P0 | `TutorialManager.ts:26-29` | 未解决 |
| `auto` 触发的步骤使用 `setTimeout(3000)` 自动推进，但未考虑游戏暂停/恢复 | P1 | `TutorialManager.ts:140-146` | 未解决 |
| 无道具使用教程，5 个道具按钮功能从未向玩家说明 | P0 | `TutorialManager.ts` | 未解决 |
| 无障碍物清除规则说明 | P0 | `TutorialManager.ts` | 未解决 |
| 教程步骤中 `first_merge` 事件已注册监听但无步骤使用它 | P2 | `TutorialManager.ts:77` | 未解决 |

**根本原因**：教程系统仅覆盖了最基本的投放操作，缺少道具、障碍物、变形器等进阶机制的教学步骤。

**解决方案**：
1. 添加 Level 2-3 的进阶教程（道具使用、障碍物规则）
2. `shouldShowTutorial` 改为 `attempts < 3`（前 3 次都显示）
3. `setTimeout` 改用 `AnimationManager.setTimeout` 以支持暂停
4. 添加道具使用提示浮窗

**关联测试用例**：TC-004-01 ~ TC-004-04

---

## 二、P1 — 重要问题（影响游戏体验流畅性）

---

### P1-1：道具系统交互设计反直觉（部分修复）

**当前状态**：十字准星已实现，道具选中高亮已实现。但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| 道具栏 `propsContainer.x = screenWidth - 360`，5 个按钮横排 350px 宽，在 375px 宽的手机上几乎贴边 | P1 | `GameHUD.ts:363` | 未解决 |
| 道具按钮使用文字图标（'bomb', 'rainbow' 等），无图形图标 | P2 | `GameHUD.ts:95-101` | 未解决 |
| 冻结道具使用时无视觉提示告知玩家物理已暂停（仅有冰冻效果覆盖层） | P1 | `PropEffectHandler.ts` | 未解决 |
| 缩小道具使用时无视觉提示 | P1 | `PropEffectHandler.ts` | 未解决 |

**根本原因**：道具交互缺乏完整的 UX 设计——状态变化需要对应的视觉反馈。

**关联测试用例**：TC-005-01 ~ TC-005-05

---

### P1-2：连锁合成反馈不充分（部分修复）

**当前状态**：`ComboDisplay` 已集成到 `GameHUD`，连锁超时已从 2 秒增加到 3 秒。但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| `ComboDisplay` 已添加但 `showCombo()` 从未被调用——`GameHUD.handleScoreUpdated()` 仅更新 `chainText`，未调用 `showCombo()` | P1 | `GameHUD.ts:320-327` | 未解决 |
| 连锁时无屏幕震动效果 | P2 | `GameScene.ts` | 未解决 |
| 高连锁时无背景色变化 | P2 | `GameScene.ts` | 未解决 |

**根本原因**：`ComboDisplay` 组件已创建但未与 `score:updated` 事件正确连接。

**解决方案**：在 `handleScoreUpdated()` 中添加 `this.showCombo(data.chainCount)` 调用。

**关联测试用例**：UX-005

---

### P1-3：投放预览轨迹过于简陋（部分修复）

**当前状态**：落点标记已添加，轨迹虚线已实现。但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| "下一个方块"预览区域已实现（`nextPreview`），但 `setNextValue()` 从未被调用 | P1 | `BlockPreview.ts:134-137` | 未解决 |
| 轨迹线无渐变透明效果 | P2 | `BlockPreview.ts` | 未解决 |
| 预览位置未限制在容器边界内 | P1 | `BlockPreview.ts:109-113` | 未解决 |

**根本原因**：`BlockPreview.setBounds()` 已设置 `minX/maxX`，但 `updatePosition()` 未使用这些边界值来约束 `x` 坐标。

**解决方案**：`updatePosition()` 中添加 `this.x = Math.max(this.minX + this.radius, Math.min(this.maxX - this.radius, x))`，并在投放后调用 `setNextValue()`。

---

### P1-4：游戏暂停/恢复时状态不一致（部分修复）

**当前状态**：`BlockSpawner.pause()/resume()` 已实现，暂停时已清除炸弹瞄准模式。但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| `gsap.globalTimeline.pause()` 暂停所有 GSAP 动画，包括 HUD 分数动画，但 `AnimationManager` 的定时器通过 `propEffectHandler.pause()` 单独暂停——两套时间系统不同步 | P1 | `GameScene.ts:252-260` | 未解决 |
| 恢复时 `FreezeProp.resume()` 可能重启物理引擎，但 `GameScene.resume()` 中 `gsap.globalTimeline.resume()` 不保证在 `propEffectHandler.resume()` 之后执行 | P1 | `GameScene.ts:255-261` | 未解决 |
| `LevelSystem` 的 `timerElapsed` 在暂停时通过 `isPaused` 标志停止累加，但 `survival` 类型关卡的计时器可能因暂停时间被"吞掉"而不准确 | P2 | `LevelSystem.ts:159-179` | 未解决 |

**根本原因**：项目存在两套独立的时间管理系统（GSAP 全局时间线 + AnimationManager 定时器），暂停/恢复操作需要分别处理，容易遗漏。

**解决方案**：创建统一的 `TimeManager`，所有定时器和动画通过同一接口暂停/恢复。

---

### P1-5：关卡选择界面缺乏信息（部分修复）

**当前状态**：已添加目标类型图标、最佳分数、解锁条件提示、滚动条指示器。但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| 目标类型图标仅区分 `score` 和其他（🎯/⭐），未区分 `target_merge`、`clear_obstacle`、`survival` | P2 | `LevelSelectScreen.ts:194` | 未解决 |
| 滚动使用 PixiJS 的 `pointerdown/move/up` 事件，在微信小程序中可能与页面滚动冲突 | P1 | `LevelSelectScreen.ts` | 未解决 |

---

## 三、P2 — 一般问题（影响体验细节）

---

### P2-1：计分系统数值膨胀严重（未解决）

**当前状态**：`ScoreSystem` 的 `calculateScore()` 使用 `2^(tier-1)` 公式，合成 256 得 128 分，乘以 5 倍连锁乘数和幸运乘数后可达数千分。Level 1 目标仅 500 分，但 Level 13 目标 12000 分，分数增长与关卡难度不匹配。

**代码位置**：`ScoreSystem.ts:77-82`

**根本原因**：`calculateScore()` 与 `SCORE_CONFIGS` 表不一致——`SCORE_CONFIGS` 定义了 `baseScore` 和 `chainMultiplier`，但 `addMergeScore()` 调用的是 `calculateScore()` 而非使用 `SCORE_CONFIGS` 表。

**解决方案**：统一使用 `SCORE_CONFIGS` 表，或重新平衡 `calculateScore()` 公式。

---

### P2-2：障碍物合成判定逻辑不直观（部分修复）

**当前状态**：障碍物已有视觉区分（半透明 + X 标记 + 灰色边框），但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| 障碍物上方未显示所需匹配数字 | P1 | `Block.ts:80-98` | 未解决 |
| 清除规则从未向玩家说明 | P0 | — | 未解决 |

---

### P2-3：容器变形器缺乏视觉预告（部分修复）

**当前状态**：`ShrinkModifier` 已实现 `showWarning()` 方法，显示收缩预览线和箭头。但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| `PaddleModifier` 和 `RotateModifier` 无预告 | P1 | `PaddleModifier.ts`, `RotateModifier.ts` | 未解决 |
| `ForkModifier` 无预告 | P1 | `ForkModifier.ts` | 未解决 |

---

### P2-4：ResultScreen 信息展示不完整（部分修复）

**当前状态**：星星动画已改用 GSAP，失败时显示"复活"按钮而非"看广告复活"。但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| `SceneManager.completeLevel()` 未传入 `maxCombo` 和 `mergedCount`，结果界面缺少这些数据 | P1 | `SceneManager.ts:125-146` | 未解决 |
| 失败时 `ResultData` 未包含 `playTime`，结果界面不显示游戏时长 | P2 | `SceneManager.ts:116-122` | 未解决 |
| 复活按钮点击后直接复活，无任何消耗或确认 | P1 | `SceneManager.ts:148-152` | 未解决 |

---

### P2-5：物理参数缺乏关卡差异化（未解决）

**当前状态**：`PhysicsManager` 已支持 `applyPhysicsConfig()`，但 `LevelConfig` 无 `physics` 字段，所有关卡使用相同物理参数。

**代码位置**：`PhysicsManager.ts:38-42`

---

### P2-6：ShrinkProp 缩小道具恢复时位置重置问题（部分修复）

**当前状态**：`handleShrinkDeactivate()` 已改为仅重置缩放比例和 `circleRadius`，不重置位置。但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| `Matter.Body.scale(block.body, inverseScale, inverseScale)` 连续缩放可能导致累积误差 | P2 | `PropEffectHandler.ts:124-125` | 未解决 |
| 缩小期间新投放的方块不在 `originalBodyData` 中，恢复时这些方块不会被还原 | P1 | `PropEffectHandler.ts:96-114` | 未解决 |

**根本原因**：`handleShrinkActivate()` 仅记录当前存在的方块数据，缩小期间新投放的方块被遗漏。

**解决方案**：缩小期间新投放的方块也应立即缩小，或在 `BlockSpawner.dropBlock()` 中检查 `shrinkActive` 状态。

---

### P2-7：音效系统（部分修复）

**当前状态**：程序化音效已实现（Web Audio API），音频文件仍缺失。但仍有：

| 子问题 | 严重级别 | 代码位置 | 状态 |
|--------|----------|----------|------|
| 程序化音效仅有 150ms 持续时间，音质单薄 | P2 | `AudioManager.ts:122-128` | 未解决 |
| `AudioManager` 在构造函数中监听了 `gameplay:blockSpawn` 等事件，但这些事件从未被发射（代码中使用的是 `block:dropped`） | P1 | `AudioManager.ts:38-46` | 未解决 |
| `sounds.json` 中缺少 `drop`、`explosion`、`warning`、`shrink`、`lucky` 等音效配置 | P2 | `sounds.json` | 未解决 |

---

## 四、H — 报告未提及的隐藏问题

---

### H-1：EventBus 事件名不一致导致功能静默失败

**严重级别**：P1  
**代码位置**：`AudioManager.ts:38-46` vs `GameEventRouter.ts`

**问题描述**：
- `AudioManager` 构造函数中监听了 `gameplay:blockSpawn`、`gameplay:merge`、`gameplay:combo`、`gameplay:gameOver`、`gameplay:levelComplete` 事件
- 但实际代码中发射的事件名是 `block:dropped`、`block:merged`、`score:updated`、`game:over`、`level:completed`
- 这意味着 `AudioManager` 构造函数中注册的 6 个事件监听器**永远不会被触发**
- 音效播放实际依赖 `GameEventRouter` 中的手动调用（如 `this.audioManager.play('merge')`），而非事件驱动

**影响范围**：AudioManager 的事件驱动架构形同虚设，双重路径可能导致未来维护混乱

**解决方案**：统一事件名，或移除 AudioManager 中的无效监听器

---

### H-2：GameEventRouter 中缩小道具音效错误

**严重级别**：P2  
**代码位置**：`GameEventRouter.ts:159-160`

**问题描述**：`handleShrinkActivate()` 中调用了 `this.audioManager.play('freeze')`，应该播放 `'shrink'` 音效而非 `'freeze'`。

```typescript
private handleShrinkActivate(data: { factor: number; duration: number }): void {
    this.gameScene.handleShrinkActivate(data);
    this.audioManager.play('freeze'); // BUG: 应为 'shrink'
}
```

**解决方案**：将 `'freeze'` 改为 `'shrink'`

---

### H-3：ShrinkModifier 墙壁定位不考虑容器偏移

**严重级别**：P1  
**代码位置**：`ShrinkModifier.ts:171-196`

**问题描述**：`updateWallPositions()` 使用 `this.originalWidth / 2` 作为中心点计算墙壁位置，但未考虑 `containerOffsetX`。当容器居中显示时（`containerOffsetX > 0`），收缩的墙壁会偏移到错误位置。

**影响范围**：所有使用 ShrinkModifier 的关卡（Level 8, 13, 15）

**解决方案**：`ShrinkModifier` 构造函数接收 `containerOffsetX` 参数，在 `updateWallPositions()` 中加入偏移量

---

### H-4：Block.destroy() 中 sprite 可能已被父类销毁

**严重级别**：P2  
**代码位置**：`Block.ts:119-124`

**问题描述**：`Block.destroy()` 先调用 `this.sprite.destroy()`，再调用 `super.destroy()`。但 `super.destroy()` （`Container.destroy()`）默认会销毁所有子元素，包括 `sprite`。如果 `sprite` 已被单独销毁，`super.destroy()` 再次尝试销毁可能引发错误。

**解决方案**：调用 `super.destroy({ children: true })` 前不单独销毁 sprite，或使用 `super.destroy({ children: false })` 并手动管理子元素销毁。

---

### H-5：ObjectPool 已创建但从未被使用

**严重级别**：P2  
**代码位置**：`ObjectPool.ts`

**问题描述**：`ObjectPool<T>` 类已实现，但全项目无任何地方使用它。`Block` 对象每次创建新实例，未使用对象池复用。报告中也提到了"对象池优化"建议，但实际代码中未落实。

**影响范围**：大量方块创建/销毁时的 GC 压力

---

### H-6：SaveManager.updateStatistics() 未被正确调用

**严重级别**：P1  
**代码位置**：`SceneManager.ts:135` vs `SaveManager.ts:198-208`

**问题描述**：`SceneManager.completeLevel()` 中调用 `this.saveManager.updateStatistics(0, 0, playTime)`，但 `mergeValue` 和 `comboCount` 参数始终传 0，导致 `highestMerge` 和 `longestCombo` 统计永远不更新。

**解决方案**：从 `GameScene` / `ScoreSystem` / `MergeSystem` 获取实际的 `highestMergeValue` 和 `chainCount` 传入

---

### H-7：LevelSystem 事件监听器在 destroy 后可能残留

**严重级别**：P2  
**代码位置**：`LevelSystem.ts:60-64`

**问题描述**：`LevelSystem` 在构造函数中通过 `eventBus.on()` 注册了 3 个事件监听器。`destroy()` 中通过 `eventBus.off()` 移除。但 `GameScene.loadLevel()` 中每次加载关卡都会 `new LevelSystem(config)`，如果前一个 `LevelSystem` 未正确 destroy（如异常情况），监听器会泄漏。

**解决方案**：使用 `eventBus.createNamespace()` 管理事件监听器，确保批量清理

---

### H-8：Game 单例模式在测试中可能导致状态污染

**严重级别**：P2  
**代码位置**：`Game.ts:33-105`

**问题描述**：`Game` 使用静态单例模式 `Game.instance`，但 `destroy()` 中设置 `Game.instance = null`。如果测试中创建多个 `Game` 实例但未正确销毁，会抛出"实例尚未创建"异常。类似问题存在于 `AudioManager`、`SaveManager`、`PropSystem`、`ModifierManager`、`AnimationManager`、`BlockTextureCache`。

**解决方案**：测试中使用依赖注入替代单例，或在 `beforeEach` 中确保 `destroy()` 被调用

---

### H-9：InputManager touchend 事件不更新位置

**严重级别**：P1  
**代码位置**：`InputManager.ts:67-71`

**问题描述**：`handleUp()` 仅重置 `isDown` 和 `isMoving`，但不更新 `position`。在触摸设备上，`touchend` 事件通过 `changedTouches` 获取最终位置，但 `handleUp()` 绑定的是 `touchend` 事件，未从 `changedTouches` 中读取最终触摸位置。这导致投放位置可能不是手指最终位置。

**解决方案**：`touchend` 时从 `e.changedTouches[0]` 更新位置

---

### H-10：npm 依赖存在安全漏洞和版本不匹配

**严重级别**：P2  
**代码位置**：`package.json`

**问题描述**：`npm audit` 报告 6 个漏洞（5 moderate, 1 high），包括已弃用的 `glob@10.5.0`。此外 `@pixi/canvas-renderer@^7.4.3` 与 `pixi.js@8.6.3` 版本不匹配（v7 的 canvas renderer 不兼容 v8）。

**解决方案**：运行 `npm audit fix`，移除 `@pixi/canvas-renderer` 依赖（PixiJS v8 已内置 canvas renderer 回退）

---

### H-11：Level 5 的 timeLimit 与 score 类型目标冲突

**严重级别**：P0  
**代码位置**：`level_05.json`, `LevelSystem.ts:159-179`

**问题描述**：Level 5 配置了 `objective.type: "score"` 同时有 `timeLimit: 120`。在 `LevelSystem.update()` 中，当 `timeLimit` 存在且 `survivalTime >= timeLimit` 时，如果 `objective.type !== 'survival'`，会发射 `game:timeout` 事件导致游戏失败。这意味着 Level 5 实际上是一个限时得分关卡，但 UI 上没有显示倒计时（因为 `timeUpdate` 事件仅在 `timeLimit` 存在时才发射，但 `GameHUD` 的计时器显示逻辑可能未正确处理 `score` 类型关卡的倒计时）。

**影响范围**：Level 5 玩家可能在不知情的情况下超时失败

**解决方案**：Level 5 移除 `timeLimit` 或改为 `survival` 类型，或在 `score` + `timeLimit` 组合下正确显示倒计时

---

### H-12：GSAP 全局暂停影响非游戏动画

**严重级别**：P1  
**代码位置**：`GameScene.ts:252`

**问题描述**：`gsap.globalTimeline.pause()` 会暂停所有 GSAP 动画，包括 UI 界面的过渡动画（如 `LevelSelectScreen.onShow()` 中的 `gsap.to(this.container, { alpha: 1 })`）。如果暂停后显示暂停界面，暂停界面的动画也会被冻结。

**解决方案**：使用 GSAP 的独立时间线（`gsap.timeline()`）管理游戏动画，而非全局暂停

---

## 五、问题汇总统计

| 严重级别 | 数量 | 报告已识别 | 新发现 |
|----------|------|-----------|--------|
| P0 | 6 | 4 | 2（H-3 ShrinkModifier偏移, H-11 Level5超时） |
| P1 | 12 | 5 | 7（H-1, H-3, H-6, H-9, H-12, P1-2 ComboDisplay未连接, P2-6新方块遗漏） |
| P2 | 10 | 7 | 3（H-2, H-4, H-5, H-8, H-10） |

---

## 六、优先修复建议

### 立即修复（1-2天）

| 编号 | 问题 | 修复工作量 | 说明 |
|------|------|-----------|------|
| H-1 | EventBus 事件名不一致 | 0.5h | 统一事件名，修复 AudioManager 无效监听 |
| H-2 | ShrinkProp 音效名错误 | 5min | 1 行代码修改 |
| H-11 | Level 5 timeLimit 冲突 | 0.5h | 移除 timeLimit 或改为 survival 类型 |
| P1-2 | ComboDisplay 未连接 | 5min | GameHUD 中添加 `showCombo()` 调用 |
| H-9 | InputManager touchend 位置 | 0.5h | 从 changedTouches 更新位置 |

### 本周修复（3-5天）

| 编号 | 问题 | 修复工作量 | 说明 |
|------|------|-----------|------|
| P0-2 | WarningLine tint 不生效 | 1.5h | 改用直接重绘颜色 |
| H-3 | ShrinkModifier 偏移 | 1h | 添加 containerOffsetX 支持 |
| P2-6 | ShrinkProp 新方块遗漏 | 1h | dropBlock 中检查 shrinkActive |
| H-6 | updateStatistics 参数 | 0.5h | 传入正确的 mergeValue 和 comboCount |
| P1-4 | 统一时间管理 | 2h | 创建 TimeManager 统一暂停/恢复 |

### 下周修复（3-5天）

| 编号 | 问题 | 修复工作量 | 说明 |
|------|------|-----------|------|
| P0-3 | 关卡难度曲线全面调整 | 3h | 重新设计 Level 5/13-15 |
| P0-4 | 完善新手引导系统 | 4h | 添加道具/障碍物教程 |
| P1-1 | 道具栏布局优化 | 2h | 改为垂直排列或 2 行布局 |
| P2-1 | 计分系统数值平衡 | 2h | 统一使用 SCORE_CONFIGS 表 |
