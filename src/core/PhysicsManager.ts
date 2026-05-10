import Matter from 'matter-js';

export class PhysicsManager {
  private engine: Matter.Engine;
  private runner: Matter.Runner;
  private bodies: Map<number, Matter.Body> = new Map();
  private idCounter = 0;
  private running = false;
  private readonly fixedStep = 1000 / 60;

  constructor() {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.0, scale: 0.001 },
    });
    this.runner = Matter.Runner.create({
      delta: 1000 / 60,
    });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    Matter.Runner.run(this.runner, this.engine);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    Matter.Runner.stop(this.runner);
  }

  step(dt: number): void {
    Matter.Engine.update(this.engine, dt);
  }

  fixedUpdate(accumulator: number): number {
    while (accumulator >= this.fixedStep) {
      Matter.Engine.update(this.engine, this.fixedStep);
      accumulator -= this.fixedStep;
    }
    return accumulator;
  }

  clearAll(): void {
    Matter.Composite.clear(this.engine.world, false);
    this.bodies.clear();
    this.idCounter = 0;
  }

  setGravity(x: number, y: number): void {
    this.engine.gravity.x = x;
    this.engine.gravity.y = y;
  }

  isRunning(): boolean {
    return this.running;
  }

  createCircle(x: number, y: number, radius: number, options?: Matter.IBodyDefinition): Matter.Body {
    const body = Matter.Bodies.circle(x, y, radius, {
      restitution: 0.2,
      friction: 0.8,
      frictionAir: 0.02,
      frictionStatic: 0.5,
      density: 0.002,
      sleepThreshold: Infinity,
      ...options,
    });
    body.label = `block_${++this.idCounter}`;
    this.bodies.set(this.idCounter, body);
    Matter.Composite.add(this.engine.world, body);
    return body;
  }

  createRectangle(x: number, y: number, width: number, height: number, options?: Matter.IBodyDefinition): Matter.Body {
    const body = Matter.Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      friction: 0.8,
      ...options,
    });
    Matter.Composite.add(this.engine.world, body);
    return body;
  }

  removeBody(body: Matter.Body): void {
    Matter.Composite.remove(this.engine.world, body);
    for (const [id, b] of this.bodies) {
      if (b === body) {
        this.bodies.delete(id);
        break;
      }
    }
  }

  getBodyPosition(body: Matter.Body): { x: number; y: number; angle: number } {
    return {
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
    };
  }

  onCollisionStart(callback: (pair: Matter.Pair) => void): void {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach(callback);
    });
  }

  getEngine(): Matter.Engine {
    return this.engine;
  }

  getAllBodies(): Matter.Body[] {
    return Array.from(this.bodies.values());
  }
}
