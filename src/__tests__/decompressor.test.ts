/**
 * decompressor.test.ts - V125 Decompressor Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Decompressor } from '../decompressor/Decompressor';
import { DecompressorRegistry } from '../decompressor/DecompressorRegistry';
import { DecompressorExecutor } from '../decompressor/DecompressorExecutor';
import { DecompressorMonitor } from '../decompressor/DecompressorMonitor';

describe('Decompressor', () => {
  let decompressor: Decompressor;

  beforeEach(() => {
    decompressor = new Decompressor({ algorithm: 'gzip' });
  });

  afterEach(() => {
    decompressor.reset();
  });

  it('should create instance with config', () => {
    expect(decompressor.config.algorithm).toBe('gzip');
  });

  it('should decompress data', () => {
    const result = decompressor.decompress('SGVsbG8gV29ybGQ='); // "Hello World" base64
    expect(result.success).toBe(true);
    expect(result.algorithm).toBe('gzip');
  });

  it('should track decompress count', () => {
    decompressor.decompress('SGVsbG8=');
    expect(decompressor.getStats().decompressCount).toBe(1);
  });

  it('should get decompressor name', () => {
    expect(decompressor.getDecompressor()).toBe('gzip');
  });

  it('should get snapshot', () => {
    const snapshot = decompressor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.config.algorithm).toBe('gzip');
  });

  it('should reset statistics', () => {
    decompressor.decompress('SGVsbG8=');
    decompressor.reset();
    expect(decompressor.getStats().decompressCount).toBe(0);
  });

  it('should generate report', () => {
    const report = decompressor.getReport();
    expect(report).toContain('Decompressor Report');
    expect(report).toContain('gzip');
  });

  it('should export metrics', () => {
    const metrics = decompressor.exportMetrics();
    expect(metrics.version).toBe('V125');
    expect(metrics.stats).toBeDefined();
    expect(metrics.config).toBeDefined();
  });
});

describe('DecompressorRegistry', () => {
  let registry: DecompressorRegistry;

  beforeEach(() => {
    registry = new DecompressorRegistry({});
  });

  afterEach(() => {
    registry.clear();
  });

  it('should register decompressor', () => {
    const dec = new Decompressor({ algorithm: 'zip' });
    expect(registry.register('test', dec)).toBe(true);
  });

  it('should not register duplicate', () => {
    const dec = new Decompressor({ algorithm: 'zip' });
    registry.register('test', dec);
    expect(registry.register('test', dec)).toBe(false);
  });

  it('should unregister decompressor', () => {
    const dec = new Decompressor({ algorithm: 'zip' });
    registry.register('test', dec);
    expect(registry.unregister('test')).toBe(true);
    expect(registry.has('test')).toBe(false);
  });

  it('should get decompressor', () => {
    const dec = new Decompressor({ algorithm: 'zip' });
    registry.register('test', dec);
    expect(registry.get('test')).toBe(dec);
  });

  it('should get all decompressors', () => {
    const dec1 = new Decompressor({ algorithm: 'zip' });
    const dec2 = new Decompressor({ algorithm: 'gzip' });
    registry.register('test1', dec1);
    registry.register('test2', dec2);
    expect(registry.getAll()).toContain('test1');
    expect(registry.getAll()).toContain('test2');
  });

  it('should check if decompressor exists', () => {
    const dec = new Decompressor({ algorithm: 'zip' });
    registry.register('test', dec);
    expect(registry.has('test')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('should get stats', () => {
    const stats = registry.getStats();
    expect(stats.totalDecompressors).toBe(0);
  });

  it('should get snapshot', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset statistics', () => {
    registry.recordDecompression();
    registry.reset();
    expect(registry.getStats().totalDecompressions).toBe(0);
  });

  it('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('Registry');
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('V125');
  });
});

describe('DecompressorExecutor', () => {
  let registry: DecompressorRegistry;
  let executor: DecompressorExecutor;

  beforeEach(() => {
    registry = new DecompressorRegistry({});
    const dec = new Decompressor({ algorithm: 'gzip' });
    registry.register('test', dec);
    executor = new DecompressorExecutor(registry, {});
  });

  it('should execute decompression', () => {
    const result = executor.execute('test', 'SGVsbG8=');
    expect(result.success).toBe(true);
  });

  it('should return error for unknown decompressor', () => {
    const result = executor.execute('unknown', 'data');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should run multiple tasks', () => {
    const tasks = [
      { decompressorName: 'test', data: 'SGVsbG8=' },
      { decompressorName: 'test', data: 'V29ybGQ=' },
    ];
    const results = executor.run(tasks);
    expect(results.length).toBe(2);
  });

  it('should get results', () => {
    executor.execute('test', 'SGVsbG8=');
    expect(executor.getResults().length).toBeGreaterThan(0);
  });

  it('should get stats', () => {
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBeDefined();
  });

  it('should get snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset', () => {
    executor.execute('test', 'SGVsbG8=');
    executor.reset();
    expect(executor.getStats().totalExecutions).toBe(0);
  });

  it('should generate report', () => {
    const report = executor.getReport();
    expect(report).toContain('Executor');
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('V125');
  });
});

describe('DecompressorMonitor', () => {
  let monitor: DecompressorMonitor;
  let decompressor: Decompressor;
  let registry: DecompressorRegistry;

  beforeEach(() => {
    monitor = new DecompressorMonitor({});
    decompressor = new Decompressor({ algorithm: 'gzip' });
    registry = new DecompressorRegistry({});
  });

  it('should track decompressor', () => {
    monitor.track(decompressor);
    expect(monitor.getMetrics().totalTracked).toBe(1);
  });

  it('should track registry', () => {
    const dec = new Decompressor({ algorithm: 'zip' });
    registry.register('test', dec);
    monitor.track(registry);
    expect(monitor.getMetrics().totalTracked).toBe(1);
  });

  it('should get metrics', () => {
    monitor.track(decompressor);
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(1);
  });

  it('should get history', () => {
    monitor.track(decompressor);
    const history = monitor.getHistory();
    expect(history.length).toBe(1);
  });

  it('should get history with limit', () => {
    monitor.track(decompressor);
    monitor.track(decompressor);
    const history = monitor.getHistory(1);
    expect(history.length).toBe(1);
  });

  it('should get status', () => {
    const status = monitor.getStatus();
    expect(status.isMonitoring).toBe(true);
    expect(status.historySize).toBeDefined();
  });

  it('should get snapshot', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should reset', () => {
    monitor.track(decompressor);
    monitor.reset();
    expect(monitor.getMetrics().totalTracked).toBe(0);
  });

  it('should generate report', () => {
    const report = monitor.getReport();
    expect(report).toContain('Monitor');
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V125');
    expect(metrics.history).toBeDefined();
  });
});
