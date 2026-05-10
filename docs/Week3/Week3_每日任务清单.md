# 《数字工坊》Week 3 每日任务细化清单

> **阶段**：Phase 2 原型开发期 - MVP 核心  
> **时间**：Day 15 - Day 21（共7天）  
> **目标**：开发可玩的 MVP 原型，实现投放→合成→计分→关卡结算完整游戏循环，并通过全面系统测试与质量验收  
> **技术栈**：PixiJS v8 + Matter.js + TypeScript + Vite + Vitest

---

## 任务拆分总览

| 日期 | 主题 | 核心任务 | 预计工时 | 前置条件 | 并行建议 |
|------|------|----------|----------|----------|----------|
| Day 15 | 游戏主循环架构 | 搭建 Game.ts 主入口与 Ticker 循环 | 8h | Week 2 核心机制验证完成 | - |
| Day 16 | 场景管理系统 | 实现 SceneManager.ts 与场景切换 | 8h | Day 15 完成 | - |
| Day 17 | 核心玩法串联 | 整合投放→物理→合成→计分流程 | 8h | Day 15-16 完成 | - |
| Day 18 | UI 框架搭建 | UIManager.ts + 基础组件体系 | 8h | Day 17 完成 | - |
| Day 19 | 核心界面实现 | 主菜单、游戏界面、结算界面 | 8h | Day 18 完成 | 可与 Day 20 部分并行 |
| Day 20 | 关卡系统框架 | LevelSystem.ts + 配置解析 + 目标判定 | 8h | Day 17 完成 | 可与 Day 19 部分并行 |
| Day 21 | 全面测试与收尾 | 系统测试 + 缺陷修复 + 用例精简 + 最终核实 | 8h | Day 19-20 完成 | 测试与修复并行 |

---

## 并行执行策略

为提高开发效率，以下任务可并行执行：

| 并行组合 | 任务 A | 任务 B | 说明 |
|----------|--------|--------|------|
| Day 19 + Day 20 | 核心界面实现（UI 部分） | 关卡系统框架（数据部分） | UI 与数据逻辑无强依赖，可分别开发后联调 |
| Day 21 内部 | 执行测试用例 | 修复已发现缺陷 | 测试人员执行用例，开发人员同步修复 |
| Day 21 内部 | 测试用例精简评估 | 文档归档 | 测试完成后同步进行 |

---

## Day 15：游戏主循环架构搭建

### 任务信息

| 属性 | 内容 |
|------|------|
| **任务编号** | W3-D15 |
| **任务名称** | 游戏主循环架构搭建 |
| **预计工时** | 8小时（编码6h + 自测2h） |
| **前置条件** | Week 2 核心物理合成原型已验证通过；项目目录结构已初始化（含 src/core/、src/gameplay/、src/ui/ 等完整目录树）；tsconfig.json 和 vite.config.ts 已配置 |
| **技术栈** | TypeScript, PixiJS v8 Application/Ticker, Matter.js Engine |
| **交付标准** | Game.ts 可初始化运行，Ticker 循环稳定 60fps，无内存泄漏 |

### 具体任务目标

搭建游戏主入口 [Game.ts](file:///workspace/src/core/Game.ts)，实现：
1. PixiJS Application 单例初始化（WebGL/Canvas 自动降级）
2. Matter.js Engine 初始化与物理世界配置
3. PixiJS Ticker 游戏循环，同步物理步进（固定时间步长）
4. 全局游戏状态机（BOOT → LOADING → MENU → PLAYING → PAUSED → GAMEOVER）
5. 窗口resize适配与DPI缩放处理

### 详细实现步骤

1. **Game.ts 单例类实现**（2h）
   - 实现 `Game.getInstance()` 单例模式
   - 构造函数中初始化 PixiJS Application（width: window.innerWidth, height: window.innerHeight, backgroundColor: 0x1a1a2e）
   - 配置 WebGL 优先、Canvas 2D 降级策略
   - 将 canvas 添加到 DOM

2. **物理引擎集成**（2h）
   - 初始化 Matter.js Engine 和 World
   - 配置物理参数（gravity: {x:0, y:1}, restitution: 0.3, friction: 0.5）
   - 实现物理步进与渲染循环的解耦（固定 60fps 物理更新）
   - 物理-渲染同步机制设计

3. **游戏状态机**（1.5h）
   - 定义 `GameState` 枚举：BOOT, LOADING, MENU, PLAYING, PAUSED, GAMEOVER
   - 实现状态切换方法 `changeState(state)`，带生命周期钩子（onEnter/onExit）
   - 状态切换事件通过 EventBus 广播

4. **Ticker 循环与性能监控**（1.5h）
   - PixiJS Ticker 注册 update 回调
   - 实现固定时间步长物理更新（dt 累积 + 最大步长限制）
   - 集成 FPS 计数器与帧时间监控
   - 低帧率自动降级策略（<30fps 时减少物理迭代次数）

5. **窗口适配**（1h）
   - resize 事件监听，动态调整 canvas 尺寸
   - 计算安全区域（适配刘海屏、底部导航栏）
   - DPI 缩放处理（devicePixelRatio 适配）

### 单元测试任务

| 测试项 | 测试内容 | 通过标准 |
|--------|----------|----------|
| 单例测试 | 多次调用 getInstance() 返回同一实例 | 引用相等 |
| 状态机测试 | 状态切换序列正确，生命周期钩子触发 | 无异常，事件正确广播 |
| Ticker 测试 | 连续运行 60 秒，统计 FPS | 平均 FPS ≥ 58（PC端） |
| 内存测试 | 连续运行 5 分钟，堆内存增长 | 增长 < 10MB |

### 代码审查要点

- [ ] 单例实现是否线程安全（虽然 JS 单线程，但需防止多次初始化）
- [ ] 物理步进是否使用固定时间步长，避免不同帧率下物理表现不一致
- [ ] Ticker 回调是否正确清理，避免重复注册
- [ ] resize 事件是否防抖处理，避免频繁重排

### 产出物

1. [src/core/Game.ts](file:///workspace/src/core/Game.ts) - 游戏主入口
2. [src/core/PhysicsManager.ts](file:///workspace/src/core/PhysicsManager.ts) - 物理引擎管理器（如未在 Week 1-2 完成）
3. [tests/core/Game.test.ts](file:///workspace/tests/core/Game.test.ts) - 单元测试
4. Day 15 开发日志（记录遇到的问题和解决方案）

---

## Day 16：场景管理系统实现

### 任务信息

| 属性 | 内容 |
|------|------|
| **任务编号** | W3-D16 |
| **任务名称** | 场景管理系统实现 |
| **预计工时** | 8小时（编码6h + 自测2h） |
| **前置条件** | Day 15 Game.ts 完成；PixiJS Container 层级结构明确 |
| **技术栈** | TypeScript, PixiJS v8 Container, GSAP |
| **交付标准** | 场景切换流畅，内存正确释放，过渡动画 60fps |

### 具体任务目标

实现 [SceneManager.ts](file:///workspace/src/core/SceneManager.ts)，管理游戏各场景的完整生命周期：
1. 场景注册与懒加载机制
2. 场景切换过渡动画（淡入淡出/滑动）
3. 场景资源预加载与卸载
4. 场景层级管理（背景层、游戏层、UI层、弹窗层）

### 详细实现步骤

1. **Scene 基类设计**（2h）
   - 抽象类 `Scene extends PIXI.Container`
   - 生命周期方法：`preload()` → `create()` → `update(dt)` → `pause()` → `resume()` → `destroy()`
   - 每个场景独立的 Container 层级，便于内存管理

2. **SceneManager 实现**（2.5h）
   - 场景注册表：`Map<string, typeof Scene>`
   - 当前场景引用与场景栈（支持返回上一级）
   - `switchTo(sceneName, transition?)` 切换场景
   - `push(sceneName)` / `pop()` 场景栈操作

3. **过渡动画系统**（2h）
   - 实现 `Transition` 基类
   - 内置过渡效果：FadeTransition（淡入淡出）、SlideTransition（左右滑动）
   - 使用 GSAP 实现动画，确保 60fps
   - 过渡期间禁用输入，防止误操作

4. **资源生命周期管理**（1.5h）
   - 场景进入时预加载所需资源
   - 场景退出时卸载非共享资源
   - 引用计数机制，避免共享资源被提前释放

### 单元测试任务

| 测试项 | 测试内容 | 通过标准 |
|--------|----------|----------|
| 场景切换测试 | A→B→A 切换序列 | 无内存泄漏，Container 子节点正确清理 |
| 场景栈测试 | push A → push B → pop → 回到 A | 场景状态正确恢复 |
| 过渡动画测试 | 快速连续切换 10 次 | 无动画冲突，最终显示正确场景 |

### 代码审查要点

- [ ] 场景 destroy 是否彻底清理 PixiJS 对象和事件监听
- [ ] 过渡动画是否处理中断情况（快速切换时）
- [ ] 资源卸载是否使用引用计数，避免误删共享资源
- [ ] 场景栈深度是否限制，防止无限累积

### 产出物

1. [src/core/SceneManager.ts](file:///workspace/src/core/SceneManager.ts) - 场景管理器
2. [src/core/Scene.ts](file:///workspace/src/core/Scene.ts) - 场景基类
3. [src/core/transitions/](file:///workspace/src/core/transitions/) - 过渡动画实现
4. [tests/core/SceneManager.test.ts](file:///workspace/tests/core/SceneManager.test.ts) - 单元测试

---

## Day 17：核心玩法串联整合

### 任务信息

| 属性 | 内容 |
|------|------|
| **任务编号** | W3-D17 |
| **任务名称** | 核心玩法串联整合 |
| **预计工时** | 8小时（编码6h + 联调2h） |
| **前置条件** | Day 15-16 完成；Week 2 的 Block.ts、MergeSystem.ts 原型可用 |
| **技术栈** | TypeScript, PixiJS v8, Matter.js, 自定义事件系统 |
| **交付标准** | 完成一次完整的游戏循环：投放→下落→碰撞→合成→计分→检测通关/失败 |

### 具体任务目标

将 Week 2 验证的核心机制整合为完整的游戏循环：
1. 玩家投放流程（选择位置→预览→下落→进入物理世界）
2. 碰撞检测与合成触发
3. 连锁合成处理
4. 实时计分与连击显示
5. 警戒线检测与游戏结束判定

### 详细实现步骤

1. **GameScreen 场景搭建**（1.5h）
   - 创建 `GameScreen extends Scene`
   - 初始化游戏世界：物理容器边界、背景、警戒线
   - 集成 Block.ts（数字方块实体）到场景

2. **投放系统完善**（2h）
   - 玩家输入处理：触摸/鼠标拖动选择投放位置
   - 预览轨迹显示：虚线指示下落路径
   - 投放冷却机制：0.5 秒 CD，防止误触
   - 投放后方块从物理休眠唤醒，进入模拟

3. **合成系统整合**（2h）
   - 接入 MergeSystem.ts，处理碰撞合成逻辑
   - 合成动画：旧方块缩放消失，新方块缩放出现
   - 连锁检测：新方块生成后立即检测周围
   - 合成事件广播，供计分系统监听

4. **计分与连击系统**（1.5h）
   - 实现 ScoreSystem.ts：基础分数 + 连锁倍率计算
   - 连击计数器：连续合成间隔 < 2 秒计入连击
   - 分数飘字动画（GSAP）
   - 当前分数 HUD 更新

5. **游戏结束检测**（1h）
   - 警戒线高度检测（容器高度的 80%）
   - 持续 3 秒超限触发 GAMEOVER
   - 警告效果：警戒线以上区域红色闪烁

### 单元测试任务

| 测试项 | 测试内容 | 通过标准 |
|--------|----------|----------|
| 投放流程测试 | 模拟 10 次投放 | 每次投放后方块正确进入物理世界 |
| 合成测试 | 放置两个相同数字方块，触发碰撞 | 合成后数字正确，分数正确计算 |
| 连锁测试 | 构造 3 级以上连锁场景 | 连锁次数正确，倍率正确 |
| 结束检测测试 | 模拟方块堆叠至警戒线以上 | 3 秒后正确触发 GAMEOVER |

### 代码审查要点

- [ ] 投放冷却是否使用服务器时间或可靠计时，避免客户端加速作弊
- [ ] 合成动画期间是否暂停物理模拟，避免状态不一致
- [ ] 连锁检测是否防止无限递归（设置最大连锁深度）
- [ ] 游戏结束判定是否考虑方块速度（运动中暂时越过警戒线不应触发）

### 产出物

1. [src/ui/screens/GameScreen.ts](file:///workspace/src/ui/screens/GameScreen.ts) - 游戏主场景
2. [src/gameplay/ScoreSystem.ts](file:///workspace/src/gameplay/ScoreSystem.ts) - 计分系统
3. [src/ui/components/ScoreBoard.ts](file:///workspace/src/ui/components/ScoreBoard.ts) - 分数面板
4. [src/ui/components/WarningLine.ts](file:///workspace/src/ui/components/WarningLine.ts) - 警戒线组件
5. [tests/gameplay/ScoreSystem.test.ts](file:///workspace/tests/gameplay/ScoreSystem.test.ts) - 计分系统测试

---

## Day 18：UI 框架搭建

### 任务信息

| 属性 | 内容 |
|------|------|
| **任务编号** | W3-D18 |
| **任务名称** | UI 框架与组件体系搭建 |
| **预计工时** | 8小时（编码6h + 自测2h） |
| **前置条件** | Day 16 SceneManager 完成；UI 设计稿或风格指南确认 |
| **技术栈** | TypeScript, PixiJS v8 Container/Graphics/Text, 自定义布局系统 |
| **交付标准** | UI 组件可复用，布局自适应多种屏幕比例，交互反馈及时 |

### 具体任务目标

搭建可复用的 UI 框架：
1. UIManager.ts 统一管理 UI 层级和生命周期
2. 基础 UI 组件库（Button、Panel、ProgressBar、Label）
3. 响应式布局系统（适配 9:16 ~ 9:19 屏幕比例）
4. 通用交互效果（按钮点击缩放、面板弹出动画）

### 详细实现步骤

1. **UIManager 实现**（2h）
   - 单例模式，管理全局 UI 层级
   - UI 层级划分：Background → Main → Popup → Overlay → Toast
   - 弹窗队列管理（多个弹窗按优先级显示）
   - 模态遮罩处理（弹窗显示时禁用下层交互）

2. **基础组件实现**（3h）
   - `UIButton`：支持普通/按下/禁用状态，点击音效，防连点
   - `UIPanel`：带标题、关闭按钮、背景遮罩
   - `UIProgressBar`：进度条，支持动画填充
   - `UILabel`：封装 PIXI.Text，支持文字阴影、描边
   - `UIList`：滚动列表，支持虚拟滚动（大量数据时优化）

3. **布局系统**（2h）
   - 实现 `Layout` 工具类：Anchor（锚点定位）、Grid（网格布局）、Flex（弹性布局）
   - 安全区域计算（避开刘海、底部导航）
   - 横竖屏适配策略（锁定竖屏，但需处理不同高度）

4. **交互反馈系统**（1h）
   - 按钮点击：缩放 0.95 → 1.0，时长 100ms
   - 面板弹出：从底部滑入 + 遮罩淡入
   - Toast 提示：顶部滑入，自动消失

### 单元测试任务

| 测试项 | 测试内容 | 通过标准 |
|--------|----------|----------|
| 按钮测试 | 点击、快速连点、禁用状态 | 防连点生效，状态切换正确 |
| 布局测试 | 在 375×667 和 414×896 分辨率下布局 | 元素位置正确，无重叠溢出 |
| 弹窗测试 | 连续打开 3 个弹窗 | 层级正确，遮罩正确，关闭顺序正确 |

### 代码审查要点

- [ ] UI 组件是否正确销毁，避免内存泄漏
- [ ] 按钮防连点机制是否完善（时间阈值 + 动画状态）
- [ ] 文字是否使用 BitmapFont 或预加载字体，避免运行时加载闪动
- [ ] 弹窗是否处理返回键/物理返回手势

### 产出物

1. [src/ui/UIManager.ts](file:///workspace/src/ui/UIManager.ts) - UI 管理器
2. [src/ui/components/UIButton.ts](file:///workspace/src/ui/components/UIButton.ts) - 按钮组件
3. [src/ui/components/UIPanel.ts](file:///workspace/src/ui/components/UIPanel.ts) - 面板组件
4. [src/ui/components/UIProgressBar.ts](file:///workspace/src/ui/components/UIProgressBar.ts) - 进度条组件
5. [src/ui/components/UILabel.ts](file:///workspace/src/ui/components/UILabel.ts) - 标签组件
6. [src/ui/layout/Layout.ts](file:///workspace/src/ui/layout/Layout.ts) - 布局工具
7. [tests/ui/UIManager.test.ts](file:///workspace/tests/ui/UIManager.test.ts) - UI 框架测试

---

## Day 19：核心界面实现 + 关卡配置（并行）

### 任务信息

| 属性 | 内容 |
|------|------|
| **任务编号** | W3-D19 |
| **任务名称** | 核心界面实现 + 关卡配置（并行） |
| **预计工时** | 8小时（界面编码4h + 关卡配置2h + 联调2h） |
| **前置条件** | Day 18 UI 框架完成；Day 17 游戏循环完成 |
| **技术栈** | TypeScript, PixiJS v8, GSAP, UI 组件库, JSON |
| **交付标准** | 三个核心界面可正常交互，5个测试关卡配置完成 |
| **并行策略** | 界面开发（前端）与关卡配置（数据）可分别由不同人员并行执行 |

### 具体任务目标

**任务 A：核心界面实现（4h）**
1. **MainMenuScreen**（主菜单）：开始游戏、关卡选择、设置入口
2. **GameScreen**（游戏界面）：HUD 完善（分数、目标、道具、暂停）
3. **ResultScreen**（结算界面）：星级评价、分数展示、下一关/重试

**任务 B：测试关卡配置（2h，可与任务 A 并行）**
配置 5 个测试关卡（覆盖不同目标类型和难度）

**任务 C：联调整合（2h）**
界面与关卡系统联调，打通完整流程

### 详细实现步骤

#### 任务 A：核心界面实现（4h）

1. **MainMenuScreen 实现**（1.5h）
   - 背景：动态粒子效果或渐变色背景
   - Logo 展示：游戏标题，带呼吸动画
   - 主按钮组：开始游戏（大按钮）、关卡选择、设置
   - 底部信息：版本号、音效开关
   - 进入动画：按钮依次从下方滑入（stagger 100ms）

2. **GameScreen HUD 完善**（1.5h）
   - 顶部信息栏：当前分数、关卡目标、剩余步数/时间
   - 方块预览区：显示下一个待投放的方块数字
   - 道具栏：3 个道具槽位，点击使用
   - 暂停按钮：点击弹出暂停菜单（继续、重试、返回主菜单）
   - 连击显示：连击时显示 "x3 COMBO!" 动画

3. **ResultScreen 实现**（1h）
   - 胜利/失败状态区分
   - 星级评价：根据分数显示 1-3 星（动画依次点亮）
   - 分数明细：基础分 + 连击奖励 + 时间奖励
   - 操作按钮：下一关、重试、返回主菜单
   - 失败时显示 "观看广告复活" 按钮（UI 占位，功能后续实现）

#### 任务 B：测试关卡配置（2h，并行）

| 关卡 | 目标类型 | 难度 | 特殊设计 |
|------|----------|------|----------|
| 第1关 | 分数挑战 | 简单 | 目标 100 分，教学引导 |
| 第2关 | 指定合成 | 简单 | 合成出 16，初始有辅助方块 |
| 第3关 | 分数挑战 | 中等 | 目标 1000 分，空间管理教学 |
| 第4关 | 消除障碍 | 中等 | 清除 3 个障碍，障碍占空间 |
| 第5关 | 限时生存 | 困难 | 存活 60 秒，自动掉落加速 |

每个关卡配置包含：
- 容器尺寸、初始方块、可投放数字范围
- 目标参数、星级分数线
- 关卡名称和简短描述

#### 任务 C：联调整合（2h）
- 主菜单 → 游戏界面 → 结算界面 流程打通
- 结算后根据选择返回主菜单或进入下一关
- 关卡选择界面显示各关卡解锁状态和最高星级

### 单元测试任务

| 测试项 | 测试内容 | 通过标准 |
|--------|----------|----------|
| 主菜单测试 | 点击各按钮 | 正确跳转到对应场景 |
| HUD 测试 | 游戏过程中分数更新 | HUD 实时同步，无延迟 |
| 结算测试 | 模拟通关和失败 | 显示正确，按钮功能正常 |
| 适配测试 | 在多种分辨率下检查 | 无元素被遮挡或溢出屏幕 |
| 关卡配置测试 | 加载 5 个关卡配置 | 所有配置字段正确解析 |

### 代码审查要点

- [ ] 界面切换时是否正确清理游戏状态
- [ ] 暂停菜单是否真正暂停游戏逻辑（Ticker、物理、动画）
- [ ] 结算界面分数计算是否与游戏内一致
- [ ] 按钮热区是否足够大（移动端最小 44×44dp）
- [ ] 关卡配置 JSON 是否通过 Schema 验证

### 产出物

1. [src/ui/screens/MainMenuScreen.ts](file:///workspace/src/ui/screens/MainMenuScreen.ts) - 主菜单界面
2. [src/ui/screens/ResultScreen.ts](file:///workspace/src/ui/screens/ResultScreen.ts) - 结算界面
3. [src/ui/hud/GameHUD.ts](file:///workspace/src/ui/hud/GameHUD.ts) - 游戏内 HUD
4. [src/ui/hud/PauseMenu.ts](file:///workspace/src/ui/hud/PauseMenu.ts) - 暂停菜单
5. [src/ui/components/BlockPreview.ts](file:///workspace/src/ui/components/BlockPreview.ts) - 方块预览组件
6. [src/ui/components/ComboDisplay.ts](file:///workspace/src/ui/components/ComboDisplay.ts) - 连击显示组件
7. [src/data/levels/level_01.json](file:///workspace/src/data/levels/level_01.json) ~ [level_05.json](file:///workspace/src/data/levels/level_05.json) - 5 个测试关卡配置
8. [src/ui/screens/LevelSelectScreen.ts](file:///workspace/src/ui/screens/LevelSelectScreen.ts) - 关卡选择界面

---

## Day 20：关卡系统框架实现

### 任务信息

| 属性 | 内容 |
|------|------|
| **任务编号** | W3-D20 |
| **任务名称** | 关卡系统框架实现 |
| **预计工时** | 8小时（编码6h + 自测2h） |
| **前置条件** | Day 17 核心玩法完成；Day 19 界面完成；关卡配置格式已定义 |
| **技术栈** | TypeScript, JSON 配置解析, 策略模式 |
| **交付标准** | 支持 JSON 配置关卡，4 种目标类型判定正确，关卡进度可保存 |

### 具体任务目标

实现完整的关卡系统：
1. LevelSystem.ts：关卡加载、初始化、状态管理
2. 4 种目标类型的判定逻辑（分数挑战、指定合成、消除障碍、限时生存）
3. 关卡配置解析与验证
4. 关卡进度存储（本地存储）

### 详细实现步骤

1. **LevelSystem 核心实现**（2.5h）
   - `LevelSystem` 类：管理当前关卡状态
   - `loadLevel(levelId)`：读取配置，初始化关卡
   - `startLevel()`：设置初始状态，生成预设方块
   - `checkObjective()`：每帧检查目标达成情况
   - `endLevel(success)`：关卡结束，计算奖励

2. **目标判定策略**（2.5h）
   - 实现 `ObjectiveChecker` 策略模式基类
   - `ScoreObjectiveChecker`：当前分数 ≥ 目标分数
   - `MergeObjectiveChecker`：合成出指定数字
   - `ClearObstacleChecker`：障碍物数量 = 0
   - `SurvivalObjectiveChecker`：存活时间 ≥ 目标时间
   - 每种判定器独立单元测试

3. **关卡配置解析**（1.5h）
   - 定义 `LevelConfig` TypeScript 接口（与文档 4.4.2 完全一致）
   - 完整字段解析支持：
     - `container`：width、height、shape（'rectangle' | 'circle' | 'custom'）、modifiers（ContainerModifier[]）
     - `spawn`：initialBlocks（初始方块数组）、availableNumbers（可投放数字范围）、spawnInterval（生存模式自动掉落间隔）
     - `obstacles`：障碍物配置数组（位置、类型、耐久度）
     - `rewards`：stars（1-3星分数线）、firstClear（首通奖励）、blueprintFragments（蓝图碎片数量）
   - JSON Schema 验证配置合法性
   - 配置热重载（开发模式下修改配置自动刷新）
   - 错误处理：配置缺失字段时给出明确错误信息

4. **进度存储**（1.5h）
   - `SaveManager` 集成：关卡解锁状态、最高分数、星级记录
   - 本地存储使用微信 `wx.setStorageSync`
   - 数据版本控制（配置变更时自动重置进度）

### 单元测试任务

| 测试项 | 测试内容 | 通过标准 |
|--------|----------|----------|
| 加载测试 | 加载有效/无效配置 | 有效配置正常加载，无效配置抛出明确错误 |
| 目标判定测试 | 4 种目标类型的边界条件 | 刚好达到目标时判定通过，差 1 时不通过 |
| 进度存储测试 | 保存后读取 | 数据一致，无丢失 |
| 关卡流程测试 | 完整通关一个关卡 | 状态流转正确，奖励计算正确 |

### 代码审查要点

- [ ] 目标判定是否在正确时机触发（避免每帧全量计算）
- [ ] 配置验证是否完善，防止运行时 undefined 错误
- [ ] 进度存储是否处理存储空间不足的情况
- [ ] 关卡失败后的状态清理是否彻底

### 产出物

1. [src/gameplay/LevelSystem.ts](file:///workspace/src/gameplay/LevelSystem.ts) - 关卡系统
2. [src/gameplay/objectives/](file:///workspace/src/gameplay/objectives/) - 目标判定策略类
3. [src/data/levels/schema.json](file:///workspace/src/data/levels/schema.json) - 关卡配置 Schema
4. [tests/gameplay/LevelSystem.test.ts](file:///workspace/tests/gameplay/LevelSystem.test.ts) - 关卡系统测试

---

## Day 21：全面系统测试、缺陷修复与最终核实

### 任务信息

| 属性 | 内容 |
|------|------|
| **任务编号** | W3-D21 |
| **任务名称** | 全面系统测试、缺陷修复与最终核实 |
| **预计工时** | 8小时（测试执行3h + 缺陷修复2.5h + 用例精简1h + 最终核实1.5h） |
| **前置条件** | Day 19-20 完成，所有 Week 3 功能代码已提交 |
| **技术栈** | Vitest, Chrome DevTools, 微信开发者工具 |
| **交付标准** | 所有 P0/P1 缺陷修复完毕，测试用例精简完成，质量门禁通过 |
| **并行策略** | 测试执行与缺陷修复可并行；用例精简与文档归档可并行 |

### 上午：全面系统测试（3h）

#### 1. 单元测试（Unit Testing）

| 测试模块 | 测试内容 | 测试方法 | 优先级 |
|----------|----------|----------|--------|
| Game.ts | 状态机转换、Ticker 回调 | 自动化单元测试 | P0 |
| PhysicsManager.ts | 刚体创建/删除、碰撞监听 | 自动化单元测试 | P0 |
| SceneManager.ts | 场景注册/切换/销毁 | 自动化单元测试 | P0 |
| Block.ts | 方块创建、配置读取、位置同步 | 自动化单元测试 | P0 |
| MergeSystem.ts | 碰撞检测、合成逻辑、连锁反应 | 自动化单元测试 | P0 |
| InputManager.ts | 鼠标/触摸事件、状态更新 | 自动化单元测试 | P1 |
| EventBus.ts | 事件订阅/发布/取消 | 自动化单元测试 | P1 |
| ScoreSystem.ts | 分数计算、连锁倍率 | 自动化单元测试 | P0 |
| LevelSystem.ts | 关卡加载、目标判定、进度存储 | 自动化单元测试 | P0 |
| PlatformAdapter | 存储读写、系统信息 | 自动化单元测试 | P1 |

#### 2. 集成测试（Integration Testing）

| 测试场景 | 测试内容 | 预期结果 |
|----------|----------|----------|
| 投放→物理→渲染 | 投放方块后物理模拟与 PixiJS 渲染同步 | 方块位置与渲染位置一致 |
| 合成→计分→事件 | 合成触发后分数正确更新并广播事件 | 分数与事件数据一致 |
| 场景切换→资源管理 | 切换场景后旧场景资源正确释放 | 无内存泄漏 |
| 关卡加载→配置解析 | 加载 JSON 配置并初始化关卡 | 所有配置字段正确解析 |

#### 3. 系统测试（System Testing）

| 测试项 | 测试步骤 | 预期结果 |
|--------|----------|----------|
| 完整游戏循环 | 启动→投放→合成→达成目标→结算→下一关 | 全流程无异常 |
| 多关卡连续游玩 | 连续通关 5 个测试关卡 | 进度正确保存 |
| 游戏结束与重试 | 触发警戒线→游戏结束→重试 | 场景重置 |
| 异常输入处理 | 快速连续点击、越界投放 | 无崩溃，冷却机制生效 |

#### 4. 边界条件测试（Boundary Testing）

| 边界条件 | 测试方法 | 预期结果 |
|----------|----------|----------|
| 最大方块数量 | 投放 50+ 个方块 | 帧率下降 < 20%，无崩溃 |
| 最大连锁深度 | 构造 10 级以上连锁 | 递归安全，不栈溢出 |
| 临界分数判定 | 分数刚好等于目标值 | 正确判定通关 |
| 空关卡配置 | 加载缺少字段的配置 | 抛出明确错误，不崩溃 |

#### 5. 性能测试（Performance Testing）

| 测试项 | 测试环境 | 通过标准 |
|--------|----------|----------|
| 首包大小 | 构建产物 | < 4MB |
| 运行帧率 | 50 个物理方块同屏 | ≥ 30fps（低端机）/ ≥ 60fps（PC） |
| 内存占用 | 连续游玩 10 分钟 | 增长 < 50MB，无持续泄漏 |
| 加载时间 | 首屏加载 | < 3 秒 |

### 下午：缺陷修复（2.5h，与测试并行）

**缺陷分级标准**

| 级别 | 定义 | 处理要求 |
|------|------|----------|
| P0-致命 | 导致崩溃、数据丢失、主流程阻断 | 必须立即修复 |
| P1-严重 | 功能异常、性能严重下降 | 必须修复 |
| P2-一般 | 次要功能异常、界面瑕疵 | 尽量修复 |
| P3-轻微 | 文字错误、样式偏差 | 可选修复 |

**修复流程**
1. 测试人员发现缺陷 → 记录到缺陷跟踪表
2. 开发人员领取 P0/P1 缺陷 → 定位原因 → 修复 → 提交
3. 测试人员验证修复 → 关闭或重新打开

### 傍晚：测试用例精简（1h）

**精简原则**

| 原则 | 说明 | 操作 |
|------|------|------|
| 去重合并 | 功能重叠的用例合并为一个 | 删除重复用例，保留覆盖最广的 |
| 优先级过滤 | 删除低优先级且已稳定的用例 | P2/P3 用例可精简，保留核心路径 |
| 参数化合并 | 相似逻辑不同数据的用例合并 | 使用参数化测试替代多个相似用例 |
| 移除过时用例 | 删除因需求变更而失效的用例 | 定期清理 |

**精简示例**

| 原用例 | 问题 | 精简后 |
|--------|------|--------|
| 测试按钮点击、测试按钮禁用、测试按钮快速连点 | 功能重叠，都是按钮状态测试 | 合并为"按钮状态转换测试"，参数化覆盖三种状态 |
| 测试分数 100、测试分数 1000、测试分数 5000 | 相同逻辑不同数据 | 参数化测试，数据驱动 |
| 测试 iPhone SE 布局、测试 iPhone 14 布局 | 布局逻辑相同，仅分辨率不同 | 参数化测试，传入不同分辨率 |

**精简目标**
- 测试用例总数减少 20-30%
- 核心功能覆盖率保持 ≥ 60%
- 测试执行时间减少 15-20%

### 最终核实（1.5h）

#### 功能完成度核实

- [ ] Day 15：Game.ts 主循环架构已实现并测试通过
- [ ] Day 16：SceneManager.ts 场景管理已实现并测试通过
- [ ] Day 17：核心玩法串联（投放→合成→计分→结束）已实现并测试通过
- [ ] Day 18：UI 框架（UIManager + 基础组件）已实现并测试通过
- [ ] Day 19：核心界面（主菜单/游戏/结算）已实现并测试通过
- [ ] Day 20：关卡系统框架（LevelSystem + 目标判定）已实现并测试通过
- [ ] Day 21：全面系统测试已完成，所有 P0/P1 缺陷已修复
- [ ] Day 21：测试用例已精简，无功能重叠用例

#### 交付物核实

- [ ] [src/core/Game.ts](file:///workspace/src/core/Game.ts) 存在且通过测试
- [ ] [src/core/SceneManager.ts](file:///workspace/src/core/SceneManager.ts) 存在且通过测试
- [ ] [src/ui/screens/GameScreen.ts](file:///workspace/src/ui/screens/GameScreen.ts) 存在且通过测试
- [ ] [src/ui/screens/MainMenuScreen.ts](file:///workspace/src/ui/screens/MainMenuScreen.ts) 存在且通过测试
- [ ] [src/ui/screens/ResultScreen.ts](file:///workspace/src/ui/screens/ResultScreen.ts) 存在且通过测试
- [ ] [src/gameplay/LevelSystem.ts](file:///workspace/src/gameplay/LevelSystem.ts) 存在且通过测试
- [ ] [src/gameplay/ScoreSystem.ts](file:///workspace/src/gameplay/ScoreSystem.ts) 存在且通过测试
- [ ] [src/ui/UIManager.ts](file:///workspace/src/ui/UIManager.ts) 存在且通过测试
- [ ] [src/data/levels/level_01.json](file:///workspace/src/data/levels/level_01.json) ~ level_05.json 存在且通过验证
- [ ] [tests/](file:///workspace/tests/) 核心模块测试覆盖率 > 60%
- [ ] [docs/Week3/测试报告.md](file:///workspace/docs/Week3/测试报告.md) 已输出
- [ ] [docs/Week3/缺陷修复记录.md](file:///workspace/docs/Week3/缺陷修复记录.md) 已输出
- [ ] [docs/Week3/阶段报告.md](file:///workspace/docs/Week3/阶段报告.md) 已输出
- [ ] [docs/Week3/用例精简记录.md](file:///workspace/docs/Week3/用例精简记录.md) 已输出

#### 质量门禁核实

- [ ] 所有单元测试通过（`npm test` 无失败）
- [ ] TypeScript 编译无错误（`npm run lint` 通过）
- [ ] 核心模块测试覆盖率 ≥ 60%
- [ ] 无 P0/P1 级别未修复缺陷
- [ ] 性能指标达标（首包 < 4MB，帧率 ≥ 30fps）
- [ ] 代码已提交到远程分支

### 产出物

1. [docs/Week3/测试报告.md](file:///workspace/docs/Week3/测试报告.md) - 完整测试报告
2. [docs/Week3/缺陷修复记录.md](file:///workspace/docs/Week3/缺陷修复记录.md) - 缺陷清单和修复记录
3. [docs/Week3/用例精简记录.md](file:///workspace/docs/Week3/用例精简记录.md) - 测试用例精简说明
4. [docs/Week3/阶段报告.md](file:///workspace/docs/Week3/阶段报告.md) - 阶段完成度、风险、下周计划
5. [tests/coverage/](file:///workspace/tests/coverage/) - 测试覆盖率报告
6. 修复后的代码提交

---

## 任务依赖关系图

```
Day 15 (Game.ts)
    │
    ▼
Day 16 (SceneManager)
    │
    ├───→ Day 17 (核心玩法串联) ───→ Day 20 (关卡系统)
    │          │                           │
    │          ▼                           ▼
    │    Day 18 (UI框架) ─────────→ Day 19 (界面+配置，并行)
    │          │                           │
    │          └───────────────────────────┘
    │                      │
    │                      ▼
    │              Day 21 (测试+修复+精简+核实)
    │                      │
    │                      ▼
    │              Week 3 交付
```

---

## 每日工时分配建议

| 时间段 | 内容 | 时长 |
|--------|------|------|
| 09:00-10:00 | 代码审查（昨日代码）+ 今日任务确认 | 1h |
| 10:00-12:00 | 核心编码（复杂逻辑） | 2h |
| 13:30-15:30 | 核心编码（功能实现） | 2h |
| 15:30-16:00 | 单元测试编写 | 0.5h |
| 16:00-17:30 | 自测与 Bug 修复 | 1.5h |
| 17:30-18:00 | 代码提交 + 开发日志 | 0.5h |
| 20:00-21:00 | （如需）加班修复阻塞问题 | 1h |

---

## 风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| Day 15-16 架构复杂度过高 | 延误后续任务 | 采用最小可行架构，非核心功能延后 |
| Matter.js 物理同步问题 | 合成不准确 | 预留 0.5h 每日缓冲用于物理调优 |
| UI 适配工作量超预期 | Day 19 延期 | Day 18 优先实现核心组件，复杂动画延后 |
| 关卡配置格式变更 | Day 20 返工 | 配置格式在 Day 20 开始前冻结 |
| Day 21 缺陷数量超预期 | 修复时间不足 | 优先修复 P0/P1，P2/P3 延后到 Week 4 |
| 测试覆盖率不达标 | 质量门禁失败 | Day 17-20 每日编写单元测试，避免集中补测试 |

---

## Week 3 交付物汇总

| 交付物 | 路径 | 验收标准 |
|--------|------|----------|
| 游戏主入口 | [src/core/Game.ts](file:///workspace/src/core/Game.ts) | 稳定运行，状态机正确 |
| 场景管理器 | [src/core/SceneManager.ts](file:///workspace/src/core/SceneManager.ts) | 切换流畅，无内存泄漏 |
| 游戏主场景 | [src/ui/screens/GameScreen.ts](file:///workspace/src/ui/screens/GameScreen.ts) | 核心循环完整 |
| 主菜单界面 | [src/ui/screens/MainMenuScreen.ts](file:///workspace/src/ui/screens/MainMenuScreen.ts) | 交互流畅，动画 60fps |
| 结算界面 | [src/ui/screens/ResultScreen.ts](file:///workspace/src/ui/screens/ResultScreen.ts) | 状态区分正确 |
| 关卡系统 | [src/gameplay/LevelSystem.ts](file:///workspace/src/gameplay/LevelSystem.ts) | 4 种目标判定正确 |
| UI 框架 | [src/ui/UIManager.ts](file:///workspace/src/ui/UIManager.ts) | 组件可复用，布局适配 |
| 计分系统 | [src/gameplay/ScoreSystem.ts](file:///workspace/src/gameplay/ScoreSystem.ts) | 分数计算准确 |
| 测试关卡 | [src/data/levels/](file:///workspace/src/data/levels/) | 5 个关卡可正常运行 |
| 单元测试 | [tests/](file:///workspace/tests/) | 核心模块覆盖率 > 60%，用例已精简 |
| 阶段报告 | [docs/Week3/阶段报告.md](file:///workspace/docs/Week3/阶段报告.md) | 风险、进度、下周计划明确 |
| 测试报告 | [docs/Week3/测试报告.md](file:///workspace/docs/Week3/测试报告.md) | 包含用例、步骤、结果对比、缺陷清单 |
| 缺陷修复记录 | [docs/Week3/缺陷修复记录.md](file:///workspace/docs/Week3/缺陷修复记录.md) | 所有发现的问题已修复并验证 |
| 用例精简记录 | [docs/Week3/用例精简记录.md](file:///workspace/docs/Week3/用例精简记录.md) | 精简原因和合并说明清晰 |
