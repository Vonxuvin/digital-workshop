import { describe, it, expect } from 'vitest';
import { EventBus } from '../src/utils/EventBus';

describe('EventBus', () => {
  it('should emit and receive events', () => {
    const bus = new EventBus();
    let received = false;
    bus.on('test', () => { received = true; });
    bus.emit('test');
    expect(received).toBe(true);
  });

  it('should pass arguments correctly', () => {
    const bus = new EventBus();
    let value = 0;
    bus.on('number', (n: number) => { value = n; });
    bus.emit('number', 42);
    expect(value).toBe(42);
  });

  it('should remove listeners correctly', () => {
    const bus = new EventBus();
    let count = 0;
    const handler = () => { count++; };
    bus.on('inc', handler);
    bus.emit('inc');
    bus.off('inc', handler);
    bus.emit('inc');
    expect(count).toBe(1);
  });
});
