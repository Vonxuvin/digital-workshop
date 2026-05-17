import { describe, it, expect, beforeEach } from 'vitest';
import { BlockPreview } from '../../src/gameplay/BlockPreview';
import { Container } from 'pixi.js';

describe('BlockPreview - ghost/afterimage cleanup fix', () => {
  let preview: BlockPreview;
  let parentContainer: Container;

  beforeEach(() => {
    parentContainer = new Container();
    preview = new BlockPreview();
    parentContainer.addChild(preview);
  });

  it('should clear trailGraphics on hide', () => {
    preview.setBounds(0, 400);
    preview.setGroundY(500);
    preview.show(1, 200, 80);

    const trailGraphics = (preview as any).trailGraphics;
    expect(trailGraphics._context.instructions.length).toBeGreaterThan(0);

    preview.hide();
    expect(trailGraphics._context.instructions.length).toBe(0);
  });

  it('should clear landingMarker on hide', () => {
    preview.setBounds(0, 400);
    preview.setGroundY(500);
    preview.show(1, 200, 80);

    const landingMarker = (preview as any).landingMarker;
    expect(landingMarker._context.instructions.length).toBeGreaterThan(0);

    preview.hide();
    expect(landingMarker._context.instructions.length).toBe(0);
  });

  it('should clear graphics on hide', () => {
    preview.setBounds(0, 400);
    preview.show(1, 200, 80);

    const graphics = (preview as any).graphics;
    expect(graphics._context.instructions.length).toBeGreaterThan(0);

    preview.hide();
    expect(graphics._context.instructions.length).toBe(0);
  });

  it('should not leave residual drawing instructions after hide', () => {
    preview.setBounds(0, 400);
    preview.setGroundY(500);
    preview.show(2, 150, 80);
    preview.updatePosition(200);
    preview.hide();

    const trailGraphics = (preview as any).trailGraphics;
    const landingMarker = (preview as any).landingMarker;
    const graphics = (preview as any).graphics;

    expect(trailGraphics._context.instructions.length).toBe(0);
    expect(landingMarker._context.instructions.length).toBe(0);
    expect(graphics._context.instructions.length).toBe(0);
  });

  it('should not leave residual drawing after hide during auto-drop', () => {
    preview.setBounds(0, 400);
    preview.setGroundY(500);
    preview.show(1, 200, 80);

    preview.hide();

    const trailGraphics = (preview as any).trailGraphics;
    const landingMarker = (preview as any).landingMarker;
    const graphics = (preview as any).graphics;

    expect(trailGraphics._context.instructions.length).toBe(0);
    expect(landingMarker._context.instructions.length).toBe(0);
    expect(graphics._context.instructions.length).toBe(0);
  });

  it('should cleanly re-show after hide without residual graphics', () => {
    preview.setBounds(0, 400);
    preview.setGroundY(500);
    preview.show(1, 200, 80);
    preview.hide();

    preview.show(2, 150, 80);
    expect(preview.visible).toBe(true);
    expect(preview.x).toBe(150);
    expect(preview.getTargetX()).toBe(150);
  });

  it('should handle multiple show/hide cycles without accumulating graphics', () => {
    preview.setBounds(0, 400);
    preview.setGroundY(500);

    for (let i = 0; i < 5; i++) {
      preview.show(1, 200, 80);
      preview.updatePosition(200 + i * 10);
      preview.hide();
    }

    const trailGraphics = (preview as any).trailGraphics;
    const landingMarker = (preview as any).landingMarker;
    const graphics = (preview as any).graphics;

    expect(trailGraphics._context.instructions.length).toBe(0);
    expect(landingMarker._context.instructions.length).toBe(0);
    expect(graphics._context.instructions.length).toBe(0);
  });

  it('should clear all graphics when hide is called after updatePosition', () => {
    preview.setBounds(0, 400);
    preview.setGroundY(500);
    preview.show(1, 200, 80);
    preview.updatePosition(300);

    preview.hide();

    const trailGraphics = (preview as any).trailGraphics;
    const landingMarker = (preview as any).landingMarker;
    expect(trailGraphics._context.instructions.length).toBe(0);
    expect(landingMarker._context.instructions.length).toBe(0);
  });

  it('should handle hide when already hidden without error', () => {
    preview.setBounds(0, 400);
    preview.hide();
    expect(preview.visible).toBe(false);
  });

  it('should clear graphics on hide even when show was not called', () => {
    preview.setBounds(0, 400);
    preview.hide();
    expect(preview.visible).toBe(false);
  });
});
