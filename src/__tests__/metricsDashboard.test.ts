/**
 * MetricsDashboard Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerfProfiler } from '../performance/PerfProfiler';
import { MetricsDashboard } from '../performance/MetricsDashboard';

describe('MetricsDashboard', () => {
  let profiler: PerfProfiler;
  let dashboard: MetricsDashboard;

  beforeEach(() => {
    profiler = new PerfProfiler('test-dashboard');
    profiler.clearMetrics();
    dashboard = new MetricsDashboard(profiler);
  });

  describe('registerModule', () => {
    it('should register a module to a category', () => {
      dashboard.registerModule('customModule', 'Hook');
      profiler.recordMetric('customModule', 10, 100);

      const kpi = dashboard.getModuleKPI('customModule');
      expect(kpi!.category).toBe('Hook');
    });
  });

  describe('getModuleKPI', () => {
    it('should return null for unknown module', () => {
      const kpi = dashboard.getModuleKPI('unknown');
      expect(kpi).toBeNull();
    });

    it('should return correct KPI structure', () => {
      profiler.recordMetric('testModule', 100, 1024 * 1024);

      const kpi = dashboard.getModuleKPI('testModule');
      expect(kpi).toMatchObject({
        moduleName: 'testModule',
        callCount: 1,
        avgExecutionTime: 100,
        totalExecutionTime: 100,
        healthScore: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('getAllKPIs', () => {
    it('should return KPIs for all modules with metrics', () => {
      profiler.recordMetric('module1', 10, 100);
      profiler.recordMetric('module2', 20, 200);

      const kpis = dashboard.getAllKPIs();
      expect(kpis.length).toBe(2);
    });

    it('should return empty array when no metrics', () => {
      const kpis = dashboard.getAllKPIs();
      expect(kpis).toEqual([]);
    });
  });

  describe('getKPIsByCategory', () => {
    it('should group KPIs by category', () => {
      profiler.recordMetric('hookRegistry', 10, 100);
      profiler.recordMetric('mcpServer', 20, 200);

      const byCategory = dashboard.getKPIsByCategory();
      expect(byCategory.has('Hook')).toBe(true);
      expect(byCategory.has('MCP')).toBe(true);
    });
  });

  describe('getCategoryKPI', () => {
    it('should return null for empty category', () => {
      const kpi = dashboard.getCategoryKPI('Other');
      expect(kpi).toBeNull();
    });

    it('should aggregate KPIs for a category', () => {
      profiler.recordMetric('hookRegistry', 100, 1024);
      profiler.recordMetric('hookLifecycle', 200, 2048);

      const categoryKPI = dashboard.getCategoryKPI('Hook');
      expect(categoryKPI).not.toBeNull();
      expect(categoryKPI!.category).toBe('Hook');
      expect(categoryKPI!.totalCalls).toBe(2);
      expect(categoryKPI!.moduleCount).toBe(2);
    });
  });

  describe('getAllCategoryKPIs', () => {
    it('should return KPI summaries for all categories', () => {
      const allKPIs = dashboard.getAllCategoryKPIs();
      expect(Array.isArray(allKPIs)).toBe(true);
    });
  });

  describe('getTopModulesByCalls', () => {
    it('should return top N modules by call count', () => {
      profiler.recordMetric('module1', 10, 100);
      profiler.recordMetric('module2', 10, 100);
      profiler.recordMetric('module3', 10, 100);
      profiler.recordMetric('module1', 10, 100);

      const top = dashboard.getTopModulesByCalls(2);
      expect(top.length).toBeLessThanOrEqual(2);
      expect(top[0].callCount).toBeGreaterThanOrEqual(top[1]?.callCount ?? 0);
    });
  });

  describe('getTopModulesByTime', () => {
    it('should return top N modules by execution time', () => {
      profiler.recordMetric('slowModule', 1000, 100);
      profiler.recordMetric('fastModule', 10, 100);

      const top = dashboard.getTopModulesByTime(1);
      expect(top[0].moduleName).toBe('slowModule');
    });
  });

  describe('getTopModulesByMemory', () => {
    it('should return top N modules by memory usage', () => {
      profiler.recordMetric('heavyModule', 10, 10 * 1024 * 1024);
      profiler.recordMetric('lightModule', 10, 1024);

      const top = dashboard.getTopModulesByMemory(1);
      expect(top[0].moduleName).toBe('heavyModule');
    });
  });

  describe('getSnapshot', () => {
    it('should return dashboard snapshot with all fields', () => {
      profiler.recordMetric('testModule', 100, 1024);

      const snapshot = dashboard.getSnapshot();
      expect(snapshot).toMatchObject({
        timestamp: expect.any(Number),
        totalModules: expect.any(Number),
        categories: expect.any(Array),
        topModules: expect.any(Array),
        overallHealthScore: expect.any(Number),
      });
    });

    it('should include modules in topModules', () => {
      profiler.recordMetric('testModule', 100, 1024);

      const snapshot = dashboard.getSnapshot();
      expect(snapshot.topModules.length).toBeGreaterThan(0);
    });
  });

  describe('saveSnapshot / getSnapshots', () => {
    it('should save and retrieve snapshots', () => {
      profiler.recordMetric('testModule', 100, 1024);
      dashboard.saveSnapshot();

      const snapshots = dashboard.getSnapshots();
      expect(snapshots.length).toBe(1);
    });

    it('should limit stored snapshots to max', () => {
      for (let i = 0; i < 150; i++) {
        dashboard.saveSnapshot();
      }

      const snapshots = dashboard.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(100);
    });
  });

  describe('clearSnapshots', () => {
    it('should clear all snapshots', () => {
      dashboard.saveSnapshot();
      dashboard.clearSnapshots();

      expect(dashboard.getSnapshots()).toEqual([]);
    });
  });

  describe('healthScore calculation', () => {
    it('should calculate health score based on memory and time', () => {
      profiler.recordMetric('healthyModule', 10, 1024);

      const kpi = dashboard.getModuleKPI('healthyModule');
      expect(kpi!.healthScore).toBe(100);
    });

    it('should penalize high memory usage', () => {
      profiler.recordMetric('heavyModule', 10, 100 * 1024 * 1024);

      const kpi = dashboard.getModuleKPI('heavyModule');
      expect(kpi!.healthScore).toBeLessThan(100);
    });
  });

  describe('getProfiler', () => {
    it('should return the underlying profiler', () => {
      expect(dashboard.getProfiler()).toBe(profiler);
    });
  });
});