# 集成测试用例索引体系

## 概述

本文档建立了针对 Week1 至 Week5 阶段所有功能的集成测试用例索引体系。所有测试用例按功能模块分类归档，确保每个功能点至少有一个对应的集成测试用例覆盖。临时Bug修复测试用例已按功能模块整合到对应的永久测试文件中，消除了重复用例和独立修复文件。

**测试统计**: 20个集成测试文件, 全部通过 ✓

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
- GameStateMachine + BlockTextureCache 集成

### 1.2 对象池管理
**文件**: `tests/core/ObjectPool.test.ts`
**覆盖阶段**: Week1-Week3
**功能点**:
- ObjectPool 初始化/预分配
- acquire/release 生命周期
- 对象复用与重置
- 池大小管理

### 1.3 性能监控
**文件**: `tests/utils/PerformanceMonitor.test.ts`
**覆盖阶段**: Week1-Week3
**功能点**:
- FPS 计算/帧时间统计
- 质量等级降级与恢复
- 粒子倍率/效果缩减/非必要动画暂停
- 采样数限制 (60)

---

## 二、道具系统集成 (Props System Integration)

### 2.1 道具系统集成测试
**文件**: `tests/integration/PropsIntegration.test.ts`
**覆盖阶段**: Week4-Week5
**功能点**:
- BombProp / RainbowProp / FreezeProp / ShrinkProp / LuckyProp 完整生命周期
- PropSystem 加载配置、使用、重置、暂停恢复
- 道具 + EventBus 事件传播
- BombProp Bug Fix 回归测试
- Bomb Target Mode 响应优化
- LuckyProp Bug Fix 回归测试
- PropEffectHandler + Container boundary 集成
- PropEffectHandler circleRadius for circle bodies
- Shrink bottom position 集成
- ShrinkProp 新方块遗漏修复回归
- PropEffectHandler handleRevive 调用链
- ShrinkProp 音效名修复回归

---

## 三、变形器系统集成 (Modifiers System Integration)

### 3.1 变形器系统集成测试
**文件**: `tests/integration/ModifiersIntegration.test.ts`
**覆盖阶段**: Week5
**功能点**:
- ModifierManager 生命周期 (创建/替换/加载/启动/停止/暂停/恢复/清除)
- ForkModifier / PaddleModifier / RotateModifier / ShrinkModifier 集成
- 多变形器同时激活
- 变形器 + EventBus 事件传播
- ShrinkModifier 墙壁偏移修复回归
- ShrinkModifier containerOffsetX 修复回归

---

## 四、目标判定系统集成 (Objectives System Integration)

### 4.1 目标判定系统集成测试
**文件**: `tests/integration/ObjectivesIntegration.test.ts`
**覆盖阶段**: Week2-Week5
**功能点**:
- ScoreObjectiveChecker / MergeObjectiveChecker / ClearObstacleChecker / SurvivalObjectiveChecker
- ObjectiveChecker 工厂模式
- LevelSystem + Objectives 集成 (分数/合并/清除/生存目标)
- Level 5 timeLimit 冲突修复回归
- LevelSystem 复活/重新启动流程
- LevelSystem + ScoreSystem 统计追踪

### 4.2 目标显示集成测试
**文件**: `tests/integration/ObjectiveDisplayIntegration.test.ts`
**覆盖阶段**: Week4
**功能点**:
- LevelSystem + ObjectiveDisplay 集成
- GameHUD + LevelSystem 集成
- LevelObjectiveOverlay + LevelConfig 集成
- 进度刷新机制

---

## 五、完整游戏循环集成 (Full Game Loop Integration)

### 5.1 完整游戏循环集成测试
**文件**: `tests/integration/FullGameLoopIntegration.test.ts`
**覆盖阶段**: Week1-Week5
**功能点**:
- 投放→合并→计分→通关完整链
- 连锁合并计分与超时重置
- 暂停/恢复关卡系统
- 游戏结束/关卡完成状态
- 警戒线→游戏结束
- 障碍物清除计分
- 幸运倍率计分
- 多系统协调

---

## 六、存档系统集成 (Save/Load System Integration)

### 6.1 存档系统集成测试
**文件**: `tests/integration/SaveLoadIntegration.test.ts`
**覆盖阶段**: Week5
**功能点**:
- 默认数据初始化
- 关卡进度更新/解锁/星星/最高分/尝试次数/最佳时间
- 游戏统计/最大连击/最高合并/累计时间
- 音效/音乐/震动设置
- 保存/加载事件/脏标记
- SaveManager updateStatistics 参数修复回归
- SceneManager.completeLevel 正确参数验证

---

## 七、音效系统集成 (Audio System Integration)

### 7.1 音效与游戏事件集成测试
**文件**: `tests/integration/AudioGameplayIntegration.test.ts`
**覆盖阶段**: Week4-Week5
**功能点**:
- 投放/合并/通关/失败/道具/障碍物/警戒/按钮音效
- 静音/取消静音
- 游戏状态音乐切换
- 设置同步
- AudioManager EventBus 事件名一致性修复回归

---

## 八、教程系统集成 (Tutorial System Integration)

### 8.1 教程与游戏玩法集成测试
**文件**: `tests/integration/TutorialGameplayIntegration.test.ts`
**覆盖阶段**: Week5
**功能点**:
- 教程显示条件/启动/跳过
- Level 1/2/3 步骤推进
- 教程 + 游戏事件响应
- 教程完成后隐藏/不再显示

---

## 九、警戒线集成 (WarningLine Integration)

### 9.1 警戒线集成测试
**文件**: `tests/integration/WarningLineIntegration.test.ts`
**覆盖阶段**: Week5
**功能点**:
- 警戒线视觉反馈阶段 (黄色0-30%/橙色30-70%/红色70-100%)
- 宽限期与速度过滤
- PixiJS v8 Graphics.tint 兼容性修复回归
- 警戒线重置与生命周期
- 警戒线 + UI 集成

---

## 十、方块预览集成 (BlockPreview Integration)

### 10.1 方块预览集成测试
**文件**: `tests/integration/BlockPreviewIntegration.test.ts`
**覆盖阶段**: Week4-Week5
**功能点**:
- nextPreview 生命周期
- 暂停/恢复与 nextPreview
- 状态转换处理
- 多次投放与预览更新
- 隐藏状态 getBounds
- 自动投放与预览集成

---

## 十一、方块生成器集成 (BlockSpawner Integration)

### 11.1 方块生成器集成测试
**文件**: `tests/integration/BlockSpawnerIntegration.test.ts`
**覆盖阶段**: Week3-Week5
**功能点**:
- 自动投放与手动释放冲突
- 投放时序与动画
- spawnObstacles containerOffsetX
- 障碍物边界钳制

---

## 十二、时间管理集成 (TimeManager Integration)

### 12.1 时间管理集成测试
**文件**: `tests/integration/TimeManagerIntegration.test.ts`
**覆盖阶段**: Week5
**功能点**:
- 统一暂停/恢复 (GSAP时间线 + AnimationManager)
- 单例管理
- 游戏时间线
- 源码验证 (GameScene/效果/HUD/ComboDisplay使用TimeManager)
- 动画时间线重置

---

## 十三、UI组件集成 (UI Components Integration)

### 13.1 UI组件集成测试
**文件**: `tests/integration/UIComponentsIntegration.test.ts`
**覆盖阶段**: Week5
**功能点**:
- Screen resize 流程 (Pause/Settings/MainMenu/Result)
- Effect 生命周期 (Particle/Freeze)
- HUD + Props 集成
- ComboDisplay 集成
- UI Components (Button/ProgressBar/Panel)
- PropButton 状态
- UI Event flow

---

## 十四、关卡数据验证 (Level Data Validation)

### 14.1 关卡数据验证测试
**文件**: `tests/integration/LevelDataValidation.test.ts`
**覆盖阶段**: Week5
**功能点**:
- 关卡难度曲线验证 (Level 1-6/6/8/13-15)
- 新手引导验证 (Level 1/2/3 教程)
- 道具交互验证 (炸弹/冰冻/道具栏布局)

---

## 十五、其他集成测试

### 15.1 关卡流程集成
**文件**: `tests/integration/LevelFlowIntegration.test.ts`
**覆盖阶段**: Week3-Week5
**功能点**: GameEventRouter 完整游戏流程、道具事件流、分数和警戒流、Game.ts重复事件监听BUG回归

### 15.2 加载渲染集成
**文件**: `tests/integration/LoadingRendering.integration.test.ts`
**覆盖阶段**: Week3
**功能点**: LoadingScreen + GameStateMachine、BlockTextureCache、PlatformAdapter、LevelLoader

### 15.3 性能优化集成
**文件**: `tests/integration/PerformanceOptimization.test.ts`
**覆盖阶段**: Week3
**功能点**: LevelLoader懒加载、BlockTextureCache最小预加载、PlatformAdapter单例

### 15.4 视觉墙壁对齐
**文件**: `tests/integration/VisualWallAlignment.test.ts`
**覆盖阶段**: Week4
**功能点**: ContainerRenderer→BlockPreview bounds、物理墙壁对齐、预览落点标记

### 15.5 计分计数器集成
**文件**: `tests/integration/ScoreCounterIntegration.test.ts`
**覆盖阶段**: Week2-Week5
**功能点**: 碰撞→合并→计分流程、Level 2场景、空间合并检查、计分系统数值平衡、Score→Level完成事件流

---

## 十六、功能覆盖矩阵

| 功能模块 | Week1 | Week2 | Week3 | Week4 | Week5 | 测试文件 |
|----------|-------|-------|-------|-------|-------|---------|
| 核心状态机 | ✓ | - | - | - | - | GameStateSceneManager, GameStateMachine.test |
| 物理引擎 | ✓ | - | - | - | - | PhysicsManager.test |
| 事件总线 | ✓ | ✓ | ✓ | ✓ | ✓ | EventBus.test |
| 输入管理 | - | - | - | - | ✓ | InputManager.test |
| 对象池 | ✓ | - | ✓ | - | - | ObjectPool.test |
| 性能监控 | ✓ | - | ✓ | - | - | PerformanceMonitor.test |
| 计分系统 | - | ✓ | - | - | ✓ | ScoreCounterIntegration, ScoreSystem.test |
| 关卡系统 | - | ✓ | ✓ | - | ✓ | ObjectivesIntegration, LevelDataValidation |
| 目标判定 | - | ✓ | ✓ | - | - | ObjectivesIntegration, ObjectiveDisplayIntegration |
| 合并系统 | - | ✓ | - | - | - | MergeSystem.test |
| 方块实体 | - | ✓ | - | - | - | Block.test |
| 警戒线 | - | ✓ | - | - | ✓ | WarningLineIntegration, WarningLine.test |
| 道具系统 | - | - | - | ✓ | ✓ | PropsIntegration |
| 音效系统 | - | - | - | ✓ | ✓ | AudioGameplayIntegration |
| 变形器系统 | - | - | - | - | ✓ | ModifiersIntegration |
| 存档系统 | - | - | - | - | ✓ | SaveLoadIntegration |
| 教程系统 | - | - | - | - | ✓ | TutorialGameplayIntegration |
| 时间管理 | - | - | - | - | ✓ | TimeManagerIntegration |
| 方块预览 | - | - | - | ✓ | ✓ | BlockPreviewIntegration |
| 方块生成器 | - | - | ✓ | - | ✓ | BlockSpawnerIntegration |
| UI组件 | - | - | - | - | ✓ | UIComponentsIntegration |
| 完整游戏循环 | ✓ | ✓ | ✓ | ✓ | ✓ | FullGameLoopIntegration |
| 关卡流程 | - | - | ✓ | - | ✓ | LevelFlowIntegration |
| 加载渲染 | - | - | ✓ | - | - | LoadingRenderingIntegration |
| 性能优化 | - | - | ✓ | - | - | PerformanceOptimization |
| 视觉对齐 | - | - | - | ✓ | - | VisualWallAlignment |

---

## 十七、测试执行命令

```bash
# 运行所有集成测试
npx vitest run tests/integration/

# 运行特定模块集成测试
npx vitest run tests/integration/PropsIntegration.test.ts
npx vitest run tests/integration/ModifiersIntegration.test.ts
npx vitest run tests/integration/ObjectivesIntegration.test.ts
npx vitest run tests/integration/WarningLineIntegration.test.ts
npx vitest run tests/integration/BlockPreviewIntegration.test.ts
npx vitest run tests/integration/BlockSpawnerIntegration.test.ts
npx vitest run tests/integration/TimeManagerIntegration.test.ts
npx vitest run tests/integration/UIComponentsIntegration.test.ts
npx vitest run tests/integration/LevelDataValidation.test.ts

# 运行全部测试
npx vitest run
```

---

## 十八、变更记录

| 日期 | 变更内容 | 影响 |
|------|----------|------|
| 2026-05-18 | 系统性整合Deep*临时测试文件，按功能模块归类到永久测试文件 | 删除3个Deep*临时集成测试文件，新增2个单元测试文件(ObjectPool/PerformanceMonitor)，扩展9个现有测试文件 |
| 2026-05-17 | 系统性整合临时Bug修复测试文件，按功能模块归类 | 删除11个临时集成测试文件，新增6个功能模块文件，扩展7个现有文件 |
| 2026-05-17 | 整合gameplay临时测试文件到主测试文件 | 删除3个临时单元测试文件，扩展2个主文件，新增1个BlockSpawner.test.ts |
| 2026-05-17 | 更新INDEX.md索引体系 | 反映整合后的文件结构和功能覆盖矩阵 |
