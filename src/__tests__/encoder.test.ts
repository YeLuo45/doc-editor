/**
 * V122 Encoder Module Tests
 */

import { Encoder, EncoderConfig, EncodingResult, EncodingStats } from '../encoder/Encoder';
import { EncoderRegistry, RegistryConfig, RegistryStats } from '../encoder/EncoderRegistry';
import { EncoderExecutor, ExecutorConfig, ExecutionResult, ExecutorStats } from '../encoder/EncoderExecutor';
import { EncoderMonitor, MonitorConfig, MonitorMetrics, MonitorStatus } from '../encoder/EncoderMonitor';

describe('Encoder', () => {
  let encoder: Encoder;
  let config: EncoderConfig;

  beforeEach(() => {
    config = {
      id: 'test-encoder',
      name: 'Test Encoder',
      enabled: true,
      priority: 1,
      timeout: 5000,
      retries: 3,
    };
    encoder = new Encoder(config);
  });

  test('should create encoder with config', () => {
    expect(encoder.config).toEqual(config);
  });

  test('should encode data successfully', () => {
    encoder.registerEncoding('base64', (data) => ({
      success: true,
      data: Buffer.from(String(data)).toString('base64'),
      timestamp: Date.now(),
    }));

    const result = encoder.encode('base64', 'hello');
    expect(result.success).toBe(true);
    expect(result.data).toBe('aGVsbG8=');
  });

  test('should return error for unknown encoding', () => {
    const result = encoder.encode('unknown', 'data');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('should decode data successfully', () => {
    encoder.registerEncoding('reverse', (data) => ({
      success: true,
      data: String(data).split('').reverse().join(''),
      timestamp: Date.now(),
    }));

    const result = encoder.decode('reverse', 'hello');
    expect(result.success).toBe(true);
    expect(result.data).toBe('olleh');
  });

  test('should track encoding stats', () => {
    encoder.registerEncoding('passthrough', (data) => ({
      success: true,
      data,
      timestamp: Date.now(),
    }));

    encoder.encode('passthrough', 'test');
    encoder.encode('passthrough', 'test');

    const stats = encoder.getStats();
    expect(stats.totalEncodings).toBe(2);
    expect(stats.successfulEncodings).toBe(2);
  });

  test('should register and unregister encodings', () => {
    encoder.registerEncoding('test', (data) => ({ success: true, data, timestamp: Date.now() }));
    expect(encoder.getEncoder('test')).toBeDefined();

    encoder.unregisterEncoding('test');
    expect(encoder.getEncoder('test')).toBeUndefined();
  });

  test('should reset stats', () => {
    encoder.registerEncoding('test', (data) => ({ success: true, data, timestamp: Date.now() }));
    encoder.encode('test', 'data');
    encoder.reset();

    const stats = encoder.getStats();
    expect(stats.totalEncodings).toBe(0);
  });

  test('should export metrics with version', () => {
    const metrics = encoder.exportMetrics();
    expect(metrics.version).toBe('1.2.2');
    expect(metrics.stats).toBeDefined();
  });

  test('should generate report', () => {
    const report = encoder.getReport();
    expect(report).toContain('Encoder Report');
    expect(report).toContain('test-encoder');
  });

  test('should get snapshot', () => {
    const snapshot = encoder.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toEqual(config);
  });
});

describe('EncoderRegistry', () => {
  let registry: EncoderRegistry;
  let config: RegistryConfig;

  beforeEach(() => {
    config = {
      maxEncoders: 10,
      allowDuplicates: false,
      autoInitialize: true,
    };
    registry = new EncoderRegistry(config);
  });

  test('should register encoder', () => {
    const encoder = new Encoder({ id: 'e1', name: 'E1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    expect(registry.register('enc1', encoder)).toBe(true);
  });

  test('should not register duplicate encoder without flag', () => {
    const encoder = new Encoder({ id: 'e1', name: 'E1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    registry.register('enc1', encoder);
    expect(registry.register('enc1', encoder)).toBe(false);
  });

  test('should unregister encoder', () => {
    const encoder = new Encoder({ id: 'e1', name: 'E1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    registry.register('enc1', encoder);
    expect(registry.unregister('enc1')).toBe(true);
  });

  test('should check if encoder exists', () => {
    const encoder = new Encoder({ id: 'e1', name: 'E1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    registry.register('enc1', encoder);
    expect(registry.has('enc1')).toBe(true);
    expect(registry.has('unknown')).toBe(false);
  });

  test('should get encoder by id', () => {
    const encoder = new Encoder({ id: 'e1', name: 'E1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    registry.register('enc1', encoder);
    expect(registry.get('enc1')).toBe(encoder);
    expect(registry.get('unknown')).toBeUndefined();
  });

  test('should get all encoders', () => {
    const encoder1 = new Encoder({ id: 'e1', name: 'E1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    const encoder2 = new Encoder({ id: 'e2', name: 'E2', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    registry.register('enc1', encoder1);
    registry.register('enc2', encoder2);

    const all = registry.getAll();
    expect(all.size).toBe(2);
  });

  test('should clear all encoders', () => {
    const encoder = new Encoder({ id: 'e1', name: 'E1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    registry.register('enc1', encoder);
    registry.clear();
    expect(registry.getAll().size).toBe(0);
  });

  test('should get registry stats', () => {
    const stats = registry.getStats();
    expect(stats.totalRegistrations).toBe(0);
    expect(stats.activeEncoders).toBe(0);
  });

  test('should reset registry', () => {
    const encoder = new Encoder({ id: 'e1', name: 'E1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    registry.register('enc1', encoder);
    registry.reset();

    const stats = registry.getStats();
    expect(stats.totalRegistrations).toBe(0);
  });
});

describe('EncoderExecutor', () => {
  let registry: EncoderRegistry;
  let executor: EncoderExecutor;
  let executorConfig: ExecutorConfig;

  beforeEach(() => {
    registry = new EncoderRegistry({ maxEncoders: 10, allowDuplicates: false, autoInitialize: true });

    const encoder = new Encoder({ id: 'e1', name: 'E1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    encoder.registerEncoding('upper', (data) => ({
      success: true,
      data: String(data).toUpperCase(),
      timestamp: Date.now(),
    }));
    registry.register('enc1', encoder);

    executorConfig = { parallel: false, stopOnError: true, timeout: 5000, maxConcurrency: 5 };
    executor = new EncoderExecutor(executorConfig, registry);
  });

  test('should execute encoding', () => {
    const result = executor.execute('enc1', 'upper', 'hello');
    expect(result.success).toBe(true);
    expect(result.data).toBe('HELLO');
  });

  test('should track execution stats', () => {
    executor.execute('enc1', 'upper', 'hello');
    executor.execute('enc1', 'upper', 'world');

    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(2);
  });

  test('should run multiple encodings', () => {
    const results = executor.run(['enc1'], 'upper', 'test');
    expect(results.length).toBe(1);
    expect(results[0].result.success).toBe(true);
  });

  test('should get execution results', () => {
    executor.execute('enc1', 'upper', 'hello');
    const results = executor.getResults();
    expect(results.length).toBe(1);
  });

  test('should clear results', () => {
    executor.execute('enc1', 'upper', 'hello');
    executor.clearResults();
    expect(executor.getResults().length).toBe(0);
  });

  test('should reset executor', () => {
    executor.execute('enc1', 'upper', 'hello');
    executor.reset();

    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(0);
  });

  test('should export executor metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.2.2');
    expect(metrics.stats).toBeDefined();
  });

  test('should get executor snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.stats).toBeDefined();
    expect(snapshot.config).toEqual(executorConfig);
  });
});

describe('EncoderMonitor', () => {
  let monitor: EncoderMonitor;
  let config: MonitorConfig;

  beforeEach(() => {
    config = { interval: 1000, historySize: 10, enableAlerts: true };
    monitor = new EncoderMonitor(config);
  });

  test('should track execution result', () => {
    const result = {
      encoderId: 'enc1',
      encodingId: 'upper',
      result: { success: true, data: 'HELLO', timestamp: Date.now() },
    };

    monitor.track(result);
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(1);
  });

  test('should calculate success rate', () => {
    const successResult = { encoderId: 'e1', encodingId: 'u', result: { success: true, data: 'A', timestamp: Date.now() } };
    const failResult = { encoderId: 'e1', encodingId: 'u', result: { success: false, error: 'fail', timestamp: Date.now() } };

    monitor.track(successResult);
    monitor.track(failResult);

    const metrics = monitor.getMetrics();
    expect(metrics.successRate).toBe(0.5);
  });

  test('should maintain history', () => {
    const result = { encoderId: 'e1', encodingId: 'u', result: { success: true, data: 'A', timestamp: Date.now() } };
    monitor.track(result);

    const history = monitor.getHistory();
    expect(history.length).toBe(1);
  });

  test('should get current status', () => {
    expect(monitor.getStatus()).toBe('idle');
  });

  test('should pause and resume', () => {
    monitor.pause();
    expect(monitor.getStatus()).toBe('paused');

    monitor.resume();
    expect(monitor.getStatus()).toBe('monitoring');
  });

  test('should reset monitor', () => {
    const result = { encoderId: 'e1', encodingId: 'u', result: { success: true, data: 'A', timestamp: Date.now() } };
    monitor.track(result);
    monitor.reset();

    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(0);
    expect(monitor.getStatus()).toBe('idle');
  });

  test('should generate monitor report', () => {
    const report = monitor.getReport();
    expect(report).toContain('EncoderMonitor Report');
  });

  test('should export monitor metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.2.2');
    expect(metrics.metrics).toBeDefined();
  });

  test('should update from executor stats', () => {
    const stats: ExecutorStats = {
      totalExecutions: 10,
      successfulExecutions: 8,
      failedExecutions: 2,
      totalDuration: 100,
    };

    monitor.updateFromExecutorStats(stats);
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(10);
  });
});