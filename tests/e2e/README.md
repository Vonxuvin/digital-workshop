# E2E 测试用例清单

## 测试模块概览

| 编号 | 文件 | 模块名称 | 用例数 | 覆盖维度 |
|------|------|---------|--------|---------|
| 01 | `01-launch-init.spec.ts` | 启动与初始化 | 13 | 页面加载、Canvas创建、PixiJS初始化、WebGL支持 |
| 02 | `02-rendering-performance.spec.ts` | 渲染与性能 | 14 | 基础渲染、FPS监控、纹理缓存、内存管理 |
| 03 | `03-input-interaction.spec.ts` | 输入交互 | 14 | 点击、触摸、拖拽、长按、快速点击 |
| 04 | `04-core-gameplay.spec.ts` | 核心玩法 | 38 | 物理碰撞、方块生成与合成、分数计算、Score计数器累加与显示一致性、自动下落与手动释放、球体残影消除、动画流畅性、GSAP动画清理、并发控制、自动下落球体可见性验证 |
| 05 | `05-level-system.spec.ts` | 关卡系统 | 35 | 关卡配置、目标更新、关卡解锁、第2关卡特定场景、关卡目标展示与覆盖层、目标进度更新、不同目标类型展示 |
| 06 | `06-ui-screens.spec.ts` | UI界面 | 36 | 主菜单、HUD、暂停、结算、关卡选择、UI组件库、通关条件固定显示、ObjectiveDisplay界面布局整合 |
| 07 | `07-prop-system.spec.ts` | 道具系统 | 49 | 5种道具使用逻辑、数量管理、效果验证、炸弹道具BUG修复、炸弹按钮响应优化（含十字准星位置/延迟/完整流程/坐标验证）、缩小道具底部位置修正（含不悬浮验证） |
| 08 | `08-audio-effects.spec.ts` | 音效与特效 | 14 | 音效生成、特效播放、资源复用 |
| 09 | `09-data-persistence.spec.ts` | 数据持久化 | 15 | 保存/加载/重置、JSON序列化 |
| 10 | `10-state-flow.spec.ts` | 状态管理与流程 | 33 | GameStateMachine、EventBus、状态流转、复活后计时器恢复、重新开始后WarningLine和动画恢复、失败后重新开始/复活WarningLine可见性、TimeManager window暴露验证 |
| 11 | `11-platform-edge.spec.ts` | 平台适配与异常边界 | 16 | 平台检测、设备适配、边界条件 |
| 12 | `12-visual-layout.spec.ts` | 视觉布局与UI可见性 | 45 | 多分辨率按钮布局、Canvas可见性、动画元素渲染范围、暂停菜单布局、NextPreview定位修复与可见性、容器边界与预览夹持、落点标记位置、碰撞边界验证、容器边界稳定性 |
| 13 | `13-gameplay-edge.spec.ts` | 玩法边界与视觉效果 | 17 | 容器边界限制、警戒线行为、合成动画质量、过关分数验证 |
| 14 | `14-boundary-props-critical.spec.ts` | 边界与道具关键路径 | 13 | 容器边界、道具关键路径 |
| **合计** | | | **354** | |

## 测试执行命令

```bash
# 桌面端全量测试（4分片并行）
npx playwright test --shard=1/4

# 移动端测试（4分片并行）
npx playwright test --project=chromium-mobile --project=chromium-small-mobile --shard=1/4

# 单文件调试
npx playwright test tests/e2e/12-visual-layout.spec.ts

# UI模式调试
npx playwright test --ui
```

## 整合模块说明

### 04-core-gameplay.spec.ts（核心玩法）
- 整合来源：17-score-counter-fix.spec.ts、20-auto-drop-manual-release-fix.spec.ts
- 新增覆盖：Score计数器累加与显示一致性、自动下落与手动释放、球体残影消除、动画流畅性、GSAP动画清理、并发控制、自动下落球体可见性验证

### 05-level-system.spec.ts（关卡系统）
- 整合来源：17-score-counter-fix.spec.ts、19-objective-display.spec.ts
- 新增覆盖：第2关卡特定场景、关卡目标展示与覆盖层、目标进度更新、不同目标类型展示

### 06-ui-screens.spec.ts（UI界面）
- 整合来源：19-objective-display.spec.ts
- 新增覆盖：通关条件固定显示、ObjectiveDisplay界面布局整合

### 07-prop-system.spec.ts（道具系统）
- 整合来源：15-bomb-prop-bugfix.spec.ts、18-bomb-response-optimization.spec.ts、19-shrink-bottom-position-fix.spec.ts
- 新增覆盖：炸弹道具BUG修复、炸弹按钮响应优化（含十字准星位置/延迟/完整流程/坐标验证）、缩小道具底部位置修正（含不悬浮验证）

### 10-state-flow.spec.ts（状态管理与流程）
- 整合来源：18-week5-revive-restart-fixes.spec.ts
- 新增覆盖：复活后计时器恢复、重新开始后WarningLine和动画恢复、失败后重新开始/复活WarningLine可见性、TimeManager window暴露验证

### 12-visual-layout.spec.ts（视觉布局与UI可见性）
- 整合来源：16-next-preview-fix.spec.ts、16-visual-wall-preview.spec.ts
- 新增覆盖：NextPreview定位修复与可见性、容器边界与预览夹持、落点标记位置、碰撞边界验证、容器边界稳定性
- 覆盖 5 种分辨率（1920×1080、768×1024、375×812、320×568、812×375）
- 验证按钮不重叠、UI元素完全在屏幕内
- 验证动画元素（连击显示、得分飘字、道具按钮动画）不超出屏幕
- 验证暂停菜单在各类分辨率下正确居中

### 13-gameplay-edge.spec.ts（玩法边界与视觉效果）
- 容器边界限制：左侧、右侧、预览、快速点击溢出
- 容器底部边界：方块堆积验证
- 警戒线：高度比例、尺寸缩放、空中/静止区分、速度阈值
- 合成动画：扩散环、粒子效果、视觉冲击力、连锁增强
- 动画性能：帧率、特效清理
- 过关分数：目标>0、递增性、星级合理性、生存时间、合成目标、障碍数量