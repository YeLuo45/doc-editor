/**
 * V141 Extrapolator Test Suite
 * Tests for Extrapolator, ExtrapolatorRegistry, ExtrapolatorExecutor, ExtrapolatorMonitor
 */

import {
  Extrapolator,
  ExtrapolatorConfig,
  ExtrapolationResult,
  ExtrapolationStats,
} from '../extrapolator/Extrapolator';
import {
  ExtrapolatorRegistry,
  RegistryConfig,
  RegistryStats,
} from '../extrapolator/ExtrapolatorRegistry';
import {
  ExtrapolatorExecutor,
  ExecutorConfig,
  ExecutorStats,
} from '../extrapolator/ExtrapolatorExecutor';
import {
  ExtrapolatorMonitor,
  MonitorConfig,
  MonitorStats,
} from '../extrapolator/ExtrapolatorMonitor';

describe('Extrapolator', () => {
  let extrapolator: Extrapolator;
  const config: ExtrapolatorConfig = {
    name: 'test-extrapolator',
    type: 'linear',
    maxLookahead: 10,
    precision: 2,
    enableCache: true,
    interpolation: 'linear',
  };

  beforeEach(() => {
    extrapolator = new Extrapolator(config);
  });

  test('should create instance with valid config', () => {
    expect(extrapolator).toBeDefined();
    expect(extrapolator.config.name).toBe('test-extrapolator');
    expect(extrapolator.config.type).toBe('linear');
  });

  test('should extrapolate with linear method', () => {
    const data = [1, 2, 3, 4, 5];
    const result = extrapolator.extrapolate(data, 2);
    expect(result).toBeDefined();
    expect(result.method).toBe('linear');
    expect(result.confidence).toBeGreaterThan(0);
  });

  test('should extrapolate with polynomial method', () => {
    const data = [1, 4, 9, 16, 25];
    const result = extrapolator.extrapolate(data, 2, { method: 'polynomial' });
    expect(result).toBeDefined();
    expect(result.method).toBe('polynomial');
  });

  test('should extrapolate with exponential method', () => {
    const data = [2, 4, 8, 16, 32];
    const result = extrapolator.extrapolate(data, 2, { method: 'exponential' });
    expect(result).toBeDefined();
    expect(result.method).toBe('exponential');
  });

  test('should throw error for empty data', () => {
    expect(() => extrapolator.extrapolate([], 2)).toThrow('Data array is empty');
  });

  test('should throw error for invalid steps', () => {
    expect(() => extrapolator.extrapolate([1, 2, 3], 0)).toThrow();
    expect(() => extrapolator.extrapolate([1, 2, 3], 15)).toThrow();
  });

  test('should return stats correctly', () => {
    const data = [1, 2, 3, 4, 5];
    extrapolator.extrapolate(data, 2);
    const stats = extrapolator.getStats();
    expect(stats.totalExtrapolations).toBe(1);
    expect(stats.successfulExtrapolations).toBe(1);
  });

  test('should return snapshot correctly', () => {
    const snapshot = extrapolator.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.metrics).toBeDefined();
  });

  test('should reset correctly', () => {
    const data = [1, 2, 3, 4, 5];
    extrapolator.extrapolate(data, 2);
    extrapolator.reset();
    const stats = extrapolator.getStats();
    expect(stats.totalExtrapolations).toBe(0);
    expect(stats.successfulExtrapolations).toBe(0);
  });

  test('should generate report', () => {
    const report = extrapolator.getReport();
    expect(report).toContain('Extrapolator Report');
    expect(report).toContain('test-extrapolator');
  });

  test('should export metrics version', () => {
    const metrics = extrapolator.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  test('should cache results when enabled', () => {
    const data = [1, 2, 3, 4, 5];
    const result1 = extrapolator.extrapolate(data, 2);
    const result2 = extrapolator.extrapolate(data, 2);
    expect(result1.value).toBe(result2.value);
  });
});

describe('ExtrapolatorRegistry', () => {
  let registry: ExtrapolatorRegistry;
  let extrapolator: Extrapolator;
  const config: RegistryConfig = {
    name: 'test-registry',
    maxEntries: 10,
    enableValidation: true,
    autoInitialize: false,
  };

  beforeEach(() => {
    registry = new ExtrapolatorRegistry(config);
    extrapolator = new Extrapolator({
      name: 'test',
      type: 'linear',
      maxLookahead: 10,
      precision: 2,
      enableCache: false,
      interpolation: 'linear',
    });
  });

  test('should create instance', () => {
    expect(registry).toBeDefined();
    expect(registry.config.name).toBe('test-registry');
  });

  test('should register extrapolator', () => {
    const result = registry.register('test-extrap', extrapolator);
    expect(result).toBe(true);
  });

  test('should throw error when registering duplicate', () => {
    registry.register('test-extrap', extrapolator);
    expect(() => registry.register('test-extrap', extrapolator)).toThrow();
  });

  test('should unregister extrapolator', () => {
    registry.register('test-extrap', extrapolator);
    const result = registry.unregister('test-extrap');
    expect(result).toBe(true);
  });

  test('should get extrapolator by name', () => {
    registry.register('test-extrap', extrapolator);
    const retrieved = registry.get('test-extrap');
    expect(retrieved).toBeDefined();
  });

  test('should return all extrapolators', () => {
    registry.register('test1', extrapolator);
    registry.register('test2', extrapolator);
    const all = registry.getAll();
    expect(all.length).toBe(2);
  });

  test('should check if extrapolator exists', () => {
    registry.register('test-extrap', extrapolator);
    expect(registry.has('test-extrap')).toBe(true);
    expect(registry.has('non-existent')).toBe(false);
  });

  test('should return stats correctly', () => {
    registry.register('test-extrap', extrapolator);
    const stats = registry.getStats();
    expect(stats.totalRegistrations).toBe(1);
    expect(stats.activeExtrapolators).toBe(1);
  });

  test('should reset correctly', () => {
    registry.register('test-extrap', extrapolator);
    registry.reset();
    expect(registry.getAll().length).toBe(0);
  });

  test('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('ExtrapolatorRegistry Report');
  });

  test('should export metrics version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('ExtrapolatorExecutor', () => {
  let executor: ExtrapolatorExecutor;
  let extrapolator: Extrapolator;
  const config: ExecutorConfig = {
    name: 'test-executor',
    maxConcurrent: 5,
    timeout: 30000,
    retryAttempts: 3,
    enableParallel: true,
  };

  beforeEach(() => {
    executor = new ExtrapolatorExecutor(config);
    extrapolator = new Extrapolator({
      name: 'test',
      type: 'linear',
      maxLookahead: 10,
      precision: 2,
      enableCache: false,
      interpolation: 'linear',
    });
  });

  test('should create instance', () => {
    expect(executor).toBeDefined();
    expect(executor.config.name).toBe('test-executor');
  });

  test('should execute extrapolation', () => {
    const data = [1, 2, 3, 4, 5];
    const result = executor.execute(extrapolator, data, 2);
    expect(result).toBeDefined();
    expect(result.value).toBeDefined();
  });

  test('should run extrapolation asynchronously', async () => {
    const data = [1, 2, 3, 4, 5];
    const result = await executor.run(extrapolator, data, 2);
    expect(result).toBeDefined();
  });

  test('should get results', () => {
    const data = [1, 2, 3, 4, 5];
    executor.execute(extrapolator, data, 2);
  });

  test('should return stats correctly', () => {
    const data = [1, 2, 3, 4, 5];
    executor.execute(extrapolator, data, 2);
    const stats = executor.getStats();
    expect(stats.totalTasks).toBe(1);
    expect(stats.completedTasks).toBe(1);
  });

  test('should return snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.metrics).toBeDefined();
  });

  test('should reset correctly', () => {
    const data = [1, 2, 3, 4, 5];
    executor.execute(extrapolator, data, 2);
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalTasks).toBe(0);
  });

  test('should generate report', () => {
    const report = executor.getReport();
    expect(report).toContain('ExtrapolatorExecutor Report');
  });

  test('should export metrics version', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('ExtrapolatorMonitor', () => {
  let monitor: ExtrapolatorMonitor;
  const config: MonitorConfig = {
    name: 'test-monitor',
    metricsWindow: 3600000,
    enableAlerts: true,
    alertThreshold: 0.9,
    samplingRate: 1.0,
  };

  beforeEach(() => {
    monitor = new ExtrapolatorMonitor(config);
  });

  test('should create instance', () => {
    expect(monitor).toBeDefined();
    expect(monitor.config.name).toBe('test-monitor');
  });

  test('should track metrics', () => {
    monitor.track('test-metric', 0.5);
    const metrics = monitor.getMetrics('test-metric');
    expect(metrics.length).toBe(1);
  });

  test('should track with labels', () => {
    monitor.track('test-metric', 0.5, { env: 'test' });
    const metrics = monitor.getMetrics('test-metric');
    expect(metrics[0].labels).toEqual({ env: 'test' });
  });

  test('should get history', () => {
    monitor.track('test-metric', 0.5);
    const history = monitor.getHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  test('should limit history', () => {
    monitor.track('test-metric', 0.5);
    monitor.track('test-metric', 0.6);
    const history = monitor.getHistory(1);
    expect(history.length).toBe(1);
  });

  test('should return status', () => {
    monitor.track('test-metric', 0.5);
    const status = monitor.getStatus();
    expect(status.healthy).toBe(true);
  });

  test('should return stats', () => {
    monitor.track('test-metric', 0.5);
    const stats = monitor.getStats();
    expect(stats.totalTracks).toBe(1);
  });

  test('should return snapshot', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot).toBeDefined();
  });

  test('should reset correctly', () => {
    monitor.track('test-metric', 0.5);
    monitor.reset();
    const stats = monitor.getStats();
    expect(stats.totalTracks).toBe(0);
  });

  test('should generate report', () => {
    const report = monitor.getReport();
    expect(report).toContain('ExtrapolatorMonitor Report');
  });

  test('should export metrics version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});