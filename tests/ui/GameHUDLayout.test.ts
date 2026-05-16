import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameHUD } from '../../src/ui/hud/GameHUD';
import { PropSystem } from '../../src/gameplay/props/PropSystem';

class MockPropSystem {
  getPropCount(_type: any): number { return 3; }
  pause(): void {}
  resume(): void {}
  reset(): void {}
  setPhysicsManager(_physics: any): void {}
  getProp(_type: any): any { return null; }
  useProp(_type: any, _target?: any): boolean { return true; }
  getAllProps(): any[] { return []; }
}

describe('FIX-12: GameHUD responsive layout', () => {
  let hud: GameHUD;
  let propSystem: MockPropSystem;

  beforeEach(() => {
    propSystem = new MockPropSystem();
    hud = new GameHUD(propSystem as any);
  });

  afterEach(() => {
    hud.destroy();
  });

  it('should create HUD with props container', () => {
    expect(hud).toBeDefined();
    expect(hud.propsContainer).toBeDefined();
  });

  it('should layout props bar within screen bounds on large screen', () => {
    hud.layout(800, 600);
    expect(hud.propsContainerX).toBeGreaterThanOrEqual(0);
  });

  it('should layout props bar within screen bounds on medium screen', () => {
    hud.layout(500, 600);
    expect(hud.propsContainerX).toBeGreaterThanOrEqual(0);
  });

  it('should layout props bar within screen bounds on small screen (375px)', () => {
    hud.layout(375, 667);
    expect(hud.propsContainerX).toBeGreaterThanOrEqual(0);
  });

  it('should use full button size (60) on large screen', () => {
    hud.layout(800, 600);
    expect(hud.currentButtonSize).toBe(60);
  });

  it('should scale down button size on small screen', () => {
    hud.layout(375, 667);
    expect(hud.currentButtonSize).toBeLessThan(60);
  });

  it('should handle very small screen (320px)', () => {
    hud.layout(320, 480);
    expect(hud.propsContainerX).toBeGreaterThanOrEqual(0);
    expect(hud.currentButtonSize).toBeLessThan(60);
  });

  it('should reset HUD', () => {
    hud.reset();
  });

  it('should handle layout changes dynamically', () => {
    hud.layout(800, 600);
    const largeSize = hud.currentButtonSize;
    hud.layout(375, 667);
    const smallSize = hud.currentButtonSize;
    expect(smallSize).toBeLessThanOrEqual(largeSize);
  });

  it('should have prop buttons after creation', () => {
    expect(hud.propButtons.size).toBe(5);
  });

  it('should have objective bar', () => {
    expect(hud.objectiveBar).toBeDefined();
  });
});
