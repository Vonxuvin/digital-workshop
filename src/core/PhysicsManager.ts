import Matter from 'matter-js';

export interface PhysicsConfig {
  gravityX: number;
  gravityY: number;
  friction: number;
  restitution: number;
  density: number;
  slop: number;
}

const DEFAULT_PHYSICS_CONFIG: PhysicsConfig = {
  gravityX: 0,
  gravityY: 1.0,
  friction: 0.3,
  restitution: 0.2,
  density: 0.001,
  slop: 0.5,
};

export class PhysicsManager {
  private engine: Matter.Engine;
  private bodies: Map<number, Matter.Body> = new Map();
  private bodyToId: Map<Matter.Body, number> = new Map();
  private idCounter = 0;
  private running = false;
  private readonly fixedStep = 1000 / 60;
  private readonly maxVelocity = 20;
  private physicsConfig: PhysicsConfig;
  private collisionCallbackMap: Map<(pair: Matter.Pair) => void, (event: any) => void> = new Map();

  constructor() {
    this.physicsConfig = { ...DEFAULT_PHYSICS_CONFIG };
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.0, scale: 0.001 },
      enableSleeping: true,
    });
  }

  applyPhysicsConfig(config: Partial<PhysicsConfig>): void {
    this.physicsConfig = { ...this.physicsConfig, ...config };
    this.engine.gravity.x = this.physicsConfig.gravityX;
    this.engine.gravity.y = this.physicsConfig.gravityY;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  pause(): void {
    this.running = false;
  }

  resume(): void {
    if (this.running) return;
    this.running = true;
  }

  step(dt: number): void {
    if (!this.running) return;
    Matter.Engine.update(this.engine, dt);
  }

  private readonly maxPhysicsSteps = 3;

  fixedUpdate(accumulator: number): number {
    if (!this.running) return accumulator;
    let acc = accumulator;
    let steps = 0;
    while (acc >= this.fixedStep && steps < this.maxPhysicsSteps) {
      Matter.Engine.update(this.engine, this.fixedStep);
      this.clampVelocities();
      acc -= this.fixedStep;
      steps++;
    }
    if (steps >= this.maxPhysicsSteps) {
      acc = 0;
    }
    return acc;
  }

  private clampVelocities(): void {
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;
      const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
      if (speed > this.maxVelocity) {
        const scale = this.maxVelocity / speed;
        Matter.Body.setVelocity(body, {
          x: body.velocity.x * scale,
          y: body.velocity.y * scale,
        });
      }
    }
  }

  clearAll(): void {
    Matter.Composite.clear(this.engine.world, false);
    this.bodies.clear();
    this.bodyToId.clear();
    this.idCounter = 0;
  }

  setGravity(x: number, y: number): void {
    this.engine.gravity.x = x;
    this.engine.gravity.y = y;
  }

  isRunning(): boolean {
    return this.running;
  }

  hasCollision(): boolean {
    return this.engine.pairs.list.length > 0;
  }

  createCircle(x: number, y: number, radius: number, options?: Matter.IBodyDefinition): Matter.Body {
    const body = Matter.Bodies.circle(x, y, radius, {
      restitution: this.physicsConfig.restitution,
      friction: this.physicsConfig.friction,
      frictionAir: 0.01,
      frictionStatic: 0.6,
      density: this.physicsConfig.density,
      sleepThreshold: 30,
      ...options,
    });
    body.label = `block_${++this.idCounter}`;
    this.bodies.set(this.idCounter, body);
    this.bodyToId.set(body, this.idCounter);
    Matter.Composite.add(this.engine.world, body);
    return body;
  }

  createRectangle(x: number, y: number, width: number, height: number, options?: Matter.IBodyDefinition): Matter.Body {
    const body = Matter.Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      friction: 0.8,
      ...options,
    });
    body.label = `block_${++this.idCounter}`;
    this.bodies.set(this.idCounter, body);
    this.bodyToId.set(body, this.idCounter);
    Matter.Composite.add(this.engine.world, body);
    return body;
  }

  removeBody(body: Matter.Body): void {
    Matter.Composite.remove(this.engine.world, body);
    const id = this.bodyToId.get(body);
    if (id !== undefined) {
      this.bodies.delete(id);
      this.bodyToId.delete(body);
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
    const wrapper = (event: any) => {
      event.pairs.forEach(callback);
    };
    this.collisionCallbackMap.set(callback, wrapper);
    Matter.Events.on(this.engine, 'collisionStart', wrapper);
  }

  offCollisionStart(callback: (pair: Matter.Pair) => void): void {
    const wrapper = this.collisionCallbackMap.get(callback);
    if (wrapper) {
      Matter.Events.off(this.engine, 'collisionStart', wrapper);
      this.collisionCallbackMap.delete(callback);
    }
  }

  destroy(): void {
    for (const wrapper of this.collisionCallbackMap.values()) {
      Matter.Events.off(this.engine, 'collisionStart', wrapper);
    }
    this.collisionCallbackMap.clear();
    Matter.Engine.clear(this.engine);
    this.bodies.clear();
    this.bodyToId.clear();
    this.running = false;
  }

  getEngine(): Matter.Engine {
    return this.engine;
  }

  getAllBodies(): Matter.Body[] {
    return Array.from(this.bodies.values());
  }

  getBodiesInArea(minX: number, minY: number, maxX: number, maxY: number): Matter.Body[] {
    const result: Matter.Body[] = [];
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;
      const pos = body.position;
      if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
        result.push(body);
      }
    }
    return result;
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
