/**
 * V121 Mutator Tests
 * Comprehensive test suite for mutator module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Mutator, MutatorConfig, MutationResult } from '../mutator/Mutator';
import { MutatorRegistry, RegistryConfig } from '../mutator/MutatorRegistry';
import { MutatorExecutor, ExecutorConfig } from '../mutator/MutatorExecutor';
import { MutatorMonitor, MonitorConfig } from '../mutator/MutatorMonitor';

describe('Mutator', () => {
  let mutator: Mutator;
  let config: MutatorConfig;

  beforeEach(() => {
    config = {
      id: 'test-mutator-1',
      name: 'Test Mutator',
      enabled: true,
      priority: 1,
      timeout: 5000,
      retries: 3,
    };
    mutator = new Mutator(config);
  });

  it('should create a mutator with config', () => {
    expect(mutator.config.id).toBe('test-mutator-1');
    expect(mutator.config.name).toBe('Test Mutator');
    expect(mutator.config.enabled).toBe(true);
  });

  it('should register and execute mutations', () => {
    mutator.registerMutation('double', (data) => {
      return { success: true, data: (data as number) * 2, timestamp: Date.now() };
    });

    const result = mutator.mutate('double', 5);
    expect(result.success).toBe(true);
    expect(result.data).toBe(10);
  });

  it('should return error for non-existent mutation', () => {
    const result = mutator.mutate('non-existent', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should validate data correctly', () => {
    expect(mutator.validate(null)).toBe(false);
    expect(mutator.validate(undefined)).toBe(false);
    expect(mutator.validate({})).toBe(true);
  });

  it('should track mutation stats', () => {
    mutator.registerMutation('inc', (data) => ({
      success: true,
      data: (data as number) + 1,
      timestamp: Date.now(),
    }));

    mutator.mutate('inc', 1);
    mutator.mutate('inc', 2);
    const stats = mutator.getStats();
    expect(stats.totalMutations).toBe(2);
    expect(stats.successfulMutations).toBe(2);
  });

  it('should get snapshot with metrics and config', () => {
    const snapshot = mutator.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
    expect(snapshot.config.id).toBe('test-mutator-1');
  });

  it('should reset stats', () => {
    mutator.registerMutation('test', (data) => ({
      success: true,
      data,
      timestamp: Date.now(),
    }));
    mutator.mutate('test', 1);
    mutator.reset();
    const stats = mutator.getStats();
    expect(stats.totalMutations).toBe(0);
  });

  it('should generate report', () => {
    const report = mutator.getReport();
    expect(report).toContain('Mutator Report');
    expect(report).toContain('test-mutator-1');
  });

  it('should export metrics with version', () => {
    const metrics = mutator.exportMetrics();
    expect(metrics.version).toBe('1.2.1');
    expect(metrics.stats).toBeDefined();
    expect(metrics.config).toBeDefined();
  });
});

describe('MutatorRegistry', () => {
  let registry: MutatorRegistry;
  let config: RegistryConfig;

  beforeEach(() => {
    config = {
      maxMutators: 10,
      allowDuplicates: false,
      autoInitialize: true,
    };
    registry = new MutatorRegistry(config);
  });

  it('should register mutators', () => {
    const mutator = new Mutator({ id: 'm1', name: 'M1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    expect(registry.register('m1', mutator)).toBe(true);
    expect(registry.has('m1')).toBe(true);
  });

  it('should not allow duplicate registrations', () => {
    const mutator = new Mutator({ id: 'm1', name: 'M1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    registry.register('m1', mutator);
    expect(registry.register('m1', mutator)).toBe(false);
  });

  it('should unregister mutators', () => {
    const mutator = new Mutator({ id: 'm1', name: 'M1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    registry.register('m1', mutator);
    expect(registry.unregister('m1')).toBe(true);
    expect(registry.has('m1')).toBe(false);
  });

  it('should get mutator by id', () => {
    const mutator = new Mutator({ id: 'm1', name: 'M1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    registry.register('m1', mutator);
    expect(registry.get('m1')).toBe(mutator);
    expect(registry.get('non-existent')).toBeUndefined();
  });

  it('should get all mutators', () => {
    const m1 = new Mutator({ id: 'm1', name: 'M1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    const m2 = new Mutator({ id: 'm2', name: 'M2', enabled: true, priority: 2, timeout: 1000, retries: 1 });
    registry.register('m1', m1);
    registry.register('m2', m2);
    const all = registry.getAll();
    expect(all.size).toBe(2);
  });

  it('should clear all mutators', () => {
    const mutator = new Mutator({ id: 'm1', name: 'M1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    registry.register('m1', mutator);
    registry.clear();
    expect(registry.getAll().size).toBe(0);
  });

  it('should get snapshot with stats', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot.stats).toBeDefined();
    expect(snapshot.config).toBeDefined();
    expect(Array.isArray(snapshot.mutatorIds)).toBe(true);
  });

  it('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.2.1');
  });
});

describe('MutatorExecutor', () => {
  let registry: MutatorRegistry;
  let executor: MutatorExecutor;

  beforeEach(() => {
    registry = new MutatorRegistry({ maxMutators: 10, allowDuplicates: false, autoInitialize: true });
    const m1 = new Mutator({ id: 'm1', name: 'M1', enabled: true, priority: 1, timeout: 1000, retries: 1 });
    m1.registerMutation('double', (data) => ({
      success: true,
      data: (data as number) * 2,
      timestamp: Date.now(),
    }));
    registry.register('m1', m1);

    executor = new MutatorExecutor(
      { parallel: false, stopOnError: false, timeout: 5000, maxConcurrency: 5 },
      registry
    );
  });

  it('should execute single mutation', () => {
    const result = executor.execute('m1', 'double', 5);
    expect(result.success).toBe(true);
    expect(result.data).toBe(10);
  });

  it('should run multiple mutations', () => {
    const results = executor.run(['m1'], 'double', 3);
    expect(results.length).toBe(1);
    expect(results[0].result.data).toBe(6);
  });

  it('should track execution results', () => {
    executor.execute('m1', 'double', 2);
    const results = executor.getResults();
    expect(results.length).toBe(1);
  });

  it('should get executor stats', () => {
    executor.execute('m1', 'double', 1);
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
  });

  it('should clear results', () => {
    executor.execute('m1', 'double', 1);
    executor.clearResults();
    expect(executor.getResults().length).toBe(0);
  });

  it('should reset executor state', () => {
    executor.execute('m1', 'double', 1);
    executor.reset();
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('1.2.1');
    expect(metrics.stats).toBeDefined();
  });
});

describe('MutatorMonitor', () => {
  let monitor: MutatorMonitor;

  beforeEach(() => {
    monitor = new MutatorMonitor({
      interval: 1000,
      historySize: 10,
      enableAlerts: true,
    });
  });

  it('should track execution results', () => {
    const mockResult = {
      mutatorId: 'm1',
      mutationId: 'double',
      result: { success: true, data: 10, timestamp: Date.now() } as MutationResult,
    };
    monitor.track(mockResult);
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(1);
  });

  it('should calculate success rate', () => {
    monitor.track({ mutatorId: 'm1', mutationId: 'test', result: { success: true, timestamp: Date.now() } });
    monitor.track({ mutatorId: 'm1', mutationId: 'test', result: { success: false, error: 'fail', timestamp: Date.now() } });
    const metrics = monitor.getMetrics();
    expect(metrics.successRate).toBe(0.5);
  });

  it('should get metrics history', () => {
    monitor.track({ mutatorId: 'm1', mutationId: 'test', result: { success: true, timestamp: Date.now() } });
    const history = monitor.getHistory();
    expect(history.length).toBe(1);
  });

  it('should get monitor status', () => {
    expect(monitor.getStatus()).toBe('idle');
    monitor.track({ mutatorId: 'm1', mutationId: 'test', result: { success: true, timestamp: Date.now() } });
    expect(monitor.getStatus()).toBe('monitoring');
  });

  it('should pause and resume monitoring', () => {
    monitor.pause();
    expect(monitor.getStatus()).toBe('paused');
    monitor.resume();
    expect(monitor.getStatus()).toBe('monitoring');
  });

  it('should reset monitor state', () => {
    monitor.track({ mutatorId: 'm1', mutationId: 'test', result: { success: true, timestamp: Date.now() } });
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(0);
    expect(monitor.getStatus()).toBe('idle');
  });

  it('should get snapshot with history', () => {
    monitor.track({ mutatorId: 'm1', mutationId: 'test', result: { success: true, timestamp: Date.now() } });
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.status).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  it('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.2.1');
    expect(Array.isArray(metrics.metrics)).toBe(true);
  });

  it('should update from executor stats', () => {
    monitor.updateFromExecutorStats({
      totalExecutions: 10,
      successfulExecutions: 8,
      failedExecutions: 2,
      totalDuration: 100,
    });
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(10);
  });

  it('should update from mutator stats', () => {
    monitor.updateFromMutatorStats({
      totalMutations: 5,
      successfulMutations: 4,
      failedMutations: 1,
      averageDuration: 10,
    });
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(5);
  });

  it('should generate report', () => {
    monitor.track({ mutatorId: 'm1', mutationId: 'test', result: { success: true, timestamp: Date.now() } });
    const report = monitor.getReport();
    expect(report).toContain('MutatorMonitor Report');
  });
});