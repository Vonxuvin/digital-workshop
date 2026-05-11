import Matter from 'matter-js';

export class PhysicsManager {
  private engine: Matter.Engine;
  private bodies: Map<number, Matter.Body> = new Map();
  private idCounter = 0;
  private running = false;
  private readonly fixedStep = 1000 / 60;

  constructor() {
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 2.0, scale: 0.001 },
      enableSleeping: true,
    });
  }

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  pause(): void {
    this.running = false;
  }

  resume(): void {
    this.running = true;
  }

  step(dt: number): void {
    if (!this.running) return;
    Matter.Engine.update(this.engine, dt);
  }

  fixedUpdate(accumulator: number): number {
    if (!this.running) return accumulator;
    let acc = accumulator;
    while (acc >= this.fixedStep) {
      Matter.Engine.update(this.engine, this.fixedStep);
      acc -= this.fixedStep;
    }
    return acc;
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
      restitution: 0.15,
      friction: 0.5,
      frictionAir: 0.005,
      frictionStatic: 0.6,
      density: 0.005,
      sleepThreshold: 60,
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
    Matter.Events.on(this.engine, 'collisionStart', (event: any) => {
      event.pairs.forEach(callback);
    });
  }

  getEngine(): Matter.Engine {
    return this.engine;
  }

  getAllBodies(): Matter.Body[] {
    return Array.from(this.bodies.values());
  }

  getContainerBodies(): Matter.Body[] {
    const allWorldBodies = Matter.Composite.allBodies(this.engine.world);
    return allWorldBodies.filter(b =>
      b.label?.startsWith('container_') ||
      b.label?.startsWith('wall_') ||
      b.label === 'ground'
    );
  }
}
