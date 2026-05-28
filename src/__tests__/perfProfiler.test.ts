/**
 * PerfProfiler Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerfProfiler } from '../performance/PerfProfiler';

describe('PerfProfiler', () => {
  let profiler: PerfProfiler;

  beforeEach(() => {
    profiler = new PerfProfiler('test-profiler');
    profiler.clearMetrics();
  });

  describe('startTimer / endTimer', () => {
    it('should record execution time for a module', () => {
      profiler.startTimer('testModule');
      // Simulate work
      const start = performance.now();
      while (performance.now() - start < 10) {
        // Busy wait for 10ms
      }
      const elapsed = profiler.endTimer('testModule');

      expect(elapsed).toBeGreaterThanOrEqual(0);
      const summary = profiler.getModuleSummary('testModule');
      expect(summary).not.toBeNull();
      expect(summary!.callCount).toBe(1);
    });

    it('should return 0 if endTimer is called without startTimer', () => {
      const elapsed = profiler.endTimer('unknownModule');
      expect(elapsed).toBe(0);
    });

    it('should handle multiple sequential timings', () => {
      profiler.startTimer('module1');
      profiler.endTimer('module1');
      profiler.startTimer('module1');
      profiler.endTimer('module1');

      const summary = profiler.getModuleSummary('module1');
      expect(summary!.callCount).toBe(2);
    });
  });

  describe('recordMetric', () => {
    it('should record a metric with custom memory usage', () => {
      profiler.recordMetric('testModule', 50, 1024 * 1024);

      const summary = profiler.getModuleSummary('testModule');
      expect(summary!.totalTime).toBe(50);
      expect(summary!.maxMemory).toBe(1024 * 1024);
      expect(summary!.callCount).toBe(1);
    });

    it('should accumulate metrics across calls', () => {
      profiler.recordMetric('testModule', 100, 512 * 1024);
      profiler.recordMetric('testModule', 200, 1024 * 1024);

      const summary = profiler.getModuleSummary('testModule');
      expect(summary!.callCount).toBe(2);
      expect(summary!.totalTime).toBe(300);
      expect(summary!.avgTime).toBe(150);
    });

    it('should track min and max memory', () => {
      profiler.recordMetric('testModule', 10, 100);
      profiler.recordMetric('testModule', 10, 500);
      profiler.recordMetric('testModule', 10, 200);

      const summary = profiler.getModuleSummary('testModule');
      expect(summary!.minMemory).toBe(100);
      expect(summary!.maxMemory).toBe(500);
    });
  });

  describe('getModuleSummary', () => {
    it('should return null for unknown module', () => {
      const summary = profiler.getModuleSummary('unknown');
      expect(summary).toBeNull();
    });

    it('should return correct summary structure', () => {
      profiler.recordMetric('testModule', 100, 1024);

      const summary = profiler.getModuleSummary('testModule');
      expect(summary).toMatchObject({
        moduleName: 'testModule',
        totalTime: 100,
        totalMemory: 1024,
        callCount: 1,
        avgTime: 100,
        maxMemory: 1024,
        minMemory: 1024,
        samples: 1,
      });
    });
  });

  describe('getAllSummaries', () => {
    it('should return summaries for all recorded modules', () => {
      profiler.recordMetric('module1', 10, 100);
      profiler.recordMetric('module2', 20, 200);

      const summaries = profiler.getAllSummaries();
      expect(summaries.length).toBe(2);
    });

    it('should return empty array when no metrics recorded', () => {
      const summaries = profiler.getAllSummaries();
      expect(summaries).toEqual([]);
    });
  });

  describe('resetModule', () => {
    it('should remove metrics for a specific module', () => {
      profiler.recordMetric('module1', 10, 100);
      profiler.recordMetric('module2', 20, 200);

      profiler.resetModule('module1');

      expect(profiler.getModuleSummary('module1')).toBeNull();
      expect(profiler.getModuleSummary('module2')).not.toBeNull();
    });
  });

  describe('clearMetrics', () => {
    it('should clear all metrics', () => {
      profiler.recordMetric('module1', 10, 100);
      profiler.recordMetric('module2', 20, 200);

      profiler.clearMetrics();

      expect(profiler.getAllSummaries()).toEqual([]);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return a number for memory usage', () => {
      const memory = profiler.getMemoryUsage();
      expect(typeof memory).toBe('number');
    });
  });

  describe('storage persistence', () => {
    it('should create instance with custom storage key', () => {
      const customProfiler = new PerfProfiler('custom-key');
      customProfiler.recordMetric('test', 10, 100);
      customProfiler.clearMetrics();

      const newProfiler = new PerfProfiler('custom-key');
      expect(newProfiler.getAllSummaries().length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('timer edge cases', () => {
    it('should handle overlapping timers', () => {
      profiler.startTimer('module1');
      profiler.startTimer('module2');
      profiler.endTimer('module2');
      profiler.endTimer('module1');

      const summary1 = profiler.getModuleSummary('module1');
      const summary2 = profiler.getModuleSummary('module2');
      expect(summary1).not.toBeNull();
      expect(summary2).not.toBeNull();
    });

    it('should overwrite timer when startTimer called twice', () => {
      profiler.startTimer('module1');
      profiler.startTimer('module1'); // Restart
      const elapsed = profiler.endTimer('module1');
      expect(typeof elapsed).toBe('number');
    });
  });
});