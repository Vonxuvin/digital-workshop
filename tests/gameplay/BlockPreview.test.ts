import { describe, it, expect, beforeEach } from 'vitest';
import { BlockPreview } from '../../src/gameplay/BlockPreview';
import { Container } from 'pixi.js';

describe('BlockPreview', () => {
  let preview: BlockPreview;
  let parentContainer: Container;

  beforeEach(() => {
    parentContainer = new Container();
    preview = new BlockPreview();
    parentContainer.addChild(preview);
  });

  it('should be hidden by default', () => {
    expect(preview.visible).toBe(false);
  });

  it('should show with correct value and position', () => {
    preview.show(2, 100, 80);
    expect(preview.visible).toBe(true);
    expect(preview.x).toBe(100);
    expect(preview.y).toBe(80);
    expect(preview.getTargetX()).toBe(100);
  });

  it('should hide correctly', () => {
    preview.show(1, 100, 80);
    preview.hide();
    expect(preview.visible).toBe(false);
  });

  it('should update position within bounds', () => {
    preview.setBounds(0, 400);
    preview.show(1, 200, 80);
    preview.updatePosition(200);
    expect(preview.getTargetX()).toBe(200);
  });

  it('should clamp position to left bound', () => {
    preview.setBounds(0, 400);
    preview.show(1, 200, 80);
    preview.updatePosition(-10);
    expect(preview.getTargetX()).toBeGreaterThan(0);
  });

  it('should clamp position to right bound', () => {
    preview.setBounds(0, 400);
    preview.show(1, 200, 80);
    preview.updatePosition(500);
    expect(preview.getTargetX()).toBeLessThan(400);
  });

  it('should set ground Y', () => {
    preview.setGroundY(500);
    preview.show(1, 100, 80);
    expect(preview.visible).toBe(true);
  });

  it('should set bounds', () => {
    preview.setBounds(50, 350);
    preview.show(1, 200, 80);
    preview.updatePosition(10);
    expect(preview.getTargetX()).toBeGreaterThanOrEqual(50);
  });

  it('should set gravity angle and redraw when visible', () => {
    preview.show(1, 100, 80);
    preview.setGravityAngle(Math.PI / 6);
    expect(preview.visible).toBe(true);
  });

  it('should set gravity angle without error when hidden', () => {
    preview.setGravityAngle(Math.PI / 4);
    expect(preview.visible).toBe(false);
  });

  it('should handle show with high value block', () => {
    preview.show(1024, 200, 80);
    expect(preview.visible).toBe(true);
  });

  it('should handle updatePosition after setBounds with offset', () => {
    preview.setBounds(100, 500);
    preview.show(1, 200, 80);
    preview.updatePosition(50);
    expect(preview.getTargetX()).toBeGreaterThanOrEqual(100);
  });

  it('should handle setGroundY with small value', () => {
    preview.setGroundY(100);
    preview.show(1, 100, 80);
    expect(preview.visible).toBe(true);
  });

  it('should destroy without error', () => {
    preview.show(1, 100, 80);
    preview.setNextValue(2);
    preview.destroy();
  });
});

describe('BlockPreview - nextPreview positioning fix', () => {
  let preview: BlockPreview;
  let parentContainer: Container;

  beforeEach(() => {
    parentContainer = new Container();
    preview = new BlockPreview();
    parentContainer.addChild(preview);
  });

  it('should position nextPreview at container top-right when setNextValue is called', () => {
    preview.setBounds(100, 500);
    preview.setNextValue(2);

    const pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(500 - 40);
    expect(pos.y).toBe(40);
  });

  it('should not position nextPreview at (0, 0) when bounds are set', () => {
    preview.setBounds(200, 600);
    preview.setNextValue(4);

    const pos = preview.getNextPreviewPosition();
    expect(pos.x).toBeGreaterThan(0);
    expect(pos.y).toBeGreaterThan(0);
    expect(pos.x).toBe(600 - 40);
    expect(pos.y).toBe(40);
  });

  it('should update nextPreview position when setBounds changes', () => {
    preview.setBounds(100, 500);
    preview.setNextValue(2);

    let pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(460);

    preview.setBounds(50, 350);
    pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(310);
  });

  it('should hide nextPreview visually when show() is called but keep it active', () => {
    preview.setBounds(100, 500);
    preview.setNextValue(2);
    expect(preview.isNextPreviewVisible()).toBe(true);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.show(1, 200, 80);
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(true);
  });

  it('should show nextPreview after setNextValue following a drop', () => {
    preview.setBounds(100, 500);
    preview.show(1, 200, 80);
    expect(preview.isNextPreviewVisible()).toBe(false);

    preview.hide();
    preview.setNextValue(2);
    expect(preview.isNextPreviewVisible()).toBe(true);
  });

  it('should track nextPreviewActive state correctly', () => {
    expect(preview.isNextPreviewActive()).toBe(false);

    preview.setBounds(100, 500);
    preview.setNextValue(2);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.deactivateNextPreview();
    expect(preview.isNextPreviewActive()).toBe(false);
  });

  it('should restore nextPreview on resume after pause (hideNextPreview)', () => {
    preview.setBounds(100, 500);
    preview.setNextValue(2);
    expect(preview.isNextPreviewVisible()).toBe(true);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.hideNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.showNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(true);
    expect(preview.isNextPreviewActive()).toBe(true);
  });

  it('should not restore nextPreview on resume after deactivate', () => {
    preview.setBounds(100, 500);
    preview.setNextValue(2);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.deactivateNextPreview();
    expect(preview.isNextPreviewActive()).toBe(false);

    preview.showNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
  });

  it('should set next position manually', () => {
    preview.setNextPosition(300, 50);
  });

  it('should calculate next position based on maxX and padding', () => {
    preview.setBounds(0, 400);
    const pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(400 - 40);
    expect(pos.y).toBe(40);
  });

  it('should handle multiple setNextValue calls', () => {
    preview.setBounds(100, 500);
    preview.setNextValue(2);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.setNextValue(4);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.setNextValue(8);
    expect(preview.isNextPreviewActive()).toBe(true);
  });

  it('should handle hideNextPreview when nextPreview does not exist', () => {
    expect(() => preview.hideNextPreview()).not.toThrow();
    expect(preview.isNextPreviewVisible()).toBe(false);
  });

  it('should handle showNextPreview when nextPreview does not exist', () => {
    expect(() => preview.showNextPreview()).not.toThrow();
  });

  it('should handle deactivateNextPreview when nextPreview does not exist', () => {
    expect(() => preview.deactivateNextPreview()).not.toThrow();
    expect(preview.isNextPreviewActive()).toBe(false);
  });

  it('should handle getNextPreviewPosition before setBounds', () => {
    const pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(0 - 40);
    expect(pos.y).toBe(40);
  });

  it('should destroy nextPreview properly after setNextValue', () => {
    preview.setBounds(100, 500);
    preview.setNextValue(2);
    preview.destroy();
  });

  it('should handle setNextValue with various block values', () => {
    preview.setBounds(100, 500);
    const values = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
    for (const v of values) {
      preview.setNextValue(v);
      expect(preview.isNextPreviewActive()).toBe(true);
    }
  });

  it('should maintain correct position after multiple setBounds calls', () => {
    preview.setBounds(0, 400);
    preview.setNextValue(2);

    preview.setBounds(100, 600);
    let pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(560);

    preview.setBounds(200, 800);
    pos = preview.getNextPreviewPosition();
    expect(pos.x).toBe(760);
  });

  it('should handle show/hide cycle with nextPreview', () => {
    preview.setBounds(100, 500);

    preview.show(1, 200, 80);
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(false);

    preview.hide();
    preview.setNextValue(2);
    expect(preview.isNextPreviewVisible()).toBe(true);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.show(2, 250, 80);
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.hide();
    preview.setNextValue(4);
    expect(preview.isNextPreviewVisible()).toBe(true);
    expect(preview.isNextPreviewActive()).toBe(true);
  });

  it('should handle pause/resume cycle correctly', () => {
    preview.setBounds(100, 500);
    preview.setNextValue(2);

    preview.hideNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(true);

    preview.showNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(true);
    expect(preview.isNextPreviewActive()).toBe(true);
  });

  it('should handle reset cycle correctly', () => {
    preview.setBounds(100, 500);
    preview.setNextValue(2);

    preview.deactivateNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(false);

    preview.showNextPreview();
    expect(preview.isNextPreviewVisible()).toBe(false);
    expect(preview.isNextPreviewActive()).toBe(false);
  });

  it('should reactivate nextPreview after deactivate when setNextValue is called', () => {
    preview.setBounds(100, 500);
    preview.setNextValue(2);
    preview.deactivateNextPreview();
    expect(preview.isNextPreviewActive()).toBe(false);

    preview.setNextValue(4);
    expect(preview.isNextPreviewActive()).toBe(true);
    expect(preview.isNextPreviewVisible()).toBe(true);
  });
});
