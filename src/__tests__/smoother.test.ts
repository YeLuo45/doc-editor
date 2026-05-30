/**
 * V142 Smoother Test Suite
 * Tests for Smoother, SmootherRegistry, SmootherExecutor, SmootherMonitor
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Smoother } from '../smoother/Smoother';
import { SmootherRegistry } from '../smoother/SmootherRegistry';
import { SmootherExecutor } from '../smoother/SmootherExecutor';
import { SmootherMonitor } from '../smoother/SmootherMonitor';

describe('Smoother', () => {
  let smoother: Smoother;

  beforeEach(() => {
    smoother = new Smoother({
      name: 'test-smoother',
      type: 'moving-average',
      windowSize: 3,
      smoothingFactor: 0.5,
      enableCache: true,
      method: 'moving-average',
    });
  });

  it('should create smoother with config', () => {
    expect(smoother.config.name).toBe('test-smoother');
    expect(smoother.config.windowSize).toBe(3);
  });

  it('should smooth data with moving-average method', () => {
    const result = smoother.smooth([1, 2, 3, 4, 5]);
    expect(result.value).toBe(4);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.method).toBe('moving-average');
  });

  it('should smooth data with exponential method', () => {
    const result = smoother.smooth([1, 2, 3, 4, 5], { method: 'exponential' });
    expect(result.value).toBeDefined();
    expect(result.method).toBe('exponential');
  });

  it('should smooth data with weighted method', () => {
    const result = smoother.smooth([1, 2, 3, 4, 5], { method: 'weighted' });
    expect(result.value).toBeDefined();
    expect(result.method).toBe('weighted');
  });

  it('should get smoother stats', () => {
    smoother.smooth([1, 2, 3]);
    const stats = smoother.getStats();
    expect(stats.totalSmoothingOps).toBeGreaterThan(0);
    expect(stats.successfulOps).toBe(1);
  });

  it('should get snapshot', () => {
    smoother.smooth([1, 2, 3]);
    const snapshot = smoother.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.totalSmoothingOps).toBe(1);
  });

  it('should reset smoother', () => {
    smoother.smooth([1, 2, 3]);
    smoother.reset();
    const stats = smoother.getStats();
    expect(stats.totalSmoothingOps).toBe(0);
    expect(stats.successfulOps).toBe(0);
  });

  it('should get report', () => {
    smoother.smooth([1, 2, 3]);
    const report = smoother.getReport();
    expect(report).toContain('Smoother Report');
    expect(report).toContain('test-smoother');
  });

  it('should export metrics', () => {
    const metrics = smoother.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should throw error for empty data', () => {
    expect(() => smoother.smooth([])).toThrow('Data array is empty');
  });

  it('should handle single element data', () => {
    const result = smoother.smooth([42]);
    expect(result.value).toBe(42);
    expect(result.confidence).toBe(1);
  });

  it('should cache results', () => {
    smoother.smooth([1, 2, 3]);
    smoother.smooth([1, 2, 3]);
    const stats = smoother.getStats();
    expect(stats.successfulOps).toBe(2);
  });

  it('should get smoother by name', () => {
    const found = smoother.getSmoother('test-smoother');
    expect(found).toBe(smoother);
    const notFound = smoother.getSmoother('non-existent');
    expect(notFound).toBeNull();
  });
});

describe('SmootherRegistry', () => {
  let registry: SmootherRegistry;

  beforeEach(() => {
    registry = new SmootherRegistry({
      name: 'test-registry',
      maxEntries: 10,
      enableValidation: true,
    });
  });

  it('should create registry with config', () => {
    expect(registry.config.name).toBe('test-registry');
    expect(registry.config.maxEntries).toBe(10);
  });

  it('should register smoother', () => {
    const smoother = new Smoother({ name: 'smoother1' });
    const result = registry.register('smoother1', smoother);
    expect(result).toBe(true);
    expect(registry.has('smoother1')).toBe(true);
  });

  it('should unregister smoother', () => {
    const smoother = new Smoother({ name: 'smoother1' });
    registry.register('smoother1', smoother);
    const result = registry.unregister('smoother1');
    expect(result).toBe(true);
    expect(registry.has('smoother1')).toBe(false);
  });

  it('should get smoother', () => {
    const smoother = new Smoother({ name: 'smoother1' });
    registry.register('smoother1', smoother);
    const found = registry.get('smoother1');
    expect(found).toBe(smoother);
  });

  it('should get all smoothers', () => {
    const smoother1 = new Smoother({ name: 'smoother1' });
    const smoother2 = new Smoother({ name: 'smoother2' });
    registry.register('smoother1', smoother1);
    registry.register('smoother2', smoother2);
    const all = registry.getAll();
    expect(all).toHaveLength(2);
  });

  it('should check if smoother exists', () => {
    const smoother = new Smoother({ name: 'smoother1' });
    expect(registry.has('smoother1')).toBe(false);
    registry.register('smoother1', smoother);
    expect(registry.has('smoother1')).toBe(true);
  });

  it('should get registry stats', () => {
    const smoother = new Smoother({ name: 'smoother1' });
    registry.register('smoother1', smoother);
    const stats = registry.getStats();
    expect(stats.totalRegistrations).toBe(1);
    expect(stats.activeSmoothers).toBe(1);
  });

  it('should get snapshot', () => {
    const smoother = new Smoother({ name: 'smoother1' });
    registry.register('smoother1', smoother);
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset registry', () => {
    const smoother = new Smoother({ name: 'smoother1' });
    registry.register('smoother1', smoother);
    registry.reset();
    expect(registry.getAll()).toHaveLength(0);
  });

  it('should get report', () => {
    const smoother = new Smoother({ name: 'smoother1' });
    registry.register('smoother1', smoother);
    const report = registry.getReport();
    expect(report).toContain('SmootherRegistry Report');
    expect(report).toContain('test-registry');
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should throw on duplicate registration', () => {
    const smoother = new Smoother({ name: 'smoother1' });
    registry.register('smoother1', smoother);
    expect(() => registry.register('smoother1', smoother)).toThrow();
  });

  it('should throw when registry is full', () => {
    const smallRegistry = new SmootherRegistry({ name: 'small', maxEntries: 1 });
    smallRegistry.register('s1', new Smoother({ name: 's1' }));
    expect(() => smallRegistry.register('s2', new Smoother({ name: 's2' }))).toThrow();
  });

  it('should get registry size', () => {
    registry.register('s1', new Smoother({ name: 's1' }));
    registry.register('s2', new Smoother({ name: 's2' }));
    expect(registry.size()).toBe(2);
  });

  it('should get registry keys', () => {
    registry.register('s1', new Smoother({ name: 's1' }));
    registry.register('s2', new Smoother({ name: 's2' }));
    const keys = registry.keys();
    expect(keys).toContain('s1');
    expect(keys).toContain('s2');
  });

  it('should clear registry', () => {
    registry.register('s1', new Smoother({ name: 's1' }));
    registry.clear();
    expect(registry.size()).toBe(0);
  });
});

describe('SmootherExecutor', () => {
  let executor: SmootherExecutor;
  let smoother: Smoother;

  beforeEach(() => {
    executor = new SmootherExecutor({
      name: 'test-executor',
      maxConcurrent: 5,
      timeout: 30000,
    });
    smoother = new Smoother({ name: 'test-smoother' });
  });

  it('should create executor with config', () => {
    expect(executor.config.name).toBe('test-executor');
    expect(executor.config.maxConcurrent).toBe(5);
  });

  it('should execute smoothing task', () => {
    const result = executor.execute(smoother, [1, 2, 3, 4, 5]);
    expect(result.value).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should run async smoothing task', async () => {
    const result = await executor.run(smoother, [1, 2, 3, 4, 5]);
    expect(result.value).toBeDefined();
  });

  it('should get executor stats', () => {
    executor.execute(smoother, [1, 2, 3]);
    const stats = executor.getStats();
    expect(stats.totalTasks).toBe(1);
    expect(stats.completedTasks).toBe(1);
  });

  it('should get snapshot', () => {
    executor.execute(smoother, [1, 2, 3]);
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.totalTasks).toBe(1);
  });

  it('should reset executor', () => {
    executor.execute(smoother, [1, 2, 3]);
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalTasks).toBe(0);
    expect(stats.completedTasks).toBe(0);
  });

  it('should get report', () => {
    executor.execute(smoother, [1, 2, 3]);
    const report = executor.getReport();
    expect(report).toContain('SmootherExecutor Report');
    expect(report).toContain('test-executor');
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should get task by id', () => {
    const result = executor.execute(smoother, [1, 2, 3]);
    const tasks = executor.getAllTasks();
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('should clear completed tasks', () => {
    executor.execute(smoother, [1, 2, 3]);
    executor.clearCompletedTasks();
    const tasks = executor.getAllTasks();
    expect(tasks.length).toBe(0);
  });

  it('should get results for task', () => {
    const result = executor.execute(smoother, [1, 2, 3, 4, 5]);
    const tasks = executor.getAllTasks();
    expect(tasks[0].result).toBeDefined();
  });
});

describe('SmootherMonitor', () => {
  let monitor: SmootherMonitor;

  beforeEach(() => {
    monitor = new SmootherMonitor({
      name: 'test-monitor',
      metricsWindow: 3600000,
      enableAlerts: true,
      alertThreshold: 0.9,
    });
  });

  it('should create monitor with config', () => {
    expect(monitor.config.name).toBe('test-monitor');
    expect(monitor.config.metricsWindow).toBe(3600000);
  });

  it('should track metrics', () => {
    monitor.track('cpu_usage', 0.5);
    const metrics = monitor.getMetrics('cpu_usage');
    expect(metrics.length).toBe(1);
    expect(metrics[0].value).toBe(0.5);
  });

  it('should get metrics history', () => {
    monitor.track('cpu_usage', 0.5);
    monitor.track('cpu_usage', 0.6);
    const history = monitor.getHistory(10);
    expect(history.length).toBe(2);
  });

  it('should get monitor status', () => {
    monitor.track('cpu_usage', 0.5);
    const status = monitor.getStatus();
    expect(status.healthy).toBe(true);
    expect(status.message).toBe('Monitor operational');
  });

  it('should get monitor stats', () => {
    monitor.track('cpu_usage', 0.5);
    const stats = monitor.getStats();
    expect(stats.totalTracks).toBe(1);
    expect(stats.activeMetrics).toBe(1);
  });

  it('should get snapshot', () => {
    monitor.track('cpu_usage', 0.5);
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset monitor', () => {
    monitor.track('cpu_usage', 0.5);
    monitor.reset();
    const stats = monitor.getStats();
    expect(stats.totalTracks).toBe(0);
    expect(stats.activeMetrics).toBe(0);
  });

  it('should get report', () => {
    monitor.track('cpu_usage', 0.5);
    const report = monitor.getReport();
    expect(report).toContain('SmootherMonitor Report');
    expect(report).toContain('test-monitor');
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should clear specific metric', () => {
    monitor.track('cpu_usage', 0.5);
    monitor.track('memory_usage', 0.3);
    monitor.clearMetrics('cpu_usage');
    const metrics = monitor.getMetrics('cpu_usage');
    expect(metrics.length).toBe(0);
    const memoryMetrics = monitor.getMetrics('memory_usage');
    expect(memoryMetrics.length).toBe(1);
  });

  it('should clear all metrics', () => {
    monitor.track('cpu_usage', 0.5);
    monitor.track('memory_usage', 0.3);
    monitor.clearMetrics();
    expect(monitor.getMetricNames()).toHaveLength(0);
  });

  it('should get metric names', () => {
    monitor.track('cpu_usage', 0.5);
    monitor.track('memory_usage', 0.3);
    const names = monitor.getMetricNames();
    expect(names).toContain('cpu_usage');
    expect(names).toContain('memory_usage');
  });

  it('should trigger alerts on threshold', () => {
    const alertMonitor = new SmootherMonitor({
      name: 'alert-test',
      enableAlerts: true,
      alertThreshold: 0.5,
    });
    alertMonitor.track('high_metric', 0.95);
    const stats = alertMonitor.getStats();
    expect(stats.alertsTriggered).toBe(1);
  });

  it('should not trigger alerts below threshold', () => {
    const alertMonitor = new SmootherMonitor({
      name: 'no-alert-test',
      enableAlerts: true,
      alertThreshold: 0.9,
    });
    alertMonitor.track('low_metric', 0.5);
    const stats = alertMonitor.getStats();
    expect(stats.alertsTriggered).toBe(0);
  });

  it('should throw error for invalid metric', () => {
    expect(() => monitor.track('', 0.5)).toThrow('Invalid metric name or value');
    expect(() => monitor.track('valid', NaN)).toThrow('Invalid metric name or value');
  });

  it('should handle limit in getHistory', () => {
    for (let i = 0; i < 10; i++) {
      monitor.track('metric', i * 0.1);
    }
    const history = monitor.getHistory(5);
    expect(history.length).toBe(5);
  });

  it('should handle unhealthy status when no metrics', () => {
    const status = monitor.getStatus();
    expect(status.healthy).toBe(false);
    expect(status.message).toBe('No recent metrics');
  });
});