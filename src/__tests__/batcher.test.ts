/**
 * V116 Batcher Tests
 * Tests for Batcher, BatcherRegistry, BatcherExecutor, BatcherMonitor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Batcher, BatcherConfig } from '../batcher/Batcher';
import { BatcherRegistry, RegistryConfig } from '../batcher/BatcherRegistry';
import { BatcherExecutor, ExecutorConfig } from '../batcher/BatcherExecutor';
import { BatcherMonitor, MonitorConfig } from '../batcher/BatcherMonitor';

describe('Batcher', () => {
  let batcher: Batcher;

  beforeEach(() => {
    const config: BatcherConfig = {
      name: 'test-batcher',
      maxSize: 5,
      flushInterval: 0,
    };
    batcher = new Batcher(config);
  });

  it('should create with config', () => {
    expect(batcher.config.name).toBe('test-batcher');
    expect(batcher.config.maxSize).toBe(5);
  });

  it('should add items', () => {
    batcher.add('item1');
    expect(batcher.getBatch()).toHaveLength(1);
  });

  it('should batch add items', () => {
    batcher.batch(['item1', 'item2', 'item3']);
    expect(batcher.getBatch()).toHaveLength(3);
  });

  it('should flush items', () => {
    batcher.add('item1');
    const flushed = batcher.flush();
    expect(flushed).toEqual(['item1']);
    expect(batcher.getBatch()).toHaveLength(0);
  });

  it('should get stats', () => {
    batcher.add('item1');
    batcher.add('item2');
    const stats = batcher.getStats();
    expect(stats.totalAdded).toBe(2);
    expect(stats.currentSize).toBe(2);
  });

  it('should auto flush when max size reached', () => {
    const config: BatcherConfig = {
      name: 'auto-flush',
      maxSize: 2,
      flushInterval: 0,
    };
    const b = new Batcher(config);
    b.add('1');
    b.add('2');
    const stats = b.getStats();
    expect(stats.totalFlushed).toBe(1);
  });

  it('should get snapshot', () => {
    batcher.add('item');
    const snap = batcher.getSnapshot();
    expect(snap.metrics.totalAdded).toBe(1);
    expect(snap.itemCount).toBe(1);
  });

  it('should reset', () => {
    batcher.add('item');
    batcher.reset();
    expect(batcher.getBatch()).toHaveLength(0);
    expect(batcher.getStats().totalAdded).toBe(0);
  });

  it('should generate report', () => {
    const report = batcher.getReport();
    expect(report).toContain('Batcher Report');
    expect(report).toContain('test-batcher');
  });

  it('should export metrics', () => {
    const metrics = batcher.exportMetrics();
    expect(metrics.version).toBe('1.16.0');
    expect(metrics.name).toBe('test-batcher');
    expect(metrics.stats).toBeDefined();
  });
});

describe('BatcherRegistry', () => {
  let registry: BatcherRegistry;

  beforeEach(() => {
    registry = new BatcherRegistry();
  });

  it('should register batcher', () => {
    const config: BatcherConfig = { name: 'reg1', maxSize: 5, flushInterval: 0 };
    const batcher = new Batcher(config);
    const result = registry.register('batch1', batcher);
    expect(result).toBe(true);
  });

  it('should not register duplicate names', () => {
    const config: BatcherConfig = { name: 'dup', maxSize: 5, flushInterval: 0 };
    const b1 = new Batcher({ ...config, name: 'b1' });
    const b2 = new Batcher({ ...config, name: 'b1' });
    registry.register('same', b1);
    const result = registry.register('same', b2);
    expect(result).toBe(false);
  });

  it('should unregister batcher', () => {
    const config: BatcherConfig = { name: 'unreg', maxSize: 5, flushInterval: 0 };
    const batcher = new Batcher(config);
    registry.register('toRemove', batcher);
    const removed = registry.unregister('toRemove');
    expect(removed).toBe(true);
    expect(registry.has('toRemove')).toBe(false);
  });

  it('should get batcher', () => {
    const config: BatcherConfig = { name: 'getme', maxSize: 5, flushInterval: 0 };
    const batcher = new Batcher(config);
    registry.register('getTest', batcher);
    const found = registry.get('getTest');
    expect(found).toBe(batcher);
  });

  it('should get all names', () => {
    registry.registerWithConfig('r1', { name: 'r1', maxSize: 5, flushInterval: 0 });
    registry.registerWithConfig('r2', { name: 'r2', maxSize: 5, flushInterval: 0 });
    const names = registry.getAll();
    expect(names).toContain('r1');
    expect(names).toContain('r2');
  });

  it('should check has', () => {
    registry.registerWithConfig('exists', { name: 'exists', maxSize: 5, flushInterval: 0 });
    expect(registry.has('exists')).toBe(true);
    expect(registry.has('notexists')).toBe(false);
  });

  it('should get snapshot', () => {
    registry.registerWithConfig('snap', { name: 'snap', maxSize: 5, flushInterval: 0 });
    const snap = registry.getSnapshot();
    expect(snap.metrics.totalRegistered).toBe(1);
  });

  it('should reset', () => {
    registry.registerWithConfig('resetme', { name: 'resetme', maxSize: 5, flushInterval: 0 });
    registry.reset();
    expect(registry.getAll()).toHaveLength(0);
  });

  it('should get report', () => {
    const report = registry.getReport();
    expect(report).toContain('BatcherRegistry');
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.16.0');
  });
});

describe('BatcherExecutor', () => {
  let executor: BatcherExecutor;
  let batcher: Batcher;

  beforeEach(() => {
    const config: ExecutorConfig = {
      name: 'exec-test',
      maxConcurrent: 2,
      timeout: 0,
    };
    executor = new BatcherExecutor(config);
    batcher = new Batcher({ name: 'exec-batch', maxSize: 5, flushInterval: 0 });
  });

  it('should execute single batcher', async () => {
    batcher.add('item1');
    const result = await executor.execute(batcher);
    expect(result.batcherName).toBe('exec-batch');
    expect(result.items).toContain('item1');
    expect(result.success).toBe(true);
  });

  it('should run multiple batchers', async () => {
    const batchers = [batcher];
    const results = await executor.run(batchers);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should get results', async () => {
    batcher.add('result-item');
    await executor.execute(batcher);
    const results = executor.getResults();
    expect(results.length).toBe(1);
  });

  it('should get stats', async () => {
    batcher.add('stats-item');
    await executor.execute(batcher);
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBe(1);
    expect(stats.totalSucceeded).toBe(1);
  });

  it('should get snapshot', () => {
    const snap = executor.getSnapshot();
    expect(snap.running).toBeDefined();
    expect(snap.metrics).toBeDefined();
  });

  it('should reset', async () => {
    batcher.add('reset-item');
    await executor.execute(batcher);
    executor.reset();
    expect(executor.getResults()).toHaveLength(0);
  });

  it('should get report', () => {
    const report = executor.getReport();
    expect(report).toContain('BatcherExecutor');
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.16.0');
    expect(metrics.name).toBe('exec-test');
  });
});

describe('BatcherMonitor', () => {
  let monitor: BatcherMonitor;
  let batcher: Batcher;

  beforeEach(() => {
    const config: MonitorConfig = {
      name: 'monitor-test',
      historySize: 10,
      interval: 0,
    };
    monitor = new BatcherMonitor(config);
    batcher = new Batcher({ name: 'mon-batch', maxSize: 5, flushInterval: 0 });
  });

  it('should track batcher', () => {
    monitor.track(batcher);
    expect(monitor.getStatus().total).toBe(1);
  });

  it('should get metrics', () => {
    monitor.track(batcher);
    batcher.add('met-item');
    const metrics = monitor.getMetrics();
    expect(metrics.has('mon-batch')).toBe(true);
  });

  it('should get history', () => {
    monitor.track(batcher);
    batcher.add('hist-item');
    const history = monitor.getHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  it('should get history with limit', () => {
    monitor.track(batcher);
    batcher.add('limit-item');
    const limited = monitor.getHistory(5);
    expect(limited.length).toBeLessThanOrEqual(5);
  });

  it('should get status', () => {
    monitor.track(batcher);
    const status = monitor.getStatus();
    expect(status.total).toBe(1);
    expect(status.healthy).toBeDefined();
    expect(status.unhealthy).toBeDefined();
  });

  it('should get snapshot', () => {
    monitor.track(batcher);
    const snap = monitor.getSnapshot();
    expect(snap.trackedCount).toBe(1);
  });

  it('should reset', () => {
    monitor.track(batcher);
    monitor.reset();
    expect(monitor.getStatus().total).toBe(0);
  });

  it('should get report', () => {
    const report = monitor.getReport();
    expect(report).toContain('BatcherMonitor');
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.16.0');
    expect(metrics.name).toBe('monitor-test');
  });
});