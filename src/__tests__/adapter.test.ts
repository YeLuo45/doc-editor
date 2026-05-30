/**
 * V111 Adapter Tests
 * Tests for Adapter, AdapterRegistry, AdapterExecutor, AdapterMonitor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Adapter, GenericAdapter, AdapterConfig, AdapterStats, AdaptResult } from '../adapter/Adapter';
import { AdapterRegistry, RegistryConfig, RegistryStats } from '../adapter/AdapterRegistry';
import { AdapterExecutor, ExecutorConfig, ExecutionResult, ExecutorStats } from '../adapter/AdapterExecutor';
import { AdapterMonitor, MonitorConfig, MetricPoint, MonitorStatus, MonitorStats } from '../adapter/AdapterMonitor';

describe('Adapter', () => {
  let adapter: GenericAdapter;
  let config: AdapterConfig;

  beforeEach(() => {
    config = {
      id: 'test-adapter-1',
      name: 'TestAdapter',
      version: '1.0.0',
      enabled: true,
      priority: 5,
      timeout: 3000,
      retryCount: 3,
    };
    adapter = new GenericAdapter(config);
  });

  it('should create adapter with config', () => {
    expect(adapter.config).toEqual(config);
    expect(adapter.config.id).toBe('test-adapter-1');
  });

  it('should return adapter stats', () => {
    const stats = adapter.getStats();
    expect(stats.adaptCount).toBe(0);
    expect(stats.convertCount).toBe(0);
    expect(stats.errorCount).toBe(0);
  });

  it('should adapt input successfully', async () => {
    const result = await adapter.adapt<string, string>('test-input');
    expect(result.success).toBe(true);
    expect(result.data).toBe('test-input');
  });

  it('should convert input successfully', async () => {
    const result = await adapter.convert<number, string>(456);
    expect(result.success).toBe(true);
    expect(result.data).toBe(456);
  });

  it('should track adapt count', async () => {
    await adapter.adapt<string, string>('test');
    expect(adapter.getStats().adaptCount).toBe(1);
  });

  it('should get snapshot', () => {
    const snapshot = adapter.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.adaptCount).toBe(0);
  });

  it('should reset stats', async () => {
    await adapter.adapt<string, string>('test');
    adapter.reset();
    expect(adapter.getStats().adaptCount).toBe(0);
  });

  it('should generate report', () => {
    const report = adapter.getReport();
    expect(report).toContain('Adapter Report');
    expect(report).toContain('TestAdapter');
  });

  it('should export metrics', () => {
    const metrics = adapter.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.stats).toBeDefined();
    expect(metrics.config).toEqual(config);
  });
});

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;
  let adapter: GenericAdapter;

  beforeEach(() => {
    registry = new AdapterRegistry({ name: 'TestRegistry', maxAdapters: 10 });
    adapter = new GenericAdapter({
      id: 'reg-test-1',
      name: 'RegistryTestAdapter',
      version: '1.0.0',
      enabled: true,
      priority: 1,
      timeout: 1000,
      retryCount: 1,
    });
  });

  it('should register adapter', () => {
    const result = registry.register(adapter);
    expect(result).toBe(true);
    expect(registry.has('reg-test-1')).toBe(true);
  });

  it('should not register duplicate adapter', () => {
    registry.register(adapter);
    const result = registry.register(adapter);
    expect(result).toBe(false);
  });

  it('should unregister adapter', () => {
    registry.register(adapter);
    const result = registry.unregister('reg-test-1');
    expect(result).toBe(true);
    expect(registry.has('reg-test-1')).toBe(false);
  });

  it('should get adapter by id', () => {
    registry.register(adapter);
    const found = registry.get('reg-test-1');
    expect(found?.config.id).toBe('reg-test-1');
  });

  it('should get all adapters', () => {
    const adapter2 = new GenericAdapter({
      id: 'reg-test-2',
      name: 'Adapter2',
      version: '1.0.0',
      enabled: true,
      priority: 2,
      timeout: 1000,
      retryCount: 1,
    });
    registry.register(adapter);
    registry.register(adapter2);
    const all = registry.getAll();
    expect(all.length).toBe(2);
  });

  it('should return config', () => {
    expect(registry.config.name).toBe('TestRegistry');
  });

  it('should get snapshot', () => {
    registry.register(adapter);
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.registeredCount).toBe(1);
  });

  it('should reset registry', () => {
    registry.register(adapter);
    registry.reset();
    expect(registry.getAll().length).toBe(0);
  });

  it('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('Registry Report');
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.config.name).toBe('TestRegistry');
  });
});

describe('AdapterExecutor', () => {
  let executor: AdapterExecutor;
  let adapter: GenericAdapter;

  beforeEach(() => {
    executor = new AdapterExecutor({ name: 'TestExecutor', maxConcurrency: 3 });
    adapter = new GenericAdapter({
      id: 'exec-test-1',
      name: 'ExecutorTestAdapter',
      version: '1.0.0',
      enabled: true,
      priority: 1,
      timeout: 1000,
      retryCount: 1,
    });
  });

  it('should execute adapter', async () => {
    const result = await executor.execute(adapter, 'test-input');
    expect(result.adapterId).toBe('exec-test-1');
    expect(result.success).toBe(true);
  });

  it('should run adapters sequentially', async () => {
    executor = new AdapterExecutor({ name: 'TestExecutor', parallelExecution: false });
    const adapter2 = new GenericAdapter({
      id: 'exec-test-2',
      name: 'Adapter2',
      version: '1.0.0',
      enabled: true,
      priority: 1,
      timeout: 1000,
      retryCount: 1,
    });
    const results = await executor.run([adapter, adapter2], 'input');
    expect(results.length).toBe(2);
  });

  it('should return config', () => {
    expect(executor.config.name).toBe('TestExecutor');
    expect(executor.config.maxConcurrency).toBe(3);
  });

  it('should get results', async () => {
    await executor.execute(adapter, 'test');
    const results = executor.getResults();
    expect(results.length).toBe(1);
  });

  it('should get stats', () => {
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(0);
  });

  it('should get snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset executor', () => {
    executor.reset();
    expect(executor.getStats().totalExecutions).toBe(0);
  });

  it('should generate report', () => {
    const report = executor.getReport();
    expect(report).toContain('Executor Report');
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.config.name).toBe('TestExecutor');
  });
});

describe('AdapterMonitor', () => {
  let monitor: AdapterMonitor;
  let adapter: GenericAdapter;

  beforeEach(() => {
    monitor = new AdapterMonitor({ name: 'TestMonitor', maxHistorySize: 100 });
    adapter = new GenericAdapter({
      id: 'mon-test-1',
      name: 'MonitorTestAdapter',
      version: '1.0.0',
      enabled: true,
      priority: 1,
      timeout: 1000,
      retryCount: 1,
    });
    monitor.trackAdapter(adapter);
  });

  it('should track metric', () => {
    monitor.track(adapter, 'adaptCount', 1);
    const metrics = monitor.getMetrics('mon-test-1');
    expect(metrics.length).toBe(1);
  });

  it('should get metrics', () => {
    monitor.track(adapter, 'latency', 100);
    const metrics = monitor.getMetrics();
    expect(metrics.length).toBe(1);
  });

  it('should get history', () => {
    monitor.track(adapter, 'count', 1);
    const history = monitor.getHistory('mon-test-1');
    expect(history.length).toBe(1);
  });

  it('should get status', () => {
    const status = monitor.getStatus();
    expect(status).toBe('active');
  });

  it('should pause and resume', () => {
    monitor.pause();
    expect(monitor.getStatus()).toBe('paused');
    monitor.resume();
    expect(monitor.getStatus()).toBe('active');
  });

  it('should reset monitor', () => {
    monitor.reset();
    expect(monitor.getStats().trackedAdapters).toBe(0);
  });

  it('should get report', () => {
    const report = monitor.getReport();
    expect(report).toContain('Monitor Report');
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.stats.status).toBe('active');
  });
});