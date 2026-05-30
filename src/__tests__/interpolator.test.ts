/**
 * V140 Interpolator Test Suite
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Interpolator } from '../interpolator/Interpolator';
import { InterpolatorRegistry } from '../interpolator/InterpolatorRegistry';
import { InterpolatorExecutor } from '../interpolator/InterpolatorExecutor';
import { InterpolatorMonitor } from '../interpolator/InterpolatorMonitor';

describe('Interpolator', () => {
  let interpolator: Interpolator<number>;

  beforeEach(() => {
    interpolator = new Interpolator<number>();
  });

  it('should interpolate between two numbers', () => {
    const result = interpolator.interpolate(0, 100, 0.5);
    expect(result).toBe(50);
  });

  it('should clamp progress to valid range', () => {
    const result1 = interpolator.interpolate(0, 100, -0.5);
    const result2 = interpolator.interpolate(0, 100, 1.5);
    expect(result1).toBe(0);
    expect(result2).toBe(100);
  });

  it('should track metrics correctly', () => {
    interpolator.interpolate(0, 100, 0.5);
    const stats = interpolator.getStats();
    expect(stats.totalInterpolations).toBe(1);
    expect(stats.successfulInterpolations).toBe(1);
  });

  it('should reset metrics', () => {
    interpolator.interpolate(0, 100, 0.5);
    interpolator.reset();
    const stats = interpolator.getStats();
    expect(stats.totalInterpolations).toBe(0);
    expect(stats.successfulInterpolations).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = interpolator.exportMetrics();
    expect(exported.version).toBe('1.4.0');
    expect(exported.metrics).toBeDefined();
  });

  it('should generate report string', () => {
    const report = interpolator.getReport();
    expect(report).toContain('Interpolator Report');
    expect(report).toContain('Total Interpolations');
  });

  it('should return snapshot with metrics and cache size', () => {
    const snapshot = interpolator.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.cacheSize).toBe(0);
  });
});

describe('InterpolatorRegistry', () => {
  let registry: InterpolatorRegistry;

  beforeEach(() => {
    registry = new InterpolatorRegistry();
  });

  it('should register an interpolator', () => {
    const interp = new Interpolator();
    const result = registry.register('test', interp);
    expect(result).toBe(true);
    expect(registry.has('test')).toBe(true);
  });

  it('should unregister an interpolator', () => {
    const interp = new Interpolator();
    registry.register('test', interp);
    const result = registry.unregister('test');
    expect(result).toBe(true);
    expect(registry.has('test')).toBe(false);
  });

  it('should get interpolator by name', () => {
    const interp = new Interpolator();
    registry.register('test', interp);
    const retrieved = registry.get('test');
    expect(retrieved).toBe(interp);
  });

  it('should return all interpolators', () => {
    registry.register('one', new Interpolator());
    registry.register('two', new Interpolator());
    const all = registry.getAll();
    expect(all.size).toBe(2);
  });

  it('should check if interpolator exists', () => {
    registry.register('exists', new Interpolator());
    expect(registry.has('exists')).toBe(true);
    expect(registry.has('notexists')).toBe(false);
  });

  it('should reset metrics', () => {
    registry.register('test', new Interpolator());
    registry.reset();
    const stats = registry.getStats();
    expect(stats.registeredCount).toBe(0);
    expect(stats.activeCount).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = registry.exportMetrics();
    expect(exported.version).toBe('1.4.0');
  });

  it('should get snapshot with entries', () => {
    registry.register('test', new Interpolator());
    const snapshot = registry.getSnapshot();
    expect(snapshot.entries).toContain('test');
  });
});

describe('InterpolatorExecutor', () => {
  let executor: InterpolatorExecutor;
  let registry: InterpolatorRegistry;

  beforeEach(() => {
    registry = new InterpolatorRegistry();
    executor = new InterpolatorExecutor();
    registry.register('linear', new Interpolator<number>());
    executor.registerInterpolator('linear', registry.get('linear')!);
  });

  it('should execute interpolation', () => {
    const result = executor.execute('linear', 0, 100, 0.5);
    expect(result.success).toBe(true);
    expect(result.data).toBe(50);
  });

  it('should record failed execution', () => {
    const result = executor.execute('nonexistent', 0, 100, 0.5);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should run multiple interpolation steps', () => {
    const steps = [
      { start: 0, end: 50, progress: 0.5 },
      { start: 50, end: 100, progress: 0.5 },
    ];
    const results = executor.run('linear', steps);
    expect(results.length).toBe(2);
    expect(results[0].data).toBe(25);
    expect(results[1].data).toBe(75);
  });

  it('should get all results', () => {
    executor.execute('linear', 0, 100, 0.5);
    const results = executor.getResults();
    expect(results.length).toBe(1);
  });

  it('should reset metrics and results', () => {
    executor.execute('linear', 0, 100, 0.5);
    executor.reset();
    expect(executor.getStats().totalExecutions).toBe(0);
    expect(executor.getResults().length).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = executor.exportMetrics();
    expect(exported.version).toBe('1.4.0');
  });

  it('should get snapshot with counts', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.resultCount).toBe(0);
    expect(snapshot.interpolatorCount).toBe(1);
  });
});

describe('InterpolatorMonitor', () => {
  let monitor: InterpolatorMonitor;
  let executor: InterpolatorExecutor;

  beforeEach(() => {
    executor = new InterpolatorExecutor();
    const registry = new InterpolatorRegistry();
    registry.register('test', new Interpolator<number>());
    executor.registerInterpolator('test', registry.get('test')!);
    monitor = new InterpolatorMonitor(executor);
  });

  it('should track metrics', () => {
    monitor.track('test_metric', 42, { tag: 'value' });
    const metrics = monitor.getMetrics('test_metric');
    expect(metrics.length).toBe(1);
    expect(metrics[0].value).toBe(42);
  });

  it('should get metrics by name', () => {
    monitor.track('metric1', 10);
    monitor.track('metric2', 20);
    const results = monitor.getMetrics('metric1');
    expect(results.length).toBe(1);
    expect(results[0].value).toBe(10);
  });

  it('should get metrics in time range', () => {
    monitor.track('metric', 10);
    const now = Date.now();
    const results = monitor.getMetricsInRange(0, now + 1000);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should get status', () => {
    const status = monitor.getStatus();
    expect(status.isTracking).toBeDefined();
    expect(status.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should reset all metrics', () => {
    monitor.track('test', 100);
    monitor.reset();
    expect(monitor.getMetrics().length).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = monitor.exportMetrics();
    expect(exported.version).toBe('1.4.0');
    expect(exported.metrics).toBeDefined();
  });

  it('should record execution results', () => {
    const result = executor.execute('test', 0, 100, 0.5);
    monitor.recordExecution(result);
    const metrics = monitor.getMetrics('execution.duration');
    expect(metrics.length).toBe(1);
  });

  it('should get metric statistics', () => {
    monitor.track('stat_test', 10);
    monitor.track('stat_test', 20);
    monitor.track('stat_test', 30);
    const stats = monitor.getMetricStats('stat_test');
    expect(stats.count).toBe(3);
    expect(stats.sum).toBe(60);
    expect(stats.avg).toBe(20);
  });
});