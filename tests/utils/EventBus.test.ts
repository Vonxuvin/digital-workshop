import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus, NamespacedEventBus } from '../../src/utils/EventBus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  afterEach(() => {
    bus.offAll('*');
  });

  it('should emit and receive events', () => {
    let received = false;
    bus.on('test', () => { received = true; });
    bus.emit('test');
    expect(received).toBe(true);
  });

  it('should pass arguments correctly', () => {
    let value = 0;
    bus.on('number', (n: number) => { value = n; });
    bus.emit('number', 42);
    expect(value).toBe(42);
  });

  it('should remove listeners correctly', () => {
    let count = 0;
    const handler = () => { count++; };
    bus.on('inc', handler);
    bus.emit('inc');
    bus.off('inc', handler);
    bus.emit('inc');
    expect(count).toBe(1);
  });

  describe('once', () => {
    it('应只触发一次回调', () => {
      const fn = vi.fn();
      bus.once('test', fn);
      bus.emit('test');
      bus.emit('test');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('once回调应接收参数', () => {
      const fn = vi.fn();
      bus.once('test', fn);
      bus.emit('test', 1, 'a', { b: 2 });
      expect(fn).toHaveBeenCalledWith(1, 'a', { b: 2 });
    });

    it('once回调抛出错误不应影响其他回调', () => {
      const errorFn = vi.fn(() => { throw new Error('test error'); });
      const normalFn = vi.fn();
      bus.on('test', errorFn);
      bus.on('test', normalFn);
      bus.emit('test');
      expect(errorFn).toHaveBeenCalled();
      expect(normalFn).toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('应正确移除指定回调', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      bus.on('test', fn1);
      bus.on('test', fn2);
      bus.off('test', fn1);
      bus.emit('test');
      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });

    it('移除不存在的回调不应报错', () => {
      const fn = vi.fn();
      expect(() => bus.off('test', fn)).not.toThrow();
    });
  });

  describe('offAll', () => {
    it('应移除指定事件的所有回调', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      bus.on('test1', fn1);
      bus.on('test2', fn2);
      bus.offAll('test1');
      bus.emit('test1');
      bus.emit('test2');
      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('回调执行出错时应捕获错误', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorFn = vi.fn(() => { throw new Error('Callback error'); });
      bus.on('test', errorFn);
      expect(() => bus.emit('test')).not.toThrow();
      expect(errorFn).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('应在调用回调前创建快照', () => {
      const fns: vi.Mock[] = [];
      const addFn = vi.fn(() => {
        if (fns.length === 0) {
          bus.on('test', fns[0]);
        }
      });
      fns[0] = vi.fn().mockImplementation(addFn);
      bus.on('test', fns[0]);
      bus.emit('test');
      expect(fns[0]).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('空事件名应正常工作', () => {
      const fn = vi.fn();
      bus.on('', fn);
      bus.emit('');
      expect(fn).toHaveBeenCalled();
    });

    it('特殊字符事件名应正常工作', () => {
      const fn = vi.fn();
      bus.on('test:event.1', fn);
      bus.emit('test:event.1');
      expect(fn).toHaveBeenCalled();
    });

    it('大量回调应正常执行', () => {
      const count = 100;
      const fn = vi.fn();
      for (let i = 0; i < count; i++) {
        bus.on('test', fn);
      }
      bus.emit('test');
      expect(fn).toHaveBeenCalledTimes(count);
    });
  });

  describe('namespace', () => {
    it('createNamespace应返回NamespacedEventBus', () => {
      const ns = bus.createNamespace('test');
      expect(ns).toBeInstanceOf(NamespacedEventBus);
    });

    it('NamespacedEventBus.on应注册事件', () => {
      const ns = bus.createNamespace('test');
      const fn = vi.fn();
      ns.on('test-event', fn);
      bus.emit('test-event', 'data');
      expect(fn).toHaveBeenCalledWith('data');
    });

    it('NamespacedEventBus.off应移除事件', () => {
      const ns = bus.createNamespace('test');
      const fn = vi.fn();
      ns.on('test-event', fn);
      ns.off('test-event');
      bus.emit('test-event');
      expect(fn).not.toHaveBeenCalled();
    });

    it('NamespacedEventBus.once应只触发一次', () => {
      const ns = bus.createNamespace('test');
      const fn = vi.fn();
      ns.once('test-once', fn);
      bus.emit('test-once');
      bus.emit('test-once');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('NamespacedEventBus.emit应正常发射事件', () => {
      const ns = bus.createNamespace('test');
      const fn = vi.fn();
      bus.on('ns-emit', fn);
      ns.emit('ns-emit', 'arg');
      expect(fn).toHaveBeenCalledWith('arg');
    });

    it('NamespacedEventBus.offAll应清理所有事件', () => {
      const ns = bus.createNamespace('test');
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      ns.on('event1', fn1);
      ns.on('event2', fn2);
      ns.offAll();
      bus.emit('event1');
      bus.emit('event2');
      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();
    });

    it('offNamespace应清理命名空间', () => {
      const ns = bus.createNamespace('test');
      const fn = vi.fn();
      ns.on('ns-event', fn);
      bus.offNamespace('test');
      bus.emit('ns-event');
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('应返回正确监听器数量', () => {
      expect(bus.listenerCount('test')).toBe(0);
      bus.on('test', () => {});
      expect(bus.listenerCount('test')).toBe(1);
      bus.on('test', () => {});
      expect(bus.listenerCount('test')).toBe(2);
    });
  });

  describe('destroy', () => {
    it('应清理所有事件', () => {
      const fn = vi.fn();
      bus.on('test', fn);
      bus.destroy();
      bus.emit('test');
      expect(fn).not.toHaveBeenCalled();
    });
  });
});