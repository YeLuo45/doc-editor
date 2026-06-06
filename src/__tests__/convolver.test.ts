/**
 * V145 Convolver Test Suite
 * Tests for Convolver, ConvolverRegistry, ConvolverExecutor, and ConvolverMonitor
 */

import Convolver, { ConvolverConfig, ConvolverMetrics } from '../convolver/Convolver';
import ConvolverRegistry, { RegistryConfig } from '../convolver/ConvolverRegistry';
import ConvolverExecutor, { ExecutionConfig } from '../convolver/ConvolverExecutor';
import ConvolverMonitor, { MonitorConfig, SystemStatus } from '../convolver/ConvolverMonitor';

describe('Convolver', () => {
  let convolver: Convolver;
  const config: ConvolverConfig = {
    id: 'conv1',
    name: 'Test Convolver',
    enabled: true,
    timeout: 5000,
    maxIterations: 100
  };

  beforeEach(() => {
    convolver = new Convolver(config);
  });

  test('should create with correct config', () => {
    expect(convolver.config.id).toBe('conv1');
    expect(convolver.config.name).toBe('Test Convolver');
    expect(convolver.config.enabled).toBe(true);
  });

  test('should convolve input successfully', () => {
    convolver.setConvolver((input: unknown) => `processed: ${input}`);
    const result = convolver.convolve('test');
    expect(result.success).toBe(true);
    expect(result.result).toBe('processed: test');
  });

  test('should fail when disabled', () => {
    convolver.disable();
    const result = convolver.convolve('test');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Convolver is disabled');
  });

  test('should fail when no function registered', () => {
    const result = convolver.convolve('test');
    expect(result.success).toBe(false);
    expect(result.error).toBe('No convolver function registered');
  });

  test('should getConvolver return null initially', () => {
    expect(convolver.getConvolver()).toBeNull();
  });

  test('should set and get convolver function', () => {
    const fn = (input: unknown) => input;
    convolver.setConvolver(fn);
    expect(convolver.getConvolver()).toBe(fn);
  });

  test('should track stats correctly', () => {
    convolver.setConvolver((input: unknown) => input);
    convolver.convolve('a');
    convolver.convolve('b');
    const stats = convolver.getStats();
    expect(stats.convolutions).toBe(2);
    expect(stats.errors).toBe(0);
  });

  test('should count errors', () => {
    convolver.setConvolver(() => { throw new Error('test error'); });
    convolver.convolve('test');
    const stats = convolver.getStats();
    expect(stats.errors).toBe(1);
  });

  test('should getSnapshot return metrics', () => {
    const snapshot = convolver.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('convolutions');
  });

  test('should reset metrics', () => {
    convolver.setConvolver((input: unknown) => input);
    convolver.convolve('test');
    convolver.reset();
    const stats = convolver.getStats();
    expect(stats.convolutions).toBe(0);
    expect(stats.totalTime).toBe(0);
  });

  test('should generate report', () => {
    const report = convolver.getReport();
    expect(report).toContain('Convolver Report');
    expect(report).toContain('Test Convolver');
  });

  test('should export metrics with version', () => {
    const exported = convolver.exportMetrics();
    expect(exported).toHaveProperty('version');
    expect(exported.version).toBe('1.0.0');
  });

  test('should enable and disable', () => {
    convolver.disable();
    expect(convolver.config.enabled).toBe(false);
    convolver.enable();
    expect(convolver.config.enabled).toBe(true);
  });

  test('should update config', () => {
    convolver.updateConfig({ name: 'Updated Name' });
    expect(convolver.config.name).toBe('Updated Name');
  });
});

describe('ConvolverRegistry', () => {
  let registry: ConvolverRegistry;
  const config: RegistryConfig = {
    maxConvolvers: 10,
    allowDuplicateNames: false,
    autoEnable: true
  };

  beforeEach(() => {
    registry = new ConvolverRegistry(config);
  });

  test('should register convolver successfully', () => {
    const convolver = new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 });
    const result = registry.register(convolver);
    expect(result.success).toBe(true);
  });

  test('should not register duplicate ID', () => {
    const convolver = new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 });
    registry.register(convolver);
    const result = registry.register(convolver);
    expect(result.success).toBe(false);
  });

  test('should unregister convolver', () => {
    const convolver = new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 });
    registry.register(convolver);
    const result = registry.unregister('c1');
    expect(result.success).toBe(true);
    expect(registry.get('c1')).toBeUndefined();
  });

  test('should get convolver by ID', () => {
    const convolver = new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 });
    registry.register(convolver);
    expect(registry.get('c1')).toBe(convolver);
  });

  test('should get convolver by name', () => {
    const convolver = new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 });
    registry.register(convolver);
    expect(registry.getByName('Conv1')).toBe(convolver);
  });

  test('should getAll convolvers', () => {
    registry.register(new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 }));
    registry.register(new Convolver({ id: 'c2', name: 'Conv2', enabled: true, timeout: 1000, maxIterations: 10 }));
    expect(registry.getAll().length).toBe(2);
  });

  test('should check has by ID', () => {
    const convolver = new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 });
    registry.register(convolver);
    expect(registry.has('c1')).toBe(true);
    expect(registry.has('c2')).toBe(false);
  });

  test('should clear all convolvers', () => {
    registry.register(new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 }));
    registry.clear();
    expect(registry.getAll().length).toBe(0);
  });

  test('should get registry stats', () => {
    const localConfig: RegistryConfig = {
      maxConvolvers: 10,
      allowDuplicateNames: false,
      autoEnable: false
    };
    const localRegistry = new ConvolverRegistry(localConfig);
    localRegistry.register(new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 }));
    localRegistry.register(new Convolver({ id: 'c2', name: 'Conv2', enabled: false, timeout: 1000, maxIterations: 10 }));
    const stats = localRegistry.getStats();
    expect(stats.totalConvolvers).toBe(2);
    expect(stats.enabledConvolvers).toBe(1);
  });

  test('should get snapshot', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  test('should reset all metrics', () => {
    registry.register(new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 }));
    registry.register(new Convolver({ id: 'c2', name: 'Conv2', enabled: true, timeout: 1000, maxIterations: 10 }));
    registry.reset();
    const stats = registry.getStats();
    expect(stats.totalConvolvers).toBe(2); // Convolvers remain, only metrics reset
  });

  test('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('Convolver Registry Report');
  });

  test('should export metrics with version', () => {
    const exported = registry.exportMetrics();
    expect(exported).toHaveProperty('version');
    expect(exported.version).toBe('1.0.0');
  });

  test('should enable and disable all', () => {
    registry.register(new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 }));
    registry.disableAll();
    expect(registry.get('c1')?.config.enabled).toBe(false);
    registry.enableAll();
    expect(registry.get('c1')?.config.enabled).toBe(true);
  });
});

describe('ConvolverExecutor', () => {
  let registry: ConvolverRegistry;
  let executor: ConvolverExecutor;
  const regConfig: RegistryConfig = { maxConvolvers: 10, allowDuplicateNames: false, autoEnable: true };
  const execConfig: ExecutionConfig = { parallel: false, stopOnError: true, timeout: 5000, maxConcurrency: 5 };

  beforeEach(() => {
    registry = new ConvolverRegistry(regConfig);
    executor = new ConvolverExecutor(registry, execConfig);
  });

  test('should execute convolver successfully', () => {
    const convolver = new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 });
    convolver.setConvolver((input: unknown) => `result: ${input}`);
    registry.register(convolver);

    const result = executor.execute('c1', 'test');
    expect(result.success).toBe(true);
    expect(result.result).toBe('result: test');
  });

  test('should fail for non-existent convolver', () => {
    const result = executor.execute('nonexistent', 'test');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('should run multiple convolvers', () => {
    const c1 = new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 });
    c1.setConvolver((input: unknown) => input);
    const c2 = new Convolver({ id: 'c2', name: 'Conv2', enabled: true, timeout: 1000, maxIterations: 10 });
    c2.setConvolver((input: unknown) => input);
    registry.register(c1);
    registry.register(c2);

    const results = executor.run(['c1', 'c2'], 'test');
    expect(results.length).toBe(2);
    expect(results[0].success).toBe(true);
  });

  test('should get results for convolver', () => {
    const convolver = new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 });
    convolver.setConvolver((input: unknown) => input);
    registry.register(convolver);

    executor.execute('c1', 'test');
    const results = executor.getResults('c1');
    expect(results.length).toBe(1);
  });

  test('should get all results', () => {
    executor.execute('nonexistent', 'test');
    const all = executor.getAllResults();
    expect(Array.isArray(all)).toBe(true);
  });

  test('should get executor stats', () => {
    const stats = executor.getStats();
    expect(stats).toHaveProperty('totalExecutions');
    expect(stats).toHaveProperty('successfulExecutions');
  });

  test('should get snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  test('should reset executor', () => {
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(0);
  });

  test('should generate report', () => {
    const report = executor.getReport();
    expect(report).toContain('Convolver Executor Report');
  });

  test('should export metrics with version', () => {
    const exported = executor.exportMetrics();
    expect(exported).toHaveProperty('version');
    expect(exported.version).toBe('1.0.0');
  });

  test('should clear results for convolver', () => {
    const convolver = new Convolver({ id: 'c1', name: 'Conv1', enabled: true, timeout: 1000, maxIterations: 10 });
    convolver.setConvolver((input: unknown) => input);
    registry.register(convolver);

    executor.execute('c1', 'test');
    executor.clearResults('c1');
    expect(executor.getResults('c1').length).toBe(0);
  });

  test('should clear all results', () => {
    executor.clearAllResults();
    expect(executor.getAllResults().length).toBe(0);
  });
});

describe('ConvolverMonitor', () => {
  let monitor: ConvolverMonitor;
  const config: MonitorConfig = { historySize: 100, enableRealTime: true, samplingRate: 1.0 };

  beforeEach(() => {
    monitor = new ConvolverMonitor(config);
  });

  test('should track metric', () => {
    monitor.track('test_metric', 42);
    const metrics = monitor.getMetrics('test_metric');
    expect(metrics.length).toBe(1);
    expect(metrics[0].value).toBe(42);
  });

  test('should track with label', () => {
    monitor.track('test_metric', 10, 'label1');
    const metrics = monitor.getMetrics('test_metric');
    expect(metrics[0].label).toBe('label1');
  });

  test('should get metric names', () => {
    monitor.track('metric1', 1);
    monitor.track('metric2', 2);
    const names = monitor.getMetricNames();
    expect(names).toContain('metric1');
    expect(names).toContain('metric2');
  });

  test('should get history with limit', () => {
    for (let i = 0; i < 10; i++) {
      monitor.track('test', i);
    }
    const history = monitor.getHistory('test', 5);
    expect(history.length).toBe(5);
  });

  test('should get aggregated metrics', () => {
    monitor.track('test', 10);
    monitor.track('test', 20);
    monitor.track('test', 30);
    const agg = monitor.getAggregatedMetrics('test');
    expect(agg.avgValue).toBe(20);
    expect(agg.minValue).toBe(10);
    expect(agg.maxValue).toBe(30);
  });

  test('should get and set status', () => {
    expect(monitor.getStatus()).toBe('unknown');
    monitor.setStatus('healthy');
    expect(monitor.getStatus()).toBe('healthy');
  });

  test('should get events', () => {
    monitor.track('test', 1);
    monitor.setStatus('healthy');
    const events = monitor.getEvents();
    expect(events.length).toBe(2);
  });

  test('should get snapshot', () => {
    monitor.track('test', 1);
    const snapshot = monitor.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  test('should reset monitor', () => {
    monitor.track('test', 1);
    monitor.reset();
    expect(monitor.getMetricNames().length).toBe(0);
    expect(monitor.getStatus()).toBe('unknown');
  });

  test('should clear specific metric', () => {
    monitor.track('test', 1);
    monitor.clearMetric('test');
    expect(monitor.getMetrics('test').length).toBe(0);
  });

  test('should generate report', () => {
    monitor.track('metric1', 10);
    const report = monitor.getReport();
    expect(report).toContain('Convolver Monitor Report');
  });

  test('should export metrics with version', () => {
    const exported = monitor.exportMetrics();
    expect(exported).toHaveProperty('version');
    expect(exported.version).toBe('1.0.0');
  });

  test('should handle empty metric', () => {
    const agg = monitor.getAggregatedMetrics('nonexistent');
    expect(agg.trackedItems).toBe(0);
  });

  test('should respect history size limit', () => {
    const smallConfig = { historySize: 5, enableRealTime: true, samplingRate: 1.0 };
    const smallMonitor = new ConvolverMonitor(smallConfig);
    
    for (let i = 0; i < 10; i++) {
      smallMonitor.track('test', i);
    }
    
    const metrics = smallMonitor.getMetrics('test');
    expect(metrics.length).toBe(5);
  });
});