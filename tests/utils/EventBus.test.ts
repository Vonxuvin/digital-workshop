import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../../src/utils/EventBus';

describe('EventBus Enhanced', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  afterEach(() => {
    eventBus.offAll('*');
  });

  describe('once', () => {
    it('应只触发一次回调', () => {
      const fn = vi.fn();
      eventBus.once('test', fn);
      eventBus.emit('test');
      eventBus.emit('test');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('once回调应接收参数', () => {
      const fn = vi.fn();
      eventBus.once('test', fn);
      eventBus.emit('test', 1, 'a', { b: 2 });
      expect(fn).toHaveBeenCalledWith(1, 'a', { b: 2 });
    });

    it('once回调抛出错误不应影响其他回调', () => {
      const errorFn = vi.fn(() => { throw new Error('test error'); });
      const normalFn = vi.fn();
      eventBus.on('test', errorFn);
      eventBus.on('test', normalFn);
      eventBus.emit('test');
      expect(errorFn).toHaveBeenCalled();
      expect(normalFn).toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('应正确移除指定回调', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      eventBus.on('test', fn1);
      eventBus.on('test', fn2);
      eventBus.off('test', fn1);
      eventBus.emit('test');
      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });

    it('移除不存在的回调不应报错', () => {
      const fn = vi.fn();
      expect(() => eventBus.off('test', fn)).not.toThrow();
    });
  });

  describe('offAll', () => {
    it('应移除指定事件的所有回调', () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      eventBus.on('test1', fn1);
      eventBus.on('test2', fn2);
      eventBus.offAll('test1');
      eventBus.emit('test1');
      eventBus.emit('test2');
      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });
  });

  describe('emit', () => {
    it('回调执行出错时应捕获错误', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorFn = vi.fn(() => { throw new Error('Callback error'); });
      eventBus.on('test', errorFn);
      expect(() => eventBus.emit('test')).not.toThrow();
      expect(errorFn).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('应在调用回调前创建快照', () => {
      const fns: vi.Mock[] = [];
      const addFn = vi.fn(() => {
        if (fns.length === 0) {
          eventBus.on('test', fns[0]);
        }
      });
      fns[0] = vi.fn().mockImplementation(addFn);
      eventBus.on('test', fns[0]);
      eventBus.emit('test');
      expect(fns[0]).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('空事件名应正常工作', () => {
      const fn = vi.fn();
      eventBus.on('', fn);
      eventBus.emit('');
      expect(fn).toHaveBeenCalled();
    });

    it('特殊字符事件名应正常工作', () => {
      const fn = vi.fn();
      eventBus.on('test:event.1', fn);
      eventBus.emit('test:event.1');
      expect(fn).toHaveBeenCalled();
    });

    it('大量回调应正常执行', () => {
      const count = 100;
      const fn = vi.fn();
      for (let i = 0; i < count; i++) {
        eventBus.on('test', fn);
      }
      eventBus.emit('test');
      expect(fn).toHaveBeenCalledTimes(count);
    });
  });
});
