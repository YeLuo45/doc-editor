/**
 * filter-chain.test.ts - V110 Filter Chain Tests
 * Tests for FilterChain, FilterRegistry, FilterExecutor, and FilterMonitor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterChain, Filter } from '../filter-chain/FilterChain';
import { FilterRegistry } from '../filter-chain/FilterRegistry';
import { FilterExecutor } from '../filter-chain/FilterExecutor';
import { FilterMonitor } from '../filter-chain/FilterMonitor';

describe('FilterChain', () => {
  let chain: FilterChain;

  beforeEach(() => {
    chain = new FilterChain({
      maxFilters: 10,
      enableBypass: true,
      stopOnError: false,
      asyncExecution: true,
    });
  });

  it('should add filter successfully', () => {
    const filter: Filter = { name: 'test', priority: 1, execute: async (d) => d };
    expect(chain.add(filter)).toBe(true);
    expect(chain.getChain().length).toBe(1);
  });

  it('should reject duplicate filter', () => {
    const filter: Filter = { name: 'test', priority: 1, execute: async (d) => d };
    chain.add(filter);
    expect(chain.add(filter)).toBe(false);
    expect(chain.getChain().length).toBe(1);
  });

  it('should remove filter successfully', () => {
    const filter: Filter = { name: 'test', priority: 1, execute: async (d) => d };
    chain.add(filter);
    expect(chain.remove('test')).toBe(true);
    expect(chain.getChain().length).toBe(0);
  });

  it('should execute filters in priority order', async () => {
    const results: string[] = [];
    chain.add({ name: 'first', priority: 2, execute: async (d) => { results.push('first'); return d; } });
    chain.add({ name: 'second', priority: 1, execute: async (d) => { results.push('second'); return d; } });
    await chain.execute('data');
    expect(results).toEqual(['second', 'first']);
  });

  it('should get stats after execution', async () => {
    chain.add({ name: 'test', priority: 1, execute: async (d) => d });
    await chain.execute('data');
    const stats = chain.getStats();
    expect(stats.filtersExecuted).toBe(1);
    expect(stats.filtersAdded).toBe(1);
  });

  it('should reset chain state', async () => {
    chain.add({ name: 'test', priority: 1, execute: async (d) => d });
    await chain.execute('data');
    chain.reset();
    expect(chain.getChain().length).toBe(0);
    expect(chain.getStats().filtersExecuted).toBe(0);
  });

  it('should get snapshot with metrics', async () => {
    chain.add({ name: 'test', priority: 1, execute: async (d) => d });
    await chain.execute('data');
    const snapshot = chain.getSnapshot();
    expect(snapshot.metrics.status).toBe('completed');
    expect(snapshot.metrics.filtersExecuted).toBe(1);
  });

  it('should generate report string', () => {
    const report = chain.getReport();
    expect(report).toContain('Filter Chain Report');
    expect(report).toContain('Status');
  });

  it('should export metrics with version', () => {
    const metrics = chain.exportMetrics();
    expect(metrics.version).toBe('V110');
    expect(metrics.status).toBeDefined();
  });
});

describe('FilterRegistry', () => {
  let registry: FilterRegistry;

  beforeEach(() => {
    registry = new FilterRegistry({
      maxFilters: 10,
      allowOverride: false,
      enableAutoRegister: true,
    });
  });

  it('should register filter', () => {
    expect(registry.register('test', { execute: async () => {} })).toBe(true);
    expect(registry.has('test')).toBe(true);
  });

  it('should unregister filter', () => {
    registry.register('test', {});
    expect(registry.unregister('test')).toBe(true);
    expect(registry.has('test')).toBe(false);
  });

  it('should get registered filter', () => {
    const filterObj = { execute: async () => 'result' };
    registry.register('test', filterObj);
    expect(registry.get('test')).toBe(filterObj);
  });

  it('should get all filters', () => {
    registry.register('a', {});
    registry.register('b', {});
    expect(registry.getAll().size).toBe(2);
  });

  it('should check has filter', () => {
    registry.register('test', {});
    expect(registry.has('test')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('should not override without allowOverride', () => {
    registry.register('test', {});
    expect(registry.register('test', {})).toBe(false);
  });

  it('should get stats after operations', () => {
    registry.register('test', {});
    const stats = registry.getStats();
    expect(stats.totalRegistered).toBe(1);
  });

  it('should reset registry', () => {
    registry.register('test', {});
    registry.reset();
    expect(registry.has('test')).toBe(false);
    expect(registry.getStats().totalRegistered).toBe(0);
  });

  it('should generate report string', () => {
    const report = registry.getReport();
    expect(report).toContain('Filter Registry Report');
  });

  it('should export metrics with version', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('V110');
  });
});

describe('FilterExecutor', () => {
  let executor: FilterExecutor;

  beforeEach(() => {
    executor = new FilterExecutor({
      timeout: 5000,
      enableRetry: false,
      maxRetries: 3,
      continueOnError: true,
    });
  });

  it('should execute filter successfully', async () => {
    const filter = { name: 'test', execute: async (d: unknown) => d };
    const result = await executor.execute(filter, 'data');
    expect(result).toBe('data');
  });

  it('should track results', async () => {
    const filter = { name: 'test', execute: async (d: unknown) => d };
    await executor.execute(filter, 'data');
    const results = executor.getResults();
    expect(results.length).toBe(1);
    expect(results[0].success).toBe(true);
  });

  it('should get stats after execution', async () => {
    const filter = { name: 'test', execute: async (d: unknown) => d };
    await executor.execute(filter, 'data');
    const stats = executor.getStats();
    expect(stats.totalRuns).toBe(1);
    expect(stats.successfulRuns).toBe(1);
  });

  it('should run multiple filters', async () => {
    const filters = [
      { name: 'a', execute: async (d: unknown) => d },
      { name: 'b', execute: async (d: unknown) => d },
    ];
    await executor.run(filters, 'data');
    const stats = executor.getStats();
    expect(stats.totalRuns).toBe(2);
  });

  it('should reset executor state', async () => {
    const filter = { name: 'test', execute: async (d: unknown) => d };
    await executor.execute(filter, 'data');
    executor.reset();
    expect(executor.getStats().totalRuns).toBe(0);
  });

  it('should get snapshot with metrics', async () => {
    const filter = { name: 'test', execute: async (d: unknown) => d };
    await executor.execute(filter, 'data');
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics.status).toBeDefined();
  });

  it('should generate report string', () => {
    const report = executor.getReport();
    expect(report).toContain('Filter Executor Report');
  });

  it('should export metrics with version', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('V110');
  });
});

describe('FilterMonitor', () => {
  let monitor: FilterMonitor;

  beforeEach(() => {
    monitor = new FilterMonitor({
      historySize: 100,
      enableAlerts: true,
      alertThreshold: 1000,
      enableMetricsAggregation: true,
    });
  });

  it('should track filter execution', () => {
    monitor.track('test', 100, true);
    const metrics = monitor.getMetrics('test');
    expect(metrics.filterName).toBe('test');
    expect(metrics.executionCount).toBe(1);
  });

  it('should track successful vs failed', () => {
    monitor.track('test', 100, true);
    monitor.track('test', 100, false);
    const metrics = monitor.getMetrics('test') as FilterMetric;
    expect(metrics.successCount).toBe(1);
    expect(metrics.failureCount).toBe(1);
  });

  it('should get history', () => {
    monitor.track('test', 100, true);
    const history = monitor.getHistory();
    expect(history.length).toBe(1);
  });

  it('should get status', () => {
    expect(monitor.getStatus()).toBe('active');
  });

  it('should pause and resume', () => {
    monitor.pause();
    expect(monitor.getStatus()).toBe('paused');
    monitor.resume();
    expect(monitor.getStatus()).toBe('active');
  });

  it('should trigger alerts on threshold', () => {
    monitor.track('slow', 2000, true);
    const stats = monitor.getStats();
    expect(stats.alertsTriggered).toBe(1);
  });

  it('should get stats', () => {
    monitor.track('test', 100, true);
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(1);
  });

  it('should reset monitor', () => {
    monitor.track('test', 100, true);
    monitor.reset();
    expect(monitor.getStats().totalTracked).toBe(0);
  });

  it('should generate report string', () => {
    const report = monitor.getReport();
    expect(report).toContain('Filter Monitor Report');
  });

  it('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V110');
  });
});