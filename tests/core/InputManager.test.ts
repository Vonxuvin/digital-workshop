import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputManager } from '../../src/core/InputManager';

class MockTouch {
  identifier: number;
  target: EventTarget;
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
  pageX: number;
  pageY: number;
  radiusX: number;
  radiusY: number;
  rotationAngle: number;
  force: number;

  constructor(init: TouchInit) {
    this.identifier = init.identifier;
    this.target = init.target;
    this.clientX = init.clientX;
    this.clientY = init.clientY;
    this.screenX = init.screenX;
    this.screenY = init.screenY;
    this.pageX = init.pageX;
    this.pageY = init.pageY;
    this.radiusX = (init as any).radiusX ?? 1;
    this.radiusY = (init as any).radiusY ?? 1;
    this.rotationAngle = (init as any).rotationAngle ?? 0;
    this.force = (init as any).force ?? 1;
  }
}

(globalThis as any).Touch = MockTouch;

describe('InputManager', () => {
  let canvas: HTMLCanvasElement;
  let inputManager: InputManager;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    inputManager = new InputManager(canvas);
  });

  afterEach(() => {
    inputManager.destroy();
  });

  it('should create without error', () => {
    expect(inputManager).toBeDefined();
  });

  it('should have initial state with isDown=false', () => {
    const state = inputManager.getState();
    expect(state.isDown).toBe(false);
    expect(state.isMoving).toBe(false);
  });

  describe('mouse events', () => {
    it('should update position on mousedown', () => {
      const handler = vi.fn();
      inputManager.onDown(handler);
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 200 }));
      expect(handler).toHaveBeenCalled();
      const state = handler.mock.calls[0][0];
      expect(state.position.x).toBe(100);
      expect(state.position.y).toBe(200);
      expect(state.isDown).toBe(true);
    });

    it('should update position on mousemove', () => {
      const handler = vi.fn();
      inputManager.onMove(handler);
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 250 }));
      expect(handler).toHaveBeenCalled();
      const state = handler.mock.calls[0][0];
      expect(state.position.x).toBe(150);
      expect(state.position.y).toBe(250);
    });

    it('should update position on mouseup before callbacks', () => {
      const handler = vi.fn();
      inputManager.onUp(handler);
      canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 300, clientY: 400 }));
      expect(handler).toHaveBeenCalled();
      const state = handler.mock.calls[0][0];
      expect(state.position.x).toBe(300);
      expect(state.position.y).toBe(400);
      expect(state.isDown).toBe(false);
    });
  });

  describe('touch events', () => {
    it('should update position on touchstart', () => {
      const handler = vi.fn();
      inputManager.onDown(handler);
      const touch = new MockTouch({
        identifier: 0,
        target: canvas,
        clientX: 100,
        clientY: 200,
        screenX: 100,
        screenY: 200,
        pageX: 100,
        pageY: 200,
      });
      canvas.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touch as unknown as Touch],
        changedTouches: [touch as unknown as Touch],
      }));
      expect(handler).toHaveBeenCalled();
      const state = handler.mock.calls[0][0];
      expect(state.position.x).toBe(100);
      expect(state.position.y).toBe(200);
      expect(state.isDown).toBe(true);
    });

    it('should update position on touchmove', () => {
      const handler = vi.fn();
      inputManager.onMove(handler);
      const touch = new MockTouch({
        identifier: 0,
        target: canvas,
        clientX: 150,
        clientY: 250,
        screenX: 150,
        screenY: 250,
        pageX: 150,
        pageY: 250,
      });
      canvas.dispatchEvent(new TouchEvent('touchmove', {
        touches: [touch as unknown as Touch],
        changedTouches: [touch as unknown as Touch],
      }));
      expect(handler).toHaveBeenCalled();
      const state = handler.mock.calls[0][0];
      expect(state.position.x).toBe(150);
      expect(state.position.y).toBe(250);
    });

    it('should update position from changedTouches on touchend', () => {
      const handler = vi.fn();
      inputManager.onUp(handler);
      const touch = new MockTouch({
        identifier: 0,
        target: canvas,
        clientX: 300,
        clientY: 400,
        screenX: 300,
        screenY: 400,
        pageX: 300,
        pageY: 400,
      });
      canvas.dispatchEvent(new TouchEvent('touchend', {
        touches: [],
        changedTouches: [touch as unknown as Touch],
      }));
      expect(handler).toHaveBeenCalled();
      const state = handler.mock.calls[0][0];
      expect(state.position.x).toBe(300);
      expect(state.position.y).toBe(400);
      expect(state.isDown).toBe(false);
    });

    it('should handle touchend with no changedTouches gracefully', () => {
      const handler = vi.fn();
      inputManager.onUp(handler);
      expect(() => {
        canvas.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [],
        }));
      }).not.toThrow();
    });
  });

  describe('scale', () => {
    it('should apply scale to position', () => {
      inputManager.setScale(2, 2);
      const handler = vi.fn();
      inputManager.onDown(handler);
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 200 }));
      const state = handler.mock.calls[0][0];
      expect(state.position.x).toBe(200);
      expect(state.position.y).toBe(400);
    });

    it('should apply different x/y scale', () => {
      inputManager.setScale(2, 1.5);
      const handler = vi.fn();
      inputManager.onDown(handler);
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 200 }));
      const state = handler.mock.calls[0][0];
      expect(state.position.x).toBe(200);
      expect(state.position.y).toBe(300);
    });
  });

  describe('cleanup', () => {
    it('should remove all event listeners on destroy', () => {
      const removeSpy = vi.spyOn(canvas, 'removeEventListener');
      inputManager.destroy();
      expect(removeSpy).toHaveBeenCalledTimes(6);
    });

    it('should clear callbacks on destroy', () => {
      const handler = vi.fn();
      inputManager.onDown(handler);
      inputManager.destroy();
      canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 200 }));
      expect(handler).not.toHaveBeenCalled();
    });
  });
});