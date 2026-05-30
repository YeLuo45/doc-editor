/**
 * V113 Combiner Tests
 * Comprehensive test suite for Combiner, CombinerRegistry, CombinerExecutor, and CombinerMonitor
 */

import {
  Combiner,
  CombinerConfig,
  CombineItem,
  CombineResult,
  CombineStats,
} from '../combiner/Combiner';
import {
  CombinerRegistry,
  RegistryConfig,
  RegistryStats,
} from '../combiner/CombinerRegistry';
import {
  CombinerExecutor,
  ExecutorConfig,
  ExecutorStats,
  ExecutionResult,
} from '../combiner/CombinerExecutor';
import {
  CombinerMonitor,
  MonitorConfig,
  MonitorMetrics,
  MonitorStatus,
  MetricPoint,
} from '../combiner/CombinerMonitor';

describe('Combiner', () => {
  let combiner: Combiner;
  let config: CombinerConfig;

  beforeEach(() => {
    config = {
      id: 'combiner-1',
      name: 'TestCombiner',
      version: '1.0.0',
      maxItems: 10,
      mergeStrategy: 'merge',
    };
    combiner = new Combiner(config);
  });

  test('should create combiner with config', () => {
    expect(combiner.config).toEqual(config);
    expect(combiner.config.id).toBe('combiner-1');
  });

  test('should add single item', () => {
    const item: CombineItem = { id: 'item-1', data: { value: 1 } };
    const result = combiner.add(item);
    expect(result.id).toBe('item-1');
    expect(combiner.getStats().addedItems).toBe(1);
  });

  test('should combine multiple items', () => {
    const items: CombineItem[] = [
      { id: 'item-1', data: { value: 1 } },
      { id: 'item-2', data: { value: 2 } },
    ];
    const result = combiner.combine(items);
    expect(result.count).toBe(2);
    expect(combiner.getStats().addedItems).toBe(2);
  });

  test('should remove item', () => {
    const item: CombineItem = { id: 'item-1', data: { value: 1 } };
    combiner.add(item);
    const removed = combiner.remove('item-1');
    expect(removed).toBe(true);
    expect(combiner.getStats().removedItems).toBe(1);
    expect(combiner.getResult().count).toBe(0);
  });

  test('should return false when removing non-existent item', () => {
    const removed = combiner.remove('non-existent');
    expect(removed).toBe(false);
  });

  test('should throw error when max items reached', () => {
    const smallCombiner = new Combiner({ ...config, maxItems: 2 });
    smallCombiner.add({ id: 'item-1', data: {} });
    smallCombiner.add({ id: 'item-2', data: {} });
    expect(() => smallCombiner.add({ id: 'item-3', data: {} })).toThrow('Maximum items limit reached');
  });

  test('should get result correctly', () => {
    combiner.add({ id: 'item-1', data: { value: 1 } });
    combiner.add({ id: 'item-2', data: { value: 2 } });
    const result = combiner.getResult();
    expect(result.count).toBe(2);
    expect(result.items.length).toBe(2);
    expect(result.timestamp).toBeDefined();
  });

  test('should get stats correctly', () => {
    combiner.add({ id: 'item-1', data: {} });
    const stats = combiner.getStats();
    expect(stats.totalItems).toBe(1);
    expect(stats.addedItems).toBe(1);
  });

  test('should reset state', () => {
    combiner.add({ id: 'item-1', data: {} });
    combiner.reset();
    const stats = combiner.getStats();
    expect(stats.totalItems).toBe(0);
    expect(stats.addedItems).toBe(0);
    expect(combiner.getResult().count).toBe(0);
  });

  test('should export metrics', () => {
    combiner.add({ id: 'item-1', data: {} });
    const metrics = combiner.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.stats).toBeDefined();
    expect(metrics.config.id).toBe('combiner-1');
  });

  test('should generate report', () => {
    combiner.add({ id: 'item-1', data: {} });
    const report = combiner.getReport();
    expect(report).toContain('Combiner Report');
    expect(report).toContain('combiner-1');
  });

  test('should get snapshot', () => {
    combiner.add({ id: 'item-1', data: {} });
    const snapshot = combiner.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toEqual(config);
    expect(snapshot.itemCount).toBe(1);
  });
});

describe('CombinerRegistry', () => {
  let registry: CombinerRegistry;
  let regConfig: RegistryConfig;

  beforeEach(() => {
    regConfig = {
      name: 'TestRegistry',
      version: '1.0.0',
      maxCombiners: 5,
    };
    registry = new CombinerRegistry(regConfig);
  });

  test('should create registry with config', () => {
    expect(registry.config.name).toBe('TestRegistry');
  });

  test('should register combiner', () => {
    const combiner = new Combiner({ id: 'c1', name: 'Combiner1', version: '1.0.0' });
    registry.register(combiner);
    expect(registry.has('c1')).toBe(true);
  });

  test('should throw when registering duplicate combiner', () => {
    const combiner = new Combiner({ id: 'c1', name: 'Combiner1', version: '1.0.0' });
    registry.register(combiner);
    expect(() => registry.register(combiner)).toThrow('Combiner already registered');
  });

  test('should unregister combiner', () => {
    const combiner = new Combiner({ id: 'c1', name: 'Combiner1', version: '1.0.0' });
    registry.register(combiner);
    const unregistered = registry.unregister('c1');
    expect(unregistered).toBe(true);
    expect(registry.has('c1')).toBe(false);
  });

  test('should get combiner by id', () => {
    const combiner = new Combiner({ id: 'c1', name: 'Combiner1', version: '1.0.0' });
    registry.register(combiner);
    const retrieved = registry.get('c1');
    expect(retrieved?.config.id).toBe('c1');
  });

  test('should return undefined for non-existent combiner', () => {
    const retrieved = registry.get('non-existent');
    expect(retrieved).toBeUndefined();
  });

  test('should get all combiners', () => {
    registry.register(new Combiner({ id: 'c1', name: 'C1', version: '1.0.0' }));
    registry.register(new Combiner({ id: 'c2', name: 'C2', version: '1.0.0' }));
    const all = registry.getAll();
    expect(all.length).toBe(2);
  });

  test('should check if combiner exists', () => {
    const combiner = new Combiner({ id: 'c1', name: 'Combiner1', version: '1.0.0' });
    expect(registry.has('c1')).toBe(false);
    registry.register(combiner);
    expect(registry.has('c1')).toBe(true);
  });

  test('should reset registry', () => {
    registry.register(new Combiner({ id: 'c1', name: 'C1', version: '1.0.0' }));
    registry.reset();
    expect(registry.getAll().length).toBe(0);
  });

  test('should export metrics', () => {
    registry.register(new Combiner({ id: 'c1', name: 'C1', version: '1.0.0' }));
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.stats.totalCombiners).toBe(1);
  });

  test('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('CombinerRegistry Report');
  });

  test('should get snapshot', () => {
    registry.register(new Combiner({ id: 'c1', name: 'C1', version: '1.0.0' }));
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.totalCombiners).toBe(1);
    expect(snapshot.combinerIds).toContain('c1');
  });
});

describe('CombinerExecutor', () => {
  let registry: CombinerRegistry;
  let executor: CombinerExecutor;
  let execConfig: ExecutorConfig;

  beforeEach(() => {
    registry = new CombinerRegistry({ name: 'Reg', version: '1.0.0' });
    const combiner = new Combiner({ id: 'c1', name: 'C1', version: '1.0.0' });
    registry.register(combiner);
    execConfig = { id: 'exec-1', version: '1.0.0', retryCount: 3 };
    executor = new CombinerExecutor(execConfig, registry);
  });

  test('should create executor with config', () => {
    expect(executor.config.id).toBe('exec-1');
  });

  test('should execute combine on combiner', () => {
    const items: CombineItem[] = [{ id: 'item-1', data: { value: 1 } }];
    const result = executor.execute('c1', items);
    expect(result.success).toBe(true);
    expect(result.combinerId).toBe('c1');
    expect(result.result).toBeDefined();
  });

  test('should return error for non-existent combiner', () => {
    const result = executor.execute('non-existent', [{ id: 'i1', data: {} }]);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Combiner not found: non-existent');
  });

  test('should get results', () => {
    executor.execute('c1', [{ id: 'i1', data: {} }]);
    const results = executor.getResults();
    expect(results.length).toBe(1);
  });

  test('should get stats', () => {
    executor.execute('c1', [{ id: 'i1', data: {} }]);
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successfulExecutions).toBe(1);
  });

  test('should reset executor', () => {
    executor.execute('c1', [{ id: 'i1', data: {} }]);
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(0);
  });

  test('should run with retry logic', () => {
    const result = executor.run('c1', [{ id: 'i1', data: {} }]);
    expect(result.success).toBe(true);
  });

  test('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.resultsCount).toBe(0);
  });

  test('should generate report', () => {
    const report = executor.getReport();
    expect(report).toContain('CombinerExecutor Report');
  });

  test('should get snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config.id).toBe('exec-1');
  });

  test('should execute all combiners', () => {
    registry.register(new Combiner({ id: 'c2', name: 'C2', version: '1.0.0' }));
    const results = executor.executeAll([{ id: 'i1', data: {} }]);
    expect(results.length).toBe(2);
  });
});

describe('CombinerMonitor', () => {
  let registry: CombinerRegistry;
  let executor: CombinerExecutor;
  let monitor: CombinerMonitor;
  let monConfig: MonitorConfig;

  beforeEach(() => {
    registry = new CombinerRegistry({ name: 'Reg', version: '1.0.0' });
    registry.register(new Combiner({ id: 'c1', name: 'C1', version: '1.0.0' }));
    executor = new CombinerExecutor({ id: 'exec', version: '1.0.0' }, registry);
    monConfig = { id: 'mon-1', version: '1.0.0', maxHistory: 100 };
    monitor = new CombinerMonitor(monConfig, registry, executor);
  });

  test('should create monitor with config', () => {
    expect(monitor.config.id).toBe('mon-1');
  });

  test('should track execution result', () => {
    const execResult = executor.execute('c1', [{ id: 'i1', data: {} }]);
    monitor.track(execResult);
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracks).toBe(1);
  });

  test('should get metrics', () => {
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracks).toBe(0);
    expect(metrics.successRate).toBe(0);
  });

  test('should get history', () => {
    const execResult = executor.execute('c1', [{ id: 'i1', data: {} }]);
    monitor.track(execResult);
    const history = monitor.getHistory();
    expect(history.length).toBe(1);
  });

  test('should get status', () => {
    expect(monitor.getStatus()).toBe('idle');
    const execResult = executor.execute('c1', [{ id: 'i1', data: {} }]);
    monitor.track(execResult);
    expect(monitor.getStatus()).toBe('active');
  });

  test('should reset monitor', () => {
    const execResult = executor.execute('c1', [{ id: 'i1', data: {} }]);
    monitor.track(execResult);
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracks).toBe(0);
  });

  test('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics.status).toBeDefined();
  });

  test('should generate report', () => {
    const report = monitor.getReport();
    expect(report).toContain('CombinerMonitor Report');
  });

  test('should get snapshot', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.status).toBeDefined();
  });

  test('should track batch results', () => {
    const results = executor.executeAll([{ id: 'i1', data: {} }]);
    monitor.trackBatch(results);
    expect(monitor.getMetrics().totalTracks).toBeGreaterThan(0);
  });
});