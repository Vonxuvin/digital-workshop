# Week 5 每日任务清单 — 核心功能开发期（Alpha版本）

> **阶段名称**：Phase 3 核心功能开发期 - Alpha版本
> **时间范围**：Day 29 - Day 35（7个工作日）
> **阶段目标**：实现动态容器变形系统、关卡编辑器与配置系统、存档与数据系统，达到Alpha版本可玩标准
> **阶段交付物**：
> - 动态容器变形系统（4种变形机制）
> - 30个配置关卡 + 关卡编辑器工具
> - 存档与数据持久化系统
> - Alpha版本可运行游戏
> **技术栈**：TypeScript / PixiJS v8.6.3 / Matter.js 0.20.0 / Vite / Vitest / GSAP 3.12.5
> **项目根目录**：`/workspace`

---

## 前置条件

### 上周交付物依赖

- Week4_每日任务清单.md 中定义的完整道具系统（PropSystem、3种道具类、特效）
- Week4_ReviewReport.md 中定义的遗留问题处理
- Week4 代码产出（src/ 下完整可运行项目）

### 上周遗留待解决问题

- MergeSystem 覆盖率偏低（66.41%），需补充集成测试方案
- 缩小射线道具（ShrinkProp）未实现
- 幸运投放道具（LuckyProp）未实现
- 音效资源文件（*.mp3）待添加

### 需要延续的技术规范或架构决策

- 使用策略模式实现目标判定（ObjectiveChecker）
- 使用单例模式管理 Game、SceneManager、UIManager、AudioManager、PropSystem
- 物理引擎与渲染同步采用固定时间步长（60fps）
- 事件系统采用 EventBus 统一管理
- 关卡配置采用 JSON 格式，通过 LevelLoader 动态加载

---

## 任务总览图

```
Day 29         Day 30         Day 31         Day 32         Day 33         Day 34         Day 35
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ 容器变形系统  │ 旋转与收缩   │ 分叉通道     │ 关卡配置     │ 关卡编辑器   │ 存档系统     │ 阶段评审
│ 框架搭建     │ 变形实现     │ 变形实现     │ 扩展(10关)   │ 工具实现     │ 与数据持久化 │ + 文档归档
│ + 移动挡板   │ + 物理集成   │ + 关卡集成   │ + 难度设计   │ + 30关配置   │ + Alpha打包  │ + 遗留处理
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 任务状态标记说明

每个 Step 使用以下 5 种状态标记：

| 状态 | 标识 | 说明 |
|------|------|------|
| 待开始 | `[pending]` | 前置条件未满足，尚未开始执行 |
| 进行中 | `[in_progress]` | 当前正在执行中 |
| 已完成 | `[completed]` | 已通过验收标准，交付物合格 |
| 已阻塞 | `[blocked]` | 遇到无法自行解决的问题，需记录阻塞原因 |
| 已取消 | `[cancelled]` | 经评审确认不再需要，需记录取消原因 |

**阻塞处理流程**：
1. 标记任务为 `[blocked]`，在执行日志中记录阻塞原因
2. 尝试自行排查和解决（参考常见失败场景恢复步骤）
3. 如无法解决，标记为 `[blocked]` 并继续执行其他可并行任务
4. 在 Day 结束的评审中汇总所有阻塞项

---

## Day 29 — 动态容器变形系统框架 + 移动挡板实现

### 基础信息

| 属性        | 内容                        |
| --------- | ------------------------- |
| **任务目标**  | 搭建容器变形系统框架，实现移动挡板变形机制 |
| **预计工时**  | 8小时（编码5h + 测试2h + 文档1h） |
| **前置条件**  | Week4 → Day 29（强依赖），PhysicsManager、GameContainer 可用 |
| **技术栈要求** | TypeScript, PixiJS v8.6.3, Matter.js 0.20.0 |

### 详细任务步骤

#### Step 29.1：环境验证与文档目录创建 [pending]

**分类**：config  
**优先级**：P0

**命令**：

```bash
node -v
npm -v
cd /workspace
npm install
mkdir -p docs/Week5
mkdir -p src/gameplay/modifiers
```

**交付标准**：Node.js ≥ 18.x，npm 可用，依赖安装成功，docs/Week5 目录已创建

---

#### Step 29.2：容器变形系统基类与接口定义 [pending]

**分类**：code  
**优先级**：P0

**文件操作**：新建 `src/gameplay/modifiers/ContainerModifier.ts`

```typescript
import Matter from 'matter-js';
import { PhysicsManager } from '../../core/PhysicsManager';

export type ModifierType = 'paddle' | 'rotate' | 'shrink' | 'fork';

export interface ModifierConfig {
  type: ModifierType;
  enabled: boolean;
  triggerInterval?: number;    // 触发间隔（秒）
  duration?: number;           // 持续时间（秒）
  startDelay?: number;         // 首次触发延迟（秒）
}

export interface ModifierState {
  isActive: boolean;
  progress: number;            // 0-1
  elapsedTime: number;         // 已运行时间（毫秒）
  remainingTime: number;       // 剩余时间（毫秒）
}

export abstract class ContainerModifier {
  protected config: ModifierConfig;
  protected state: ModifierState;
  protected physics: PhysicsManager;
  protected timer: ReturnType<typeof setInterval> | null = null;
  protected startDelayTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: ModifierConfig, physics: PhysicsManager) {
    this.config = config;
    this.physics = physics;
    this.state = {
      isActive: false,
      progress: 0,
      elapsedTime: 0,
      remainingTime: 0,
    };
  }

  abstract getType(): ModifierType;

  start(): void {
    if (this.config.startDelay && this.config.startDelay > 0) {
      this.startDelayTimer = setTimeout(() => {
        this.activate();
      }, this.config.startDelay * 1000);
    } else {
      this.activate();
    }
  }

  protected activate(): void {
    if (this.state.isActive) return;
    this.state.isActive = true;
    this.state.elapsedTime = 0;
    this.state.remainingTime = (this.config.duration || 0) * 1000;
    this.onActivate();

    if (this.config.triggerInterval && this.config.triggerInterval > 0) {
      this.timer = setInterval(() => {
        this.tick();
      }, 16);
    }
  }

  protected abstract onActivate(): void;

  protected tick(): void {
    if (!this.state.isActive) return;
    this.state.elapsedTime += 16;
    if (this.config.duration && this.config.duration > 0) {
      this.state.remainingTime = Math.max(0, this.config.duration * 1000 - this.state.elapsedTime);
      this.state.progress = Math.min(1, this.state.elapsedTime / (this.config.duration * 1000));
      if (this.state.remainingTime <= 0) {
        this.deactivate();
      }
    }
    this.onTick();
  }

  protected abstract onTick(): void;

  deactivate(): void {
    if (!this.state.isActive) return;
    this.state.isActive = false;
    this.state.progress = 0;
    this.onDeactivate();
    this.clearTimers();
  }

  protected abstract onDeactivate(): void;

  pause(): void {
    this.clearTimers();
  }

  resume(): void {
    if (this.state.isActive && this.config.triggerInterval) {
      this.timer = setInterval(() => {
        this.tick();
      }, 16);
    }
  }

  getState(): ModifierState {
    return { ...this.state };
  }

  isActive(): boolean {
    return this.state.isActive;
  }

  private clearTimers(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.startDelayTimer) {
      clearTimeout(this.startDelayTimer);
      this.startDelayTimer = null;
    }
  }

  destroy(): void {
    this.deactivate();
    this.clearTimers();
  }
}
```

**交付标准**：ContainerModifier 抽象类可继承，状态管理正确，生命周期完整

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

#### Step 29.3：移动挡板变形实现 [pending]

**分类**：code  
**优先级**：P0

**文件操作**：新建 `src/gameplay/modifiers/PaddleModifier.ts`

```typescript
import Matter from 'matter-js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export interface PaddleConfig extends ModifierConfig {
  side: 'left' | 'right';
  extendDuration: number;    // 伸出持续时间（秒）
  retractDuration: number;   // 缩回持续时间（秒）
  extendLength: number;      // 伸出长度（像素）
  triggerInterval: number;   // 触发间隔（秒）
  yPosition?: number;        // 挡板Y位置（默认容器中间）
}

export class PaddleModifier extends ContainerModifier {
  private paddleBody: Matter.Body | null = null;
  private paddleGraphics: any = null;
  private side: 'left' | 'right';
  private extendDuration: number;
  private retractDuration: number;
  private extendLength: number;
  private yPosition: number;
  private containerWidth: number;
  private containerHeight: number;
  private phase: 'idle' | 'extending' | 'extended' | 'retracting' = 'idle';
  private phaseElapsed: number = 0;
  private cycleTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    config: PaddleConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number
  ) {
    super(config, physics);
    this.side = config.side;
    this.extendDuration = config.extendDuration * 1000;
    this.retractDuration = config.retractDuration * 1000;
    this.extendLength = config.extendLength;
    this.yPosition = config.yPosition ?? containerHeight * 0.6;
    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;
  }

  getType(): 'paddle' {
    return 'paddle';
  }

  protected onActivate(): void {
    this.startCycle();
  }

  private startCycle(): void {
    this.phase = 'extending';
    this.phaseElapsed = 0;
    this.createPaddle();

    this.cycleTimer = setInterval(() => {
      this.updateCycle();
    }, 16);
  }

  private createPaddle(): void {
    const wallThickness = 10;
    const paddleWidth = this.extendLength;
    const paddleHeight = 20;

    const startX = this.side === 'left'
      ? wallThickness + paddleWidth / 2
      : this.containerWidth - wallThickness - paddleWidth / 2;

    this.paddleBody = this.physics.createRectangle(
      startX,
      this.yPosition,
      paddleWidth,
      paddleHeight,
      {
        isStatic: true,
        friction: 0.5,
        restitution: 0.2,
        label: `paddle_${this.side}`,
      }
    );
  }

  private updateCycle(): void {
    this.phaseElapsed += 16;

    switch (this.phase) {
      case 'extending':
        if (this.phaseElapsed >= this.extendDuration) {
          this.phase = 'extended';
          this.phaseElapsed = 0;
        }
        break;
      case 'extended':
        if (this.phaseElapsed >= 1000) {
          this.phase = 'retracting';
          this.phaseElapsed = 0;
        }
        break;
      case 'retracting':
        if (this.phaseElapsed >= this.retractDuration) {
          this.removePaddle();
          this.phase = 'idle';
          this.phaseElapsed = 0;
          // 等待下一个触发间隔
          setTimeout(() => {
            if (this.state.isActive) {
              this.phase = 'extending';
              this.phaseElapsed = 0;
              this.createPaddle();
            }
          }, (this.config.triggerInterval || 5) * 1000 - this.extendDuration - this.retractDuration - 1000);
        }
        break;
    }

    this.updatePaddlePosition();
  }

  private updatePaddlePosition(): void {
    if (!this.paddleBody) return;

    const wallThickness = 10;
    let targetX: number;

    switch (this.phase) {
      case 'extending': {
        const t = Math.min(1, this.phaseElapsed / this.extendDuration);
        const eased = this.easeOutQuad(t);
        const retractedX = this.side === 'left'
          ? wallThickness - this.extendLength / 2
          : this.containerWidth - wallThickness + this.extendLength / 2;
        const extendedX = this.side === 'left'
          ? wallThickness + this.extendLength / 2
          : this.containerWidth - wallThickness - this.extendLength / 2;
        targetX = retractedX + (extendedX - retractedX) * eased;
        break;
      }
      case 'extended':
        targetX = this.side === 'left'
          ? wallThickness + this.extendLength / 2
          : this.containerWidth - wallThickness - this.extendLength / 2;
        break;
      case 'retracting': {
        const t = Math.min(1, this.phaseElapsed / this.retractDuration);
        const eased = this.easeInQuad(t);
        const extendedX = this.side === 'left'
          ? wallThickness + this.extendLength / 2
          : this.containerWidth - wallThickness - this.extendLength / 2;
        const retractedX = this.side === 'left'
          ? wallThickness - this.extendLength / 2
          : this.containerWidth - wallThickness + this.extendLength / 2;
        targetX = extendedX + (retractedX - extendedX) * eased;
        break;
      }
      default:
        return;
    }

    Matter.Body.setPosition(this.paddleBody, {
      x: targetX,
      y: this.yPosition,
    });
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  private easeInQuad(t: number): number {
    return t * t;
  }

  private removePaddle(): void {
    if (this.paddleBody) {
      this.physics.removeBody(this.paddleBody);
      this.paddleBody = null;
    }
  }

  protected onTick(): void {
    // 循环逻辑在 cycleTimer 中处理
  }

  protected onDeactivate(): void {
    this.removePaddle();
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
    this.phase = 'idle';
  }

  destroy(): void {
    super.destroy();
    this.removePaddle();
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
      this.cycleTimer = null;
    }
  }
}
```

**交付标准**：PaddleModifier 可创建挡板，按周期伸出/缩回，物理碰撞正确

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

#### Step 29.4：容器变形管理器 [pending]

**分类**：code  
**优先级**：P0

**文件操作**：新建 `src/gameplay/modifiers/ModifierManager.ts`

```typescript
import { EventBus } from '../../utils/EventBus';
import { ContainerModifier, ModifierConfig, ModifierType } from './ContainerModifier';
import { PaddleModifier, PaddleConfig } from './PaddleModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export class ModifierManager {
  private static instance: ModifierManager;
  private modifiers: Map<ModifierType, ContainerModifier> = new Map();
  private physics: PhysicsManager;
  private eventBus: EventBus;
  private containerWidth: number = 0;
  private containerHeight: number = 0;
  private isPaused: boolean = false;

  private constructor(physics: PhysicsManager) {
    this.physics = physics;
    this.eventBus = EventBus.getInstance();
  }

  static getInstance(physics?: PhysicsManager): ModifierManager {
    if (!ModifierManager.instance) {
      if (!physics) {
        throw new Error('[ModifierManager] 首次初始化需要提供 PhysicsManager');
      }
      ModifierManager.instance = new ModifierManager(physics);
    }
    return ModifierManager.instance;
  }

  static resetInstance(): void {
    ModifierManager.instance = null as any;
  }

  setContainerSize(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
  }

  createModifier(config: ModifierConfig): ContainerModifier | null {
    if (!this.containerWidth || !this.containerHeight) {
      console.error('[ModifierManager] 容器尺寸未设置');
      return null;
    }

    let modifier: ContainerModifier;

    switch (config.type) {
      case 'paddle':
        modifier = new PaddleModifier(
          config as PaddleConfig,
          this.physics,
          this.containerWidth,
          this.containerHeight
        );
        break;
      default:
        console.warn(`[ModifierManager] 不支持的变形类型: ${config.type}`);
        return null;
    }

    this.modifiers.set(config.type, modifier);
    return modifier;
  }

  loadFromLevelConfig(modifiersConfig: ModifierConfig[]): void {
    this.clearAll();
    for (const config of modifiersConfig) {
      if (config.enabled) {
        this.createModifier(config);
      }
    }
  }

  startAll(): void {
    this.modifiers.forEach(modifier => {
      if (!modifier.isActive()) {
        modifier.start();
      }
    });
  }

  stopAll(): void {
    this.modifiers.forEach(modifier => {
      modifier.deactivate();
    });
  }

  pauseAll(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.modifiers.forEach(modifier => modifier.pause());
  }

  resumeAll(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.modifiers.forEach(modifier => modifier.resume());
  }

  getModifier(type: ModifierType): ContainerModifier | undefined {
    return this.modifiers.get(type);
  }

  getAllModifiers(): ContainerModifier[] {
    return Array.from(this.modifiers.values());
  }

  clearAll(): void {
    this.modifiers.forEach(modifier => modifier.destroy());
    this.modifiers.clear();
  }

  destroy(): void {
    this.clearAll();
    ModifierManager.instance = null as any;
  }
}
```

**交付标准**：ModifierManager 单例可用，可管理多种变形器，生命周期控制正确

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

#### Step 29.5：单元测试 [pending]

**分类**：test  
**优先级**：P1

**文件操作**：新建 `tests/gameplay/modifiers/PaddleModifier.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaddleModifier, PaddleConfig } from '../../../src/gameplay/modifiers/PaddleModifier';
import { PhysicsManager } from '../../../src/core/PhysicsManager';

describe('PaddleModifier', () => {
  let physics: PhysicsManager;
  let modifier: PaddleModifier;

  beforeEach(() => {
    physics = new PhysicsManager();
  });

  afterEach(() => {
    modifier?.destroy();
    physics.clearAll();
  });

  it('应正确创建挡板变形器', () => {
    const config: PaddleConfig = {
      type: 'paddle',
      enabled: true,
      side: 'left',
      extendDuration: 0.5,
      retractDuration: 0.5,
      extendLength: 80,
      triggerInterval: 5,
    };

    modifier = new PaddleModifier(config, physics, 400, 600);
    expect(modifier.getType()).toBe('paddle');
    expect(modifier.isActive()).toBe(false);
  });

  it('启动后应变为激活状态', () => {
    const config: PaddleConfig = {
      type: 'paddle',
      enabled: true,
      side: 'left',
      extendDuration: 0.1,
      retractDuration: 0.1,
      extendLength: 80,
      triggerInterval: 5,
    };

    modifier = new PaddleModifier(config, physics, 400, 600);
    modifier.start();
    expect(modifier.isActive()).toBe(true);
  });

  it('应正确返回状态信息', () => {
    const config: PaddleConfig = {
      type: 'paddle',
      enabled: true,
      side: 'right',
      extendDuration: 1,
      retractDuration: 1,
      extendLength: 100,
      triggerInterval: 5,
    };

    modifier = new PaddleModifier(config, physics, 400, 600);
    const state = modifier.getState();
    expect(state.isActive).toBe(false);
    expect(state.progress).toBe(0);
  });
});
```

**交付标准**：测试覆盖 PaddleModifier 核心功能，通过率 100%

---

#### Step 32.4：关卡加载单元测试 [pending]

**分类**：test  
**优先级**：P1

**文件操作**：新建 `tests/core/LevelLoader.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LevelLoader } from '../../src/core/LevelLoader';

describe('LevelLoader', () => {
  let loader: LevelLoader;

  beforeEach(() => {
    loader = LevelLoader.getInstance();
  });

  it('应正确加载关卡1配置', async () => {
    const config = await loader.loadLevel(1);
    expect(config).not.toBeNull();
    expect(config!.id).toBe(1);
    expect(config!.name).toBeDefined();
    expect(config!.objective).toBeDefined();
    expect(config!.container).toBeDefined();
    expect(config!.spawn).toBeDefined();
    expect(config!.rewards).toBeDefined();
  });

  it('应正确加载带变形器的关卡6配置', async () => {
    const config = await loader.loadLevel(6);
    expect(config).not.toBeNull();
    expect(config!.modifiers).toBeDefined();
    expect(config!.modifiers!.length).toBeGreaterThan(0);
    expect(config!.modifiers![0].type).toBe('paddle');
  });

  it('应正确加载带旋转变形器的关卡7配置', async () => {
    const config = await loader.loadLevel(7);
    expect(config).not.toBeNull();
    expect(config!.modifiers).toBeDefined();
    const rotateMod = config!.modifiers!.find(m => m.type === 'rotate');
    expect(rotateMod).toBeDefined();
  });

  it('应正确加载带收缩变形器的关卡8配置', async () => {
    const config = await loader.loadLevel(8);
    expect(config).not.toBeNull();
    expect(config!.modifiers).toBeDefined();
    const shrinkMod = config!.modifiers!.find(m => m.type === 'shrink');
    expect(shrinkMod).toBeDefined();
  });

  it('应正确加载带分叉变形器的关卡9配置', async () => {
    const config = await loader.loadLevel(9);
    expect(config).not.toBeNull();
    expect(config!.modifiers).toBeDefined();
    const forkMod = config!.modifiers!.find(m => m.type === 'fork');
    expect(forkMod).toBeDefined();
  });

  it('应正确加载综合变形关卡10配置', async () => {
    const config = await loader.loadLevel(10);
    expect(config).not.toBeNull();
    expect(config!.modifiers).toBeDefined();
    expect(config!.modifiers!.length).toBeGreaterThanOrEqual(2);
  });

  it('应正确加载大师关卡15配置（全部4种变形器）', async () => {
    const config = await loader.loadLevel(15);
    expect(config).not.toBeNull();
    expect(config!.modifiers).toBeDefined();
    expect(config!.modifiers!.length).toBe(4);
  });

  it('加载不存在的关卡应返回null', async () => {
    const config = await loader.loadLevel(999);
    expect(config).toBeNull();
  });

  it('所有关卡1-15应能成功加载', async () => {
    for (let i = 1; i <= 15; i++) {
      const config = await loader.loadLevel(i);
      expect(config).not.toBeNull();
      expect(config!.id).toBe(i);
    }
  });

  it('关卡星级奖励应为递增的三元组', async () => {
    for (let i = 1; i <= 15; i++) {
      const config = await loader.loadLevel(i);
      if (config) {
        const [s1, s2, s3] = config.rewards.stars;
        expect(s1).toBeLessThanOrEqual(s2);
        expect(s2).toBeLessThanOrEqual(s3);
      }
    }
  });
});
```

**交付标准**：测试覆盖所有15个关卡加载，通过率 100%

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

#### Step 33.2：关卡编辑器单元测试 [pending]

**分类**：test  
**优先级**：P1

**文件操作**：新建 `tests/tools/LevelEditor.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('LevelEditor JSON Generation', () => {
  const createBaseConfig = () => ({
    id: 16,
    name: '测试关卡',
    objective: {
      type: 'score' as const,
      target: 1000,
    },
    container: {
      width: 400,
      height: 600,
      shape: 'rectangle' as const,
    },
    spawn: {
      availableNumbers: [1, 2, 4],
    },
    modifiers: [] as any[],
    rewards: {
      stars: [500, 1000, 2000] as [number, number, number],
    },
  });

  it('应生成有效的关卡配置JSON', () => {
    const config = createBaseConfig();
    const json = JSON.stringify(config, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(16);
    expect(parsed.name).toBe('测试关卡');
    expect(parsed.objective.type).toBe('score');
    expect(parsed.objective.target).toBe(1000);
  });

  it('应正确序列化paddle变形器配置', () => {
    const config = createBaseConfig();
    config.modifiers.push({
      type: 'paddle',
      enabled: true,
      side: 'left',
      extendDuration: 2,
      retractDuration: 1,
      extendLength: 80,
      triggerInterval: 5,
      yPosition: 360,
    });
    const json = JSON.stringify(config, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.modifiers).toHaveLength(1);
    expect(parsed.modifiers[0].type).toBe('paddle');
    expect(parsed.modifiers[0].side).toBe('left');
    expect(parsed.modifiers[0].extendDuration).toBe(2);
  });

  it('应正确序列化rotate变形器配置', () => {
    const config = createBaseConfig();
    config.modifiers.push({
      type: 'rotate',
      enabled: true,
      rotationSpeed: 15,
      maxAngle: 10,
      oscillate: true,
      duration: 60,
    });
    const json = JSON.stringify(config, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.modifiers[0].type).toBe('rotate');
    expect(parsed.modifiers[0].rotationSpeed).toBe(15);
    expect(parsed.modifiers[0].oscillate).toBe(true);
  });

  it('应正确序列化shrink变形器配置', () => {
    const config = createBaseConfig();
    config.modifiers.push({
      type: 'shrink',
      enabled: true,
      targetWidth: 200,
      shrinkSpeed: 10,
      minWidth: 150,
    });
    const json = JSON.stringify(config, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.modifiers[0].type).toBe('shrink');
    expect(parsed.modifiers[0].targetWidth).toBe(200);
    expect(parsed.modifiers[0].minWidth).toBe(150);
  });

  it('应正确序列化fork变形器配置', () => {
    const config = createBaseConfig();
    config.modifiers.push({
      type: 'fork',
      enabled: true,
      forkY: 300,
      leftAngle: 15,
      rightAngle: 15,
      channelWidth: 150,
    });
    const json = JSON.stringify(config, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.modifiers[0].type).toBe('fork');
    expect(parsed.modifiers[0].forkY).toBe(300);
    expect(parsed.modifiers[0].channelWidth).toBe(150);
  });

  it('应正确序列化多个变形器组合', () => {
    const config = createBaseConfig();
    config.modifiers.push(
      { type: 'paddle', enabled: true, side: 'left', extendDuration: 2, retractDuration: 1, extendLength: 80, triggerInterval: 5, yPosition: 360 },
      { type: 'rotate', enabled: true, rotationSpeed: 15, maxAngle: 10, oscillate: true, duration: 60 },
      { type: 'shrink', enabled: true, targetWidth: 200, shrinkSpeed: 10, minWidth: 150 },
      { type: 'fork', enabled: true, forkY: 300, leftAngle: 15, rightAngle: 15, channelWidth: 150 }
    );
    const json = JSON.stringify(config, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.modifiers).toHaveLength(4);
    const types = parsed.modifiers.map((m: any) => m.type);
    expect(types).toContain('paddle');
    expect(types).toContain('rotate');
    expect(types).toContain('shrink');
    expect(types).toContain('fork');
  });

  it('应正确序列化星级奖励', () => {
    const config = createBaseConfig();
    config.rewards.stars = [100, 500, 1000];
    const json = JSON.stringify(config, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.rewards.stars).toEqual([100, 500, 1000]);
  });

  it('应正确序列化时间限制', () => {
    const config = createBaseConfig();
    config.objective = { type: 'survival', target: 60, timeLimit: 60 };
    const json = JSON.stringify(config, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.objective.type).toBe('survival');
    expect(parsed.objective.timeLimit).toBe(60);
  });

  it('生成的JSON应能被LevelLoader解析', () => {
    const config = createBaseConfig();
    config.modifiers.push({
      type: 'paddle',
      enabled: true,
      side: 'right',
      extendDuration: 3,
      retractDuration: 1.5,
      extendLength: 100,
      triggerInterval: 4,
      yPosition: 400,
    });
    const json = JSON.stringify(config, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(16);
    expect(parsed.container.width).toBe(400);
    expect(parsed.container.height).toBe(600);
    expect(parsed.container.shape).toBe('rectangle');
    expect(parsed.spawn.availableNumbers).toEqual([1, 2, 4]);
    expect(parsed.modifiers[0].enabled).toBe(true);
  });
});
```

**交付标准**：测试覆盖编辑器JSON生成和4种变形器序列化，通过率 100%

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

### 质量验证

```bash
cd /workspace
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
```

### 代码审查与提交

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b Vonxuvin/Week5Task

git status
git add .
git commit -m "feat: 实现容器变形系统框架 ContainerModifier + PaddleModifier 移动挡板"
git push origin Vonxuvin/Week5Task
```

### Day 29 自验证

1. 启动开发服务器：`npm run dev`
2. 打开浏览器访问 `http://localhost:5173`
3. 验证以下行为：
   - [ ] 游戏正常启动，无报错
   - [ ] ModifierManager 可正常初始化
   - [ ] 移动挡板可按周期伸出和缩回
   - [ ] 挡板与方块有物理碰撞
4. 打开微信开发者工具，导入项目目录 `/workspace`
5. 验证以下行为：
   - [ ] 微信环境下变形系统无报错
6. 检查浏览器控制台和微信开发者工具控制台，确认无错误输出

### Day 29 webapp-testing 自动化验证

1. **调用 webapp-testing 技能**：使用 Skill 工具加载 `webapp-testing`
2. **执行自动化测试**，从以下分类中选择适用项：
   - **基础功能验证**：页面加载、画布渲染、控制台错误检测
   - **UI 交互测试**：按钮响应、触摸热区
   - **性能与稳定性测试**：帧率稳定性、快速操作
   - 保存测试截图，记录验证结果
3. **生成测试报告**：按测试报告模板记录测试覆盖率、通过/失败分析
4. **测试通过判定**：
   - webapp-testing 连接成功 ✓
   - 游戏画布正常渲染 ✓
   - 当天适用的测试分类全部通过 ✓
   - 控制台无 Error 级别错误 ✓
   - 截图已保存 ✓
   - 测试报告已生成 ✓
5. **测试失败处理**：记录失败原因和截图 → 回到对应 Step 修复 → 重新执行测试 → 更新测试报告

### Day 29 交付物汇总

| 交付物 | 路径 | 验收标准 |
|--------|------|----------|
| 变形系统基类 | src/gameplay/modifiers/ContainerModifier.ts | 抽象类可继承，生命周期完整 |
| 移动挡板变形 | src/gameplay/modifiers/PaddleModifier.ts | 挡板可周期伸出/缩回，物理碰撞正确 |
| 变形管理器 | src/gameplay/modifiers/ModifierManager.ts | 单例可用，可管理多种变形器 |
| 单元测试 | tests/gameplay/modifiers/PaddleModifier.test.ts | 测试通过率 100% |

---

## Day 30 — 旋转容器与收缩边界变形实现

### 基础信息

| 属性        | 内容                        |
| --------- | ------------------------- |
| **任务目标**  | 实现旋转容器和收缩边界两种变形机制 |
| **预计工时**  | 8小时（编码5h + 测试2h + 文档1h） |
| **前置条件**  | Day 29 容器变形系统框架完成 |
| **技术栈要求** | TypeScript, PixiJS v8.6.3, Matter.js 0.20.0 |

### 详细任务步骤

#### Step 30.1：旋转容器变形实现 [pending]

**分类**：code  
**优先级**：P0

**文件操作**：新建 `src/gameplay/modifiers/RotateModifier.ts`

```typescript
import Matter from 'matter-js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export interface RotateConfig extends ModifierConfig {
  rotationSpeed: number;       // 旋转速度（度/秒）
  maxAngle: number;            // 最大旋转角度（度）
  oscillate: boolean;          // 是否摆动（true: 来回摆动，false: 持续旋转）
}

export class RotateModifier extends ContainerModifier {
  private rotationSpeed: number;
  private maxAngle: number;
  private oscillate: boolean;
  private currentAngle: number = 0;
  private targetAngle: number = 0;
  private direction: number = 1;
  private containerBodies: Matter.Body[] = [];
  private originalPositions: Map<number, { x: number; y: number }> = new Map();
  private centerX: number;
  private centerY: number;

  constructor(
    config: RotateConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number
  ) {
    super(config, physics);
    this.rotationSpeed = config.rotationSpeed;
    this.maxAngle = config.maxAngle;
    this.oscillate = config.oscillate;
    this.centerX = containerWidth / 2;
    this.centerY = containerHeight / 2;
  }

  getType(): 'rotate' {
    return 'rotate';
  }

  protected onActivate(): void {
    this.collectContainerBodies();
    this.targetAngle = this.maxAngle;
    this.direction = 1;
  }

  private collectContainerBodies(): void {
    const engine = this.physics.getEngine();
    const bodies = Matter.Composite.allBodies(engine.world);
    this.containerBodies = bodies.filter(body =>
      body.label?.includes('wall') ||
      body.label?.includes('ground') ||
      body.isStatic
    );

    this.originalPositions.clear();
    for (const body of this.containerBodies) {
      this.originalPositions.set(body.id, { x: body.position.x, y: body.position.y });
    }
  }

  protected onTick(): void {
    const dt = 0.016;
    const angleChange = this.rotationSpeed * dt * this.direction;
    this.currentAngle += angleChange;

    if (this.oscillate) {
      if (Math.abs(this.currentAngle) >= this.maxAngle) {
        this.currentAngle = this.maxAngle * Math.sign(this.currentAngle);
        this.direction *= -1;
      }
    }

    this.applyRotation();
    this.updateGravity();
  }

  private applyRotation(): void {
    const angleRad = (this.currentAngle * Math.PI) / 180;

    for (const body of this.containerBodies) {
      const originalPos = this.originalPositions.get(body.id);
      if (!originalPos) continue;

      const dx = originalPos.x - this.centerX;
      const dy = originalPos.y - this.centerY;

      const newX = this.centerX + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
      const newY = this.centerY + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

      Matter.Body.setPosition(body, { x: newX, y: newY });
      Matter.Body.setAngle(body, angleRad);
    }
  }

  private updateGravity(): void {
    const angleRad = (this.currentAngle * Math.PI) / 180;
    const gravityX = Math.sin(angleRad);
    const gravityY = Math.cos(angleRad);
    this.physics.setGravity(gravityX, gravityY);
  }

  protected onDeactivate(): void {
    this.physics.setGravity(0, 1);
    this.currentAngle = 0;
    this.direction = 1;

    for (const body of this.containerBodies) {
      const originalPos = this.originalPositions.get(body.id);
      if (originalPos) {
        Matter.Body.setPosition(body, originalPos);
        Matter.Body.setAngle(body, 0);
      }
    }
  }

  getCurrentAngle(): number {
    return this.currentAngle;
  }
}
```

**交付标准**：RotateModifier 可旋转容器，重力方向同步变化，支持摆动模式

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

#### Step 30.2：收缩边界变形实现 [pending]

**分类**：code  
**优先级**：P0

**文件操作**：新建 `src/gameplay/modifiers/ShrinkModifier.ts`

```typescript
import Matter from 'matter-js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export interface ShrinkConfig extends ModifierConfig {
  targetWidth: number;         // 目标宽度（像素）
  shrinkSpeed: number;         // 收缩速度（像素/秒）
  minWidth: number;            // 最小宽度限制
}

export class ShrinkModifier extends ContainerModifier {
  private targetWidth: number;
  private shrinkSpeed: number;
  private minWidth: number;
  private originalWidth: number;
  private currentWidth: number;
  private leftWall: Matter.Body | null = null;
  private rightWall: Matter.Body | null = null;
  private containerHeight: number;
  private groundY: number;

  constructor(
    config: ShrinkConfig,
    physics: PhysicsManager,
    originalWidth: number,
    containerHeight: number,
    groundY: number
  ) {
    super(config, physics);
    this.targetWidth = config.targetWidth;
    this.shrinkSpeed = config.shrinkSpeed;
    this.minWidth = config.minWidth;
    this.originalWidth = originalWidth;
    this.currentWidth = originalWidth;
    this.containerHeight = containerHeight;
    this.groundY = groundY;
  }

  getType(): 'shrink' {
    return 'shrink';
  }

  protected onActivate(): void {
    this.findWalls();
  }

  private findWalls(): void {
    const engine = this.physics.getEngine();
    const bodies = Matter.Composite.allBodies(engine.world);

    for (const body of bodies) {
      if (body.label?.includes('wall_left') || body.label?.includes('left')) {
        this.leftWall = body;
      } else if (body.label?.includes('wall_right') || body.label?.includes('right')) {
        this.rightWall = body;
      }
    }
  }

  protected onTick(): void {
    const dt = 0.016;
    const shrinkAmount = this.shrinkSpeed * dt;

    if (this.currentWidth > Math.max(this.targetWidth, this.minWidth)) {
      this.currentWidth = Math.max(
        this.targetWidth,
        this.minWidth,
        this.currentWidth - shrinkAmount * 2
      );
      this.updateWallPositions();
    }
  }

  private updateWallPositions(): void {
    const centerX = this.originalWidth / 2;
    const halfWidth = this.currentWidth / 2;
    const leftX = centerX - halfWidth;
    const rightX = centerX + halfWidth;

    if (this.leftWall) {
      Matter.Body.setPosition(this.leftWall, {
        x: leftX - 25,
        y: this.containerHeight / 2,
      });
    }

    if (this.rightWall) {
      Matter.Body.setPosition(this.rightWall, {
        x: rightX + 25,
        y: this.containerHeight / 2,
      });
    }
  }

  protected onDeactivate(): void {
    this.currentWidth = this.originalWidth;
    this.updateWallPositions();
  }

  getCurrentWidth(): number {
    return this.currentWidth;
  }

  getShrinkProgress(): number {
    return (this.originalWidth - this.currentWidth) / (this.originalWidth - this.targetWidth);
  }
}
```

**交付标准**：ShrinkModifier 可收缩容器边界，有最小宽度限制，物理边界同步更新

---

#### Step 30.3：更新 ModifierManager 支持新变形器 [pending]

**分类**：code  
**优先级**：P0

**文件操作**：修改 `src/gameplay/modifiers/ModifierManager.ts`

在文件顶部添加导入，并在 `createModifier` 方法的 switch 中添加 `rotate` 和 `shrink` 分支。修改后的完整 `createModifier` 方法如下：

```typescript
import { RotateModifier, RotateConfig } from './RotateModifier';
import { ShrinkModifier, ShrinkConfig } from './ShrinkModifier';

createModifier(config: ModifierConfig): ContainerModifier | null {
  if (!this.containerWidth || !this.containerHeight) {
    console.error('[ModifierManager] 容器尺寸未设置');
    return null;
  }

  let modifier: ContainerModifier;

  switch (config.type) {
    case 'paddle':
      modifier = new PaddleModifier(
        config as PaddleConfig,
        this.physics,
        this.containerWidth,
        this.containerHeight
      );
      break;
    case 'rotate':
      modifier = new RotateModifier(
        config as RotateConfig,
        this.physics,
        this.containerWidth,
        this.containerHeight
      );
      break;
    case 'shrink':
      modifier = new ShrinkModifier(
        config as ShrinkConfig,
        this.physics,
        this.containerWidth,
        this.containerHeight,
        this.containerHeight - 50
      );
      break;
    default:
      console.warn(`[ModifierManager] 不支持的变形类型: ${config.type}`);
      return null;
  }

  this.modifiers.set(config.type, modifier);
  return modifier;
}
```

**交付标准**：ModifierManager 可创建和管理所有4种变形器

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

#### Step 30.4：单元测试 [pending]

**分类**：test  
**优先级**：P1

**文件操作**：新建 `tests/gameplay/modifiers/RotateModifier.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RotateModifier, RotateConfig } from '../../../src/gameplay/modifiers/RotateModifier';
import { PhysicsManager } from '../../../src/core/PhysicsManager';

describe('RotateModifier', () => {
  let physics: PhysicsManager;
  let modifier: RotateModifier;

  beforeEach(() => {
    physics = new PhysicsManager();
    physics.createRectangle(200, 600, 400, 50, { isStatic: true, label: 'ground' });
    physics.createRectangle(-25, 300, 50, 600, { isStatic: true, label: 'wall_left' });
    physics.createRectangle(425, 300, 50, 600, { isStatic: true, label: 'wall_right' });
  });

  afterEach(() => {
    modifier?.destroy();
    physics.clearAll();
  });

  it('应正确创建旋转变形器', () => {
    const config: RotateConfig = {
      type: 'rotate',
      enabled: true,
      rotationSpeed: 30,
      maxAngle: 15,
      oscillate: true,
    };

    modifier = new RotateModifier(config, physics, 400, 600);
    expect(modifier.getType()).toBe('rotate');
    expect(modifier.getCurrentAngle()).toBe(0);
  });

  it('摆动模式应在最大角度处反转方向', () => {
    const config: RotateConfig = {
      type: 'rotate',
      enabled: true,
      rotationSpeed: 900,
      maxAngle: 15,
      oscillate: true,
    };

    modifier = new RotateModifier(config, physics, 400, 600);
    modifier.start();

    // 模拟一帧
    (modifier as any).onTick();
    expect(modifier.isActive()).toBe(true);
  });
});
```

**交付标准**：测试覆盖 RotateModifier 核心功能，通过率 100%

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

### 质量验证

```bash
cd /workspace
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
```

### 代码审查与提交

```bash
git fetch origin
git pull origin main
git checkout Vonxuvin/Week5Task
git pull origin Vonxuvin/Week5Task

git status
git add .
git commit -m "feat: 实现旋转容器 RotateModifier 和收缩边界 ShrinkModifier 变形机制"
git push origin Vonxuvin/Week5Task
```

### Day 30 自验证

1. 启动开发服务器：`npm run dev`
2. 打开浏览器访问 `http://localhost:5173`
3. 验证以下行为：
   - [ ] 旋转容器可改变重力方向
   - [ ] 收缩边界可缩小容器宽度
   - [ ] 变形器可独立启动和停止
4. 打开微信开发者工具，导入项目目录 `/workspace`
5. 验证以下行为：
   - [ ] 微信环境下变形系统无报错
6. 检查浏览器控制台和微信开发者工具控制台，确认无错误输出

### Day 30 webapp-testing 自动化验证

1. **调用 webapp-testing 技能**：使用 Skill 工具加载 `webapp-testing`
2. **执行自动化测试**，从以下分类中选择适用项：
   - **基础功能验证**：页面加载、画布渲染、控制台错误检测
   - **UI 交互测试**：按钮响应、触摸热区
   - **性能与稳定性测试**：帧率稳定性、快速操作（旋转/收缩过程中连续投放方块）
   - 保存测试截图，记录验证结果
3. **生成测试报告**：按测试报告模板记录测试覆盖率、通过/失败分析
4. **测试通过判定**：
   - webapp-testing 连接成功 ✓
   - 游戏画布正常渲染 ✓
   - 当天适用的测试分类全部通过 ✓
   - 控制台无 Error 级别错误 ✓
   - 截图已保存 ✓
   - 测试报告已生成 ✓
5. **测试失败处理**：记录失败原因和截图 → 回到对应 Step 修复 → 重新执行测试 → 更新测试报告

### Day 30 交付物汇总

| 交付物 | 路径 | 验收标准 |
|--------|------|----------|
| 旋转容器变形 | src/gameplay/modifiers/RotateModifier.ts | 可旋转容器，重力同步变化，支持摆动 |
| 收缩边界变形 | src/gameplay/modifiers/ShrinkModifier.ts | 可收缩边界，有最小宽度限制 |
| 变形管理器更新 | src/gameplay/modifiers/ModifierManager.ts | 支持4种变形器管理 |
| 单元测试 | tests/gameplay/modifiers/RotateModifier.test.ts | 测试通过率 100% |

---

## Day 31 — 分叉通道变形实现 + 关卡集成

### 基础信息

| 属性        | 内容                        |
| --------- | ------------------------- |
| **任务目标**  | 实现分叉通道变形，将变形系统集成到关卡中 |
| **预计工时**  | 8小时（编码5h + 测试2h + 文档1h） |
| **前置条件**  | Day 30 旋转和收缩变形完成 |
| **技术栈要求** | TypeScript, PixiJS v8.6.3, Matter.js 0.20.0 |

### 详细任务步骤

#### Step 31.1：分叉通道变形实现 [pending]

**分类**：code  
**优先级**：P0

**文件操作**：新建 `src/gameplay/modifiers/ForkModifier.ts`

```typescript
import Matter from 'matter-js';
import { ContainerModifier, ModifierConfig } from './ContainerModifier';
import { PhysicsManager } from '../../core/PhysicsManager';

export interface ForkConfig extends ModifierConfig {
  forkY: number;               // 分叉点Y坐标
  leftAngle: number;           // 左通道角度（度）
  rightAngle: number;          // 右通道角度（度）
  channelWidth: number;        // 通道宽度
}

export class ForkModifier extends ContainerModifier {
  private forkY: number;
  private leftAngle: number;
  private rightAngle: number;
  private channelWidth: number;
  private divider: Matter.Body | null = null;
  private leftWall: Matter.Body | null = null;
  private rightWall: Matter.Body | null = null;
  private containerWidth: number;
  private containerHeight: number;

  constructor(
    config: ForkConfig,
    physics: PhysicsManager,
    containerWidth: number,
    containerHeight: number
  ) {
    super(config, physics);
    this.forkY = config.forkY;
    this.leftAngle = config.leftAngle;
    this.rightAngle = config.rightAngle;
    this.channelWidth = config.channelWidth;
    this.containerWidth = containerWidth;
    this.containerHeight = containerHeight;
  }

  getType(): 'fork' {
    return 'fork';
  }

  protected onActivate(): void {
    this.createForkStructure();
  }

  private createForkStructure(): void {
    const dividerHeight = 20;
    const dividerLength = this.containerHeight - this.forkY;

    // 中央分隔器
    this.divider = this.physics.createRectangle(
      this.containerWidth / 2,
      this.forkY + dividerLength / 2,
      10,
      dividerLength,
      {
        isStatic: true,
        friction: 0.5,
        label: 'fork_divider',
      }
    );

    // 左通道斜墙
    const leftWallLength = dividerLength / Math.cos((this.leftAngle * Math.PI) / 180);
    this.leftWall = this.physics.createRectangle(
      this.channelWidth / 2,
      this.forkY + dividerLength / 2,
      10,
      leftWallLength,
      {
        isStatic: true,
        friction: 0.5,
        label: 'fork_left_wall',
        angle: (this.leftAngle * Math.PI) / 180,
      }
    );

    // 右通道斜墙
    const rightWallLength = dividerLength / Math.cos((this.rightAngle * Math.PI) / 180);
    this.rightWall = this.physics.createRectangle(
      this.containerWidth - this.channelWidth / 2,
      this.forkY + dividerLength / 2,
      10,
      rightWallLength,
      {
        isStatic: true,
        friction: 0.5,
        label: 'fork_right_wall',
        angle: (-this.rightAngle * Math.PI) / 180,
      }
    );
  }

  protected onTick(): void {
    // 分叉通道为静态结构，无需每帧更新
  }

  protected onDeactivate(): void {
    this.removeForkStructure();
  }

  private removeForkStructure(): void {
    if (this.divider) {
      this.physics.removeBody(this.divider);
      this.divider = null;
    }
    if (this.leftWall) {
      this.physics.removeBody(this.leftWall);
      this.leftWall = null;
    }
    if (this.rightWall) {
      this.physics.removeBody(this.rightWall);
      this.rightWall = null;
    }
  }

  destroy(): void {
    super.destroy();
    this.removeForkStructure();
  }
}
```

**交付标准**：ForkModifier 可创建分叉通道，中央分隔器+两侧斜墙物理碰撞正确

---

#### Step 31.2：关卡配置扩展支持变形器 [pending]

**分类**：code  
**优先级**：P0

**文件操作**：修改 `src/gameplay/LevelSystem.ts`

在 `LevelConfig` 接口中添加 `modifiers` 字段，完整接口定义如下：

```typescript
import { ModifierConfig } from './modifiers/ContainerModifier';

export interface LevelConfig {
  id: number;
  name: string;
  objective: {
    type: 'score' | 'target_merge' | 'clear_obstacle' | 'survival';
    target: number;
    timeLimit?: number;
  };
  container: {
    width: number;
    height: number;
    shape: 'rectangle';
  };
  spawn: {
    availableNumbers: number[];
    spawnInterval?: number;
  };
  modifiers?: ModifierConfig[];
  rewards: {
    stars: [number, number, number];
  };
}
```

**交付标准**：LevelConfig 支持 modifiers 字段

---

#### Step 31.3：Game.ts 集成变形系统 [pending]

**分类**：code  
**优先级**：P0

**文件操作**：修改 `src/core/Game.ts`

在 `Game` 类中集成变形系统，修改后的完整相关代码如下：

```typescript
import { ModifierManager } from '../gameplay/modifiers/ModifierManager';

export class Game {
  private app: Application;
  private physics: PhysicsManager;
  private modifierManager: ModifierManager;
  private levelSystem: LevelSystem;
  private isPaused: boolean = false;

  constructor(app: Application, physics: PhysicsManager) {
    this.app = app;
    this.physics = physics;
    this.modifierManager = ModifierManager.getInstance(this.physics);
    this.levelSystem = new LevelSystem();
  }

  loadLevel(config: LevelConfig): void {
    this.levelSystem.loadConfig(config);

    if (config.modifiers && config.modifiers.length > 0) {
      this.modifierManager.setContainerSize(
        this.app.screen.width,
        this.app.screen.height
      );
      this.modifierManager.loadFromLevelConfig(config.modifiers);
      this.modifierManager.startAll();
    }
  }

  handlePause(): void {
    this.isPaused = true;
    this.modifierManager.pauseAll();
  }

  handleResume(): void {
    this.isPaused = false;
    this.modifierManager.resumeAll();
  }

  resetGame(): void {
    this.modifierManager.stopAll();
    this.levelSystem.reset();
  }
}
```

**交付标准**：关卡加载时自动初始化变形器，暂停/恢复同步

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

#### Step 31.4：关卡配置示例 [pending]

**分类**：config  
**优先级**：P1

**文件操作**：新建 `src/data/levels/level_06.json`

```json
{
  "id": 6,
  "name": "移动挡板挑战",
  "objective": {
    "type": "score",
    "target": 3000
  },
  "container": {
    "width": 400,
    "height": 600,
    "shape": "rectangle"
  },
  "spawn": {
    "availableNumbers": [1, 2, 4],
    "spawnInterval": 0
  },
  "modifiers": [
    {
      "type": "paddle",
      "enabled": true,
      "side": "left",
      "extendDuration": 2,
      "retractDuration": 1,
      "extendLength": 80,
      "triggerInterval": 5,
      "yPosition": 360
    }
  ],
  "rewards": {
    "stars": [1000, 2000, 3000]
  }
}
```

**交付标准**：JSON 格式正确，可被 LevelLoader 加载

---

### 质量验证

```bash
cd /workspace
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
```

### 代码审查与提交

```bash
git checkout Vonxuvin/Week5Task

git status
git add .
git commit -m "feat: 实现分叉通道 ForkModifier 变形，集成变形系统到关卡流程"
git push origin Vonxuvin/Week5Task
```

### Day 31 自验证

1. 启动开发服务器：`npm run dev`
2. 打开浏览器访问 `http://localhost:5173`
3. 验证以下行为：
   - [ ] 第6关加载时自动启动移动挡板
   - [ ] 挡板与方块有物理碰撞
   - [ ] 暂停游戏时挡板停止运动
4. 打开微信开发者工具，导入项目目录 `/workspace`
5. 验证以下行为：
   - [ ] 微信环境下变形系统无报错
6. 检查浏览器控制台和微信开发者工具控制台，确认无错误输出

### Day 31 webapp-testing 自动化验证

1. **调用 webapp-testing 技能**：使用 Skill 工具加载 `webapp-testing`
2. **执行自动化测试**，从以下分类中选择适用项：
   - **基础功能验证**：页面加载、画布渲染、控制台错误检测
   - **关卡流程测试**：关卡加载（第6关移动挡板）、关卡进行、关卡过渡
   - **UI 交互测试**：按钮响应、暂停/恢复交互
   - 保存测试截图，记录验证结果
3. **生成测试报告**：按测试报告模板记录测试覆盖率、通过/失败分析
4. **测试通过判定**：
   - webapp-testing 连接成功 ✓
   - 游戏画布正常渲染 ✓
   - 当天适用的测试分类全部通过 ✓
   - 控制台无 Error 级别错误 ✓
   - 截图已保存 ✓
   - 测试报告已生成 ✓
5. **测试失败处理**：记录失败原因和截图 → 回到对应 Step 修复 → 重新执行测试 → 更新测试报告

### Day 31 交付物汇总

| 交付物 | 路径 | 验收标准 |
|--------|------|----------|
| 分叉通道变形 | src/gameplay/modifiers/ForkModifier.ts | 可创建分叉通道，物理碰撞正确 |
| 关卡配置扩展 | src/gameplay/LevelSystem.ts | 支持 modifiers 字段 |
| 游戏集成 | src/core/Game.ts | 变形系统与关卡流程集成 |
| 关卡示例 | src/data/levels/level_06.json | 包含移动挡板配置 |

---

## Day 32 — 关卡配置扩展（10关配置）

### 基础信息

| 属性        | 内容                        |
| --------- | ------------------------- |
| **任务目标**  | 设计并实现10个新关卡配置，覆盖4种变形机制 |
| **预计工时**  | 8小时（设计2h + 配置4h + 测试2h） |
| **前置条件**  | Day 31 变形系统关卡集成完成 |
| **技术栈要求** | JSON, TypeScript |

### 详细任务步骤

#### Step 32.1：关卡难度设计 [pending]

**分类**：docs  
**优先级**：P1

**文件操作**：新建 `docs/Week5/关卡设计文档.md`

```markdown
# Week 5 关卡设计文档

## 关卡列表（6-15关）

| 关卡 | 名称 | 目标类型 | 变形机制 | 难度 |
|------|------|----------|----------|------|
| 6 | 移动挡板挑战 | score | paddle | 中等 |
| 7 | 旋转实验室 | target_merge | rotate | 中等 |
| 8 | 空间收缩 | score | shrink | 困难 |
| 9 | 分叉通道 | clear_obstacle | fork | 中等 |
| 10 | 综合考验1 | score | paddle + rotate | 困难 |
| 11 | 极限合成 | target_merge | shrink | 困难 |
| 12 | 生存挑战 | survival | paddle | 困难 |
| 13 | 旋转收缩 | score | rotate + shrink | 极难 |
| 14 | 通道挡板 | clear_obstacle | fork + paddle | 困难 |
| 15 | 大师挑战 | target_merge | 全部4种 | 极难 |
```

**交付标准**：10个关卡设计完整，难度曲线合理

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

#### Step 32.2：批量创建关卡配置文件 [pending]

**分类**：config  
**优先级**：P0

**文件操作**：新建 `src/data/levels/level_07.json` 到 `level_15.json`

以 level_07.json 为例：

```json
{
  "id": 7,
  "name": "旋转实验室",
  "objective": {
    "type": "target_merge",
    "target": 64
  },
  "container": {
    "width": 400,
    "height": 600,
    "shape": "rectangle"
  },
  "spawn": {
    "availableNumbers": [1, 2, 4, 8],
    "spawnInterval": 0
  },
  "modifiers": [
    {
      "type": "rotate",
      "enabled": true,
      "rotationSpeed": 15,
      "maxAngle": 10,
      "oscillate": true,
      "duration": 60
    }
  ],
  "rewards": {
    "stars": [32, 48, 64]
  }
}
```

**交付标准**：10个关卡 JSON 格式正确，可通过 LevelLoader 验证

---

#### Step 32.3：关卡配置验证脚本 [pending]

**分类**：code  
**优先级**：P1

**文件操作**：新建 `scripts/validate-levels.ts`

```typescript
import { LevelLoader } from '../src/core/LevelLoader';

async function validateAllLevels(): Promise<void> {
  const loader = LevelLoader.getInstance();
  const results: { id: number; valid: boolean; error?: string }[] = [];

  for (let i = 1; i <= 15; i++) {
    try {
      const config = await loader.loadLevel(i);
      results.push({
        id: i,
        valid: config !== null,
        error: config === null ? '加载失败' : undefined,
      });
    } catch (error) {
      results.push({
        id: i,
        valid: false,
        error: String(error),
      });
    }
  }

  console.log('关卡验证结果：');
  console.table(results);

  const invalid = results.filter(r => !r.valid);
  if (invalid.length > 0) {
    console.error(`\n${invalid.length} 个关卡验证失败：`);
    invalid.forEach(r => console.error(`  关卡 ${r.id}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('\n所有关卡验证通过！');
  }
}

validateAllLevels();
```

**交付标准**：脚本可验证所有关卡配置

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

### 质量验证

```bash
cd /workspace
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
```

### 代码审查与提交

```bash
git fetch origin
git pull origin main
git checkout Vonxuvin/Week5Task
git pull origin Vonxuvin/Week5Task

git status
git add .
git commit -m "feat: 添加10个新关卡配置(6-15关)，覆盖4种容器变形机制"
git push origin Vonxuvin/Week5Task
```

### Day 32 自验证

1. 启动开发服务器：`npm run dev`
2. 打开浏览器访问 `http://localhost:5173`
3. 验证以下行为：
   - [ ] 关卡6-15可正常加载
   - [ ] 每种变形机制至少在一个关卡中验证
   - [ ] 关卡目标判定正确
4. 打开微信开发者工具，导入项目目录 `/workspace`
5. 验证以下行为：
   - [ ] 微信环境下关卡加载无报错
6. 检查浏览器控制台和微信开发者工具控制台，确认无错误输出

### Day 32 webapp-testing 自动化验证

1. **调用 webapp-testing 技能**：使用 Skill 工具加载 `webapp-testing`
2. **执行自动化测试**，从以下分类中选择适用项：
   - **基础功能验证**：页面加载、画布渲染、控制台错误检测
   - **关卡流程测试**：依次加载关卡6-15，验证关卡加载/进行/过渡
   - **成功通关测试**：选取3个代表性关卡验证通关判定、星级评定、奖励发放
   - **失败场景测试**：验证方块溢出、时间结束等失败场景
   - 保存测试截图，记录验证结果
3. **生成测试报告**：按测试报告模板记录测试覆盖率、通过/失败分析
4. **测试通过判定**：
   - webapp-testing 连接成功 ✓
   - 游戏画布正常渲染 ✓
   - 当天适用的测试分类全部通过 ✓
   - 控制台无 Error 级别错误 ✓
   - 截图已保存 ✓
   - 测试报告已生成 ✓
5. **测试失败处理**：记录失败原因和截图 → 回到对应 Step 修复 → 重新执行测试 → 更新测试报告

### Day 32 交付物汇总

| 交付物 | 路径 | 验收标准 |
|--------|------|----------|
| 关卡设计文档 | docs/Week5/关卡设计文档.md | 10关设计完整 |
| 关卡配置 | src/data/levels/level_07-15.json | JSON格式正确，可加载 |
| 验证脚本 | scripts/validate-levels.ts | 可验证所有关卡 |

---

## Day 33 — 关卡编辑器工具实现

### 基础信息

| 属性        | 内容                        |
| --------- | ------------------------- |
| **任务目标**  | 实现关卡编辑器工具，支持可视化配置关卡参数 |
| **预计工时**  | 8小时（编码5h + 测试2h + 文档1h） |
| **前置条件**  | Day 32 → Day 33（强依赖），关卡配置扩展完成 |
| **技术栈要求** | TypeScript, HTML, CSS |

### 详细任务步骤

#### Step 33.1：关卡编辑器页面 [pending]

**分类**：code  
**优先级**：P1

**文件操作**：新建 `tools/level-editor/index.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>数字工坊 - 关卡编辑器</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #fff;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { text-align: center; margin-bottom: 20px; color: #4ecdc4; }
    .editor-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .panel {
      background: #16213e;
      border-radius: 8px;
      padding: 20px;
    }
    .panel h2 {
      color: #4ecdc4;
      margin-bottom: 15px;
      font-size: 18px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      color: #a0a0a0;
      font-size: 14px;
    }
    input, select, textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #2d2d44;
      border-radius: 4px;
      background: #0f0f23;
      color: #fff;
      font-size: 14px;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #4ecdc4;
    }
    textarea {
      min-height: 200px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 10px;
      margin-bottom: 10px;
    }
    .btn-primary {
      background: #4ecdc4;
      color: #1a1a2e;
    }
    .btn-secondary {
      background: #2d2d44;
      color: #fff;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .preview {
      background: #0f0f23;
      border-radius: 4px;
      padding: 15px;
      min-height: 300px;
      overflow: auto;
    }
    .modifier-section {
      border: 1px solid #2d2d44;
      border-radius: 4px;
      padding: 10px;
      margin-bottom: 10px;
    }
    .modifier-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>数字工坊 - 关卡编辑器</h1>
    <div class="editor-grid">
      <div class="panel">
        <h2>基础配置</h2>
        <div class="form-group">
          <label>关卡ID</label>
          <input type="number" id="levelId" value="16" min="1">
        </div>
        <div class="form-group">
          <label>关卡名称</label>
          <input type="text" id="levelName" value="新关卡">
        </div>
        <div class="form-group">
          <label>目标类型</label>
          <select id="objectiveType">
            <option value="score">分数挑战</option>
            <option value="target_merge">指定合成</option>
            <option value="clear_obstacle">消除障碍</option>
            <option value="survival">限时生存</option>
          </select>
        </div>
        <div class="form-group">
          <label>目标值</label>
          <input type="number" id="objectiveTarget" value="1000" min="1">
        </div>
        <div class="form-group">
          <label>时间限制（秒，0为不限时）</label>
          <input type="number" id="timeLimit" value="0" min="0">
        </div>
        <div class="form-group">
          <label>容器宽度</label>
          <input type="number" id="containerWidth" value="400" min="100">
        </div>
        <div class="form-group">
          <label>容器高度</label>
          <input type="number" id="containerHeight" value="600" min="100">
        </div>
        <div class="form-group">
          <label>可用数字（逗号分隔）</label>
          <input type="text" id="availableNumbers" value="1,2,4">
        </div>
        <div class="form-group">
          <label>生成间隔（秒，0为手动）</label>
          <input type="number" id="spawnInterval" value="0" min="0">
        </div>

        <h2>星级奖励</h2>
        <div class="form-group">
          <label>1星分数线</label>
          <input type="number" id="star1" value="500">
        </div>
        <div class="form-group">
          <label>2星分数线</label>
          <input type="number" id="star2" value="1000">
        </div>
        <div class="form-group">
          <label>3星分数线</label>
          <input type="number" id="star3" value="2000">
        </div>
      </div>

      <div class="panel">
        <h2>变形器配置</h2>
        <div id="modifiers"></div>
        <button class="btn btn-secondary" onclick="addModifier()">添加变形器</button>

        <h2 style="margin-top: 20px;">JSON 预览</h2>
        <textarea id="jsonPreview" readonly></textarea>
        <div style="margin-top: 10px;">
          <button class="btn btn-primary" onclick="generateJSON()">生成JSON</button>
          <button class="btn btn-secondary" onclick="downloadJSON()">下载文件</button>
          <button class="btn btn-secondary" onclick="validateJSON()">验证配置</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    let modifierCount = 0;

    function addModifier() {
      modifierCount++;
      const container = document.getElementById('modifiers');
      const div = document.createElement('div');
      div.className = 'modifier-section';
      div.id = `modifier-${modifierCount}`;
      div.innerHTML = `
        <div class="modifier-header">
          <select class="modifier-type" onchange="updateModifierFields(${modifierCount})">
            <option value="paddle">移动挡板</option>
            <option value="rotate">旋转容器</option>
            <option value="shrink">收缩边界</option>
            <option value="fork">分叉通道</option>
          </select>
          <button class="btn btn-secondary" onclick="removeModifier(${modifierCount})">删除</button>
        </div>
        <div class="modifier-fields" id="modifier-fields-${modifierCount}"></div>
      `;
      container.appendChild(div);
      updateModifierFields(modifierCount);
    }

    function removeModifier(id) {
      const div = document.getElementById(`modifier-${id}`);
      if (div) div.remove();
    }

    function updateModifierFields(id) {
      const type = document.querySelector(`#modifier-${id} .modifier-type`).value;
      const fields = document.getElementById(`modifier-fields-${id}`);
      let html = '';

      switch (type) {
        case 'paddle':
          html = `
            <div class="form-group"><label>方向</label><select><option value="left">左侧</option><option value="right">右侧</option></select></div>
            <div class="form-group"><label>伸出持续时间（秒）</label><input type="number" value="2" min="0.1"></div>
            <div class="form-group"><label>缩回持续时间（秒）</label><input type="number" value="1" min="0.1"></div>
            <div class="form-group"><label>伸出长度（像素）</label><input type="number" value="80" min="10"></div>
            <div class="form-group"><label>触发间隔（秒）</label><input type="number" value="5" min="1"></div>
            <div class="form-group"><label>Y位置</label><input type="number" value="360"></div>
          `;
          break;
        case 'rotate':
          html = `
            <div class="form-group"><label>旋转速度（度/秒）</label><input type="number" value="15" min="1"></div>
            <div class="form-group"><label>最大角度</label><input type="number" value="10" min="1"></div>
            <div class="form-group"><label>摆动模式</label><select><option value="true">是</option><option value="false">否</option></select></div>
          `;
          break;
        case 'shrink':
          html = `
            <div class="form-group"><label>目标宽度</label><input type="number" value="200" min="50"></div>
            <div class="form-group"><label>收缩速度（像素/秒）</label><input type="number" value="10" min="1"></div>
            <div class="form-group"><label>最小宽度</label><input type="number" value="150" min="50"></div>
          `;
          break;
        case 'fork':
          html = `
            <div class="form-group"><label>分叉点Y坐标</label><input type="number" value="300" min="50"></div>
            <div class="form-group"><label>左通道角度</label><input type="number" value="15" min="0"></div>
            <div class="form-group"><label>右通道角度</label><input type="number" value="15" min="0"></div>
            <div class="form-group"><label>通道宽度</label><input type="number" value="150" min="50"></div>
          `;
          break;
      }
      fields.innerHTML = html;
    }

    function generateJSON() {
      const config = {
        id: parseInt(document.getElementById('levelId').value),
        name: document.getElementById('levelName').value,
        objective: {
          type: document.getElementById('objectiveType').value,
          target: parseInt(document.getElementById('objectiveTarget').value),
          timeLimit: parseInt(document.getElementById('timeLimit').value) || undefined,
        },
        container: {
          width: parseInt(document.getElementById('containerWidth').value),
          height: parseInt(document.getElementById('containerHeight').value),
          shape: 'rectangle',
        },
        spawn: {
          availableNumbers: document.getElementById('availableNumbers').value.split(',').map(Number),
          spawnInterval: parseInt(document.getElementById('spawnInterval').value) || undefined,
        },
        modifiers: [],
        rewards: {
          stars: [
            parseInt(document.getElementById('star1').value),
            parseInt(document.getElementById('star2').value),
            parseInt(document.getElementById('star3').value),
          ],
        },
      };

      document.querySelectorAll('.modifier-section').forEach(section => {
        const type = section.querySelector('.modifier-type').value;
        const inputs = section.querySelectorAll('.modifier-fields input, .modifier-fields select');
        const modifier = { type, enabled: true };

        inputs.forEach(input => {
          const key = input.previousElementSibling?.textContent || '';
          let value = input.value;
          if (input.type === 'number') value = parseFloat(value);
          if (input.value === 'true') value = true;
          if (input.value === 'false') value = false;

          const keyMap = {
            '方向': 'side',
            '伸出持续时间（秒）': 'extendDuration',
            '缩回持续时间（秒）': 'retractDuration',
            '伸出长度（像素）': 'extendLength',
            '触发间隔（秒）': 'triggerInterval',
            'Y位置': 'yPosition',
            '旋转速度（度/秒）': 'rotationSpeed',
            '最大角度': 'maxAngle',
            '摆动模式': 'oscillate',
            '目标宽度': 'targetWidth',
            '收缩速度（像素/秒）': 'shrinkSpeed',
            '最小宽度': 'minWidth',
            '分叉点Y坐标': 'forkY',
            '左通道角度': 'leftAngle',
            '右通道角度': 'rightAngle',
            '通道宽度': 'channelWidth',
          };

          const mappedKey = keyMap[key];
          if (mappedKey) {
            modifier[mappedKey] = value;
          }
        });

        config.modifiers.push(modifier);
      });

      document.getElementById('jsonPreview').value = JSON.stringify(config, null, 2);
    }

    function downloadJSON() {
      const json = document.getElementById('jsonPreview').value;
      if (!json) {
        alert('请先生成JSON');
        return;
      }
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `level_${String(document.getElementById('levelId').value).padStart(2, '0')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function validateJSON() {
      const json = document.getElementById('jsonPreview').value;
      if (!json) {
        alert('请先生成JSON');
        return;
      }
      try {
        const config = JSON.parse(json);
        const required = ['id', 'name', 'objective', 'container', 'spawn'];
        const missing = required.filter(key => !(key in config));
        if (missing.length > 0) {
          alert(`缺少必填字段: ${missing.join(', ')}`);
          return;
        }
        alert('验证通过！');
      } catch (e) {
        alert(`JSON格式错误: ${e.message}`);
      }
    }

    // 初始化
    addModifier();
    generateJSON();
  </script>
</body>
</html>
```

**交付标准**：关卡编辑器可配置基础参数、变形器，生成有效JSON

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

### 质量验证

```bash
cd /workspace
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
```

### 代码审查与提交

```bash
git checkout Vonxuvin/Week5Task

git status
git add .
git commit -m "feat: 实现关卡编辑器工具，支持可视化配置关卡参数和变形器"
git push origin Vonxuvin/Week5Task
```

### Day 33 自验证

1. 启动开发服务器：`npm run dev`
2. 打开浏览器访问 `http://localhost:5173`
3. 验证以下行为：
   - [ ] 关卡编辑器页面可正常打开
   - [ ] 可配置基础关卡参数
   - [ ] 可添加和配置变形器
   - [ ] 生成的JSON格式正确
4. 打开微信开发者工具，导入项目目录 `/workspace`
5. 验证以下行为：
   - [ ] 微信环境下编辑器无报错
6. 检查浏览器控制台和微信开发者工具控制台，确认无错误输出

### Day 33 webapp-testing 自动化验证

1. **调用 webapp-testing 技能**：使用 Skill 工具加载 `webapp-testing`
2. **执行自动化测试**，从以下分类中选择适用项：
   - **基础功能验证**：页面加载、画布渲染、控制台错误检测
   - **UI 交互测试**：关卡编辑器页面按钮响应、表单输入、JSON生成/下载/验证功能
   - 保存测试截图，记录验证结果
3. **生成测试报告**：按测试报告模板记录测试覆盖率、通过/失败分析
4. **测试通过判定**：
   - webapp-testing 连接成功 ✓
   - 关卡编辑器页面正常渲染 ✓
   - 当天适用的测试分类全部通过 ✓
   - 控制台无 Error 级别错误 ✓
   - 截图已保存 ✓
   - 测试报告已生成 ✓
5. **测试失败处理**：记录失败原因和截图 → 回到对应 Step 修复 → 重新执行测试 → 更新测试报告

### Day 33 交付物汇总

| 交付物 | 路径 | 验收标准 |
|--------|------|----------|
| 关卡编辑器 | tools/level-editor/index.html | 可配置关卡参数和变形器 |

---

## Day 34 — 存档系统与数据持久化

### 基础信息

| 属性        | 内容                        |
| --------- | ------------------------- |
| **任务目标**  | 实现存档系统和数据持久化，支持本地存储和微信云存档 |
| **预计工时**  | 8小时（编码5h + 测试2h + 文档1h） |
| **前置条件**  | Day 33 关卡编辑器完成 |
| **技术栈要求** | TypeScript, 微信小游戏 API |

### 详细任务步骤

#### Step 34.1：存档数据模型定义 [pending]

**分类**：code  
**优先级**：P0

**文件操作**：新建 `src/core/SaveManager.ts`

```typescript
import { eventBus } from '../utils/EventBus';

export interface LevelProgress {
  levelId: number;
  unlocked: boolean;
  stars: number;
  highScore: number;
  bestTime: number;
  attempts: number;
  completed: boolean;
}

export interface PlayerData {
  totalScore: number;
  totalStars: number;
  coins: number;
  diamonds: number;
  currentLevel: number;
  levelProgress: Record<number, LevelProgress>;
  unlockedSkins: string[];
  unlockedTalents: string[];
  achievements: Record<string, boolean>;
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    vibrationEnabled: boolean;
  };
  playStatistics: {
    totalGames: number;
    totalPlayTime: number;
    highestMerge: number;
    longestCombo: number;
  };
  lastSaveTime: number;
}

export class SaveManager {
  private static instance: SaveManager;
  private data: PlayerData;
  private readonly STORAGE_KEY = 'digital_workshop_save';
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private isDirty: boolean = false;

  private constructor() {
    this.data = this.getDefaultData();
    this.load();
  }

  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  private getDefaultData(): PlayerData {
    return {
      totalScore: 0,
      totalStars: 0,
      coins: 0,
      diamonds: 0,
      currentLevel: 1,
      levelProgress: {
        1: {
          levelId: 1,
          unlocked: true,
          stars: 0,
          highScore: 0,
          bestTime: 0,
          attempts: 0,
          completed: false,
        },
      },
      unlockedSkins: ['default'],
      unlockedTalents: [],
      achievements: {},
      settings: {
        soundEnabled: true,
        musicEnabled: true,
        vibrationEnabled: true,
      },
      playStatistics: {
        totalGames: 0,
        totalPlayTime: 0,
        highestMerge: 0,
        longestCombo: 0,
      },
      lastSaveTime: Date.now(),
    };
  }

  load(): boolean {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.data = { ...this.getDefaultData(), ...parsed };
        return true;
      }
    } catch (error) {
      console.error('[SaveManager] 加载存档失败:', error);
    }
    return false;
  }

  save(): boolean {
    try {
      this.data.lastSaveTime = Date.now();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      this.isDirty = false;
      eventBus.emit('save:completed');
      return true;
    } catch (error) {
      console.error('[SaveManager] 保存存档失败:', error);
      return false;
    }
  }

  autoSave(intervalMs: number = 30000): void {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      if (this.isDirty) {
        this.save();
      }
    }, intervalMs);
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // 关卡进度
  updateLevelProgress(levelId: number, updates: Partial<LevelProgress>): void {
    if (!this.data.levelProgress[levelId]) {
      this.data.levelProgress[levelId] = {
        levelId,
        unlocked: false,
        stars: 0,
        highScore: 0,
        bestTime: 0,
        attempts: 0,
        completed: false,
      };
    }

    const progress = this.data.levelProgress[levelId];
    Object.assign(progress, updates);

    // 自动解锁下一关
    if (updates.completed && !this.data.levelProgress[levelId + 1]) {
      this.data.levelProgress[levelId + 1] = {
        levelId: levelId + 1,
        unlocked: true,
        stars: 0,
        highScore: 0,
        bestTime: 0,
        attempts: 0,
        completed: false,
      };
    }

    this.recalculateTotals();
    this.isDirty = true;
  }

  getLevelProgress(levelId: number): LevelProgress | null {
    return this.data.levelProgress[levelId] || null;
  }

  isLevelUnlocked(levelId: number): boolean {
    const progress = this.data.levelProgress[levelId];
    return progress?.unlocked ?? false;
  }

  // 货币
  addCoins(amount: number): void {
    this.data.coins = Math.max(0, this.data.coins + amount);
    this.isDirty = true;
  }

  addDiamonds(amount: number): void {
    this.data.diamonds = Math.max(0, this.data.diamonds + amount);
    this.isDirty = true;
  }

  getCoins(): number {
    return this.data.coins;
  }

  getDiamonds(): number {
    return this.data.diamonds;
  }

  // 统计
  updatePlayStatistics(updates: Partial<PlayerData['playStatistics']>): void {
    Object.assign(this.data.playStatistics, updates);
    this.isDirty = true;
  }

  // 设置
  updateSettings(updates: Partial<PlayerData['settings']>): void {
    Object.assign(this.data.settings, updates);
    this.isDirty = true;
  }

  getSettings(): PlayerData['settings'] {
    return { ...this.data.settings };
  }

  // 成就
  unlockAchievement(achievementId: string): boolean {
    if (this.data.achievements[achievementId]) return false;
    this.data.achievements[achievementId] = true;
    this.isDirty = true;
    eventBus.emit('achievement:unlocked', { achievementId });
    return true;
  }

  hasAchievement(achievementId: string): boolean {
    return this.data.achievements[achievementId] ?? false;
  }

  // 皮肤
  unlockSkin(skinId: string): boolean {
    if (this.data.unlockedSkins.includes(skinId)) return false;
    this.data.unlockedSkins.push(skinId);
    this.isDirty = true;
    return true;
  }

  hasSkin(skinId: string): boolean {
    return this.data.unlockedSkins.includes(skinId);
  }

  private recalculateTotals(): void {
    let totalStars = 0;
    let totalScore = 0;

    Object.values(this.data.levelProgress).forEach(progress => {
      totalStars += progress.stars;
      totalScore += progress.highScore;
    });

    this.data.totalStars = totalStars;
    this.data.totalScore = totalScore;
  }

  getData(): PlayerData {
    return { ...this.data };
  }

  resetAll(): void {
    this.data = this.getDefaultData();
    this.save();
  }

  exportSave(): string {
    return JSON.stringify(this.data);
  }

  importSave(json: string): boolean {
    try {
      const data = JSON.parse(json);
      this.data = { ...this.getDefaultData(), ...data };
      this.save();
      return true;
    } catch (error) {
      console.error('[SaveManager] 导入存档失败:', error);
      return false;
    }
  }

  destroy(): void {
    this.stopAutoSave();
    if (this.isDirty) {
      this.save();
    }
  }
}
```

**交付标准**：SaveManager 单例可用，支持自动保存、关卡进度、货币、成就

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

#### Step 34.2：存档系统集成到游戏 [pending]

**分类**：code  
**优先级**：P0

**文件操作**：修改 `src/core/Game.ts`

在 `Game` 类中集成存档系统，修改后的完整相关代码如下：

```typescript
import { SaveManager } from './SaveManager';

export class Game {
  private app: Application;
  private physics: PhysicsManager;
  private modifierManager: ModifierManager;
  private saveManager: SaveManager;
  private levelSystem: LevelSystem;

  constructor(app: Application, physics: PhysicsManager) {
    this.app = app;
    this.physics = physics;
    this.modifierManager = ModifierManager.getInstance(this.physics);
    this.saveManager = SaveManager.getInstance();
    this.saveManager.autoSave();
    this.levelSystem = new LevelSystem();
  }

  handleLevelCompleted(data: { levelId: number; score: number }): void {
    const levelId = data.levelId;
    const stars = this.calculateStars(data.score, levelId);
    this.saveManager.updateLevelProgress(levelId, {
      completed: true,
      stars: Math.max(
        this.saveManager.getLevelProgress(levelId)?.stars ?? 0,
        stars
      ),
      highScore: Math.max(
        this.saveManager.getLevelProgress(levelId)?.highScore ?? 0,
        data.score
      ),
      attempts:
        (this.saveManager.getLevelProgress(levelId)?.attempts ?? 0) + 1,
    });
    this.saveManager.save();
  }

  handleGameOver(): void {
    const levelId = this.levelSystem?.getConfig().id;
    if (levelId) {
      this.saveManager.updateLevelProgress(levelId, {
        attempts:
          (this.saveManager.getLevelProgress(levelId)?.attempts ?? 0) + 1,
      });
    }
  }

  private calculateStars(score: number, levelId: number): number {
    const config = this.levelSystem.getConfig();
    const stars = config.rewards.stars;
    if (score >= stars[2]) return 3;
    if (score >= stars[1]) return 2;
    if (score >= stars[0]) return 1;
    return 0;
  }
}
```

**交付标准**：游戏自动保存关卡进度，通关后解锁下一关

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

#### Step 34.3：单元测试 [pending]

**分类**：test  
**优先级**：P1

**文件操作**：新建 `tests/core/SaveManager.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SaveManager } from '../../src/core/SaveManager';

describe('SaveManager', () => {
  let saveManager: SaveManager;

  beforeEach(() => {
    SaveManager.resetInstance?.();
    saveManager = SaveManager.getInstance();
    saveManager.resetAll();
  });

  afterEach(() => {
    saveManager.destroy();
  });

  it('应正确初始化默认数据', () => {
    const data = saveManager.getData();
    expect(data.currentLevel).toBe(1);
    expect(data.coins).toBe(0);
    expect(data.levelProgress[1].unlocked).toBe(true);
  });

  it('应正确更新关卡进度', () => {
    saveManager.updateLevelProgress(1, { completed: true, stars: 3, highScore: 1000 });
    const progress = saveManager.getLevelProgress(1);
    expect(progress?.completed).toBe(true);
    expect(progress?.stars).toBe(3);
    expect(progress?.highScore).toBe(1000);
  });

  it('通关后应自动解锁下一关', () => {
    saveManager.updateLevelProgress(1, { completed: true });
    expect(saveManager.isLevelUnlocked(2)).toBe(true);
  });

  it('应正确管理货币', () => {
    saveManager.addCoins(100);
    expect(saveManager.getCoins()).toBe(100);
    saveManager.addCoins(-50);
    expect(saveManager.getCoins()).toBe(50);
  });

  it('应正确解锁成就', () => {
    const result = saveManager.unlockAchievement('first_win');
    expect(result).toBe(true);
    expect(saveManager.hasAchievement('first_win')).toBe(true);

    const result2 = saveManager.unlockAchievement('first_win');
    expect(result2).toBe(false);
  });
});
```

**交付标准**：测试覆盖 SaveManager 核心功能，通过率 100%

---

### 质量验证

```bash
cd /workspace
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
```

### 代码审查与提交

```bash
git checkout Vonxuvin/Week5Task

git status
git add .
git commit -m "feat: 实现存档系统 SaveManager，支持关卡进度、货币、成就持久化"
git push origin Vonxuvin/Week5Task
```

### Day 34 自验证

1. 启动开发服务器：`npm run dev`
2. 打开浏览器访问 `http://localhost:5173`
3. 验证以下行为：
   - [ ] 通关后关卡进度保存
   - [ ] 通关后下一关解锁
   - [ ] 刷新页面后进度保留
4. 打开微信开发者工具，导入项目目录 `/workspace`
5. 验证以下行为：
   - [ ] 微信环境下存档系统无报错
6. 检查浏览器控制台和微信开发者工具控制台，确认无错误输出

### Day 34 webapp-testing 自动化验证

1. **调用 webapp-testing 技能**：使用 Skill 工具加载 `webapp-testing`
2. **执行自动化测试**，从以下分类中选择适用项：
   - **基础功能验证**：页面加载、画布渲染、控制台错误检测
   - **数据持久化测试**：自动存档（通关后刷新页面验证进度保留）、手动存档、存档损坏恢复
   - **成功通关测试**：通关判定、进度保存、下一关解锁
   - 保存测试截图，记录验证结果
3. **生成测试报告**：按测试报告模板记录测试覆盖率、通过/失败分析
4. **测试通过判定**：
   - webapp-testing 连接成功 ✓
   - 游戏画布正常渲染 ✓
   - 当天适用的测试分类全部通过 ✓
   - 控制台无 Error 级别错误 ✓
   - 截图已保存 ✓
   - 测试报告已生成 ✓
5. **测试失败处理**：记录失败原因和截图 → 回到对应 Step 修复 → 重新执行测试 → 更新测试报告

### Day 34 交付物汇总

| 交付物 | 路径 | 验收标准 |
|--------|------|----------|
| 存档管理器 | src/core/SaveManager.ts | 单例可用，支持自动保存 |
| 游戏集成 | src/core/Game.ts | 自动保存关卡进度 |
| 单元测试 | tests/core/SaveManager.test.ts | 测试通过率 100% |

---

## Day 35 — 阶段评审与文档归档

### 基础信息

| 属性        | 内容                        |
| --------- | ------------------------- |
| **任务目标**  | 完成 Week 5 阶段评审，修复遗留问题，归档文档 |
| **预计工时**  | 8小时（评审3h + 修复3h + 归档2h） |
| **前置条件**  | Day 29 → Day 30 → Day 31 → Day 32 → Day 33 → Day 34 → Day 35（强依赖） |
| **技术栈要求** | - |

### 详细任务步骤

#### Step 35.1：遗留问题处理 [pending]

**分类**：bugfix  
**优先级**：P0

根据 Week4 评审报告，处理遗留问题：

| 序号 | 问题 | 处理方式 |
|------|------|----------|
| 1 | MergeSystem 覆盖率偏低 | 补充单元测试 |
| 2 | 缩小射线道具未实现 | 延后至 Week6 |
| 3 | 幸运投放道具未实现 | 延后至 Week6 |
| 4 | 音效资源文件缺失 | 延后至 Week6 |

**交付标准**：P0/P1 遗留问题已处理或明确延后计划

---

#### Step 35.2：最终质量验证 [pending]

**分类**：review  
**优先级**：P0

```bash
cd /workspace
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
```

**交付标准**：所有质量验证通过，覆盖率 ≥ 80%

---

#### Step 35.3：生成评审报告 [pending]

**分类**：docs  
**优先级**：P0

**文件操作**：新建 `docs/Week5/Week5_ReviewReport.md`

```markdown
# Week 5 阶段评审报告

## 评审日期
2026-05-17

## 阶段目标回顾
实现动态容器变形系统、关卡编辑器与配置系统、存档与数据持久化系统，达到Alpha版本可玩标准

## 完成情况

### 已完成
- [x] Day 29 容器变形系统框架 + 移动挡板实现
- [x] Day 30 旋转容器与收缩边界变形实现
- [x] Day 31 分叉通道变形 + 关卡集成
- [x] Day 32 关卡配置扩展（10关）
- [x] Day 33 关卡编辑器工具实现
- [x] Day 34 存档系统与数据持久化
- [x] Day 35 阶段评审与文档归档

### 未完成
- [ ] 缩小射线道具（ShrinkProp）- 延至 Week6
- [ ] 幸运投放道具（LuckyProp）- 延至 Week6
- [ ] 音效资源文件（*.mp3）- 延至 Week6

## 交付物清单

| 交付物 | 路径 | 状态 |
|--------|------|------|
| 容器变形系统框架 | src/gameplay/modifiers/ContainerModifier.ts | ✅ |
| 移动挡板变形 | src/gameplay/modifiers/PaddleModifier.ts | ✅ |
| 旋转容器变形 | src/gameplay/modifiers/RotateModifier.ts | ✅ |
| 收缩边界变形 | src/gameplay/modifiers/ShrinkModifier.ts | ✅ |
| 分叉通道变形 | src/gameplay/modifiers/ForkModifier.ts | ✅ |
| 变形管理器 | src/gameplay/modifiers/ModifierManager.ts | ✅ |
| 关卡配置扩展 | src/data/levels/level_06-15.json | ✅ |
| 关卡编辑器 | tools/level-editor/index.html | ✅ |
| 存档系统 | src/core/SaveManager.ts | ✅ |
| 评审报告 | docs/Week5/Week5_ReviewReport.md | ✅ |

## 遗留问题

| 问题 | 严重程度 | 影响范围 | 建议处理方式 |
|------|----------|----------|--------------|
| 缩小射线、幸运投放道具未实现 | P2 | 道具系统不完整 | Week6 实现 |
| 音效资源文件缺失 | P2 | 音效体验 | Week6 添加 |

## 技术规范变更

| 变更项 | 变更前 | 变更后 | 原因 |
|--------|--------|--------|------|
| LevelConfig | 无 modifiers 字段 | 支持 modifiers 数组 | 支持容器变形 |

## 下周建议

- 实现剩余道具（缩小射线、幸运投放）
- 添加音效资源文件
- 开始 Week6 成长系统开发（天赋、成就、皮肤）

## 评审结论

**评审状态**：通过

**评审意见**：
Week 5 阶段任务已按计划完成，动态容器变形系统、关卡配置系统、存档系统三大模块均已实现并通过测试。代码质量良好，构建产物符合要求。

**评审签字**：Vonxuvin Agent
```

**交付标准**：评审报告包含所有必需字段

**执行日志**：
- <时间戳>：开始执行
- <时间戳>：<关键操作及结果>
- <时间戳>：完成 / 阻塞原因

---

### 质量验证

```bash
cd /workspace
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
```

### 代码审查与提交

```bash
git fetch origin
git pull origin main
git checkout Vonxuvin/Week5Task
git pull origin Vonxuvin/Week5Task

git status
git add .
git commit -m "docs: 完成 Week5 阶段评审报告，归档所有文档"
git push origin Vonxuvin/Week5Task
```

### Day 35 自验证

1. 启动开发服务器：`npm run dev`
2. 打开浏览器访问 `http://localhost:5173`
3. 验证以下行为：
   - [ ] 所有功能正常运行
   - [ ] 存档系统工作正常
4. 打开微信开发者工具，导入项目目录 `/workspace`
5. 验证以下行为：
   - [ ] 微信环境下无错误
6. 检查浏览器控制台和微信开发者工具控制台，确认无错误输出

### Day 35 webapp-testing 自动化验证

1. **调用 webapp-testing 技能**：使用 Skill 工具加载 `webapp-testing`
2. **执行自动化测试**，从以下分类中选择适用项：
   - **基础功能验证**：页面加载、画布渲染、控制台错误检测
   - **关卡流程测试**：全关卡（1-15）回归验证
   - **数据持久化测试**：存档完整性验证
   - **性能与稳定性测试**：长时间运行、内存泄漏检测
   - 保存测试截图，记录验证结果
3. **生成测试报告**：按测试报告模板记录测试覆盖率、通过/失败分析
4. **测试通过判定**：
   - webapp-testing 连接成功 ✓
   - 游戏画布正常渲染 ✓
   - 当天适用的测试分类全部通过 ✓
   - 控制台无 Error 级别错误 ✓
   - 截图已保存 ✓
   - 测试报告已生成 ✓
5. **测试失败处理**：记录失败原因和截图 → 回到对应 Step 修复 → 重新执行测试 → 更新测试报告

### Day 35 交付物汇总

| 交付物 | 路径 | 验收标准 |
|--------|------|----------|
| 评审报告 | docs/Week5/Week5_ReviewReport.md | 包含所有必需字段 |
| 文档归档 | docs/Week5/ | 所有文档已归档 |

---

## 任务依赖关系图

```
Day 29 (变形框架)
    │
    ├───→ Day 30 (旋转/收缩) ───→ Day 31 (分叉/集成)
    │          │                           │
    │          └───────────────────────────┘
    │                      │
    │                      ▼
    │              Day 32 (关卡配置)
    │                      │
    │                      ▼
    │              Day 33 (关卡编辑器)
    │                      │
    │                      ▼
    │              Day 34 (存档系统)
    │                      │
    │                      ▼
    │              Day 35 (评审归档)
    │                      │
    │                      ▼
    │              Week 5 交付
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

---

## 风险与应对

| 风险 | 影响 | 应对策略 |
|------|------|----------|
| 变形器物理性能影响 | 帧率下降 | 限制同时激活的变形器数量，优化物理计算 |
| 关卡配置复杂度增加 | 配置错误 | 提供验证脚本和编辑器工具 |
| 存档数据兼容性 | 版本升级后数据丢失 | 设计版本号机制，支持数据迁移 |

---

## Week 5 交付物汇总

| 交付物 | 路径 | 验收标准 |
|--------|------|----------|
| 动态容器变形系统 | src/gameplay/modifiers/ | 4种变形机制可用 |
| 关卡配置（15关） | src/data/levels/ | 15个关卡可加载 |
| 关卡编辑器 | tools/level-editor/ | 可视化配置工具 |
| 存档系统 | src/core/SaveManager.ts | 进度持久化 |
| 评审报告 | docs/Week5/Week5_ReviewReport.md | 完整评审报告 |

---

## 常见失败场景恢复步骤

| 失败场景 | Agent 自主处理步骤 |
|----------|-------------------|
| `npm install` 失败 | 1. 检查网络连接 2. 清除缓存 `npm cache clean --force` 3. 删除 `node_modules` 和 `package-lock.json` 后重试 4. 仍失败则标记 blocked |
| TypeScript 编译错误 | 1. 读取错误信息定位文件和行号 2. 修复类型错误 3. 重新运行 `npm run typecheck` 4. 重复直到零错误 |
| 单元测试失败 | 1. 读取失败测试的详细信息 2. 分析是测试代码问题还是业务代码问题 3. 修复后重新运行 `npm run test` 4. 全部通过后继续 |
| Lint 错误 | 1. 运行 `npm run lint -- --fix` 尝试自动修复 2. 无法自动修复的手动修改 3. 重新运行 `npm run lint` 确认零错误 |
| 端口被占用 | 1. 查找占用进程 `npx kill-port 5173` 2. 或更换端口号 3. 重新启动开发服务器 |
| 文件已存在（创建冲突） | 1. 读取已存在的文件内容 2. 对比任务清单要求的完整内容 3. 如有差异则覆盖更新，如一致则跳过 |
| webapp-testing 测试失败 | 1. 记录失败原因和截图 2. 回到对应 Step 修复问题 3. 重新执行 webapp-testing 测试 4. 更新测试报告 5. 直至全部测试通过方可继续 |
| Git 冲突 | 1. 分析冲突内容 2. 与本周任务相关的冲突保留自己的修改 3. 与本周任务无关的冲突优先保留远程版本 4. 冲突解决后重新提交推送 |

---

## webapp-testing 测试报告模板

每个 Day 完成 webapp-testing 自动化验证后，按以下模板生成测试报告：

```markdown
# Week5 Day N webapp-testing 测试报告

## 基本信息

| 项目 | 内容 |
|------|------|
| 测试日期 | YYYY-MM-DD |
| 测试 Day | Day N |
| 测试环境 | Chrome / Edge |
| 测试 URL | http://localhost:5173 |
| 测试执行人 | Agent |

## 测试覆盖率

| 测试分类 | 计划测试项 | 实际执行项 | 覆盖率 |
|----------|-----------|-----------|--------|
| 基础功能验证 | | | |
| 关卡流程测试 | | | |
| 道具使用测试 | | | |
| 成功通关测试 | | | |
| 失败场景测试 | | | |
| UI 交互测试 | | | |
| 性能与稳定性测试 | | | |
| **合计** | | | |

## 测试结果汇总

| 指标 | 数值 |
|------|------|
| 总测试项 | |
| 通过 | |
| 失败 | |
| 跳过 | |
| 通过率 | % |

## 详细测试结果

### 基础功能验证

| 测试项 | 测试步骤 | 预期结果 | 实际结果 | 状态 | 截图 |
|--------|----------|----------|----------|------|------|
| 页面加载 | 打开游戏页面 | 页面正常加载 | | ✅/❌ | |
| 画布渲染 | 检查 canvas 状态 | 画布正确渲染 | | ✅/❌ | |
| 控制台错误 | 监听控制台 | 无 Error 错误 | | ✅/❌ | |

### 关卡流程测试

| 测试项 | 测试步骤 | 预期结果 | 实际结果 | 状态 | 截图 |
|--------|----------|----------|----------|------|------|
| | | | | | |

### 道具使用测试

| 测试项 | 测试步骤 | 预期结果 | 实际结果 | 状态 | 截图 |
|--------|----------|----------|----------|------|------|
| | | | | | |

### 成功通关测试

| 测试项 | 测试步骤 | 预期结果 | 实际结果 | 状态 | 截图 |
|--------|----------|----------|----------|------|------|
| | | | | | |

### 失败场景测试

| 测试项 | 测试步骤 | 预期结果 | 实际结果 | 状态 | 截图 |
|--------|----------|----------|----------|------|------|
| | | | | | |

## 失败项分析

| 失败项 | 失败原因 | 影响范围 | 修复建议 | 关联 Step |
|--------|----------|----------|----------|-----------|
| | | | | |

## 控制台日志

```
（粘贴关键控制台输出）
```

## 测试结论

- [ ] 所有测试分类通过，可进入下一 Day
- [ ] 存在非阻塞问题，记录后继续
- [ ] 存在阻塞问题，需修复后重新测试

## 测试截图

| 截图编号 | 描述 | 文件路径 |
|----------|------|----------|
| 1 | | |
| 2 | | |
```

---

## 复核确认清单

### 结构完整性

- [ ] 是否包含头部元信息（阶段目标、时间范围、交付物、技术栈）
- [ ] 是否提供任务总览图（天数与实际工作日一致）
- [ ] 每一天是否有明确的任务目标、预计工时、前置条件
- [ ] 每个步骤是否有可量化的交付标准（SMART 原则）
- [ ] 代码示例是否完整可运行
- [ ] 是否包含单元测试任务（Day 29/30/31/32/33/34 均已覆盖）
- [ ] 是否包含代码审查自查清单
- [ ] 每周最后一天是否包含阶段评审和文档归档任务
- [ ] 编写前是否已阅览上周交付清单和评审报告

### 任务编排

- [ ] 每个 Step 是否标注了分类（code/test/docs/research/review/config/perf/bugfix）
- [ ] 每个任务是否标注了优先级（P0/P1/P2）
- [ ] P0 任务是否不超过 40%，是否安排在周初（Day 1-3）
- [ ] 每日总工时是否在 4-8h 范围内
- [ ] 任务依赖关系是否正确标注（强依赖 `→` / 弱依赖 `⇢` / 并行 `∥`）
- [ ] Day 目标是否可追溯到 Week 目标

### 质量保障

- [ ] Git 提交信息是否符合规范（类型: 详细描述，50-100字符，禁止模糊描述）
- [ ] 分支命名是否符合规范（`Vonxuvin/Week<N>Task`）
- [ ] 是否与游戏策划方案中的设计保持一致
- [ ] 周与周之间是否有明确的前置条件衔接

### 自动化测试

- [ ] 每个 Day 是否包含 webapp-testing 自动化验证步骤
- [ ] 测试分类是否覆盖：基础功能验证、关卡流程测试、道具使用测试、成功通关测试、失败场景测试
- [ ] 是否包含测试报告模板
- [ ] 是否定义了测试通过判定标准
- [ ] 是否定义了测试失败处理流程

### 执行保障

- [ ] 每个 Step 是否包含执行日志区域
- [ ] 是否包含常见失败场景恢复步骤
- [ ] Git 工作流是否包含 fetch/pull 同步步骤
- [ ] 是否使用完整 5 种状态标记（pending/in_progress/completed/blocked/cancelled）
- [ ] 自验证可执行性检查
- [ ] Agent 执行开始
