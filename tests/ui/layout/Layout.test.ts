import { describe, it, expect } from 'vitest';
import { Layout } from '../../../src/ui/layout/Layout';

describe('Layout', () => {
  describe('anchor', () => {
    const target = { x: 0, y: 0, width: 100, height: 50 };
    const parent = { width: 800, height: 600 };

    it('should center horizontally and vertically by default', () => {
      const result = Layout.anchor(target, parent);
      expect(result.x).toBe(400);
      expect(result.y).toBe(300);
    });

    it('should align left with marginX', () => {
      const result = Layout.anchor(target, parent, 'left', 'center', 10);
      expect(result.x).toBe(60);
    });

    it('should align right with marginX', () => {
      const result = Layout.anchor(target, parent, 'right', 'center', 10);
      expect(result.x).toBe(740);
    });

    it('should align top with marginY', () => {
      const result = Layout.anchor(target, parent, 'center', 'top', 0, 10);
      expect(result.y).toBe(35);
    });

    it('should align bottom with marginY', () => {
      const result = Layout.anchor(target, parent, 'center', 'bottom', 0, 10);
      expect(result.y).toBe(565);
    });

    it('should apply both margins', () => {
      const result = Layout.anchor(target, parent, 'left', 'top', 20, 30);
      expect(result.x).toBe(70);
      expect(result.y).toBe(55);
    });

    it('should default marginX and marginY to 0', () => {
      const result = Layout.anchor(target, parent, 'center', 'center');
      expect(result.x).toBe(400);
      expect(result.y).toBe(300);
    });

    it('should handle left alignment without margin', () => {
      const result = Layout.anchor(target, parent, 'left');
      expect(result.x).toBe(50);
    });

    it('should handle right alignment without margin', () => {
      const result = Layout.anchor(target, parent, 'right');
      expect(result.x).toBe(750);
    });

    it('should handle top alignment without margin', () => {
      const result = Layout.anchor(target, parent, 'center', 'top');
      expect(result.y).toBe(25);
    });

    it('should handle bottom alignment without margin', () => {
      const result = Layout.anchor(target, parent, 'center', 'bottom');
      expect(result.y).toBe(575);
    });
  });

  describe('grid', () => {
    it('should position items in a grid', () => {
      const items = [1, 2, 3, 4];
      const positions = Layout.grid(items, 2, 100, 50, 10, 10, 0, 0);
      expect(positions).toHaveLength(4);
      expect(positions[0]).toEqual({ x: 0, y: 0 });
      expect(positions[1]).toEqual({ x: 110, y: 0 });
      expect(positions[2]).toEqual({ x: 0, y: 60 });
      expect(positions[3]).toEqual({ x: 110, y: 60 });
    });

    it('should handle single column', () => {
      const items = [1, 2, 3];
      const positions = Layout.grid(items, 1, 50, 30, 0, 5, 10, 20);
      expect(positions).toHaveLength(3);
      expect(positions[0]).toEqual({ x: 10, y: 20 });
      expect(positions[1]).toEqual({ x: 10, y: 55 });
      expect(positions[2]).toEqual({ x: 10, y: 90 });
    });

    it('should handle single row', () => {
      const items = [1, 2, 3];
      const positions = Layout.grid(items, 3, 40, 40, 5, 0, 0, 0);
      expect(positions).toHaveLength(3);
      expect(positions[0]).toEqual({ x: 0, y: 0 });
      expect(positions[1]).toEqual({ x: 45, y: 0 });
      expect(positions[2]).toEqual({ x: 90, y: 0 });
    });

    it('should return empty array for empty items', () => {
      const positions = Layout.grid([], 3, 50, 50, 10, 10, 0, 0);
      expect(positions).toHaveLength(0);
    });

    it('should handle gap of 0', () => {
      const items = [1, 2];
      const positions = Layout.grid(items, 2, 100, 50, 0, 0, 0, 0);
      expect(positions[0]).toEqual({ x: 0, y: 0 });
      expect(positions[1]).toEqual({ x: 100, y: 0 });
    });
  });

  describe('flex', () => {
    it('should layout items in a row by default', () => {
      const items = [
        { width: 100, height: 50 },
        { width: 80, height: 50 },
        { width: 60, height: 50 },
      ];
      const positions = Layout.flex(items, 'row', 10, 0, 0);
      expect(positions).toHaveLength(3);
      expect(positions[0]).toEqual({ x: 0, y: 0 });
      expect(positions[1]).toEqual({ x: 110, y: 0 });
      expect(positions[2]).toEqual({ x: 200, y: 0 });
    });

    it('should layout items in a column', () => {
      const items = [
        { width: 100, height: 50 },
        { width: 80, height: 30 },
        { width: 60, height: 40 },
      ];
      const positions = Layout.flex(items, 'column', 5, 10, 20);
      expect(positions).toHaveLength(3);
      expect(positions[0]).toEqual({ x: 10, y: 20 });
      expect(positions[1]).toEqual({ x: 10, y: 75 });
      expect(positions[2]).toEqual({ x: 10, y: 110 });
    });

    it('should return empty array for empty items', () => {
      const positions = Layout.flex([], 'row', 10, 0, 0);
      expect(positions).toHaveLength(0);
    });

    it('should handle gap of 0 in row', () => {
      const items = [{ width: 50, height: 30 }, { width: 50, height: 30 }];
      const positions = Layout.flex(items, 'row', 0, 0, 0);
      expect(positions[0]).toEqual({ x: 0, y: 0 });
      expect(positions[1]).toEqual({ x: 50, y: 0 });
    });

    it('should handle gap of 0 in column', () => {
      const items = [{ width: 50, height: 30 }, { width: 50, height: 30 }];
      const positions = Layout.flex(items, 'column', 0, 0, 0);
      expect(positions[0]).toEqual({ x: 0, y: 0 });
      expect(positions[1]).toEqual({ x: 0, y: 30 });
    });

    it('should handle single item', () => {
      const items = [{ width: 100, height: 50 }];
      const positions = Layout.flex(items, 'row', 10, 5, 10);
      expect(positions).toHaveLength(1);
      expect(positions[0]).toEqual({ x: 5, y: 10 });
    });
  });

  describe('safeArea', () => {
    it('should calculate safe area insets', () => {
      const result = Layout.safeArea(800, 600);
      expect(result.top).toBe(30);
      expect(result.bottom).toBe(30);
      expect(result.left).toBe(24);
      expect(result.right).toBe(24);
    });

    it('should scale with screen size', () => {
      const result = Layout.safeArea(400, 300);
      expect(result.top).toBe(15);
      expect(result.bottom).toBe(15);
      expect(result.left).toBe(12);
      expect(result.right).toBe(12);
    });

    it('should handle very small screen sizes', () => {
      const result = Layout.safeArea(100, 100);
      expect(result.top).toBe(5);
      expect(result.bottom).toBe(5);
      expect(result.left).toBe(3);
      expect(result.right).toBe(3);
    });
  });
});
