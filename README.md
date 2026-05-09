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
│   │   ├── SceneManager.ts      # 场景管理器
│   │   ├── AssetManager.ts      # 资源管理器
│   │   ├── PhysicsManager.ts    # 物理引擎管理器
│   │   ├── InputManager.ts      # 输入管理器
│   │   ├── AudioManager.ts      # 音频管理器
│   │   ├── SaveManager.ts       # 存档管理器
│   │   └── ObjectPool.ts        # 对象池
│   ├── gameplay/                # 游戏玩法
│   │   ├── Block.ts             # 数字方块实体
│   │   ├── Container.ts         # 物理容器
│   │   ├── MergeSystem.ts       # 合成系统
│   │   ├── ScoreSystem.ts       # 计分系统
│   │   ├── LevelSystem.ts       # 关卡系统
│   │   ├── PropSystem.ts        # 道具系统
│   │   └── ContainerModifier.ts # 容器变形系统
│   ├── ui/                      # UI 系统
│   │   ├── screens/             # 全屏界面
│   │   ├── components/          # UI 组件
│   │   └── hud/                 # 游戏内 HUD
│   ├── progression/             # 成长系统
│   │   ├── TalentSystem.ts      # 天赋系统
│   │   ├── AchievementSystem.ts # 成就系统
│   │   ├── PassSystem.ts        # 通行证系统
│   │   ├── SkinSystem.ts        # 皮肤系统
│   │   └── LeaderboardSystem.ts # 排行榜系统
│   ├── monetization/            # 变现系统
│   │   ├── AdManager.ts         # 广告管理器
│   │   ├── IAPManager.ts        # 内购管理器
│   │   ├── ShopManager.ts       # 商店管理器
│   │   └── RewardManager.ts     # 奖励管理器
│   ├── platform/                # 平台适配
│   │   ├── PlatformAdapter.ts   # 平台抽象基类
│   │   ├── WXAdapter.ts         # 微信适配器
│   │   └── MockAdapter.ts       # 调试适配器
│   ├── data/                    # 数据配置
│   │   ├── levels/              # 关卡配置
│   │   ├── talents/             # 天赋配置
│   │   ├── props/               # 道具配置
│   │   ├── skins/               # 皮肤配置
│   │   └── achievements/        # 成就配置
│   ├── utils/                   # 工具类
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
