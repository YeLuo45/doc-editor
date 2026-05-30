/**
 * V144 SmootherV2 Test Suite
 * Tests for SmootherV2, SmootherRegistryV2, SmootherExecutorV2, and SmootherMonitorV2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SmootherV2 } from '../smoother-v2/SmootherV2';
import { SmootherRegistryV2 } from '../smoother-v2/SmootherRegistryV2';
import { SmootherExecutorV2 } from '../smoother-v2/SmootherExecutorV2';
import { SmootherMonitorV2 } from '../smoother-v2/SmootherMonitorV2';

describe('SmootherV2', () => {
  let smoother: SmootherV2;

  beforeEach(() => {
    smoother = new SmootherV2({
      name: 'test-smoother',
      type: 'adaptive',
      windowSize: 5,
      smoothingFactor: 0.5,
      enableCache: true,
      method: 'moving-average',
    });
  });

  it('should create SmootherV2 with correct config', () => {
    expect(smoother.config.name).toBe('test-smoother');
    expect(smoother.config.windowSize).toBe(5);
    expect(smoother.config.smoothingFactor).toBe(0.5);
  });

  it('should smooth data with moving average', () => {
    const data = [1, 2, 3, 4, 5];
    const result = smoother.smooth(data);
    expect(result.value).toBe(3);
    expect(result.method).toBe('moving-average');
  });

  it('should smooth data with exponential method', () => {
    const data = [1, 2, 3, 4, 5];
    const result = smoother.smooth(data, { method: 'exponential' });
    expect(result.value).toBeGreaterThan(0);
    expect(result.method).toBe('exponential');
  });

  it('should smooth data with weighted method', () => {
    const data = [1, 2, 3, 4, 5];
    const result = smoother.smooth(data, { method: 'weighted' });
    expect(result.value).toBeGreaterThan(0);
    expect(result.method).toBe('weighted');
  });

  it('should smooth data with adaptive method', () => {
    const data = [1, 2, 3, 4, 5];
    const result = smoother.smooth(data, { method: 'adaptive' });
    expect(result.value).toBeGreaterThan(0);
    expect(result.method).toBe('adaptive');
  });

  it('should track stats correctly', () => {
    smoother.smooth([1, 2, 3]);
    smoother.smooth([1, 2, 3, 4, 5]);
    const stats = smoother.getStats();
    expect(stats.totalSmoothingOps).toBe(2);
    expect(stats.successfulOps).toBe(2);
  });

  it('should get snapshot', () => {
    smoother.smooth([1, 2, 3]);
    const snapshot = smoother.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.totalSmoothingOps).toBe(1);
  });

  it('should reset stats and cache', () => {
    smoother.smooth([1, 2, 3]);
    smoother.reset();
    const stats = smoother.getStats();
    expect(stats.totalSmoothingOps).toBe(0);
  });

  it('should get report', () => {
    const report = smoother.getReport();
    expect(report).toContain('SmootherV2 Report');
    expect(report).toContain('test-smoother');
  });

  it('should export metrics', () => {
    const metrics = smoother.exportMetrics();
    expect(metrics.version).toBe('1.44.0');
  });

  it('should get smoother by name', () => {
    const found = smoother.getSmoother('test-smoother');
    expect(found).toBe(smoother);
    const notFound = smoother.getSmoother('non-existent');
    expect(notFound).toBeNull();
  });

  it('should throw error for empty data', () => {
    expect(() => smoother.smooth([])).toThrow('Data array is empty');
  });
});

describe('SmootherRegistryV2', () => {
  let registry: SmootherRegistryV2;
  let smoother: SmootherV2;

  beforeEach(() => {
    registry = new SmootherRegistryV2({ name: 'test-registry' });
    smoother = new SmootherV2({ name: 'smoother-1', method: 'moving-average' });
  });

  it('should register a smoother', () => {
    const result = registry.register(smoother);
    expect(result).toBe(true);
  });

  it('should not register duplicate smoother', () => {
    registry.register(smoother);
    const result = registry.register(smoother);
    expect(result).toBe(false);
  });

  it('should unregister a smoother', () => {
    registry.register(smoother);
    const result = registry.unregister('smoother-1');
    expect(result).toBe(true);
  });

  it('should get smoother by name', () => {
    registry.register(smoother);
    const found = registry.get('smoother-1');
    expect(found).toBe(smoother);
  });

  it('should return all smoothers', () => {
    const smoother2 = new SmootherV2({ name: 'smoother-2', method: 'exponential' });
    registry.register(smoother);
    registry.register(smoother2);
    const all = registry.getAll();
    expect(all.length).toBe(2);
  });

  it('should check if smoother exists', () => {
    registry.register(smoother);
    expect(registry.has('smoother-1')).toBe(true);
    expect(registry.has('non-existent')).toBe(false);
  });

  it('should get stats', () => {
    registry.register(smoother);
    const stats = registry.getStats();
    expect(stats.totalRegistered).toBe(1);
    expect(stats.activeCount).toBe(1);
  });

  it('should get snapshot', () => {
    registry.register(smoother);
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset registry', () => {
    registry.register(smoother);
    registry.reset();
    expect(registry.getAll().length).toBe(0);
  });

  it('should get report', () => {
    registry.register(smoother);
    const report = registry.getReport();
    expect(report).toContain('SmootherRegistryV2 Report');
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.44.0');
  });
});

describe('SmootherExecutorV2', () => {
  let executor: SmootherExecutorV2;
  let smoother: SmootherV2;

  beforeEach(() => {
    executor = new SmootherExecutorV2({ name: 'test-executor' });
    smoother = new SmootherV2({ name: 'exec-smoother', method: 'moving-average' });
  });

  it('should execute a smoothing task', () => {
    const task = executor.execute(smoother, [1, 2, 3]);
    expect(task.id).toBeDefined();
    expect(task.smootherName).toBe('exec-smoother');
  });

  it('should get task by id', () => {
    const task = executor.execute(smoother, [1, 2, 3]);
    const found = executor.getTask(task.id);
    expect(found).toBeDefined();
  });

  it('should get all tasks', () => {
    executor.execute(smoother, [1, 2, 3]);
    const tasks = executor.getAllTasks();
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('should get stats', () => {
    executor.execute(smoother, [1, 2, 3]);
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBeGreaterThanOrEqual(0);
  });

  it('should get snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset executor', () => {
    executor.execute(smoother, [1, 2, 3]);
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBe(0);
  });

  it('should get report', () => {
    const report = executor.getReport();
    expect(report).toContain('SmootherExecutorV2 Report');
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.44.0');
  });
});

describe('SmootherMonitorV2', () => {
  let monitor: SmootherMonitorV2;
  let smoother: SmootherV2;

  beforeEach(() => {
    monitor = new SmootherMonitorV2({ name: 'test-monitor' });
    smoother = new SmootherV2({ name: 'monitor-smoother', method: 'moving-average' });
  });

  it('should track a smoother', () => {
    const result = monitor.track(smoother);
    expect(result).toBe(true);
  });

  it('should not track same smoother twice', () => {
    monitor.track(smoother);
    const result = monitor.track(smoother);
    expect(result).toBe(false);
  });

  it('should get metrics', () => {
    monitor.track(smoother);
    smoother.smooth([1, 2, 3]);
    const metrics = monitor.getMetrics('monitor-smoother');
    expect(metrics.length).toBeGreaterThan(0);
  });

  it('should get history', () => {
    monitor.track(smoother);
    const history = monitor.getHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it('should get status', () => {
    monitor.track(smoother);
    const status = monitor.getStatus('monitor-smoother');
    expect(status.healthy).toBe(true);
    expect(status.lastCheck).toBeDefined();
  });

  it('should get stats', () => {
    monitor.track(smoother);
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(1);
  });

  it('should get snapshot', () => {
    monitor.track(smoother);
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset monitor', () => {
    monitor.track(smoother);
    monitor.reset();
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(0);
  });

  it('should get report', () => {
    monitor.track(smoother);
    const report = monitor.getReport();
    expect(report).toContain('SmootherMonitorV2 Report');
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.44.0');
  });
});