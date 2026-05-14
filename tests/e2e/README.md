# E2E 自动化测试说明

## 测试架构

本目录包含基于 Playwright 的端到端自动化测试用例，按**微信小游戏常用测试维度**划分为 11 个模块：

| 编号 | 文件 | 测试维度 | 用例数 |
|------|------|---------|--------|
| 01 | `01-launch-init.spec.ts` | 启动与初始化 | 12 |
| 02 | `02-rendering-performance.spec.ts` | 渲染与性能 | 14 |
| 03 | `03-input-interaction.spec.ts` | 输入交互 | 13 |
| 04 | `04-core-gameplay.spec.ts` | 核心玩法 | 19 |
| 05 | `05-level-system.spec.ts` | 关卡系统 | 18 |
| 06 | `06-ui-screens.spec.ts` | UI 界面 | 22 |
| 07 | `07-prop-system.spec.ts` | 道具系统 | 17 |
| 08 | `08-audio-effects.spec.ts` | 音效与特效 | 16 |
| 09 | `09-data-persistence.spec.ts` | 数据持久化 | 16 |
| 10 | `10-state-flow.spec.ts` | 状态管理与完整流程 | 18 |
| 11 | `11-platform-edge.spec.ts` | 平台适配与异常边界 | 21 |

> 共计约 **186 个测试用例**

## 各维度覆盖说明

### 01 - 启动与初始化
- 页面加载状态码、DOCTYPE、title、viewport
- Canvas 元素创建、尺寸、WebGL 上下文
- PixiJS Application 初始化、游戏单例模式
- 启动流程（boot → loading → menu）
- 首屏加载性能、微信小游戏环境适配

### 02 - 渲染与性能
- 基础渲染正确性（非黑屏、非空白）
- 容器渲染、方块渲染、数字文本显示
- FPS 监控、空闲/高负载下帧率
- GraphicsPool 对象复用、特效清理
- 窗口缩放适配、横竖屏切换、小屏设备
- 5 层 UI 渲染层级

### 03 - 输入交互
- 点击/触摸投放方块、不同位置投放
- 多点触控、Canvas 边缘点击
- 输入响应延迟、快速连续点击
- 暂停/游戏结束状态下输入拦截
- 键盘快捷键（Escape 暂停、Space 投放）

### 04 - 核心玩法
- Matter.js 物理引擎初始化、重力模拟
- 方块碰撞检测、物理边界约束
- 方块生成（数字、颜色、位置）
- 合成系统（同数字合成、不同数字不合成）
- 连锁反应、连击倍率、连击重置
- 警戒线检测、游戏结束判定

### 05 - 关卡系统
- 15 个关卡配置完整性校验
- 4 种目标类型（分数/目标合成/清除障碍/生存）
- 关卡加载、无效 ID 处理
- 目标进度更新、通关条件判定
- 难度曲线、后期关卡变形器
- 3 星评定配置与阈值递增

### 06 - UI 界面
- 主菜单（开始游戏/关卡选择/设置入口）
- 游戏 HUD（分数/关卡/暂停/道具栏/进度条/连击）
- 暂停界面（继续/重新开始/返回菜单）
- 结算界面（胜利/失败/星级动画/操作按钮）
- 关卡选择（卡片信息/滚动/锁定状态）
- UI 组件库（Button/ProgressBar/Popup/Modal）
- 场景切换与生命周期管理

### 07 - 道具系统
- 5 种道具（炸弹/彩虹/冻结/缩小/幸运）
- 道具数量管理、使用消耗
- 数量为 0 时拦截、暂停时拦截
- 炸弹清除范围、爆炸特效
- 彩虹方块合成、冻结物理暂停/恢复
- 缩小效果、幸运倍率
- 道具按钮组件、PropEffectHandler 集成

### 08 - 音效与特效
- AudioManager 程序化音效生成
- 不同事件触发不同音效
- 主音量/音效/音乐独立控制
- 静音模式切换
- 合成扩散环特效、爆炸粒子特效、冰冻全屏特效
- 特效管理器清理、GraphicsPool 复用
- 投放动画、合成缩放动画、得分飘字动画

### 09 - 数据持久化
- SaveManager 完整数据结构
- 手动保存/加载/重置
- 关卡进度更新、通关解锁下一关
- 统计数据（最高分/游戏次数/最大连击）
- 自动存档、脏标记追踪
- 音效/音乐/震动设置持久化
- JSON 序列化、损坏数据回退

### 10 - 状态管理与完整流程
- GameStateMachine 初始化、有效/无效状态转换
- 状态历史记录
- EventBus 订阅/发布/取消订阅
- 完整游戏流程（menu→playing→paused→playing）
- 游戏结束流程（playing→gameover→menu）
- 通关流程（playing→victory）
- 场景切换（主菜单↔游戏、重新开始）
- 跨模块交互（合成→计分→HUD、目标达成→通关）

### 11 - 平台适配与异常边界
- 运行平台检测、浏览器适配、存储接口
- 微信 wx API Mock
- 桌面/平板/手机/小屏四种设备适配
- WebGL 降级处理
- 页面刷新恢复、未捕获错误检测
- Canvas 外点击拦截、极快连续点击
- 分数/方块数量/道具数量边界
- 关卡 ID 越界/负数处理
- 并发状态转换、游戏结束状态道具操作
- 长时间运行内存、大量特效同时播放

## 快速开始

### 安装依赖

```bash
npm install
npx playwright install --with-deps chromium
```

### 运行测试

```bash
# 运行全部 E2E 测试
npm run test:e2e

# 运行指定模块
npx playwright test 01-launch-init.spec.ts

# 带 UI 界面运行
npm run test:e2e:ui

# 仅运行桌面端
npx playwright test --project=chromium-desktop

# 仅运行移动端
npx playwright test --project=chromium-mobile

# 查看测试报告
npm run test:e2e:report
```

### 测试配置

配置文件位于项目根目录 `playwright.config.ts`，关键配置：

- **baseURL**: `http://localhost:5173`（自动启动 Vite 开发服务器）
- **超时**: 测试 60s，断言 10s
- **重试**: CI 环境自动重试 2 次
- **截图/视频**: 仅在失败时保留
- **并行**: 默认全并行，CI 环境单 worker

### 覆盖的设备类型

| 项目名 | 设备 | 分辨率 |
|--------|------|--------|
| `chromium-desktop` | Desktop Chrome | 1280×720 |
| `chromium-tablet` | iPad (gen 7) | 810×1080 |
| `chromium-mobile` | Pixel 5 | 393×851 |
| `chromium-small-mobile` | iPhone SE | 375×667 |

## 辅助函数

`helpers.ts` 提供以下公共方法：

| 函数 | 说明 |
|------|------|
| `navigateToGame(page)` | 导航到游戏页面并等待初始化完成 |
| `clickCanvasCenter(page)` | 点击 Canvas 中心位置 |
| `clickCanvasAt(page, xRatio, yRatio)` | 按比例点击 Canvas 指定位置 |
| `dropBlocks(page, count, intervalMs)` | 连续投放指定数量的方块 |
| `waitForStable(page, ms)` | 等待物理模拟稳定 |
| `collectConsoleLogs(page, pattern)` | 收集匹配模式的 console 日志 |
| `collectPageErrors(page)` | 收集页面未捕获错误 |
| `getGameInstance(page)` | 获取游戏实例引用 |

## CI 集成

GitHub Actions 工作流配置位于 `.github/workflows/ci.yml`，包含：

- **lint-and-typecheck**: TypeScript 类型检查
- **unit-tests**: Vitest 单元测试
- **e2e-tests**: Playwright E2E 测试（4 分片并行）
- **e2e-tests-mobile**: 移动端视口专项测试
- **build**: 生产构建验证

## 编写新测试

1. 确定测试所属维度，在对应文件中添加
2. 使用 `helpers.ts` 中的公共方法
3. 通过 `page.evaluate()` 访问游戏内部状态
4. 游戏实例通过 `(window as any).__gameInstance` 获取

```typescript
import { test, expect } from '@playwright/test';
import { navigateToGame, clickCanvasCenter } from './helpers';

test('示例：投放方块后应有方块存在', async ({ page }) => {
  await navigateToGame(page);
  await clickCanvasCenter(page);
  await page.waitForTimeout(1000);

  const blockCount = await page.evaluate(() => {
    const game = (window as any).__gameInstance;
    return game?.getBlockSpawner?.()?.getBlocks?.()?.length ?? 0;
  });

  expect(blockCount).toBeGreaterThan(0);
});
```