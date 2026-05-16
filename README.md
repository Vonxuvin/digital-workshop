# 数字工坊 (Digital Workshop)

> 基于 PixiJS + Matter.js 的物理合成消除微信小游戏

## 项目简介

《数字工坊》是一款创新的物理合成消除游戏。玩家通过投放带有数字的圆形方块，在物理重力环境下进行堆叠，相同数字碰撞后合并为更高阶数字，体验"物理连锁合成"的核心爽点。

## 技术栈

- **渲染引擎**: PixiJS v8 (WebGL/Canvas 双模式)
- **物理引擎**: Matter.js
- **动画系统**: GSAP + PixiJS Ticker
- **构建工具**: Vite + TypeScript
- **测试框架**: Vitest

## 项目结构

```
digital-workshop/
├── assets/                      # 游戏资源
│   ├── textures/                # 纹理图集
│   │   ├── core/                # 核心资源（首包）
│   │   ├── skins/               # 皮肤资源（按需加载）
│   │   └── effects/             # 特效资源（按需加载）
│   ├── audio/                   # 音频资源
│   └── fonts/                   # 字体资源
├── src/
│   ├── core/                    # 核心框架
│   │   ├── Game.ts              # 游戏主入口
│   │   ├── GameScene.ts         # 游戏场景
│   │   ├── GameInputHandler.ts  # 输入处理（触摸/键盘）
│   │   ├── ContainerRenderer.ts # 容器渲染与物理墙壁
│   │   ├── PropsConfigLoader.ts # 道具配置加载器
│   │   ├── GameEffectManager.ts # 特效管理器
│   │   ├── GameEventRouter.ts   # 事件路由
│   │   ├── PropEffectHandler.ts # 道具效果处理
│   │   ├── SceneManager.ts      # 场景管理器
│   │   ├── AssetManager.ts      # 资源管理器
│   │   ├── PhysicsManager.ts    # 物理引擎管理器
│   │   ├── InputManager.ts      # 输入管理器
│   │   ├── AudioManager.ts      # 音频管理器
│   │   ├── SaveManager.ts       # 存档管理器
│   │   ├── TutorialManager.ts   # 教程管理器
│   │   ├── AdManager.ts         # 广告管理器（激励视频/插屏/Banner）
│   │   ├── GameStateMachine.ts  # 游戏状态机
│   │   ├── LevelLoader.ts       # 关卡加载器
│   │   ├── BlockPool.ts         # 方块对象池
│   │   └── ObjectPool.ts        # 通用对象池
│   ├── gameplay/                # 游戏玩法
│   │   ├── Block.ts             # 数字方块实体
│   │   ├── BlockPreview.ts      # 方块预览
│   │   ├── BlockSpawner.ts      # 方块生成器
│   │   ├── Container.ts         # 物理容器
│   │   ├── MergeSystem.ts       # 合成系统
│   │   ├── ScoreSystem.ts       # 计分系统
│   │   ├── LevelSystem.ts       # 关卡系统
│   │   └── PhysicsEntity.ts     # 物理实体基类
│   ├── gameplay/props/          # 道具系统
│   │   ├── PropSystem.ts        # 道具管理器
│   │   ├── BombProp.ts          # 炸弹道具
│   │   ├── FreezeProp.ts        # 冰冻道具
│   │   ├── LuckyProp.ts         # 幸运道具
│   │   ├── RainbowProp.ts       # 彩虹道具
│   │   └── ShrinkProp.ts        # 缩小道具
│   ├── ui/                      # UI 系统
│   │   ├── screens/             # 全屏界面（主菜单/暂停/结算/关卡选择/设置/加载）
│   │   ├── components/          # UI 组件（按钮/面板/进度条/标签/连击/道具按钮/预览/计分板/警告线）
│   │   ├── hud/                 # 游戏内 HUD
│   │   ├── effects/             # 特效（粒子/合并/爆炸/冰冻）
│   │   └── layout/              # 布局管理
│   ├── progression/             # 成长系统（规划中，预计 Week 7–8）
│   │   ├── TalentSystem.ts      # 天赋系统
│   │   ├── AchievementSystem.ts # 成就系统
│   │   ├── PassSystem.ts        # 通行证系统
│   │   ├── SkinSystem.ts        # 皮肤系统
│   │   └── LeaderboardSystem.ts # 排行榜系统
│   ├── monetization/            # 变现系统（规划中，预计 Week 7–8）
│   │   ├── IAPManager.ts        # 内购管理器
│   │   ├── ShopManager.ts       # 商店管理器
│   │   └── RewardManager.ts     # 奖励管理器
│   ├── platform/                # 平台适配
│   │   ├── PlatformAdapter.ts   # 平台抽象基类
│   │   ├── WXAdapter.ts         # 微信适配器
│   │   └── MockAdapter.ts       # 调试适配器
│   ├── data/                    # 数据配置
│   │   ├── levels/              # 关卡配置（level_01 ~ level_30）
│   │   ├── talents/             # 天赋配置
│   │   ├── props/               # 道具配置
│   │   ├── skins/               # 皮肤配置
│   │   └── achievements/        # 成就配置
│   ├── utils/                   # 工具类（EventBus/PerformanceMonitor/AnimationManager）
│   └── types/                   # TypeScript 类型定义
├── tests/                       # 测试用例
├── docs/                        # 项目文档
├── scripts/                     # 构建脚本
├── game.json                    # 微信小游戏配置
├── project.config.json          # 微信开发者工具配置
├── index.html                   # 浏览器入口
├── tsconfig.json                # TypeScript 配置
├── vite.config.ts               # Vite 构建配置
└── package.json
```

## 开发指南

### 安装依赖

```bash
npm install
```

### 本地开发（浏览器）

```bash
npm run dev
```

### 构建微信小游戏版本

```bash
npm run build:wechat
```

### 运行测试

```bash
npm test
```

### 代码检查

```bash
npm run lint
```

## 开发计划

详见 [docs/](../docs/) 目录下的策划文档和开发计划。

## 许可证

MIT
