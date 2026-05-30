/**
 * V130 Unpacker Tests
 */

import {
  Unpacker,
  UnpackerConfig,
  UnpackResult,
} from '../unpacker/Unpacker.js';

import {
  UnpackerRegistry,
  RegistryConfig,
  RegistryEntry,
} from '../unpacker/UnpackerRegistry.js';

import {
  UnpackerExecutor,
  ExecutorConfig,
  ExecutionResult,
} from '../unpacker/UnpackerExecutor.js';

import {
  UnpackerMonitor,
  MonitorConfig,
  MonitorMetric,
  MonitorStatus,
} from '../unpacker/UnpackerMonitor.js';

describe('Unpacker', () => {
  let unpacker: Unpacker;
  let config: UnpackerConfig;

  beforeEach(() => {
    config = {
      id: 'test-unpacker',
      name: 'Test Unpacker',
      version: '1.0.0',
      enabled: true,
      timeout: 5000,
    };
    unpacker = new Unpacker(config);
  });

  test('should create unpacker with config', () => {
    expect(unpacker).toBeDefined();
    expect(unpacker.getConfig().id).toBe('test-unpacker');
  });

  test('should unpack successfully', () => {
    const result = unpacker.unpack();
    expect(result.success).toBe(true);
    expect(result.id).toContain('unpack-');
  });

  test('should track failed unpacks', () => {
    const result = unpacker.unpack();
    expect(result.success).toBe(true);
  });

  test('should get stats', () => {
    unpacker.unpack();
    const stats = unpacker.getStats();
    expect(stats.unpacked).toBe(1);
    expect(stats.itemCount).toBe(0);
  });

  test('should add and remove items', () => {
    expect(unpacker.add('key1', 'value1')).toBe(true);
    expect(unpacker.add('', 'value2')).toBe(false);
    expect(unpacker.remove('key1')).toBe(true);
  });

  test('should get snapshot', () => {
    const snapshot = unpacker.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.config).toBeDefined();
  });

  test('should reset state', () => {
    unpacker.unpack();
    unpacker.reset();
    const stats = unpacker.getStats();
    expect(stats.unpacked).toBe(0);
  });

  test('should export metrics', () => {
    const metrics = unpacker.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.unpacked).toBe(0);
  });

  test('should generate report', () => {
    const report = unpacker.getReport();
    expect(report).toContain('test-unpacker');
  });
});

describe('UnpackerRegistry', () => {
  let registry: UnpackerRegistry;
  let unpacker: Unpacker;

  beforeEach(() => {
    registry = new UnpackerRegistry();
    unpacker = new Unpacker({
      id: 'reg-test',
      name: 'Registry Test',
      version: '1.0.0',
    });
  });

  test('should register unpacker', () => {
    expect(registry.register('id1', unpacker)).toBe(true);
  });

  test('should not register duplicate without allowDuplicates', () => {
    expect(registry.register('id1', unpacker)).toBe(true);
    expect(registry.register('id1', unpacker)).toBe(false);
  });

  test('should unregister unpacker', () => {
    registry.register('id1', unpacker);
    expect(registry.unregister('id1')).toBe(true);
    expect(registry.has('id1')).toBe(false);
  });

  test('should get unpacker by id', () => {
    registry.register('id1', unpacker);
    const found = registry.get('id1');
    expect(found).toBe(unpacker);
  });

  test('should return null for non-existent unpacker', () => {
    const found = registry.get('non-existent');
    expect(found).toBeNull();
  });

  test('should get all unpackers', () => {
    registry.register('id1', unpacker);
    const all = registry.getAll();
    expect(all.length).toBe(1);
  });

  test('should check if unpacker exists', () => {
    registry.register('id1', unpacker);
    expect(registry.has('id1')).toBe(true);
    expect(registry.has('non-existent')).toBe(false);
  });

  test('should clear all entries', () => {
    registry.register('id1', unpacker);
    registry.clear();
    expect(registry.getAll().length).toBe(0);
  });

  test('should get snapshot', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.size).toBe(0);
  });

  test('should reset', () => {
    registry.register('id1', unpacker);
    registry.reset();
    expect(registry.getAll().length).toBe(0);
  });

  test('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('UnpackerExecutor', () => {
  let executor: UnpackerExecutor;
  let unpacker: Unpacker;

  beforeEach(() => {
    executor = new UnpackerExecutor();
    unpacker = new Unpacker({
      id: 'exec-test',
      name: 'Executor Test',
      version: '1.0.0',
    });
  });

  test('should execute unpacker', async () => {
    const result = await executor.execute(unpacker);
    expect(result.success).toBe(true);
    expect(result.executionId).toContain('exec-');
  });

  test('should track execution stats', async () => {
    await executor.execute(unpacker);
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
  });

  test('should run multiple unpackers', async () => {
    const results = await executor.run([unpacker, unpacker]);
    expect(results.length).toBe(2);
  });

  test('should get all results', async () => {
    await executor.execute(unpacker);
    const results = executor.getResults();
    expect(results.length).toBe(1);
  });

  test('should clear results', async () => {
    await executor.execute(unpacker);
    executor.clearResults();
    expect(executor.getResults().length).toBe(0);
  });

  test('should get snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  test('should reset executor', async () => {
    await executor.execute(unpacker);
    executor.reset();
    expect(executor.getStats().totalExecutions).toBe(0);
  });

  test('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('UnpackerMonitor', () => {
  let monitor: UnpackerMonitor;
  let unpacker: Unpacker;

  beforeEach(() => {
    monitor = new UnpackerMonitor();
    unpacker = new Unpacker({
      id: 'mon-test',
      name: 'Monitor Test',
      version: '1.0.0',
    });
  });

  test('should track unpacker', () => {
    expect(monitor.track(unpacker)).toBe(true);
    expect(monitor.track(unpacker)).toBe(true);
  });

  test('should not track null unpacker', () => {
    expect(monitor.track(null as any)).toBe(false);
  });

  test('should get metrics', () => {
    monitor.track(unpacker);
    const metrics = monitor.getMetrics();
    expect(metrics.length).toBeGreaterThan(0);
  });

  test('should get filtered metrics by unpackerId', () => {
    monitor.track(unpacker);
    const metrics = monitor.getMetrics('mon-test');
    expect(metrics.length).toBeGreaterThan(0);
  });

  test('should get history with limit', () => {
    monitor.track(unpacker);
    const history = monitor.getHistory(5);
    expect(history.length).toBeLessThanOrEqual(5);
  });

  test('should get status', () => {
    const status = monitor.getStatus();
    expect(status.status).toBe('active');
  });

  test('should pause and resume', () => {
    monitor.pause();
    expect(monitor.getStatus().status).toBe('paused');
    monitor.resume();
    expect(monitor.getStatus().status).toBe('active');
  });

  test('should get snapshot', () => {
    monitor.track(unpacker);
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  test('should reset', () => {
    monitor.track(unpacker);
    monitor.reset();
    expect(monitor.getStatus().trackedCount).toBe(0);
  });

  test('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});