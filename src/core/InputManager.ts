import { Point } from 'pixi.js';

export interface InputState {
  position: Point;
  isDown: boolean;
  isMoving: boolean;
}

type InputCallback = (state: InputState) => void;

export class InputManager {
  private state: InputState = {
    position: new Point(0, 0),
    isDown: false,
    isMoving: false,
  };
  private onMoveCallbacks: InputCallback[] = [];
  private onDownCallbacks: InputCallback[] = [];
  private onUpCallbacks: InputCallback[] = [];
  private canvas: HTMLCanvasElement;
  private boundHandleDown: (e: MouseEvent) => void;
  private boundHandleMove: (e: MouseEvent) => void;
  private boundHandleUp: (e?: MouseEvent | TouchEvent) => void;
  private boundHandleTouch: (e: TouchEvent) => void;
  private scaleX: number = 1;
  private scaleY: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.boundHandleDown = this.handleDown.bind(this);
    this.boundHandleMove = this.handleMove.bind(this);
    this.boundHandleUp = this.handleUp.bind(this);
    this.boundHandleTouch = this.handleTouch.bind(this);
    this.setupEvents();
  }

  setScale(scaleX: number, scaleY?: number): void {
    this.scaleX = scaleX;
    this.scaleY = scaleY ?? scaleX;
  }

  private setupEvents(): void {
    this.canvas.addEventListener('mousedown', this.boundHandleDown);
    this.canvas.addEventListener('mousemove', this.boundHandleMove);
    this.canvas.addEventListener('mouseup', this.boundHandleUp);

    this.canvas.addEventListener('touchstart', this.boundHandleTouch);
    this.canvas.addEventListener('touchmove', this.boundHandleTouch);
    this.canvas.addEventListener('touchend', this.boundHandleUp);
  }

  private handleDown(e: MouseEvent): void {
    this.updatePosition(e.clientX, e.clientY);
    this.state.isDown = true;
    this.state.isMoving = false;
    this.onDownCallbacks.forEach(cb => cb({ ...this.state }));
  }

  private handleMove(e: MouseEvent): void {
    this.updatePosition(e.clientX, e.clientY);
    if (this.state.isDown) {
      this.state.isMoving = true;
    }
    this.onMoveCallbacks.forEach(cb => cb({ ...this.state }));
  }

  private handleUp(e?: MouseEvent | TouchEvent): void {
    if (e && e.type === 'touchend') {
      const touch = (e as TouchEvent).changedTouches[0];
      if (touch) {
        this.updatePosition(touch.clientX, touch.clientY);
      }
    } else if (e && e.type === 'mouseup') {
      this.updatePosition((e as MouseEvent).clientX, (e as MouseEvent).clientY);
    }
    this.state.isDown = false;
    this.state.isMoving = false;
    this.onUpCallbacks.forEach(cb => cb({ ...this.state }));
  }

  private handleTouch(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0] || e.changedTouches[0];
    if (touch) {
      this.updatePosition(touch.clientX, touch.clientY);
      if (e.type === 'touchstart') {
        this.state.isDown = true;
        this.state.isMoving = false;
        this.onDownCallbacks.forEach(cb => cb({ ...this.state }));
      } else if (e.type === 'touchmove') {
        this.state.isMoving = true;
        this.onMoveCallbacks.forEach(cb => cb({ ...this.state }));
      }
    }
  }

  private updatePosition(x: number, y: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const cssX = (x - rect.left) * this.scaleX;
    const cssY = (y - rect.top) * this.scaleY;
    this.state.position.set(cssX, cssY);
  }

  onMove(callback: InputCallback): void {
    this.onMoveCallbacks.push(callback);
  }

  onDown(callback: InputCallback): void {
    this.onDownCallbacks.push(callback);
  }

  onUp(callback: InputCallback): void {
    this.onUpCallbacks.push(callback);
  }

  getState(): InputState {
    return { ...this.state };
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.boundHandleDown);
    this.canvas.removeEventListener('mousemove', this.boundHandleMove);
    this.canvas.removeEventListener('mouseup', this.boundHandleUp);
    this.canvas.removeEventListener('touchstart', this.boundHandleTouch);
    this.canvas.removeEventListener('touchmove', this.boundHandleTouch);
    this.canvas.removeEventListener('touchend', this.boundHandleUp);
    this.onDownCallbacks = [];
    this.onMoveCallbacks = [];
    this.onUpCallbacks = [];
  }
}
