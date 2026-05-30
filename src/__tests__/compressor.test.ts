/**
 * compressor.test.ts - V124 Compressor Tests
 * Comprehensive test suite for Compressor, CompressorRegistry,
 * CompressorExecutor, and CompressorMonitor
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  Compressor,
  CompressorConfig,
  CompressorStats,
  CompressionResult,
  DecompressionResult,
} from '../compressor/Compressor';
import {
  CompressorRegistry,
  CompressorRegistryConfig,
  CompressorRegistryStats,
} from '../compressor/CompressorRegistry';
import {
  CompressorExecutor,
  CompressorExecutorConfig,
  CompressorExecutorStats,
  ExecutionResult,
} from '../compressor/CompressorExecutor';
import {
  CompressorMonitor,
  CompressorMonitorConfig,
  CompressorMonitorStats,
  MetricEntry,
} from '../compressor/CompressorMonitor';

describe('Compressor', () => {
  let compressor: Compressor;

  beforeEach(() => {
    const config: CompressorConfig = { algorithm: 'gzip', level: 6 };
    compressor = new Compressor(config);
  });

  it('should create compressor with config', () => {
    expect(compressor.config.algorithm).toBe('gzip');
    expect(compressor.config.level).toBe(6);
  });

  it('should compress data and return result', () => {
    const result: CompressionResult = compressor.compress('test data');
    expect(result.data).toBeDefined();
    expect(result.originalSize).toBe(9);
    expect(result.algorithm).toBe('gzip');
    expect(result.ratio).toBeDefined();
  });

  it('should decompress data', () => {
    compressor.compress('test data');
    const result: DecompressionResult = compressor.decompress('dGVzdCBkYXRh'); // base64 encoded
    expect(result.data).toBeDefined();
  });

  it('should track compression statistics', () => {
    compressor.compress('data1');
    compressor.compress('data2');
    const stats: CompressorStats = compressor.getStats();
    expect(stats.compressCount).toBe(2);
  });

  it('should get compressor name', () => {
    expect(compressor.getCompressor()).toBe('gzip');
  });

  it('should reset statistics', () => {
    compressor.compress('data');
    compressor.reset();
    const stats: CompressorStats = compressor.getStats();
    expect(stats.compressCount).toBe(0);
  });

  it('should get snapshot', () => {
    const snapshot = compressor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  it('should generate report', () => {
    const report: string = compressor.getReport();
    expect(report).toContain('Compressor Report');
    expect(report).toContain('gzip');
  });

  it('should export metrics', () => {
    const metrics = compressor.exportMetrics();
    expect(metrics.version).toBe('V124');
    expect(metrics.stats).toBeDefined();
    expect(metrics.config).toBeDefined();
  });
});

describe('CompressorRegistry', () => {
  let registry: CompressorRegistry;

  beforeEach(() => {
    const config: CompressorRegistryConfig = {
      maxCompressors: 10,
      allowOverride: false,
      enableAutoRegister: true,
    };
    registry = new CompressorRegistry(config);
  });

  it('should create registry with config', () => {
    expect(registry.config.maxCompressors).toBe(10);
    expect(registry.config.allowOverride).toBe(false);
  });

  it('should register compressor', () => {
    const compressor = new Compressor({ algorithm: 'zip' });
    const result = registry.register('zip-compressor', compressor);
    expect(result).toBe(true);
  });

  it('should not register duplicate without override', () => {
    const compressor = new Compressor({ algorithm: 'zip' });
    registry.register('compressor1', compressor);
    const result = registry.register('compressor1', compressor);
    expect(result).toBe(false);
  });

  it('should unregister compressor', () => {
    const compressor = new Compressor({ algorithm: 'zip' });
    registry.register('test-comp', compressor);
    const result = registry.unregister('test-comp');
    expect(result).toBe(true);
    expect(registry.has('test-comp')).toBe(false);
  });

  it('should get registered compressor', () => {
    const compressor = new Compressor({ algorithm: 'rar' });
    registry.register('rar-comp', compressor);
    const retrieved = registry.get('rar-comp');
    expect(retrieved).toBeDefined();
    expect(retrieved?.getCompressor()).toBe('rar');
  });

  it('should return undefined for non-existent compressor', () => {
    const result = registry.get('non-existent');
    expect(result).toBeUndefined();
  });

  it('should get all registered compressor names', () => {
    registry.register('comp1', new Compressor({ algorithm: 'a' }));
    registry.register('comp2', new Compressor({ algorithm: 'b' }));
    const all = registry.getAll();
    expect(all).toContain('comp1');
    expect(all).toContain('comp2');
  });

  it('should check if compressor exists', () => {
    registry.register('exists', new Compressor({ algorithm: 'test' }));
    expect(registry.has('exists')).toBe(true);
    expect(registry.has('not-exists')).toBe(false);
  });

  it('should get registry stats', () => {
    registry.register('test', new Compressor({ algorithm: 'test' }));
    const stats: CompressorRegistryStats = registry.getStats();
    expect(stats.totalRegistered).toBe(1);
    expect(stats.activeCompressors).toBe(1);
  });

  it('should reset registry', () => {
    registry.register('test', new Compressor({ algorithm: 'test' }));
    registry.reset();
    const stats = registry.getStats();
    expect(stats.totalRegistered).toBe(0);
  });

  it('should generate report', () => {
    const report: string = registry.getReport();
    expect(report).toContain('Compressor Registry Report');
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('V124');
    expect(metrics.stats).toBeDefined();
  });
});

describe('CompressorExecutor', () => {
  let executor: CompressorExecutor;

  beforeEach(() => {
    const config: CompressorExecutorConfig = {
      timeout: 5000,
      maxConcurrent: 5,
      retryCount: 3,
      enableParallel: true,
    };
    executor = new CompressorExecutor(config);
  });

  it('should create executor with config', () => {
    expect(executor.config.timeout).toBe(5000);
    expect(executor.config.maxConcurrent).toBe(5);
  });

  it('should execute compression', () => {
    const compressor = new Compressor({ algorithm: 'test' });
    const result: ExecutionResult = executor.execute('test', compressor, 'data');
    expect(result.success).toBe(true);
    expect(result.compressorName).toBe('test');
  });

  it('should track execution results', () => {
    const compressor = new Compressor({ algorithm: 'test' });
    executor.execute('test1', compressor, 'data1');
    executor.execute('test2', compressor, 'data2');
    const results = executor.getResults();
    expect(results.length).toBe(2);
  });

  it('should run batch of compressions', () => {
    const compressor = new Compressor({ algorithm: 'batch' });
    const batch = executor.run([
      { name: 'batch1', compressor, data: 'data1' },
      { name: 'batch2', compressor, data: 'data2' },
    ]);
    expect(batch.results.length).toBe(2);
    expect(batch.id).toBeDefined();
  });

  it('should get executor stats', () => {
    const compressor = new Compressor({ algorithm: 'test' });
    executor.execute('test', compressor, 'data');
    const stats: CompressorExecutorStats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successfulExecutions).toBe(1);
  });

  it('should handle failed execution', () => {
    const badCompressor = {} as Compressor;
    const result = executor.execute('bad', badCompressor as any, 'data');
    expect(result.success).toBe(false);
  });

  it('should get snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.activeOperations).toBeDefined();
  });

  it('should reset executor', () => {
    const compressor = new Compressor({ algorithm: 'test' });
    executor.execute('test', compressor, 'data');
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(0);
  });

  it('should generate report', () => {
    const report: string = executor.getReport();
    expect(report).toContain('Compressor Executor Report');
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('V124');
    expect(metrics.stats).toBeDefined();
  });
});

describe('CompressorMonitor', () => {
  let monitor: CompressorMonitor;

  beforeEach(() => {
    const config: CompressorMonitorConfig = {
      interval: 100,
      historySize: 100,
      enableAlerts: true,
      alertThreshold: 100,
    };
    monitor = new CompressorMonitor(config);
  });

  it('should create monitor with config', () => {
    expect(monitor.config.interval).toBe(100);
    expect(monitor.config.historySize).toBe(100);
  });

  it('should track metrics', () => {
    monitor.track('compression-time', 50);
    const metrics = monitor.getMetrics();
    expect(metrics.length).toBe(1);
  });

  it('should get metric history', () => {
    monitor.track('metric1', 10);
    monitor.track('metric2', 20);
    const history: MetricEntry[] = monitor.getHistory();
    expect(history.length).toBe(2);
  });

  it('should get monitor status', () => {
    const status = monitor.getStatus();
    expect(status.healthy).toBe(true);
    expect(status.metricsCount).toBeDefined();
  });

  it('should trigger alerts on threshold', () => {
    monitor.track('high-metric', 150);
    const stats: CompressorMonitorStats = monitor.getStats();
    expect(stats.alertsTriggered).toBe(1);
  });

  it('should not trigger alerts below threshold', () => {
    monitor.track('low-metric', 50);
    const stats = monitor.getStats();
    expect(stats.alertsTriggered).toBe(0);
  });

  it('should maintain history size limit', () => {
    const smallConfig: CompressorMonitorConfig = {
      interval: 100,
      historySize: 5,
      enableAlerts: false,
    };
    const smallMonitor = new CompressorMonitor(smallConfig);
    for (let i = 0; i < 10; i++) {
      smallMonitor.track('metric', i);
    }
    const history = smallMonitor.getHistory();
    expect(history.length).toBe(5);
  });

  it('should reset monitor', () => {
    monitor.track('metric', 50);
    monitor.reset();
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(0);
  });

  it('should get snapshot', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.currentStatus).toBeDefined();
  });

  it('should generate report', () => {
    const report: string = monitor.getReport();
    expect(report).toContain('Compressor Monitor Report');
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V124');
    expect(metrics.stats).toBeDefined();
  });

  it('should clear alerts', () => {
    monitor.track('high', 150);
    monitor.clearAlerts();
    const status = monitor.getStatus();
    expect(status.alertsActive).toBe(0);
  });

  it('should get metrics by name', () => {
    monitor.track('test-metric', 10);
    monitor.track('test-metric', 20);
    monitor.track('other-metric', 30);
    const testMetrics = monitor.getMetricsByName('test-metric');
    expect(testMetrics.length).toBe(2);
  });
});