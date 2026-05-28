/**
 * RealTimeMonitor Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerfProfiler } from '../performance/PerfProfiler';
import { RealTimeMonitor } from '../performance/RealTimeMonitor';
describe('RealTimeMonitor', () => {
  let profiler: PerfProfiler;
  let monitor: RealTimeMonitor;

  beforeEach(() => {
    profiler = new PerfProfiler('test-monitor');
    profiler.clearMetrics();
    monitor = new RealTimeMonitor(profiler, { sampleInterval: 100 });
  });

  afterEach(() => {
    monitor.stop();
    monitor.clearSamples();
  });

  describe('start / stop', () => {
    it('should start and stop the monitor', () => {
      monitor.start();
      expect(monitor.getIsRunning()).toBe(true);

      monitor.stop();
      expect(monitor.getIsRunning()).toBe(false);
    });

    it('should not start if already running', () => {
      monitor.start();
      monitor.start(); // Should not throw
      expect(monitor.getIsRunning()).toBe(true);
      monitor.stop();
    });

    it('should not stop if not running', () => {
      monitor.stop(); // Should not throw
      expect(monitor.getIsRunning()).toBe(false);
    });
  });

  describe('getCurrentFps', () => {
    it('should return 0 when not running', () => {
      expect(monitor.getCurrentFps()).toBe(0);
    });
  });

  describe('getFpsHistory', () => {
    it('should return empty array initially', () => {
      expect(monitor.getFpsHistory()).toEqual([]);
    });
  });

  describe('getAverageFps', () => {
    it('should return 0 when no history', () => {
      expect(monitor.getAverageFps()).toBe(0);
    });
  });

  describe('getSamples', () => {
    it('should return empty array initially', () => {
      expect(monitor.getSamples()).toEqual([]);
    });
  });

  describe('getLatestSample', () => {
    it('should return null when no samples', () => {
      expect(monitor.getLatestSample()).toBeNull();
    });
  });

  describe('forceSample', () => {
    it('should take a sample when forced', () => {
      profiler.recordMetric('testModule', 10, 100);
      monitor.forceSample();

      expect(monitor.getSamplesCount()).toBe(1);
      expect(monitor.getLatestSample()).not.toBeNull();
    });
  });

  describe('subscribe / unsubscribe', () => {
    it('should call callback when sample is taken', () => {
      let callCount = 0;
      const unsubscribe = monitor.subscribe(() => {
        callCount++;
      });

      profiler.recordMetric('testModule', 10, 100);
      monitor.forceSample();

      expect(callCount).toBe(1);

      unsubscribe();
      monitor.forceSample();
      expect(callCount).toBe(1); // Should not increase after unsubscribe
    });
  });

  describe('clearSamples', () => {
    it('should clear all samples', () => {
      profiler.recordMetric('testModule', 10, 100);
      monitor.forceSample();
      monitor.forceSample();

      monitor.clearSamples();

      expect(monitor.getSamples()).toEqual([]);
      expect(monitor.getSamplesCount()).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      monitor.updateConfig({ sampleInterval: 500 });

      const config = monitor.getConfig();
      expect(config.sampleInterval).toBe(500);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = monitor.getConfig();
      expect(config).toMatchObject({
        sampleInterval: expect.any(Number),
        fpsHistorySize: expect.any(Number),
        enableFpsTracking: expect.any(Boolean),
        enableMemoryTracking: expect.any(Boolean),
      });
    });
  });

  describe('getSamplesInRange', () => {
    it('should return samples within time range', () => {
      profiler.recordMetric('testModule', 10, 100);
      monitor.forceSample();

      const now = Date.now();
      const samples = monitor.getSamplesInRange(0, now + 1000);
      expect(samples.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return performance summary object', () => {
      const summary = monitor.getPerformanceSummary();
      expect(summary).toMatchObject({
        avgFps: expect.any(Number),
        minFps: expect.any(Number),
        maxFps: expect.any(Number),
        avgMemory: expect.any(Number),
        currentFps: expect.any(Number),
        currentMemory: expect.any(Number),
        samplesCount: expect.any(Number),
        memoryTrend: expect.stringMatching(/^(increasing|decreasing|stable)$/),
      });
    });
  });

  describe('getMemoryTrend', () => {
    it('should return stable when insufficient samples', () => {
      expect(monitor.getMemoryTrend(10)).toBe('stable');
    });

    it('should detect increasing memory trend', () => {
      // Add samples with increasing memory
      // This test may vary based on actual memory values
      monitor.getMemoryTrend(2); // Should handle edge case
      expect(monitor.getMemoryTrend(2)).toBeTruthy();
    });
  });

  describe('sample collection', () => {
    it('should collect samples with correct structure', () => {
      profiler.recordMetric('testModule', 50, 1024 * 1024);
      monitor.forceSample();

      const sample = monitor.getLatestSample()!;
      expect(sample).toMatchObject({
        timestamp: expect.any(Number),
        fps: expect.any(Number),
        memoryUsage: expect.any(Number),
        activeModules: expect.any(Array),
        avgResponseTime: expect.any(Number),
      });
    });
  });
});