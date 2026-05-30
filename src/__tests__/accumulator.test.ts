/**
 * V115 Accumulator Test Suite
 * Tests for Accumulator, AccumulatorRegistry, AccumulatorExecutor, AccumulatorMonitor
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  Accumulator,
  AccumulatorConfig,
  AccumulatorRegistry,
  RegistryConfig,
  AccumulatorExecutor,
  ExecutorConfig,
  AccumulatorMonitor,
  MonitorConfig,
} from '../accumulator';

describe('Accumulator', () => {
  let accumulator: Accumulator;

  beforeEach(() => {
    const config: AccumulatorConfig = { id: 'test-1', name: 'TestAccumulator' };
    accumulator = new Accumulator(config);
  });

  it('should create with config', () => {
    expect(accumulator.config).toBeDefined();
    expect(accumulator.config.id).toBe('test-1');
    expect(accumulator.config.name).toBe('TestAccumulator');
  });

  it('should accumulate items', () => {
    const result = accumulator.accumulate('key1', 'value1');
    expect(result).toBe(true);
    expect(accumulator.size()).toBe(1);
  });

  it('should add items if not exists', () => {
    accumulator.add('key1', 'value1');
    expect(accumulator.getResult('key1')).toBe('value1');
    expect(accumulator.add('key1', 'value2')).toBe(false);
  });

  it('should remove items', () => {
    accumulator.add('key1', 'value1');
    expect(accumulator.remove('key1')).toBe(true);
    expect(accumulator.has('key1')).toBe(false);
    expect(accumulator.remove('nonexistent')).toBe(false);
  });

  it('should get stats correctly', () => {
    accumulator.add('key1', 'value1');
    accumulator.add('key2', 'value2');
    const stats = accumulator.getStats();
    expect(stats.totalItems).toBe(2);
    expect(stats.addedCount).toBe(2);
  });

  it('should get snapshot', () => {
    accumulator.add('key1', 'value1');
    const snapshot = accumulator.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
    expect(snapshot.items).toHaveLength(1);
  });

  it('should reset', () => {
    accumulator.add('key1', 'value1');
    accumulator.reset();
    expect(accumulator.size()).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = accumulator.exportMetrics();
    expect(metrics.version).toBe('v115');
    expect(metrics.totalItems).toBeDefined();
  });

  it('should generate report', () => {
    const report = accumulator.getReport();
    expect(report).toContain('Accumulator Report');
    expect(report).toContain('TestAccumulator');
  });

  it('should respect maxSize config', () => {
    const smallAccumulator = new Accumulator({ id: 'small', name: 'Small', maxSize: 2 });
    smallAccumulator.add('a', 1);
    smallAccumulator.add('b', 2);
    smallAccumulator.add('c', 3);
    expect(smallAccumulator.size()).toBe(2);
  });

  it('should clear all items', () => {
    accumulator.add('key1', 'value1');
    accumulator.add('key2', 'value2');
    accumulator.clear();
    expect(accumulator.size()).toBe(0);
  });
});

describe('AccumulatorRegistry', () => {
  let registry: AccumulatorRegistry;

  beforeEach(() => {
    const config: RegistryConfig = { namespace: 'test-namespace' };
    registry = new AccumulatorRegistry(config);
  });

  it('should create with config', () => {
    expect(registry.config).toBeDefined();
    expect(registry.config.namespace).toBe('test-namespace');
  });

  it('should register accumulators', () => {
    const acc = registry.register({ id: 'acc1', name: 'Acc1' });
    expect(acc).toBeDefined();
    expect(registry.has('acc1')).toBe(true);
  });

  it('should unregister accumulators', () => {
    registry.register({ id: 'acc1', name: 'Acc1' });
    expect(registry.unregister('acc1')).toBe(true);
    expect(registry.has('acc1')).toBe(false);
  });

  it('should get accumulators by id', () => {
    registry.register({ id: 'acc1', name: 'Acc1' });
    const acc = registry.get('acc1');
    expect(acc).toBeDefined();
    expect(acc?.config.id).toBe('acc1');
  });

  it('should get all accumulator ids', () => {
    registry.register({ id: 'acc1', name: 'Acc1' });
    registry.register({ id: 'acc2', name: 'Acc2' });
    const all = registry.getAll();
    expect(all).toContain('acc1');
    expect(all).toContain('acc2');
  });

  it('should throw on duplicate registration', () => {
    registry.register({ id: 'acc1', name: 'Acc1' });
    expect(() => registry.register({ id: 'acc1', name: 'Acc1' })).toThrow();
  });

  it('should get stats', () => {
    registry.register({ id: 'acc1', name: 'Acc1' });
    const stats = registry.getStats();
    expect(stats.registeredCount).toBe(1);
  });

  it('should find by name', () => {
    registry.register({ id: 'acc1', name: 'MyAccumulator' });
    const found = registry.findByName('MyAccumulator');
    expect(found?.config.id).toBe('acc1');
  });

  it('should reset', () => {
    const acc = registry.register({ id: 'acc1', name: 'Acc1' });
    acc.add('k', 'v');
    registry.reset();
    expect(registry.get('acc1')?.size()).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('v115');
  });

  it('should get report', () => {
    const report = registry.getReport();
    expect(report).toContain('Accumulator Registry Report');
  });

  it('should get snapshot', () => {
    registry.register({ id: 'acc1', name: 'Acc1' });
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.accumulatorIds).toContain('acc1');
  });
});

describe('AccumulatorExecutor', () => {
  let registry: AccumulatorRegistry;
  let executor: AccumulatorExecutor;

  beforeEach(() => {
    const regConfig: RegistryConfig = { namespace: 'exec-test' };
    registry = new AccumulatorRegistry(regConfig);
    
    const acc = registry.register({ id: 'exec-acc', name: 'ExecAcc' });
    acc.add('key1', 'value1');
    
    const execConfig: ExecutorConfig = { id: 'executor-1' };
    executor = new AccumulatorExecutor(execConfig, registry);
  });

  it('should create with config', () => {
    expect(executor.config).toBeDefined();
    expect(executor.config.id).toBe('executor-1');
  });

  it('should execute callbacks', () => {
    const result = executor.execute('exec-acc', (acc) => acc.size());
    expect(result.success).toBe(true);
    expect(result.data).toBe(1);
  });

  it('should run operations', () => {
    const result = executor.run('exec-acc', 'add', 'key2', 'value2');
    expect(result.success).toBe(true);
  });

  it('should handle failed execution', () => {
    const result = executor.execute('nonexistent', (acc) => acc.size());
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should get results', () => {
    executor.execute('exec-acc', (acc) => acc.size());
    const results = executor.getResults();
    expect(results.length).toBeGreaterThan(0);
  });

  it('should get stats', () => {
    executor.execute('exec-acc', (acc) => acc.size());
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successfulExecutions).toBe(1);
  });

  it('should reset', () => {
    executor.execute('exec-acc', (acc) => acc.size());
    executor.reset();
    expect(executor.getStats().totalExecutions).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('v115');
  });

  it('should get report', () => {
    const report = executor.getReport();
    expect(report).toContain('Accumulator Executor Report');
  });

  it('should get snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  it('should get successful and failed results', () => {
    executor.execute('exec-acc', (acc) => acc.size());
    executor.execute('nonexistent', (acc) => acc.size());
    expect(executor.getSuccessfulResults().length).toBe(1);
    expect(executor.getFailedResults().length).toBe(1);
  });
});

describe('AccumulatorMonitor', () => {
  let monitor: AccumulatorMonitor;

  beforeEach(() => {
    const config: MonitorConfig = { interval: 1000 };
    monitor = new AccumulatorMonitor(config);
  });

  it('should create with config', () => {
    expect(monitor.config).toBeDefined();
    expect(monitor.config.interval).toBe(1000);
  });

  it('should track metrics', () => {
    monitor.track('metric-1', 100);
    expect(monitor.getMetrics().trackedCount).toBe(1);
  });

  it('should get metrics for id', () => {
    monitor.track('metric-1', 100);
    monitor.track('metric-1', 200);
    const metrics = monitor.getMetricsForId('metric-1');
    expect(metrics?.totalDataPoints).toBe(2);
  });

  it('should get history', () => {
    monitor.track('metric-1', 100);
    monitor.track('metric-1', 200);
    const history = monitor.getHistory('metric-1');
    expect(history).toHaveLength(2);
  });

  it('should get status', () => {
    monitor.track('metric-1', 100);
    expect(monitor.getStatus('metric-1')).toBe('active');
    expect(monitor.getStatus('nonexistent')).toBe('inactive');
  });

  it('should get snapshot', () => {
    monitor.track('metric-1', 100);
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.trackedIds).toContain('metric-1');
  });

  it('should reset', () => {
    monitor.track('metric-1', 100);
    monitor.reset();
    expect(monitor.getMetrics().trackedCount).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('v115');
  });

  it('should get report', () => {
    monitor.track('metric-1', 100);
    const report = monitor.getReport();
    expect(report).toContain('Accumulator Monitor Report');
  });

  it('should get tracked ids', () => {
    monitor.track('metric-1', 100);
    monitor.track('metric-2', 200);
    const ids = monitor.getTrackedIds();
    expect(ids).toContain('metric-1');
    expect(ids).toContain('metric-2');
  });

  it('should get latest value', () => {
    monitor.track('metric-1', 100);
    monitor.track('metric-1', 200);
    expect(monitor.getLatestValue('metric-1')).toBe(200);
  });

  it('should set status', () => {
    monitor.setStatus('metric-1', 'error');
    expect(monitor.getStatus('metric-1')).toBe('error');
  });

  it('should clear history', () => {
    monitor.track('metric-1', 100);
    monitor.clearHistory('metric-1');
    expect(monitor.getHistory('metric-1')).toHaveLength(0);
  });

  it('should track with numeric values and compute avg/min/max', () => {
    monitor.track('metric-1', 100);
    monitor.track('metric-1', 200);
    monitor.track('metric-1', 300);
    const metrics = monitor.getMetricsForId('metric-1');
    expect(metrics?.averageValue).toBe(200);
    expect(metrics?.minValue).toBe(100);
    expect(metrics?.maxValue).toBe(300);
  });
});