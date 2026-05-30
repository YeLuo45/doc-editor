/**
 * Differentiator Test Suite - V136
 * Tests for Differentiator, DifferentiatorRegistry, DifferentiatorExecutor, DifferentiatorMonitor
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Differentiator } from '../differentiator/Differentiator';
import { DifferentiatorRegistry } from '../differentiator/DifferentiatorRegistry';
import { DifferentiatorExecutor } from '../differentiator/DifferentiatorExecutor';
import { DifferentiatorMonitor } from '../differentiator/DifferentiatorMonitor';

describe('Differentiator', () => {
  let differentiator: Differentiator;

  beforeEach(() => {
    differentiator = new Differentiator({
      strictMode: true,
      ignoreWhitespace: false,
      ignoreCase: false,
      maxDepth: 10,
    });
  });

  afterEach(() => {
    differentiator.reset();
  });

  it('should differentiate equal primitive values', () => {
    const result = differentiator.differentiate(1, 1);
    expect(result.different).toBe(false);
    expect(result.differences).toHaveLength(0);
  });

  it('should detect inequality in primitive values', () => {
    const result = differentiator.differentiate(1, 2);
    expect(result.different).toBe(true);
    expect(result.differences.length).toBeGreaterThan(0);
  });

  it('should differentiate equal strings', () => {
    const result = differentiator.differentiate('hello', 'hello');
    expect(result.different).toBe(false);
  });

  it('should differentiate objects with same properties', () => {
    const left = { name: 'test', value: 42 };
    const right = { name: 'test', value: 42 };
    const result = differentiator.differentiate(left, right);
    expect(result.different).toBe(false);
  });

  it('should detect nested object differences', () => {
    const left = { nested: { a: 1 } };
    const right = { nested: { a: 2 } };
    const result = differentiator.differentiate(left, right);
    expect(result.different).toBe(true);
  });

  it('should differentiate arrays with same elements', () => {
    const result = differentiator.differentiate([1, 2, 3], [1, 2, 3]);
    expect(result.different).toBe(false);
  });

  it('should detect array length differences', () => {
    const result = differentiator.differentiate([1, 2], [1, 2, 3]);
    expect(result.different).toBe(true);
  });

  it('should get stats after differentiations', () => {
    differentiator.differentiate(1, 1);
    differentiator.differentiate(1, 2);
    const stats = differentiator.getStats();
    expect(stats.totalDifferentiation).toBe(2);
    expect(stats.successfulDifferentiation).toBe(1);
    expect(stats.failedDifferentiation).toBe(1);
  });

  it('should reset state correctly', () => {
    differentiator.differentiate(1, 1);
    differentiator.reset();
    const stats = differentiator.getStats();
    expect(stats.totalDifferentiation).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = differentiator.exportMetrics();
    expect(metrics.version).toBe('V136');
    expect(metrics).toHaveProperty('totalDifferentiation');
  });

  it('should generate snapshot with timestamp', () => {
    const snapshot = differentiator.getSnapshot();
    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should generate report string', () => {
    differentiator.differentiate(1, 1);
    const report = differentiator.getReport();
    expect(report).toContain('Differentiator Report');
    expect(report).toContain('Total');
    expect(report).toContain('Success');
    expect(report).toContain('Time');
  });

  it('should return differentiator instance from getDifferentiator', () => {
    const instance = differentiator.getDifferentiator();
    expect(instance).toBe(differentiator);
  });

  it('should handle null values correctly', () => {
    const result = differentiator.differentiate(null, null);
    expect(result.different).toBe(false);
  });

  it('should detect null vs non-null difference', () => {
    const result = differentiator.differentiate(null, 1);
    expect(result.different).toBe(true);
  });
});

describe('DifferentiatorRegistry', () => {
  let registry: DifferentiatorRegistry;

  beforeEach(() => {
    registry = new DifferentiatorRegistry({
      maxRegistrations: 10,
      allowOverride: false,
      enableAutoRegister: true,
    });
  });

  afterEach(() => {
    registry.reset();
  });

  it('should register a differentiator', () => {
    const differentiator = new Differentiator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    const result = registry.register('test', differentiator);
    expect(result).toBe(true);
  });

  it('should not register duplicate without override', () => {
    const differentiator = new Differentiator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', differentiator);
    const result = registry.register('test', differentiator);
    expect(result).toBe(false);
  });

  it('should unregister a differentiator', () => {
    const differentiator = new Differentiator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', differentiator);
    const result = registry.unregister('test');
    expect(result).toBe(true);
  });

  it('should return undefined for unregistered differentiator', () => {
    const result = registry.get('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should check if differentiator exists', () => {
    const differentiator = new Differentiator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', differentiator);
    expect(registry.has('test')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('should get all registered differentiators', () => {
    const differentiator = new Differentiator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test1', differentiator);
    registry.register('test2', differentiator);
    const all = registry.getAll();
    expect(all.size).toBe(2);
  });

  it('should get stats', () => {
    const differentiator = new Differentiator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', differentiator);
    const stats = registry.getStats();
    expect(stats.totalRegistered).toBe(1);
  });

  it('should clear all differentiators', () => {
    const differentiator = new Differentiator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', differentiator);
    registry.clear();
    expect(registry.has('test')).toBe(false);
  });

  it('should reset registry', () => {
    const differentiator = new Differentiator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', differentiator);
    registry.reset();
    const stats = registry.getStats();
    expect(stats.totalRegistered).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('V136');
  });

  it('should generate snapshot with timestamp', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot.timestamp).toBeDefined();
  });

  it('should generate report string', () => {
    const report = registry.getReport();
    expect(report).toContain('Differentiator Registry Report');
  });
});

describe('DifferentiatorExecutor', () => {
  let executor: DifferentiatorExecutor;
  let differentiator: Differentiator;

  beforeEach(() => {
    executor = new DifferentiatorExecutor({
      maxBatchSize: 5,
      enableParallel: false,
      timeout: 1000,
    });
    differentiator = new Differentiator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 10 });
  });

  afterEach(() => {
    executor.reset();
  });

  it('should execute differentiation', () => {
    const result = executor.execute(differentiator, { a: 1 }, { a: 1 });
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  it('should track failed execution on error', () => {
    const badDifferentiator = { differentiate: () => { throw new Error('Test error'); } } as any;
    const result = executor.execute(badDifferentiator, { a: 1 }, { a: 2 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Test error');
  });

  it('should run multiple pairs sequentially', async () => {
    const pairs = [
      { left: 1, right: 1 },
      { left: 2, right: 2 },
      { left: 3, right: 3 },
    ];
    const results = await executor.run(differentiator, pairs);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('should get results map', () => {
    executor.execute(differentiator, 1, 1, 'test1');
    executor.execute(differentiator, 2, 2, 'test2');
    const results = executor.getResults();
    expect(results.size).toBe(2);
  });

  it('should get executor stats', () => {
    executor.execute(differentiator, 1, 1);
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBe(1);
    expect(stats.successfulExecutions).toBe(1);
  });

  it('should reset executor state', () => {
    executor.execute(differentiator, 1, 1);
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('V136');
  });

  it('should generate snapshot with timestamp', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.timestamp).toBeDefined();
  });

  it('should generate report string', () => {
    const report = executor.getReport();
    expect(report).toContain('Differentiator Executor Report');
  });
});

describe('DifferentiatorMonitor', () => {
  let monitor: DifferentiatorMonitor;

  beforeEach(() => {
    monitor = new DifferentiatorMonitor({
      maxHistorySize: 100,
      enableMetrics: true,
      enableHistory: true,
      samplingRate: 1.0,
    });
  });

  afterEach(() => {
    monitor.reset();
  });

  it('should track operation', () => {
    const entry = monitor.track('op1', 'test-operation');
    expect(entry.id).toBe('op1');
    expect(entry.name).toBe('test-operation');
    expect(entry.startTime).toBeDefined();
  });

  it('should complete tracked operation', () => {
    monitor.track('op1', 'test');
    monitor.complete('op1');
    const history = monitor.getHistory();
    expect(history[0].endTime).toBeDefined();
  });

  it('should record metrics', () => {
    monitor.recordMetric('comparisonsTotal', 1);
    monitor.recordMetric('differencesTotal', 0);
    const metrics = monitor.getMetrics();
    expect(metrics.comparisonsTotal).toBe(1);
    expect(metrics.successRate).toBe(1);
  });

  it('should get history with limit', () => {
    monitor.track('op1', 'test');
    monitor.complete('op1');
    monitor.track('op2', 'test');
    monitor.complete('op2');
    monitor.track('op3', 'test');
    monitor.complete('op3');
    const history = monitor.getHistory(2);
    expect(history).toHaveLength(2);
  });

  it('should get status', () => {
    monitor.track('op1', 'test');
    const status = monitor.getStatus();
    expect(status.isActive).toBe(true);
    expect(status.totalTracked).toBe(1);
  });

  it('should get monitor stats', () => {
    monitor.track('op1', 'test');
    monitor.complete('op1');
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(1);
    expect(stats.completedTrackers).toBe(1);
  });

  it('should reset monitor state', () => {
    monitor.track('op1', 'test');
    monitor.reset();
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V136');
  });

  it('should generate snapshot with timestamp', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot.timestamp).toBeDefined();
  });

  it('should generate report string', () => {
    const report = monitor.getReport();
    expect(report).toContain('Differentiator Monitor Report');
  });
});