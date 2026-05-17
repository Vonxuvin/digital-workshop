import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlockPreview } from '../../src/gameplay/BlockPreview';
import { Container } from 'pixi.js';

function createMockPhysicsManager() {
  const bodies: any[] = [];
  return {
    createCircle: vi.fn((x: number, y: number, r: number, opts?: any) => {
      const body = {
        position: { x, y },
        velocity: { x: 0, y: 0 },
        angle: 0,
        isStatic: opts?.isStatic ?? false,
        isSleeping: false,
        circleRadius: r,
        label: `body_${bodies.length}`,
        id: bodies.length,
      };
      bodies.push(body);
      return body;
    }),
    createRectangle: vi.fn((x: number, y: number, w: number, h: number) => {
      const body = {
        position: { x, y },
        velocity: { x: 0, y: 0 },
        angle: 0,
        isStatic: true,
        isSleeping: false,
        label: `wall_${bodies.length}`,
        id: bodies.length,
      };
      bodies.push(body);
      return body;
    }),
    removeBody: vi.fn(),
    getAllBodies: vi.fn(() => bodies),
    fixedUpdate: vi.fn((acc: number) => 0),
    start: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
  };
}

describe('NextPreview Fix Integration - BlockPreview + GameScene lifecycle', () => {
  let preview: BlockPreview;
  let parentContainer: Container;

  beforeEach(() => {
    parentContainer = new Container();
    preview = new BlockPreview();
    parentContainer.addChild(preview);
  });

  it('should position nextPreview correctly after block drop flow', () => {
    preview.setBounds(200, 600);
    preview.setGroundY(500);

    preview.show(1, 400, 80);
    expect(preview.isNextPreviewVisible()).toBe(false);

    preview.hide();
    preview.setNextValue(2);
    expect(preview.isNextPreviewVisible()).toBe(true);
    expect(preview.isNextPreviewActive()).toBe(true);

    const pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(560);
    expect(pos.y).toBe(40);
  });

  it('should handle pause/resume cycle preserving nextPreview state', () => {
    preview.setBounds(200, 600);
    preview.setNextValue(2);

    expect(preview.isNextPreviewVisible()).toBe(true);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.hide();
    preview.hideNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.showNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(true);
    expect(preview.isNextPreviewActive()).toBe(true);
  });

  it('should handle game reset deactivating nextPreview', () => {
    preview.setBounds(200, 600);
    preview.setNextValue(2);

    preview.deactivateNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(false);

    preview.showNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
  });

  it('should handle full game cycle: play -> drop -> pause -> resume -> drop', () => {
    preview.setBounds(200, 600);
    preview.setGroundY(500);

    preview.show(1, 400, 80);
    expect(preview.isNextPreviewVisible()).toBe(false);

    preview.hide();
    preview.setNextValue(2);
    expect(preview.isNextPreviewVisible()).toBe(true);

    preview.hideNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.showNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(true);

    preview.show(2, 350, 80);
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.hide();
    preview.setNextValue(4);
    expect(preview.isNextPreviewVisible()).toBe(true);
  });

  it('should handle full game cycle: play -> drop -> reset -> new game', () => {
    preview.setBounds(200, 600);
    preview.setGroundY(500);

    preview.show(1, 400, 80);
    preview.hide();
    preview.setNextValue(2);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.deactivateNextPreview();
    expect(preview.isNextPreviewActive()).toBe(false);

    preview.showNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);

    preview.setNextValue(4);
    expect(preview.isNextPreviewActive()).toBe(true);
    expect(preview.isNextPreviewVisible()).toBe(true);
  });

  it('should update nextPreview position on container resize', () => {
    preview.setBounds(200, 600);
    preview.setNextValue(2);

    let pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(560);

    preview.setBounds(100, 500);
    pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(460);

    preview.setBounds(0, 400);
    pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(360);
  });

  it('should never position nextPreview at (0,0) when bounds are properly set', () => {
    const boundSets = [
      [100, 500],
      [200, 600],
      [0, 400],
      [50, 350],
    ];

    for (const [minX, maxX] of boundSets) {
      preview.setBounds(minX, maxX);
      preview.setNextValue(2);

      const pos = preview.getNextPreviewPosition();
      expect(pos.y).toBe(40);
      expect(pos.x).toBe(maxX - 40);

      preview.deactivateNextPreview();
    }
  });
});

describe('NextPreview Fix Integration - GameScene pause/resume with nextPreview', () => {
  it('should hide nextPreview during GameScene pause', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(200, 600);
    preview.setNextValue(2);
    expect(preview.isNextPreviewVisible()).toBe(true);

    preview.hide();
    preview.hideNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(true);
  });

  it('should restore nextPreview during GameScene resume', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(200, 600);
    preview.setNextValue(2);

    preview.hideNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);

    preview.showNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(true);
  });

  it('should deactivate nextPreview during clearEverything', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(200, 600);
    preview.setNextValue(2);

    preview.deactivateNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(false);

    preview.showNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
  });
});

describe('NextPreview Fix Integration - State transition handling', () => {
  it('should deactivate nextPreview when transitioning to non-playing state', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(200, 600);
    preview.setNextValue(2);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.deactivateNextPreview();
    expect(preview.isNextPreviewActive()).toBe(false);
  });

  it('should not show stale nextPreview when returning to playing state after menu', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(200, 600);
    preview.setNextValue(2);
    preview.deactivateNextPreview();

    preview.showNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(false);
  });

  it('should properly reactivate when setNextValue is called after deactivation', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(200, 600);
    preview.setNextValue(2);
    preview.deactivateNextPreview();

    preview.setNextValue(4);
    expect(preview.isNextPreviewActive()).toBe(true);
    expect(preview.isNextPreviewVisible()).toBe(true);

    const pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(560);
    expect(pos.y).toBe(40);
  });
});

describe('NextPreview Fix Integration - Multiple block drops', () => {
  it('should maintain correct nextPreview position across multiple drops', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(200, 600);
    preview.setGroundY(500);

    const dropValues = [1, 2, 4, 8, 16];
    for (const val of dropValues) {
      preview.show(val, 400, 80);
      expect(preview.isNextPreviewVisible()).toBe(false);

      preview.hide();
      preview.setNextValue(val * 2);
      expect(preview.isNextPreviewVisible()).toBe(true);

      const pos = preview.getNextPreviewPosition();
      expect(pos.x).toBe(560);
      expect(pos.y).toBe(40);
    }
  });

  it('should handle rapid show/hide/setNextValue cycles', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(200, 600);

    for (let i = 0; i < 20; i++) {
      preview.show(1, 300 + i * 5, 80);
      preview.hide();
      preview.setNextValue(2);
    }

    expect(preview.isNextPreviewActive()).toBe(true);
    expect(preview.isNextPreviewVisible()).toBe(true);
  });
});

describe('NextPreview Fix Integration - getBounds returns container bounds when hidden', () => {
  it('should return valid bounds for nextPreview positioning check after drop', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(200, 600);
    preview.setGroundY(500);
    preview.show(1, 400, 80);
    preview.hide();
    preview.setNextValue(2);

    const pos = preview.getNextPreviewPosition();
    const bounds = preview.getBounds();
    expect(bounds.maxX).toBeGreaterThan(0);
    expect(pos.x).toBeGreaterThan(bounds.maxX / 2);
    expect(pos.y).toBeLessThan(100);
  });

  it('should return container bounds matching setBounds values when hidden', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(150, 450);
    preview.setGroundY(550);
    preview.show(1, 300, 80);
    preview.hide();

    const bounds = preview.getBounds();
    expect(bounds.minX).toBe(150);
    expect(bounds.maxX).toBe(450);
    expect(bounds.maxY).toBe(550);
  });

  it('should maintain valid bounds through full drop lifecycle', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(100, 500);
    preview.setGroundY(600);

    preview.show(1, 300, 80);
    preview.hide();
    preview.setNextValue(2);

    const hiddenBounds = preview.getBounds();
    expect(hiddenBounds.maxX).toBe(500);

    preview.show(2, 350, 80);
    preview.hide();
    preview.setNextValue(4);

    const hiddenBounds2 = preview.getBounds();
    expect(hiddenBounds2.maxX).toBe(500);
  });

  it('should return correct bounds for different container sizes', () => {
    const sizes: Array<[number, number]> = [[0, 400], [100, 500], [200, 800]];

    for (const [minX, maxX] of sizes) {
      const preview = new BlockPreview();
      const parent = new Container();
      parent.addChild(preview);

      preview.setBounds(minX, maxX);
      preview.setGroundY(600);
      preview.show(1, (minX + maxX) / 2, 80);
      preview.hide();

      const bounds = preview.getBounds();
      expect(bounds.minX).toBe(minX);
      expect(bounds.maxX).toBe(maxX);

      preview.destroy();
    }
  });

  it('should support e2e test pattern: getNextPreviewPosition vs getBounds', () => {
    const preview = new BlockPreview();
    const parent = new Container();
    parent.addChild(preview);

    preview.setBounds(200, 600);
    preview.setGroundY(500);
    preview.show(1, 400, 80);
    preview.hide();
    preview.setNextValue(2);

    const pos = preview.getNextPreviewPosition();
    const maxX = preview.getBounds().maxX;

    expect(maxX).not.toBe(0);
    expect(pos.x > maxX / 2 && pos.y < 100).toBe(true);
  });
});
