/**
 * Comparator Test Suite - V135
 * Tests for Comparator, ComparatorRegistry, ComparatorExecutor, ComparatorMonitor
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Comparator } from '../comparator/Comparator';
import { ComparatorRegistry } from '../comparator/ComparatorRegistry';
import { ComparatorExecutor } from '../comparator/ComparatorExecutor';
import { ComparatorMonitor } from '../comparator/ComparatorMonitor';

describe('Comparator', () => {
  let comparator: Comparator;

  beforeEach(() => {
    comparator = new Comparator({
      strictMode: true,
      ignoreWhitespace: false,
      ignoreCase: false,
      maxDepth: 10,
    });
  });

  afterEach(() => {
    comparator.reset();
  });

  it('should compare equal primitive values', () => {
    const result = comparator.compare(1, 1);
    expect(result.equal).toBe(true);
    expect(result.differences).toHaveLength(0);
  });

  it('should detect inequality in primitive values', () => {
    const result = comparator.compare(1, 2);
    expect(result.equal).toBe(false);
    expect(result.differences.length).toBeGreaterThan(0);
  });

  it('should compare equal strings', () => {
    const result = comparator.compare('hello', 'hello');
    expect(result.equal).toBe(true);
  });

  it('should compare objects with same properties', () => {
    const left = { name: 'test', value: 42 };
    const right = { name: 'test', value: 42 };
    const result = comparator.compare(left, right);
    expect(result.equal).toBe(true);
  });

  it('should detect nested object differences', () => {
    const left = { nested: { a: 1 } };
    const right = { nested: { a: 2 } };
    const result = comparator.compare(left, right);
    expect(result.equal).toBe(false);
  });

  it('should compare arrays with same elements', () => {
    const result = comparator.compare([1, 2, 3], [1, 2, 3]);
    expect(result.equal).toBe(true);
  });

  it('should detect array length differences', () => {
    const result = comparator.compare([1, 2], [1, 2, 3]);
    expect(result.equal).toBe(false);
  });

  it('should get stats after comparisons', () => {
    comparator.compare(1, 1);
    comparator.compare(1, 2);
    const stats = comparator.getStats();
    expect(stats.totalComparisons).toBe(2);
    expect(stats.successfulComparisons).toBe(1);
    expect(stats.failedComparisons).toBe(1);
  });

  it('should reset state correctly', () => {
    comparator.compare(1, 1);
    comparator.reset();
    const stats = comparator.getStats();
    expect(stats.totalComparisons).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = comparator.exportMetrics();
    expect(metrics.version).toBe('V135');
    expect(metrics).toHaveProperty('totalComparisons');
  });

  it('should generate snapshot with timestamp', () => {
    const snapshot = comparator.getSnapshot();
    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should generate report string', () => {
    comparator.compare(1, 1);
    const report = comparator.getReport();
    expect(report).toContain('Comparator Report');
    expect(report).toContain('Total');
    expect(report).toContain('Success');
    expect(report).toContain('Time');
  });

  it('should return comparator instance from getComparator', () => {
    const instance = comparator.getComparator();
    expect(instance).toBe(comparator);
  });

  it('should handle null values correctly', () => {
    const result = comparator.compare(null, null);
    expect(result.equal).toBe(true);
  });

  it('should detect null vs non-null difference', () => {
    const result = comparator.compare(null, 1);
    expect(result.equal).toBe(false);
  });
});

describe('ComparatorRegistry', () => {
  let registry: ComparatorRegistry;

  beforeEach(() => {
    registry = new ComparatorRegistry({
      maxComparators: 10,
      allowOverride: false,
      enableAutoRegister: true,
    });
  });

  afterEach(() => {
    registry.reset();
  });

  it('should register a comparator', () => {
    const comparator = new Comparator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    const result = registry.register('test', comparator);
    expect(result).toBe(true);
  });

  it('should not register duplicate without override', () => {
    const comparator = new Comparator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', comparator);
    const result = registry.register('test', comparator);
    expect(result).toBe(false);
  });

  it('should unregister a comparator', () => {
    const comparator = new Comparator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', comparator);
    const result = registry.unregister('test');
    expect(result).toBe(true);
  });

  it('should return undefined for unregistered comparator', () => {
    const result = registry.get('nonexistent');
    expect(result).toBeUndefined();
  });

  it('should check if comparator exists', () => {
    const comparator = new Comparator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', comparator);
    expect(registry.has('test')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('should get all registered comparators', () => {
    const comparator = new Comparator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test1', comparator);
    registry.register('test2', comparator);
    const all = registry.getAll();
    expect(all.size).toBe(2);
  });

  it('should get stats', () => {
    const comparator = new Comparator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', comparator);
    const stats = registry.getStats();
    expect(stats.totalRegistered).toBe(1);
  });

  it('should clear all comparators', () => {
    const comparator = new Comparator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', comparator);
    registry.clear();
    expect(registry.has('test')).toBe(false);
  });

  it('should reset registry', () => {
    const comparator = new Comparator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 5 });
    registry.register('test', comparator);
    registry.reset();
    const stats = registry.getStats();
    expect(stats.totalRegistered).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('V135');
  });

  it('should generate snapshot with timestamp', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot.timestamp).toBeDefined();
  });

  it('should generate report string', () => {
    const report = registry.getReport();
    expect(report).toContain('Comparator Registry Report');
  });
});

describe('ComparatorExecutor', () => {
  let executor: ComparatorExecutor;
  let comparator: Comparator;

  beforeEach(() => {
    executor = new ComparatorExecutor({
      maxBatchSize: 5,
      enableParallel: false,
      timeout: 1000,
    });
    comparator = new Comparator({ strictMode: true, ignoreWhitespace: false, ignoreCase: false, maxDepth: 10 });
  });

  afterEach(() => {
    executor.reset();
  });

  it('should execute comparison', () => {
    const result = executor.execute(comparator, { a: 1 }, { a: 1 });
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  it('should track failed execution on error', () => {
    const badComparator = { compare: () => { throw new Error('Test error'); } } as any;
    const result = executor.execute(badComparator, { a: 1 }, { a: 2 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Test error');
  });

  it('should run multiple pairs sequentially', async () => {
    const pairs = [
      { left: 1, right: 1 },
      { left: 2, right: 2 },
      { left: 3, right: 3 },
    ];
    const results = await executor.run(comparator, pairs);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('should get results map', () => {
    executor.execute(comparator, 1, 1, 'test1');
    executor.execute(comparator, 2, 2, 'test2');
    const results = executor.getResults();
    expect(results.size).toBe(2);
  });

  it('should get executor stats', () => {
    executor.execute(comparator, 1, 1);
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBe(1);
    expect(stats.successfulExecutions).toBe(1);
  });

  it('should reset executor state', () => {
    executor.execute(comparator, 1, 1);
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('V135');
  });

  it('should generate snapshot with timestamp', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.timestamp).toBeDefined();
  });

  it('should generate report string', () => {
    const report = executor.getReport();
    expect(report).toContain('Comparator Executor Report');
  });
});

describe('ComparatorMonitor', () => {
  let monitor: ComparatorMonitor;

  beforeEach(() => {
    monitor = new ComparatorMonitor({
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
    monitor.recordMetric('comparison', 100);
    monitor.recordMetric('success', 1);
    monitor.recordMetric('error', 0);
    const metrics = monitor.getMetrics();
    expect(metrics.comparisonsTotal).toBe(1);
    expect(metrics.successRate).toBe(1);
  });

  it('should get history with limit', () => {
    monitor.track('op1', 'test');
    monitor.track('op2', 'test');
    monitor.track('op3', 'test');
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
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(1);
    expect(stats.activeTrackers).toBe(1);
  });

  it('should reset monitor state', () => {
    monitor.track('op1', 'test');
    monitor.reset();
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V135');
  });

  it('should generate snapshot with timestamp', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot.timestamp).toBeDefined();
  });

  it('should generate report string', () => {
    const report = monitor.getReport();
    expect(report).toContain('Comparator Monitor Report');
  });
});