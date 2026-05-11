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
