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

describe('InputManager touchend position update fix', () => {
  let canvas: HTMLCanvasElement;
  let inputManager: InputManager;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 600;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, width: 400, height: 600, right: 400, bottom: 600,
      x: 0, y: 0, toJSON: () => {},
    });
    document.body.appendChild(canvas);
    inputManager = new InputManager(canvas);
  });

  afterEach(() => {
    inputManager.destroy();
    document.body.removeChild(canvas);
  });

  it('FIXED: touchend event updates position from changedTouches', () => {
    const touchStart = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 100, clientY: 200,
      screenX: 100, screenY: 200,
      pageX: 100, pageY: 200,
    });
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      touches: [touchStart as unknown as Touch],
      changedTouches: [touchStart as unknown as Touch],
    }));

    const touchEnd = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 250, clientY: 350,
      screenX: 250, screenY: 350,
      pageX: 250, pageY: 350,
    });
    canvas.dispatchEvent(new TouchEvent('touchend', {
      touches: [],
      changedTouches: [touchEnd as unknown as Touch],
    }));

    const state = inputManager.getState();
    expect(state.position.x).toBeCloseTo(250, 0);
    expect(state.position.y).toBeCloseTo(350, 0);
  });

  it('FIXED: isDown and isMoving reset after touchend', () => {
    const touchStart = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 100, clientY: 200,
      screenX: 100, screenY: 200,
      pageX: 100, pageY: 200,
    });
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      touches: [touchStart as unknown as Touch],
      changedTouches: [touchStart as unknown as Touch],
    }));

    expect(inputManager.getState().isDown).toBe(true);

    const touchEnd = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 100, clientY: 200,
      screenX: 100, screenY: 200,
      pageX: 100, pageY: 200,
    });
    canvas.dispatchEvent(new TouchEvent('touchend', {
      touches: [],
      changedTouches: [touchEnd as unknown as Touch],
    }));

    const state = inputManager.getState();
    expect(state.isDown).toBe(false);
    expect(state.isMoving).toBe(false);
  });

  it('FIXED: mouseup event updates position', () => {
    canvas.dispatchEvent(new MouseEvent('mousedown', {
      clientX: 100, clientY: 200, bubbles: true,
    }));

    canvas.dispatchEvent(new MouseEvent('mouseup', {
      clientX: 300, clientY: 400, bubbles: true,
    }));

    const state = inputManager.getState();
    expect(state.position.x).toBeCloseTo(300, 0);
    expect(state.position.y).toBeCloseTo(400, 0);
  });

  it('FIXED: touchend position differs from touchmove, uses touchend changedTouches position', () => {
    const touchStart = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 100, clientY: 200,
      screenX: 100, screenY: 200,
      pageX: 100, pageY: 200,
    });
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      touches: [touchStart as unknown as Touch],
      changedTouches: [touchStart as unknown as Touch],
    }));

    const touchMove = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 150, clientY: 250,
      screenX: 150, screenY: 250,
      pageX: 150, pageY: 250,
    });
    canvas.dispatchEvent(new TouchEvent('touchmove', {
      touches: [touchMove as unknown as Touch],
      changedTouches: [touchMove as unknown as Touch],
    }));

    const touchEnd = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 200, clientY: 300,
      screenX: 200, screenY: 300,
      pageX: 200, pageY: 300,
    });
    canvas.dispatchEvent(new TouchEvent('touchend', {
      touches: [],
      changedTouches: [touchEnd as unknown as Touch],
    }));

    const state = inputManager.getState();
    expect(state.position.x).toBeCloseTo(200, 0);
    expect(state.position.y).toBeCloseTo(300, 0);
  });

  it('FIXED: onUp callback receives updated position', () => {
    const upCallback = vi.fn();
    inputManager.onUp(upCallback);

    const touchStart = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 100, clientY: 200,
      screenX: 100, screenY: 200,
      pageX: 100, pageY: 200,
    });
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      touches: [touchStart as unknown as Touch],
      changedTouches: [touchStart as unknown as Touch],
    }));

    const touchEnd = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 180, clientY: 280,
      screenX: 180, screenY: 280,
      pageX: 180, pageY: 280,
    });
    canvas.dispatchEvent(new TouchEvent('touchend', {
      touches: [],
      changedTouches: [touchEnd as unknown as Touch],
    }));

    expect(upCallback).toHaveBeenCalled();
    const lastCallState = upCallback.mock.calls[upCallback.mock.calls.length - 1][0];
    expect(lastCallState.position.x).toBeCloseTo(180, 0);
    expect(lastCallState.position.y).toBeCloseTo(280, 0);
    expect(lastCallState.isDown).toBe(false);
  });

  it('FIXED: consecutive touchstart → touchmove → touchend updates position correctly', () => {
    const touchStart = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 50, clientY: 100,
      screenX: 50, screenY: 100,
      pageX: 50, pageY: 100,
    });
    canvas.dispatchEvent(new TouchEvent('touchstart', {
      touches: [touchStart as unknown as Touch],
      changedTouches: [touchStart as unknown as Touch],
    }));
    expect(inputManager.getState().position.x).toBeCloseTo(50, 0);

    const touchMove = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 120, clientY: 180,
      screenX: 120, screenY: 180,
      pageX: 120, pageY: 180,
    });
    canvas.dispatchEvent(new TouchEvent('touchmove', {
      touches: [touchMove as unknown as Touch],
      changedTouches: [touchMove as unknown as Touch],
    }));
    expect(inputManager.getState().position.x).toBeCloseTo(120, 0);

    const touchEnd = new MockTouch({
      identifier: 0, target: canvas,
      clientX: 200, clientY: 250,
      screenX: 200, screenY: 250,
      pageX: 200, pageY: 250,
    });
    canvas.dispatchEvent(new TouchEvent('touchend', {
      touches: [],
      changedTouches: [touchEnd as unknown as Touch],
    }));
    expect(inputManager.getState().position.x).toBeCloseTo(200, 0);
    expect(inputManager.getState().position.y).toBeCloseTo(250, 0);
  });
});