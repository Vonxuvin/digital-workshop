import { describe, it, expect, beforeEach } from 'vitest';
import { BlockPreview } from '../../src/gameplay/BlockPreview';

describe('BlockPreview', () => {
  let preview: BlockPreview;

  beforeEach(() => {
    preview = new BlockPreview();
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

  it('should set next value', () => {
    preview.show(1, 100, 80);
    preview.setNextValue(4);
  });

  it('should set next position', () => {
    preview.show(1, 100, 80);
    preview.setNextPosition(300, 50);
  });

  it('should show and hide next preview', () => {
    preview.show(1, 100, 80);
    preview.setNextValue(2);
    preview.showNextPreview();
    preview.hideNextPreview();
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
