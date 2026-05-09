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

  constructor(canvas: HTMLCanvasElement) {
    this.setupEvents(canvas);
  }

  private setupEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown', this.handleDown.bind(this));
    canvas.addEventListener('mousemove', this.handleMove.bind(this));
    canvas.addEventListener('mouseup', this.handleUp.bind(this));

    canvas.addEventListener('touchstart', this.handleTouch.bind(this));
    canvas.addEventListener('touchmove', this.handleTouch.bind(this));
    canvas.addEventListener('touchend', this.handleUp.bind(this));
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

  private handleUp(): void {
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
    this.state.position.set(x, y);
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
}
