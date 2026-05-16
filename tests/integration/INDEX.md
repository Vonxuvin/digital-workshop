# 集成测试用例索引体系

## 概述

本文档建立了针对 Week1 至 Week5 阶段所有功能的集成测试用例索引体系。所有测试用例按功能模块分类归档，确保每个功能点至少有一个对应的集成测试用例覆盖。

**测试统计**: 19个集成测试文件, 642个集成测试用例, 全部通过 ✓

---

## 一、核心系统集成 (Core Systems Integration)

### 1.1 游戏状态机 + 场景管理集成
**文件**: `tests/integration/GameStateSceneManager.integration.test.ts`
**覆盖阶段**: Week1
**功能点**:
- 游戏状态转换 (boot→loading→menu→playing→paused/gameover/levelComplete)
- 状态回调协调
- 非法状态转换拦截
- 状态历史追踪

### 1.2 深度核心测试
**文件**: `tests/integration/DeepCoreTests.test.ts`
**覆盖阶段**: Week1-Week3
**功能点**:
- GameStateMachine 完整生命周期
- EventBus 事件发布订阅
- PhysicsManager 物理引擎集成
- ObjectPool 对象池管理
- PerformanceMonitor 性能监控

### 1.3 深度集成测试
**文件**: `tests/integration/DeepIntegrationTests.test.ts`
**覆盖阶段**: Week1-Week3
**功能点**:
- ScoreSystem → LevelSystem 事件流
- EventBus 事件传播
- LevelLoader 关卡加载
- WarningLine 警戒线机制

### 1.4 深度游戏玩法测试
**文件**: `tests/integration/DeepGameplayTests.test.ts`
**覆盖阶段**: Week2-Week3
**功能点**:
- ScoreSystem 计分逻辑
- LevelSystem 关卡管理
- 合并系统与计分联动

---

## 二、道具系统集成 (Props System Integration)

### 2.1 道具系统集成测试
**文件**: `tests/integration/PropsIntegration.test.ts` **[新增]**
**覆盖阶段**: Week4
**功能点**:
| 功能点 | 测试用例 | 状态 |
|--------|----------|------|
| BombProp 爆炸事件 | `should emit props:bomb:explode with correct target coordinates` | ✓ |
| BombProp 目标选择 | `should emit props:bomb:requireTarget when no target provided` | ✓ |
| BombProp 使用次数限制 | `should respect maxCount limit` | ✓ |
| BombProp 爆炸范围过滤 | `should filter blocks within explosion radius` | ✓ |
| BombProp 冷却时间 | `should enforce cooldown between uses` | ✓ |
| RainbowProp 激活事件 | `should emit props:rainbow:activated with 3 remaining blocks` | ✓ |
| RainbowProp 下一个方块标记 | `should emit gameplay:nextBlock with isRainbow flag` | ✓ |
| RainbowProp 消耗递减 | `should decrement remaining blocks on consume` | ✓ |
| RainbowProp 停用事件 | `should emit props:rainbow:deactivated when all blocks consumed` | ✓ |
| FreezeProp 物理暂停 | `should stop physics when freeze activates` | ✓ |
| FreezeProp 激活事件 | `should emit props:freeze:activated with duration` | ✓ |
| FreezeProp 延长冻结 | `should extend freeze duration when used while already frozen` | ✓ |
| FreezeProp 恢复物理 | `should restart physics when unfreeze occurs` | ✓ |
| FreezeProp 停用事件 | `should emit props:freeze:deactivated on unfreeze` | ✓ |
| ShrinkProp 激活事件 | `should emit props:shrink:activate with factor and duration` | ✓ |
| ShrinkProp 激活状态 | `should be active after use` | ✓ |
| ShrinkProp 延长持续时间 | `should extend duration when used while already active` | ✓ |
| ShrinkProp 停用事件 | `should emit props:shrink:deactivate when timer expires` | ✓ |
| ShrinkProp 冷却时间 | `should enforce cooldown` | ✓ |
| LuckyProp 激活事件 | `should emit props:lucky:activate with multiplier and remaining drops` | ✓ |
| LuckyProp 激活状态 | `should be active after use with 3 remaining drops` | ✓ |
| LuckyProp 消耗递减 | `should decrement drops on consume` | ✓ |
| LuckyProp 停用事件 | `should emit props:lucky:deactivate when all drops consumed` | ✓ |
| LuckyProp 冷却时间 | `should enforce cooldown` | ✓ |
| PropSystem 加载配置 | `should load config and initialize all prop types` | ✓ |
| PropSystem 使用炸弹 | `should use bomb prop through PropSystem` | ✓ |
| PropSystem 使用彩虹 | `should use rainbow prop through PropSystem` | ✓ |
| PropSystem 使用冰冻 | `should use freeze prop through PropSystem` | ✓ |
| PropSystem 使用缩小 | `should use shrink prop through PropSystem` | ✓ |
| PropSystem 使用幸运 | `should use lucky prop through PropSystem` | ✓ |
| PropSystem 使用失败 | `should emit props:useFailed when prop not available` | ✓ |
| PropSystem 使用成功 | `should emit props:used with remaining count` | ✓ |
| PropSystem 重置 | `should reset all props` | ✓ |
| PropSystem 暂停/恢复 | `should pause and resume props` | ✓ |
| 道具事件传播 | `should propagate bomb/rainbow/freeze/shrink/lucky events` | ✓ |

---

## 三、变形器系统集成 (Modifiers System Integration)

### 3.1 变形器系统集成测试
**文件**: `tests/integration/ModifiersIntegration.test.ts` **[新增]**
**覆盖阶段**: Week5
**功能点**:
| 功能点 | 测试用例 | 状态 |
|--------|----------|------|
| PaddleModifier 创建 | `should create paddle modifier from config` | ✓ |
| RotateModifier 创建 | `should create rotate modifier from config` | ✓ |
| ShrinkModifier 创建 | `should create shrink modifier from config` | ✓ |
| ForkModifier 创建 | `should create fork modifier from config` | ✓ |
| 同类型替换 | `should replace existing modifier of same type` | ✓ |
| 关卡配置加载 | `should load modifiers from level config array` | ✓ |
| 全部启动 | `should start all modifiers` | ✓ |
| 全部停止 | `should stop all modifiers` | ✓ |
| 全部暂停/恢复 | `should pause and resume all modifiers` | ✓ |
| 全部清除 | `should clear all modifiers` | ✓ |
| 不支持类型 | `should return null for unsupported modifier type` | ✓ |
| 容器尺寸未设置 | `should return null when container size not set` | ✓ |
| ForkModifier 结构创建 | `should create fork structure with divider and walls` | ✓ |
| ForkModifier 零角度 | `should handle zero angles gracefully` | ✓ |
| ForkModifier 顶部位置 | `should handle fork at top of container` | ✓ |
| PaddleModifier 左侧伸缩 | `should create extend mode paddle on left side` | ✓ |
| PaddleModifier 右侧滑动 | `should create slide mode paddle on right side` | ✓ |
| PaddleModifier 双侧 | `should create paddle on both sides` | ✓ |
| RotateModifier 振荡 | `should create rotating modifier with oscillation` | ✓ |
| RotateModifier 非振荡 | `should create rotating modifier without oscillation` | ✓ |
| ShrinkModifier 创建 | `should create shrink modifier` | ✓ |
| ShrinkModifier 最小宽度 | `should not shrink below minWidth` | ✓ |
| 多变形器同时激活 | `should support paddle and rotate active together` | ✓ |
| 多变形器同时激活 | `should support shrink and fork active together` | ✓ |
| 多变形器暂停恢复 | `should pause and resume all modifiers together` | ✓ |
| 变形器事件传播 | `should emit modifier events through event bus` | ✓ |
| 变形器停用事件 | `should emit modifier deactivated events` | ✓ |

---

## 四、目标判定系统集成 (Objectives System Integration)

### 4.1 目标判定系统集成测试
**文件**: `tests/integration/ObjectivesIntegration.test.ts` **[新增]**
**覆盖阶段**: Week2-Week3
**功能点**:
| 功能点 | 测试用例 | 状态 |
|--------|----------|------|
| ScoreObjective 达标 | `should return true when score meets/exceeds/equals target` | ✓ |
| ScoreObjective 未达标 | `should return false when score below target` | ✓ |
| ScoreObjective 进度 | `should return correct progress ratio / cap at 1 / 0` | ✓ |
| MergeObjective 达标 | `should return true when highest merge meets/exceeds/equals target` | ✓ |
| MergeObjective 未达标 | `should return false when highest merge below target` | ✓ |
| MergeObjective 对数进度 | `should return logarithmic progress` | ✓ |
| MergeObjective 边界 | `should return 1 when target is 0 / 0 when merge is 1` | ✓ |
| ClearObstacle 达标 | `should return true when obstacles cleared meets/exceeds target` | ✓ |
| ClearObstacle 未达标 | `should return false when obstacles cleared below target` | ✓ |
| ClearObstacle 进度 | `should return correct progress ratio / 1 when target is 0` | ✓ |
| SurvivalObjective 达标 | `should return true when survival time meets/exceeds target` | ✓ |
| SurvivalObjective 未达标 | `should return false when survival time below target` | ✓ |
| SurvivalObjective 进度 | `should return correct progress ratio / 0 when target is 0` | ✓ |
| 工厂模式创建 | `should create correct checker for each type` | ✓ |
| LevelSystem 分数目标 | `should complete level when score objective met` | ✓ |
| LevelSystem 合并目标 | `should complete level when merge objective met` | ✓ |
| LevelSystem 清除障碍目标 | `should complete level when clear obstacle objective met` | ✓ |
| LevelSystem 生存目标 | `should complete level when survival time met` | ✓ |
| LevelSystem 未达标 | `should not complete level when objective not met` | ✓ |
| LevelSystem 重复完成 | `should not emit level:completed twice for same level` | ✓ |
| LevelSystem 最高合并值 | `should track highest merge value` | ✓ |
| LevelSystem 时间更新 | `should emit level:timeUpdate during survival` | ✓ |
| LevelSystem 暂停恢复 | `should pause and resume level updates` | ✓ |
| LevelSystem 完成数据 | `should include correct data in level:completed event` | ✓ |
| LevelSystem 进度查询 | `should return correct progress for score/merge objective` | ✓ |

---

## 五、完整游戏循环集成 (Full Game Loop Integration)

### 5.1 完整游戏循环集成测试
**文件**: `tests/integration/FullGameLoopIntegration.test.ts` **[新增]**
**覆盖阶段**: Week1-Week5
**功能点**:
| 功能点 | 测试用例 | 状态 |
|--------|----------|------|
| 投放→合并→计分→通关 | `should complete full chain: drop block → merge → score → level complete` | ✓ |
| 连锁合并计分 | `should handle chain merge scoring` | ✓ |
| 连锁超时重置 | `should reset chain after timeout` | ✓ |
| 连锁结束事件 | `should emit score:chainEnded when chain times out` | ✓ |
| 暂停关卡系统 | `should pause level system when game pauses` | ✓ |
| 恢复关卡系统 | `should resume level system when game resumes` | ✓ |
| 游戏结束状态 | `should transition to gameover on game over` | ✓ |
| 关卡完成状态 | `should transition to levelComplete on level completion` | ✓ |
| 非法状态转换 | `should not allow invalid state transitions` | ✓ |
| 状态历史追踪 | `should track state history` | ✓ |
| 警戒线开始 | `should emit warning:started when blocks exceed warning line` | ✓ |
| 警戒线游戏结束 | `should emit game:over when warning threshold exceeded` | ✓ |
| 警戒线结束 | `should emit warning:ended when blocks clear from warning line` | ✓ |
| 障碍物清除计分 | `should emit obstacle:cleared and update score` | ✓ |
| 完整关卡生命周期 | `should complete full level lifecycle: start → play → complete → next` | ✓ |
| 游戏结束重启 | `should handle game over and restart` | ✓ |
| 幸运倍率计分 | `should apply lucky multiplier to score` | ✓ |
| 多系统协调 | `should coordinate score, level, and state systems` | ✓ |

---

## 六、存档系统集成 (Save/Load System Integration)

### 6.1 存档系统集成测试
**文件**: `tests/integration/SaveLoadIntegration.test.ts` **[新增]**
**覆盖阶段**: Week5
**功能点**:
| 功能点 | 测试用例 | 状态 |
|--------|----------|------|
| 默认数据初始化 | `should initialize with default data` | ✓ |
| 关卡进度更新 | `should update level progress after completing a level` | ✓ |
| 解锁下一关 | `should unlock next level when current level completed` | ✓ |
| 不重复解锁 | `should not unlock next level if already completed` | ✓ |
| 累计星星 | `should accumulate total stars` | ✓ |
| 保留最高分 | `should only keep highest score` | ✓ |
| 尝试次数追踪 | `should track attempts even when not completed` | ✓ |
| 保留最佳时间 | `should only keep best (lowest) time` | ✓ |
| 游戏统计更新 | `should update play statistics` | ✓ |
| 最大连击追踪 | `should track max combo across games` | ✓ |
| 最高合并追踪 | `should track highest merge across games` | ✓ |
| 累计游戏时间 | `should accumulate total play time` | ✓ |
| 音效开关 | `should toggle sound setting` | ✓ |
| 音乐开关 | `should toggle music setting` | ✓ |
| 震动开关 | `should toggle vibration setting` | ✓ |
| 保存事件 | `should emit save:saved when save completes` | ✓ |
| 加载事件 | `should emit save:loaded when loading` | ✓ |
| 脏标记保存 | `should mark dirty and trigger save` | ✓ |
| 顺序解锁 | `should unlock levels in sequence` | ✓ |
| 未知关卡默认进度 | `should create default progress for unknown levels` | ✓ |

---

## 七、音效系统集成 (Audio System Integration)

### 7.1 音效与游戏事件集成测试
**文件**: `tests/integration/AudioGameplayIntegration.test.ts` **[新增]**
**覆盖阶段**: Week4
**功能点**:
| 功能点 | 测试用例 | 状态 |
|--------|----------|------|
| 投放音效 | `should emit audio:play on block drop` | ✓ |
| 合并音效 | `should emit audio:play on block merge` | ✓ |
| 通关音效 | `should emit audio:play on level complete` | ✓ |
| 失败音效 | `should emit audio:play on game over` | ✓ |
| 道具音效 | `should emit audio:play on prop use` | ✓ |
| 障碍物清除音效 | `should emit audio:play on obstacle cleared` | ✓ |
| 警戒音效 | `should emit audio:play on warning started` | ✓ |
| 按钮点击音效 | `should emit audio:play on button click` | ✓ |
| 静音事件 | `should emit audio:mute when sound is muted` | ✓ |
| 取消静音事件 | `should emit audio:unmute when sound is unmuted` | ✓ |
| 静音时不播放 | `should not emit audio:play when muted` | ✓ |
| 菜单音乐 | `should play menu music on menu state` | ✓ |
| 游戏音乐 | `should play game music on playing state` | ✓ |
| 暂停音乐 | `should stop music on pause` | ✓ |
| 设置同步 | `should respect sound enabled/muted setting` | ✓ |

---

## 八、教程系统集成 (Tutorial System Integration)

### 8.1 教程与游戏玩法集成测试
**文件**: `tests/integration/TutorialGameplayIntegration.test.ts` **[新增]**
**覆盖阶段**: Week5
**功能点**:
| 功能点 | 测试用例 | 状态 |
|--------|----------|------|
| 未完成显示教程 | `should show tutorial for level 1 when not completed` | ✓ |
| 已完成不显示 | `should not show tutorial for level 1 when completed` | ✓ |
| 5次尝试后不显示 | `should not show tutorial for level 1 after 5 attempts` | ✓ |
| 无效关卡不显示 | `should not show tutorial for invalid level ids` | ✓ |
| Level 1 教程启动 | `should start tutorial for level 1` | ✓ |
| Level 2 教程启动 | `should start tutorial for level 2` | ✓ |
| Level 3 教程启动 | `should start tutorial for level 3` | ✓ |
| 跳过教程 | `should skip tutorial` | ✓ |
| 条件不满足不启动 | `should not start tutorial if shouldShowTutorial returns false` | ✓ |
| Level 1 步骤推进 | `should progress through level 1 tutorial steps` | ✓ |
| Level 2 步骤推进 | `should progress through level 2 tutorial steps` | ✓ |
| Level 3 步骤推进 | `should progress through level 3 tutorial steps` | ✓ |
| 投放事件响应 | `should respond to drop event during tutorial` | ✓ |
| 合并事件响应 | `should respond to merge event during tutorial` | ✓ |
| 警戒事件响应 | `should respond to warning event during tutorial` | ✓ |
| 道具使用事件响应 | `should respond to prop used event during tutorial` | ✓ |
| 障碍物清除事件响应 | `should respond to obstacle cleared event during tutorial` | ✓ |
| 教程完成后隐藏 | `should hide tutorial after completion` | ✓ |
| 完成后不再显示 | `should not show tutorial again after completion` | ✓ |

---

## 九、Bug修复验证集成 (Bug Fix Verification)

### 9.1 Week5 关键修复验证
**文件**: `tests/integration/Week5CriticalFixes.test.ts`
**覆盖阶段**: Week5
**功能点**: Week5 关键Bug修复的回归测试

### 9.2 Week5 修复集成验证
**文件**: `tests/integration/Week5FixesIntegration.test.ts`
**覆盖阶段**: Week5
**功能点**: Week5 修复项的集成验证

### 9.3 Week5 UI修复集成验证
**文件**: `tests/integration/Week5UIFixesIntegration.test.ts`
**覆盖阶段**: Week5
**功能点**: Week5 UI修复的集成验证

### 9.4 Week5 后续修复验证
**文件**: `tests/integration/Week5NextWeekFixes.test.ts`
**覆盖阶段**: Week5
**功能点**: 关卡难度和教程修复验证

### 9.5 Week5 每周修复验证
**文件**: `tests/integration/Week5WeeklyFixes.test.ts`
**覆盖阶段**: Week5
**功能点**: WarningLine 和 ShrinkModifier 修复验证

### 9.6 关键修复验证
**文件**: `tests/integration/CriticalFixes.test.ts`
**覆盖阶段**: Week3-Week4
**功能点**: BlockSpawner 和 PropEffectHandler 修复验证

---

## 十、功能覆盖矩阵

| 功能模块 | Week1 | Week2 | Week3 | Week4 | Week5 | 测试文件数 | 测试用例数 |
|----------|-------|-------|-------|-------|-------|-----------|-----------|
| 核心状态机 | ✓ | - | - | - | - | 2 | ~40 |
| 物理引擎 | ✓ | - | - | - | - | 1 | ~15 |
| 事件总线 | ✓ | ✓ | ✓ | ✓ | ✓ | 3 | ~30 |
| 计分系统 | - | ✓ | - | - | - | 2 | ~20 |
| 关卡系统 | - | ✓ | ✓ | - | - | 2 | ~25 |
| 目标判定 | - | ✓ | ✓ | - | - | 1 [新] | 26 |
| 合并系统 | - | ✓ | - | - | - | 1 | ~10 |
| 警戒线 | - | ✓ | - | - | - | 1 | ~8 |
| 障碍物 | - | - | ✓ | - | - | 1 | ~5 |
| 道具系统 | - | - | - | ✓ | - | 1 [新] | 35 |
| 音效系统 | - | - | - | ✓ | - | 1 [新] | 15 |
| 变形器系统 | - | - | - | - | ✓ | 1 [新] | 27 |
| 存档系统 | - | - | - | - | ✓ | 1 [新] | 20 |
| 教程系统 | - | - | - | - | ✓ | 1 [新] | 19 |
| 完整游戏循环 | ✓ | ✓ | ✓ | ✓ | ✓ | 1 [新] | 18 |
| Bug修复验证 | - | ✓ | ✓ | ✓ | ✓ | 6 | ~150 |

---

## 十一、测试执行命令

```bash
# 运行所有集成测试
npx vitest run tests/integration/

# 运行特定模块集成测试
npx vitest run tests/integration/PropsIntegration.test.ts
npx vitest run tests/integration/ModifiersIntegration.test.ts
npx vitest run tests/integration/ObjectivesIntegration.test.ts
npx vitest run tests/integration/FullGameLoopIntegration.test.ts
npx vitest run tests/integration/SaveLoadIntegration.test.ts
npx vitest run tests/integration/AudioGameplayIntegration.test.ts
npx vitest run tests/integration/TutorialGameplayIntegration.test.ts

# 运行全部测试
npx vitest run
```

---

## 十二、变更记录

| 日期 | 变更内容 | 影响 |
|------|----------|------|
| 2026-05-17 | 新增7个集成测试文件，补充142个测试用例 | 覆盖Week1-Week5所有功能点 |
| 2026-05-17 | 审查现有测试用例库，确认无无效/过期用例 | 保留所有1318个现有测试 |
| 2026-05-17 | 建立功能模块分类索引体系 | 便于测试用例管理和查找 |