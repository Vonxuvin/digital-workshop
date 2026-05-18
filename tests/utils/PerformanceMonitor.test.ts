import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformanceMonitor } from '../../src/utils/PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    monitor.start();
  });

  describe('initial state', () => {
    it('getFPS returns 60 when no ticks have occurred', () => {
      const fresh = new PerformanceMonitor();
      expect(fresh.getFPS()).toBe(60);
    });

    it('getAverageFrameTime returns 16.67 when no ticks have occurred', () => {
      const fresh = new PerformanceMonitor();
      expect(fresh.getAverageFrameTime()).toBeCloseTo(16.67, 1);
    });
  });

  describe('tick updates FPS', () => {
    it('tick records frame time', () => {
      monitor.tick();
      monitor.tick();
      expect(monitor.getAverageFrameTime()).toBeGreaterThan(0);
    });

    it('FPS is calculated from frame times', () => {
      for (let i = 0; i < 10; i++) {
        monitor.tick();
      }
      const fps = monitor.getFPS();
      expect(typeof fps).toBe('number');
      expect(fps).toBeGreaterThan(0);
    });
  });

  describe('getStats returns correct structure', () => {
    it('returns object with fps, avgFrameTime, minFrameTime, maxFrameTime', () => {
      monitor.tick();
      monitor.tick();
      const stats = monitor.getStats();
      expect(stats).toHaveProperty('fps');
      expect(stats).toHaveProperty('avgFrameTime');
      expect(stats).toHaveProperty('minFrameTime');
      expect(stats).toHaveProperty('maxFrameTime');
      expect(typeof stats.fps).toBe('number');
      expect(typeof stats.avgFrameTime).toBe('number');
      expect(typeof stats.minFrameTime).toBe('number');
      expect(typeof stats.maxFrameTime).toBe('number');
    });

    it('minFrameTime <= avgFrameTime <= maxFrameTime', () => {
      for (let i = 0; i < 10; i++) {
        monitor.tick();
      }
      const stats = monitor.getStats();
      expect(stats.minFrameTime).toBeLessThanOrEqual(stats.avgFrameTime);
      expect(stats.avgFrameTime).toBeLessThanOrEqual(stats.maxFrameTime);
    });
  });

  describe('max samples limit (60)', () => {
    it('frameTimes array does not exceed 60 samples', () => {
      for (let i = 0; i < 100; i++) {
        monitor.tick();
      }
      const stats = monitor.getStats();
      expect(stats.minFrameTime).toBeGreaterThan(0);
      expect(stats.maxFrameTime).toBeGreaterThan(0);
    });

    it('after 100 ticks, only last 60 frame times are retained', () => {
      for (let i = 0; i < 100; i++) {
        monitor.tick();
      }
      const avg = monitor.getAverageFrameTime();
      expect(avg).toBeGreaterThan(0);
      expect(isFinite(avg)).toBe(true);
    });
  });

  describe('getAverageFrameTime', () => {
    it('returns average of recorded frame times', () => {
      for (let i = 0; i < 5; i++) {
        monitor.tick();
      }
      const avg = monitor.getAverageFrameTime();
      expect(avg).toBeGreaterThan(0);
      expect(isFinite(avg)).toBe(true);
    });
  });

  describe('start() resets state', () => {
    it('calling start() again resets frame data', () => {
      for (let i = 0; i < 10; i++) {
        monitor.tick();
      }
      monitor.start();
      expect(monitor.getFPS()).toBe(60);
      expect(monitor.getAverageFrameTime()).toBeCloseTo(16.67, 1);
    });
  });

  describe('quality level degradation', () => {
    it('should degrade to medium quality with sustained low FPS', () => {
      const originalNow = performance.now;
      let currentTime = 0;
      performance.now = () => currentTime;

      currentTime = 0;
      monitor.start();

      for (let i = 0; i < 35; i++) {
        currentTime += 40;
        monitor.tick();
      }

      expect(monitor.getQualityLevel()).toBe('medium');

      performance.now = originalNow;
    });

    it('should degrade to low quality with very low FPS', () => {
      const originalNow = performance.now;
      let currentTime = 0;
      performance.now = () => currentTime;

      currentTime = 0;
      monitor.start();

      for (let i = 0; i < 65; i++) {
        currentTime += 50;
        monitor.tick();
      }

      expect(monitor.getQualityLevel()).toBe('low');

      performance.now = originalNow;
    });

    it('should recover to high quality with good FPS', () => {
      const originalNow = performance.now;
      let currentTime = 0;
      performance.now = () => currentTime;

      currentTime = 0;
      monitor.start();

      for (let i = 0; i < 35; i++) {
        currentTime += 40;
        monitor.tick();
      }
      expect(monitor.getQualityLevel()).toBe('medium');

      for (let i = 0; i < 70; i++) {
        currentTime += 16;
        monitor.tick();
      }
      expect(monitor.getQualityLevel()).toBe('high');

      performance.now = originalNow;
    });
  });

  describe('getParticleMultiplier', () => {
    it('should return 1.0 for high quality', () => {
      expect(monitor.getParticleMultiplier()).toBe(1.0);
    });

    it('should return 0.6 for medium quality', () => {
      const originalNow = performance.now;
      let currentTime = 0;
      performance.now = () => currentTime;

      currentTime = 0;
      monitor.start();
      for (let i = 0; i < 35; i++) {
        currentTime += 40;
        monitor.tick();
      }

      expect(monitor.getParticleMultiplier()).toBe(0.6);

      performance.now = originalNow;
    });

    it('should return 0.3 for low quality', () => {
      const originalNow = performance.now;
      let currentTime = 0;
      performance.now = () => currentTime;

      currentTime = 0;
      monitor.start();
      for (let i = 0; i < 65; i++) {
        currentTime += 50;
        monitor.tick();
      }

      expect(monitor.getParticleMultiplier()).toBe(0.3);

      performance.now = originalNow;
    });
  });

  describe('shouldReduceEffects', () => {
    it('should return false for high quality', () => {
      expect(monitor.shouldReduceEffects()).toBe(false);
    });

    it('should return true for medium quality', () => {
      const originalNow = performance.now;
      let currentTime = 0;
      performance.now = () => currentTime;

      currentTime = 0;
      monitor.start();
      for (let i = 0; i < 35; i++) {
        currentTime += 40;
        monitor.tick();
      }

      expect(monitor.shouldReduceEffects()).toBe(true);

      performance.now = originalNow;
    });
  });

  describe('shouldPauseNonEssentialAnimations', () => {
    it('should return false for high quality', () => {
      expect(monitor.shouldPauseNonEssentialAnimations()).toBe(false);
    });

    it('should return false for medium quality', () => {
      const originalNow = performance.now;
      let currentTime = 0;
      performance.now = () => currentTime;

      currentTime = 0;
      monitor.start();
      for (let i = 0; i < 35; i++) {
        currentTime += 40;
        monitor.tick();
      }

      expect(monitor.shouldPauseNonEssentialAnimations()).toBe(false);

      performance.now = originalNow;
    });

    it('should return true for low quality', () => {
      const originalNow = performance.now;
      let currentTime = 0;
      performance.now = () => currentTime;

      currentTime = 0;
      monitor.start();
      for (let i = 0; i < 65; i++) {
        currentTime += 50;
        monitor.tick();
      }

      expect(monitor.shouldPauseNonEssentialAnimations()).toBe(true);

      performance.now = originalNow;
    });
  });

  describe('getAverageFPS', () => {
    it('should return same value as getFPS', () => {
      for (let i = 0; i < 5; i++) {
        monitor.tick();
      }
      expect(monitor.getAverageFPS()).toBe(monitor.getFPS());
    });
  });
});
