/**
 * reducer.test.ts - V112 Reducer Test Suite
 * 27+ tests covering Reducer, ReducerRegistry, ReducerExecutor, ReducerMonitor
 */

import { Reducer } from '../reducer/Reducer';
import { ReducerRegistry } from '../reducer/ReducerRegistry';
import { ReducerExecutor } from '../reducer/ReducerExecutor';
import { ReducerMonitor } from '../reducer/ReducerMonitor';

describe('Reducer', () => {
  test('should create Reducer with config', () => {
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    expect(reducer.config.id).toBe('r1');
    expect(reducer.config.name).toBe('Test');
    expect(reducer.config.version).toBe('V112');
  });

  test('should add items successfully', () => {
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    expect(reducer.add('item1')).toBe(true);
    expect(reducer.add('item2')).toBe(true);
  });

  test('should respect maxItems limit', () => {
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112', maxItems: 2 });
    reducer.add('item1');
    reducer.add('item2');
    expect(reducer.add('item3')).toBe(false);
  });

  test('should remove items by index', () => {
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    reducer.add('item1');
    reducer.add('item2');
    expect(reducer.remove(0)).toBe(true);
    expect(reducer.remove(100)).toBe(false);
  });

  test('should reduce with function', () => {
    const reducer = new Reducer<string, number>({ id: 'r1', name: 'Test', version: 'V112' });
    reducer.add('a');
    reducer.add('bb');
    reducer.add('ccc');
    const result = reducer.reduce((items) => items.map(s => s.length));
    expect(result.data).toEqual([1, 2, 3]);
    expect(result.itemCount).toBe(3);
  });

  test('should getResult', () => {
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    reducer.add('item1');
    const result = reducer.getResult((items) => items.join(','));
    expect(result).toBe('item1');
  });

  test('should getStats', () => {
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    reducer.add('item1');
    reducer.reduce((items) => items);
    const stats = reducer.getStats();
    expect(stats.totalItems).toBe(1);
    expect(stats.processedItems).toBe(1);
  });

  test('should getSnapshot', () => {
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    const snapshot = reducer.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config.id).toBe('r1');
  });

  test('should reset', () => {
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    reducer.add('item1');
    reducer.reset();
    expect(reducer.getStats().totalItems).toBe(0);
  });

  test('should generate report', () => {
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    const report = reducer.getReport();
    expect(report).toContain('Reducer Report');
    expect(report).toContain('V112');
  });

  test('should export metrics', () => {
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    const metrics = reducer.exportMetrics();
    expect(metrics.version).toBe('V112');
    expect(metrics.stats).toBeDefined();
  });
});

describe('ReducerRegistry', () => {
  test('should create registry with config', () => {
    const registry = new ReducerRegistry({ maxReducers: 50 });
    expect(registry.config.maxReducers).toBe(50);
  });

  test('should register reducer', () => {
    const registry = new ReducerRegistry();
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    expect(registry.register('test', reducer)).toBe(true);
  });

  test('should not allow duplicate registrations', () => {
    const registry = new ReducerRegistry();
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    registry.register('test', reducer);
    expect(registry.register('test', reducer)).toBe(false);
  });

  test('should allow duplicates when configured', () => {
    const registry = new ReducerRegistry({ allowDuplicates: true });
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    expect(registry.register('test', reducer)).toBe(true);
    expect(registry.register('test', reducer)).toBe(true);
  });

  test('should unregister reducer', () => {
    const registry = new ReducerRegistry();
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    registry.register('test', reducer);
    expect(registry.unregister('test')).toBe(true);
    expect(registry.has('test')).toBe(false);
  });

  test('should get reducer by id', () => {
    const registry = new ReducerRegistry();
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    registry.register('test', reducer);
    expect(registry.get('test')).toBe(reducer);
  });

  test('should get all reducers', () => {
    const registry = new ReducerRegistry();
    registry.register('r1', new Reducer({ id: 'r1', name: 'T1', version: 'V112' }));
    registry.register('r2', new Reducer({ id: 'r2', name: 'T2', version: 'V112' }));
    expect(registry.getAll().size).toBe(2);
  });

  test('should check if reducer exists', () => {
    const registry = new ReducerRegistry();
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    registry.register('test', reducer);
    expect(registry.has('test')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  test('should get snapshot', () => {
    const registry = new ReducerRegistry();
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.count).toBe(0);
    expect(snapshot.config).toBeDefined();
  });

  test('should generate report', () => {
    const registry = new ReducerRegistry();
    const report = registry.getReport();
    expect(report).toContain('Reducer Registry Report');
  });

  test('should export metrics', () => {
    const registry = new ReducerRegistry();
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('V112');
    expect(metrics.count).toBe(0);
  });
});

describe('ReducerExecutor', () => {
  test('should create executor with config', () => {
    const executor = new ReducerExecutor({ concurrency: 10 });
    expect(executor.config.concurrency).toBe(10);
  });

  test('should execute reducer', () => {
    const executor = new ReducerExecutor();
    const reducer = new Reducer<string, string>({ id: 'r1', name: 'Test', version: 'V112' });
    reducer.add('item1');
    const result = executor.execute('exec1', reducer, ['item1']);
    expect(result.success).toBe(true);
    expect(result.id).toBe('exec1');
  });

  test('should run reducer asynchronously', async () => {
    const executor = new ReducerExecutor();
    const reducer = new Reducer<string, string>({ id: 'r1', name: 'Test', version: 'V112' });
    reducer.add('item1');
    const result = await executor.run('exec1', reducer, ['item1']);
    expect(result.success).toBe(true);
  });

  test('should get results', () => {
    const executor = new ReducerExecutor();
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    executor.execute('exec1', reducer, []);
    expect(executor.getResults().size).toBe(1);
  });

  test('should get stats', () => {
    const executor = new ReducerExecutor();
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    executor.execute('exec1', reducer, []);
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
  });

  test('should get snapshot', () => {
    const executor = new ReducerExecutor();
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  test('should reset', () => {
    const executor = new ReducerExecutor();
    const reducer = new Reducer({ id: 'r1', name: 'Test', version: 'V112' });
    executor.execute('exec1', reducer, []);
    executor.reset();
    expect(executor.getStats().totalExecutions).toBe(0);
  });

  test('should generate report', () => {
    const executor = new ReducerExecutor();
    const report = executor.getReport();
    expect(report).toContain('Reducer Executor Report');
  });

  test('should export metrics', () => {
    const executor = new ReducerExecutor();
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('V112');
  });
});

describe('ReducerMonitor', () => {
  test('should create monitor with config', () => {
    const monitor = new ReducerMonitor({ alertThreshold: 50 });
    expect(monitor.config.alertThreshold).toBe(50);
  });

  test('should track operations', () => {
    const monitor = new ReducerMonitor();
    monitor.track('test-op', 10, true);
    const metrics = monitor.getMetrics();
    expect(metrics.totalRequests).toBe(1);
    expect(metrics.successfulRequests).toBe(1);
  });

  test('should track failed operations', () => {
    const monitor = new ReducerMonitor();
    monitor.track('test-op', 10, false);
    const metrics = monitor.getMetrics();
    expect(metrics.failedRequests).toBe(1);
  });

  test('should get history', () => {
    const monitor = new ReducerMonitor();
    monitor.track('op1', 10, true);
    monitor.track('op2', 20, true);
    const history = monitor.getHistory();
    expect(history.length).toBe(2);
  });

  test('should limit history', () => {
    const monitor = new ReducerMonitor();
    for (let i = 0; i < 5; i++) {
      monitor.track('op', i * 10, true);
    }
    const history = monitor.getHistory(3);
    expect(history.length).toBe(3);
  });

  test('should get status', () => {
    const monitor = new ReducerMonitor();
    const status = monitor.getStatus();
    expect(status.healthy).toBe(true);
    expect(status.issues).toBeDefined();
  });

  test('should detect high latency', () => {
    const monitor = new ReducerMonitor({ alertThreshold: 50 });
    monitor.track('slow-op', 100, true);
    const status = monitor.getStatus();
    expect(status.healthy).toBe(false);
  });

  test('should get snapshot', () => {
    const monitor = new ReducerMonitor();
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  test('should reset', () => {
    const monitor = new ReducerMonitor();
    monitor.track('op', 10, true);
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.totalRequests).toBe(0);
  });

  test('should generate report', () => {
    const monitor = new ReducerMonitor();
    const report = monitor.getReport();
    expect(report).toContain('Reducer Monitor Report');
  });

  test('should export metrics', () => {
    const monitor = new ReducerMonitor();
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V112');
  });
});