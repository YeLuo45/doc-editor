/**
 * V139 Transformer Tests
 */

import { Transformer, TransformResult } from '../transformer/Transformer';
import { TransformerRegistry } from '../transformer/TransformerRegistry';
import { TransformerExecutor } from '../transformer/TransformerExecutor';
import { TransformerMonitor } from '../transformer/TransformerMonitor';

describe('Transformer', () => {
  let transformer: Transformer;

  beforeEach(() => {
    transformer = new Transformer({
      id: 'test-transformer',
      name: 'TestTransformer',
      version: '1.0.0',
      enabled: true,
      priority: 1,
    });
  });

  test('should create with default config', () => {
    const t = new Transformer();
    expect(t.config.id).toMatch(/^transformer-\d+$/);
    expect(t.config.name).toBe('DefaultTransformer');
    expect(t.config.enabled).toBe(true);
  });

  test('should create with custom config', () => {
    expect(transformer.config.id).toBe('test-transformer');
    expect(transformer.config.name).toBe('TestTransformer');
    expect(transformer.config.version).toBe('1.0.0');
    expect(transformer.config.enabled).toBe(true);
    expect(transformer.config.priority).toBe(1);
  });

  test('should return config immutably', () => {
    const config = transformer.config;
    config.id = 'changed';
    expect(transformer.config.id).toBe('test-transformer');
  });

  test('should transform string input', () => {
    const result = transformer.transform('hello');
    expect(result.success).toBe(true);
    expect(result.data).toBe('HELLO');
    expect(result.errors).toHaveLength(0);
  });

  test('should transform object input', () => {
    const result = transformer.transform({ key: 'value' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ key: 'value' });
  });

  test('should track transform stats', () => {
    transformer.transform('test');
    const stats = transformer.getStats();
    expect(stats.transformCount).toBe(1);
    expect(stats.successCount).toBe(1);
    expect(stats.failureCount).toBe(0);
    expect(stats.lastTransform).not.toBeNull();
  });

  test('should track failed transforms', () => {
    const disabledTransformer = new Transformer({ enabled: false });
    const result = disabledTransformer.transform('test');
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Transformer is disabled');
    const stats = disabledTransformer.getStats();
    expect(stats.transformCount).toBe(0);
  });

  test('should getTransformer by id', () => {
    const found = transformer.getTransformer('test-transformer');
    expect(found).toBe(transformer);
    const notFound = transformer.getTransformer('unknown');
    expect(notFound).toBeNull();
  });

  test('should getSnapshot', () => {
    transformer.transform('test');
    const snap = transformer.getSnapshot();
    expect(snap.metrics).toHaveProperty('id');
    expect(snap.metrics).toHaveProperty('transformCount');
    expect(snap.metrics).toHaveProperty('successCount');
  });

  test('should reset stats', () => {
    transformer.transform('test');
    transformer.reset();
    const stats = transformer.getStats();
    expect(stats.transformCount).toBe(0);
    expect(stats.successCount).toBe(0);
    expect(stats.lastTransform).toBeNull();
  });

  test('should generate report', () => {
    const report = transformer.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('metrics');
  });

  test('should export metrics with version', () => {
    const metrics = transformer.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics).toHaveProperty('id');
    expect(metrics).toHaveProperty('transformCount');
  });
});

describe('TransformerRegistry', () => {
  let registry: TransformerRegistry;

  beforeEach(() => {
    registry = new TransformerRegistry();
  });

  test('should register transformer', () => {
    const t = new Transformer({ id: 'reg-test' });
    expect(registry.register(t)).toBe(true);
    expect(registry.has('reg-test')).toBe(true);
  });

  test('should not register duplicate', () => {
    const t = new Transformer({ id: 'dup-test' });
    registry.register(t);
    expect(registry.register(t)).toBe(false);
  });

  test('should unregister transformer', () => {
    const t = new Transformer({ id: 'unreg-test' });
    registry.register(t);
    expect(registry.unregister('unreg-test')).toBe(true);
    expect(registry.has('unreg-test')).toBe(false);
  });

  test('should get registered transformer', () => {
    const t = new Transformer({ id: 'get-test' });
    registry.register(t);
    expect(registry.get('get-test')).toBe(t);
    expect(registry.get('unknown')).toBeUndefined();
  });

  test('should getAll transformers', () => {
    registry.register(new Transformer({ id: 't1' }));
    registry.register(new Transformer({ id: 't2' }));
    const all = registry.getAll();
    expect(all).toHaveLength(2);
  });

  test('should getSnapshot', () => {
    registry.register(new Transformer({ id: 'snap-test' }));
    const snap = registry.getSnapshot();
    expect(snap.metrics.count).toBe(1);
    expect(snap.metrics.ids).toContain('snap-test');
  });

  test('should reset registry', () => {
    registry.register(new Transformer({ id: 'reset-test' }));
    registry.reset();
    expect(registry.getAll()).toHaveLength(0);
  });

  test('should generate report', () => {
    const report = registry.getReport();
    expect(typeof report).toBe('string');
  });

  test('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
    expect(metrics).toHaveProperty('count');
  });
});

describe('TransformerExecutor', () => {
  let registry: TransformerRegistry;
  let executor: TransformerExecutor;

  beforeEach(() => {
    registry = new TransformerRegistry();
    executor = new TransformerExecutor(registry);
  });

  test('should execute registered transformer', () => {
    const t = new Transformer({ id: 'exec-test' });
    registry.register(t);
    const result = executor.execute('exec-test', 'hello');
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
  });

  test('should return null for unregistered transformer', () => {
    const result = executor.execute('unknown', 'hello');
    expect(result).toBeNull();
  });

  test('should track execution stats', () => {
    const t = new Transformer({ id: 'stats-test' });
    registry.register(t);
    executor.execute('stats-test', 'test');
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successfulExecutions).toBe(1);
  });

  test('should run multiple transformers', () => {
    registry.register(new Transformer({ id: 'run1' }));
    registry.register(new Transformer({ id: 'run2' }));
    const results = executor.run(['run1', 'run2'], 'test');
    expect(results.size).toBe(2);
  });

  test('should getResults', () => {
    const t = new Transformer({ id: 'results-test' });
    registry.register(t);
    executor.execute('results-test', 'test');
    const results = executor.getResults();
    expect(results).toHaveLength(1);
  });

  test('should getSnapshot', () => {
    const snap = executor.getSnapshot();
    expect(snap.metrics).toHaveProperty('totalExecutions');
    expect(snap.metrics).toHaveProperty('averageDuration');
  });

  test('should reset executor', () => {
    const t = new Transformer({ id: 'reset-exec' });
    registry.register(t);
    executor.execute('reset-exec', 'test');
    executor.reset();
    expect(executor.getResults()).toHaveLength(0);
    expect(executor.getStats().totalExecutions).toBe(0);
  });

  test('should generate report', () => {
    const report = executor.getReport();
    expect(typeof report).toBe('string');
  });

  test('should export metrics with version', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('TransformerMonitor', () => {
  let monitor: TransformerMonitor;

  beforeEach(() => {
    monitor = new TransformerMonitor();
  });

  test('should track metric', () => {
    monitor.track('test.metric', 42);
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('test.metric');
    expect(metrics[0].value).toBe(42);
  });

  test('should track with tags', () => {
    monitor.track('tagged.metric', 10, { env: 'test' });
    const metrics = monitor.getMetrics('tagged.metric');
    expect(metrics[0].tags).toEqual({ env: 'test' });
  });

  test('should getMetrics by name', () => {
    monitor.track('specific', 1);
    monitor.track('specific', 2);
    monitor.track('other', 3);
    const specific = monitor.getMetrics('specific');
    expect(specific).toHaveLength(2);
  });

  test('should getHistory with limit', () => {
    monitor.track('h1', 1);
    monitor.track('h2', 2);
    monitor.track('h3', 3);
    const history = monitor.getHistory(2);
    expect(history).toHaveLength(2);
  });

  test('should enforce history size limit', () => {
    const smallMonitor = new TransformerMonitor({ historySize: 3 });
    smallMonitor.track('a', 1);
    smallMonitor.track('b', 2);
    smallMonitor.track('c', 3);
    smallMonitor.track('d', 4);
    expect(smallMonitor.getMetrics()).toHaveLength(3);
  });

  test('should getSnapshot', () => {
    monitor.track('snap', 1);
    const snap = monitor.getSnapshot();
    expect(snap.metrics).toHaveProperty('trackCount');
    expect(snap.metrics).toHaveProperty('status');
  });

  test('should reset monitor', () => {
    monitor.track('reset', 1);
    monitor.reset();
    expect(monitor.getMetrics()).toHaveLength(0);
    expect(monitor.getStats().trackCount).toBe(0);
  });

  test('should getReport', () => {
    const report = monitor.getReport();
    expect(typeof report).toBe('string');
  });

  test('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  test('should getStatus', () => {
    expect(monitor.getStatus()).toBe('active');
  });
});