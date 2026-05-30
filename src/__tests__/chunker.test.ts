/**
 * V126 Chunker Tests - Comprehensive test suite for Chunker components
 */

import { Chunker, ChunkerConfig } from '../chunker/Chunker';
import { ChunkerRegistry, RegistryConfig } from '../chunker/ChunkerRegistry';
import { ChunkerExecutor, ExecutorConfig } from '../chunker/ChunkerExecutor';
import { ChunkerMonitor, MonitorConfig } from '../chunker/ChunkerMonitor';

describe('Chunker', () => {
  let chunker: Chunker;
  const config: ChunkerConfig = {
    name: 'test-chunker',
    maxChunkSize: 3,
    overlapSize: 1,
    strategy: 'fixed',
  };

  beforeEach(() => {
    chunker = new Chunker(config);
  });

  test('should create chunker with config', () => {
    expect(chunker.config.name).toBe('test-chunker');
    expect(chunker.config.maxChunkSize).toBe(3);
    expect(chunker.config.overlapSize).toBe(1);
  });

  test('should add single item', () => {
    const id = chunker.add('item1');
    expect(id).toContain('chunk_');
    expect(chunker.getStats().totalItems).toBe(1);
  });

  test('should add multiple items via chunk method', () => {
    const result = chunker.chunk(['a', 'b', 'c']);
    expect(result).not.toBeNull();
    expect(result?.size).toBe(3);
    expect(chunker.getStats().totalChunks).toBe(1);
  });

  test('should remove item by index', () => {
    chunker.add('item1');
    chunker.add('item2');
    const removed = chunker.remove(0);
    expect(removed).toBe(true);
    expect(chunker.getStats().currentChunkSize).toBe(1);
  });

  test('should return false when removing invalid index', () => {
    chunker.add('item1');
    const removed = chunker.remove(5);
    expect(removed).toBe(false);
  });

  test('should get chunk by index', () => {
    chunker.chunk(['a', 'b']);
    const chunk = chunker.getChunk(0);
    expect(chunk).toBeDefined();
    expect(chunk?.items).toEqual(['a', 'b']);
  });

  test('should return undefined for invalid chunk index', () => {
    const chunk = chunker.getChunk(99);
    expect(chunk).toBeUndefined();
  });

  test('should auto-create chunk when max size reached', () => {
    const c = new Chunker({ ...config, maxChunkSize: 2 });
    c.add('a');
    c.add('b');
    expect(c.getStats().totalChunks).toBe(1);
    c.add('c');
    expect(c.getStats().totalChunks).toBe(1);
  });

  test('should get stats correctly', () => {
    chunker.chunk(['x', 'y']);
    const stats = chunker.getStats();
    expect(stats.totalChunks).toBe(1);
    expect(stats.totalItems).toBe(2);
  });

  test('should reset chunker state', () => {
    chunker.chunk(['a', 'b']);
    chunker.reset();
    const stats = chunker.getStats();
    expect(stats.totalChunks).toBe(0);
    expect(stats.totalItems).toBe(0);
  });

  test('should generate snapshot', () => {
    chunker.chunk(['test']);
    const snap = chunker.getSnapshot();
    expect(snap.metrics).toBeDefined();
    expect(snap.config.maxChunkSize).toBe(3);
    expect(snap.chunkCount).toBe(1);
  });

  test('should export metrics with version', () => {
    const metrics = chunker.exportMetrics();
    expect(metrics.version).toBe('1.26.0');
    expect(metrics.name).toBe('test-chunker');
  });

  test('should generate readable report', () => {
    const report = chunker.getReport();
    expect(report).toContain('Chunker Report');
    expect(report).toContain('test-chunker');
  });
});

describe('ChunkerRegistry', () => {
  let registry: ChunkerRegistry;
  const regConfig: Partial<RegistryConfig> = { maxBatchers: 10 };

  beforeEach(() => {
    registry = new ChunkerRegistry(regConfig);
  });

  test('should register chunker', () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    const result = registry.register('chunker1', chunker);
    expect(result).toBe(true);
  });

  test('should not register duplicate names by default', () => {
    const c1 = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    const c2 = new Chunker({ name: 'c2', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    registry.register('same', c1);
    const result = registry.register('same', c2);
    expect(result).toBe(false);
  });

  test('should unregister chunker', () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    registry.register('chunker1', chunker);
    const removed = registry.unregister('chunker1');
    expect(removed).toBe(true);
    expect(registry.has('chunker1')).toBe(false);
  });

  test('should get chunker by name', () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    registry.register('chunker1', chunker);
    const found = registry.get('chunker1');
    expect(found).toBe(chunker);
  });

  test('should get all registered names', () => {
    registry.registerWithConfig('c1', { name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    registry.registerWithConfig('c2', { name: 'c2', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    const names = registry.getAll();
    expect(names).toContain('c1');
    expect(names).toContain('c2');
  });

  test('should check if chunker exists', () => {
    registry.registerWithConfig('c1', { name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    expect(registry.has('c1')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  test('should clear all chunkers', () => {
    registry.registerWithConfig('c1', { name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    registry.registerWithConfig('c2', { name: 'c2', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
  });

  test('should get snapshot and stats', () => {
    const snap = registry.getSnapshot();
    expect(snap.metrics).toBeDefined();
    expect(snap.names).toEqual([]);
  });

  test('should reset registry', () => {
    registry.registerWithConfig('c1', { name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    registry.reset();
    expect(registry.getAll()).toHaveLength(0);
  });

  test('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.26.0');
    expect(Array.isArray(metrics.names)).toBe(true);
  });
});

describe('ChunkerExecutor', () => {
  let executor: ChunkerExecutor;
  const execConfig: ExecutorConfig = {
    name: 'test-executor',
    maxConcurrent: 2,
    timeout: 10,
  };

  beforeEach(() => {
    executor = new ChunkerExecutor(execConfig);
  });

  test('should create executor with config', () => {
    expect(executor.config.name).toBe('test-executor');
    expect(executor.config.maxConcurrent).toBe(2);
  });

  test('should execute single chunker', async () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    chunker.chunk(['a', 'b']);
    const result = await executor.execute(chunker);
    expect(result.chunkerName).toBe('c1');
    expect(result.success).toBe(true);
  });

  test('should run on multiple chunkers', async () => {
    const c1 = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    const c2 = new Chunker({ name: 'c2', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    c1.chunk(['a']);
    c2.chunk(['b']);
    const results = await executor.run([c1, c2]);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('should collect results', async () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    chunker.chunk(['x']);
    await executor.execute(chunker);
    const results = executor.getResults();
    expect(results.length).toBe(1);
  });

  test('should get stats', async () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    chunker.chunk(['test']);
    await executor.execute(chunker);
    const stats = executor.getStats();
    expect(stats.totalExecuted).toBeGreaterThan(0);
  });

  test('should reset executor', async () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    chunker.chunk(['test']);
    await executor.execute(chunker);
    executor.reset();
    expect(executor.getResults()).toHaveLength(0);
  });

  test('should get snapshot', () => {
    const snap = executor.getSnapshot();
    expect(snap.running).toBe(false);
    expect(snap.resultCount).toBe(0);
  });

  test('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.26.0');
    expect(metrics.name).toBe('test-executor');
  });
});

describe('ChunkerMonitor', () => {
  let monitor: ChunkerMonitor;
  const monConfig: MonitorConfig = {
    name: 'test-monitor',
    historySize: 100,
    interval: 1000,
  };

  beforeEach(() => {
    monitor = new ChunkerMonitor({ ...monConfig, interval: 0 });
  });

  afterEach(() => {
    monitor.reset();
  });

  test('should create monitor with config', () => {
    expect(monitor.config.name).toBe('test-monitor');
    expect(monitor.config.historySize).toBe(100);
  });

  test('should track chunker', () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    monitor.track(chunker);
    const metrics = monitor.getMetrics();
    expect(metrics.has('c1')).toBe(true);
  });

  test('should untrack chunker', () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    monitor.track(chunker);
    const removed = monitor.untrack('c1');
    expect(removed).toBe(true);
  });

  test('should get metrics for tracked chunkers', () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    chunker.chunk(['a', 'b']);
    monitor.track(chunker);
    const metrics = monitor.getMetrics();
    const entry = metrics.get('c1');
    expect(entry?.chunkCount).toBe(1);
  });

  test('should get history with limit', () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    monitor.track(chunker);
    const history = monitor.getHistory(5);
    expect(Array.isArray(history)).toBe(true);
  });

  test('should get status', () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    chunker.chunk(['test']);
    monitor.track(chunker);
    const status = monitor.getStatus();
    expect(status.total).toBe(1);
  });

  test('should reset monitor', () => {
    const chunker = new Chunker({ name: 'c1', maxChunkSize: 5, overlapSize: 0, strategy: 'fixed' });
    monitor.track(chunker);
    monitor.reset();
    const snap = monitor.getSnapshot();
    expect(snap.trackedCount).toBe(0);
  });

  test('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.26.0');
    expect(metrics.name).toBe('test-monitor');
  });
});