/**
 * splitter.test.ts - V114 Splitter Tests
 */

import { Splitter, SplitResult } from '../splitter/Splitter';
import { SplitterRegistry } from '../splitter/SplitterRegistry';
import { SplitterExecutor, ExecutionResult } from '../splitter/SplitterExecutor';
import { SplitterMonitor } from '../splitter/SplitterMonitor';

describe('Splitter', () => {
  let splitter: Splitter;

  beforeEach(() => {
    splitter = new Splitter({ maxChunkSize: 50, overlap: 5, delimiter: '|' });
  });

  afterEach(() => {
    splitter.reset();
  });

  test('should split content correctly', () => {
    const result = splitter.split('part1|part2|part3|part4|part5', { id: 'test1' });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('content');
    expect(result[0]).toHaveProperty('startIndex');
    expect(result[0]).toHaveProperty('endIndex');
  });

  test('should add and remove results', () => {
    const customResult: SplitResult = {
      id: 'custom-1',
      content: 'custom content',
      startIndex: 0,
      endIndex: 14,
    };
    splitter.add(customResult);
    expect(splitter.getResult('custom-1')?.content).toBe('custom content');

    const removed = splitter.remove('custom-1');
    expect(removed).toBe(true);
    expect(splitter.getResult('custom-1')).toBeUndefined();
  });

  test('should return stats', () => {
    splitter.split('a|b|c', { id: 's1' });
    const stats = splitter.getStats();
    expect(stats).toHaveProperty('totalSplits');
    expect(stats).toHaveProperty('totalChunks');
    expect(stats).toHaveProperty('averageChunkSize');
    expect(stats).toHaveProperty('processingTimeMs');
  });

  test('should export metrics with version', () => {
    const metrics = splitter.exportMetrics();
    expect(metrics.version).toBe('1.14.0');
    expect(metrics).toHaveProperty('stats');
  });

  test('should reset state', () => {
    splitter.split('x|y|z', { id: 's1' });
    splitter.reset();
    const stats = splitter.getStats();
    expect(stats.totalSplits).toBe(0);
    expect(stats.totalChunks).toBe(0);
  });

  test('should generate report', () => {
    const report = splitter.getReport();
    expect(report).toContain('Splitter Report');
    expect(report).toContain('Total Splits');
  });

  test('should get snapshot', () => {
    const snap = splitter.getSnapshot();
    expect(snap).toHaveProperty('metrics');
    expect(snap).toHaveProperty('results');
    expect(Array.isArray(snap.results)).toBe(true);
  });
});

describe('SplitterRegistry', () => {
  let registry: SplitterRegistry;

  beforeEach(() => {
    registry = new SplitterRegistry({ maxSplitters: 10 });
  });

  afterEach(() => {
    registry.reset();
  });

  test('should register and unregister splitters', () => {
    const s = new Splitter();
    const registered = registry.register('splitter-1', s);
    expect(registered).toBe(true);
    expect(registry.has('splitter-1')).toBe(true);

    const unregistered = registry.unregister('splitter-1');
    expect(unregistered).toBe(true);
    expect(registry.has('splitter-1')).toBe(false);
  });

  test('should get splitter by id', () => {
    const s = new Splitter();
    registry.register('splitter-x', s);
    const retrieved = registry.get('splitter-x');
    expect(retrieved).toBe(s);
  });

  test('should get all splitters', () => {
    registry.register('a', new Splitter());
    registry.register('b', new Splitter());
    const all = registry.getAll();
    expect(all.length).toBe(2);
  });

  test('should prevent duplicate registration', () => {
    const s = new Splitter();
    registry.register('dup', s);
    const result = registry.register('dup', s);
    expect(result).toBe(false);
  });

  test('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.14.0');
    expect(metrics).toHaveProperty('stats');
  });

  test('should reset registry', () => {
    registry.register('x', new Splitter());
    registry.reset();
    expect(registry.getAll().length).toBe(0);
  });

  test('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('SplitterRegistry Report');
  });

  test('should get snapshot', () => {
    const snap = registry.getSnapshot();
    expect(snap).toHaveProperty('metrics');
    expect(snap).toHaveProperty('splitters');
  });
});

describe('SplitterExecutor', () => {
  let executor: SplitterExecutor;
  let splitter: Splitter;

  beforeEach(() => {
    executor = new SplitterExecutor({ maxConcurrent: 3, timeout: 5000 });
    splitter = new Splitter({ maxChunkSize: 30 });
  });

  afterEach(() => {
    executor.reset();
  });

  test('should execute and store results', async () => {
    const result = await executor.execute('exec-1', splitter, 'a|b|c|d', { id: 'e1' });
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  test('should run synchronously', () => {
    const result = executor.run('run-1', splitter, 'x|y|z', { id: 'r1' });
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });

  test('should get results by id', () => {
    executor.run('result-1', splitter, 'a|b', { id: 'rs1' });
    const results = executor.getResults('result-1');
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  test('should get all results', () => {
    executor.run('r1', splitter, 'a', { id: 'x' });
    executor.run('r2', splitter, 'b', { id: 'y' });
    const all = executor.getAllResults();
    expect(all.size).toBe(2);
  });

  test('should get stats', () => {
    executor.run('s1', splitter, 'a', { id: 'x' });
    const stats = executor.getStats();
    expect(stats).toHaveProperty('totalExecuted');
    expect(stats).toHaveProperty('totalSucceeded');
  });

  test('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.14.0');
    expect(metrics).toHaveProperty('stats');
  });

  test('should reset executor', () => {
    executor.run('x', splitter, 'a', { id: 'y' });
    executor.reset();
    const all = executor.getAllResults();
    expect(all.size).toBe(0);
  });

  test('should generate report', () => {
    const report = executor.getReport();
    expect(report).toContain('SplitterExecutor Report');
  });

  test('should get snapshot', () => {
    const snap = executor.getSnapshot();
    expect(snap).toHaveProperty('metrics');
    expect(snap).toHaveProperty('results');
  });
});

describe('SplitterMonitor', () => {
  let monitor: SplitterMonitor;

  beforeEach(() => {
    monitor = new SplitterMonitor({ historySize: 100 });
  });

  afterEach(() => {
    monitor.reset();
  });

  test('should track operations', () => {
    monitor.track('split', 100, true);
    monitor.track('split', 200, false);
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracks).toBe(2);
    expect(metrics.totalOperations).toBe(2);
  });

  test('should get metrics', () => {
    monitor.track('op', 50, true);
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveProperty('totalTracks');
    expect(metrics).toHaveProperty('currentStatus');
  });

  test('should get history with limit', () => {
    for (let i = 0; i < 10; i++) {
      monitor.track(`op-${i}`, i * 10, true);
    }
    const history = monitor.getHistory(5);
    expect(history.length).toBe(5);
  });

  test('should get status', () => {
    const status = monitor.getStatus();
    expect(status).toBe('idle');
    monitor.track('op', 100, true);
    expect(monitor.getStatus()).toBe('active');
  });

  test('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.14.0');
    expect(metrics).toHaveProperty('metrics');
  });

  test('should reset monitor', () => {
    monitor.track('x', 10, true);
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracks).toBe(0);
    expect(metrics.totalOperations).toBe(0);
  });

  test('should generate report', () => {
    const report = monitor.getReport();
    expect(report).toContain('SplitterMonitor Report');
  });

  test('should get snapshot', () => {
    monitor.track('snap', 10, true);
    const snap = monitor.getSnapshot();
    expect(snap).toHaveProperty('metrics');
    expect(snap).toHaveProperty('history');
  });
});