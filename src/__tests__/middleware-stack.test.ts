/**
 * middleware-stack.test.ts
 * V85 Middleware Stack Test Suite - 27+ tests covering all middleware components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MiddlewareStack,
  MiddlewareFn,
  MiddlewareConfig,
  StackStats,
} from '../middleware-stack/MiddlewareStack';
import { MiddlewareExecutor } from '../middleware-stack/MiddlewareExecutor';
import { MiddlewareRegistry } from '../middleware-stack/MiddlewareRegistry';
import { MiddlewareMonitor } from '../middleware-stack/MiddlewareMonitor';

describe('MiddlewareStack', () => {
  let stack: MiddlewareStack;

  beforeEach(() => {
    stack = new MiddlewareStack({ enableStats: true });
  });

  it('should create with default config', () => {
    expect(stack.config.defaultTimeout).toBe(5000);
    expect(stack.config.enableStats).toBe(true);
    expect(stack.config.errorHandling).toBe('throw');
  });

  it('should create with custom config', () => {
    const custom = new MiddlewareStack({ defaultTimeout: 1000, errorHandling: 'skip' });
    expect(custom.config.defaultTimeout).toBe(1000);
    expect(custom.config.errorHandling).toBe('skip');
  });

  it('should use middleware with config', () => {
    const mw: MiddlewareFn = vi.fn(async (ctx, next) => next());
    stack.use(mw, { name: 'test-mw', priority: 10 });
    expect(stack.getStack()).toHaveLength(1);
    expect(stack.getStack()[0].name).toBe('test-mw');
  });

  it('should use middleware without config', () => {
    const mw: MiddlewareFn = vi.fn(async (ctx, next) => next());
    stack.use(mw);
    expect(stack.getStack()).toHaveLength(1);
  });

  it('should remove middleware by name', () => {
    const mw: MiddlewareFn = vi.fn(async (ctx, next) => next());
    stack.use(mw, { name: 'to-remove' });
    expect(stack.remove('to-remove')).toBe(true);
    expect(stack.getStack()).toHaveLength(0);
  });

  it('should return false when removing non-existent middleware', () => {
    expect(stack.remove('non-existent')).toBe(false);
  });

  it('should execute middleware stack', async () => {
    const results: string[] = [];
    const mw1: MiddlewareFn = vi.fn(async (ctx, next) => {
      results.push('mw1-before');
      await next();
      results.push('mw1-after');
    });
    const mw2: MiddlewareFn = vi.fn(async (ctx, next) => {
      results.push('mw2-before');
      await next();
      results.push('mw2-after');
    });

    stack.use(mw1, { name: 'mw1' });
    stack.use(mw2, { name: 'mw2' });

    await stack.execute({});
    expect(results).toEqual(['mw1-before', 'mw2-before', 'mw2-after', 'mw1-after']);
  });

  it('should throw when no middleware registered', async () => {
    await expect(stack.execute({})).rejects.toThrow('No middleware registered');
  });

  it('should get stack statistics', () => {
    const mw: MiddlewareFn = vi.fn(async (ctx, next) => next());
    stack.use(mw);
    const stats = stack.getStats();
    expect(stats.activeMiddleware).toBe(1);
  });

  it('should get snapshot', () => {
    const snapshot = stack.getSnapshot();
    expect(snapshot.metrics.timestamp).toBeDefined();
    expect(snapshot.metrics.stats).toBeDefined();
    expect(snapshot.metrics.middleware).toBeDefined();
  });

  it('should reset stats', () => {
    stack.reset();
    const stats = stack.getStats();
    expect(stats.totalCalls).toBe(0);
    expect(stats.totalErrors).toBe(0);
  });

  it('should generate report', () => {
    const report = stack.getReport();
    expect(report).toContain('MiddlewareStack Report');
    expect(report).toContain('Config:');
  });

  it('should export metrics', () => {
    const metrics = stack.exportMetrics();
    expect(metrics.version).toContain('V85');
  });
});

describe('MiddlewareExecutor', () => {
  let executor: MiddlewareExecutor;

  beforeEach(() => {
    executor = new MiddlewareExecutor({ maxConcurrent: 5, retryAttempts: 3 });
  });

  it('should create with default config', () => {
    expect(executor.config.maxConcurrent).toBe(5);
    expect(executor.config.retryAttempts).toBe(3);
  });

  it('should create with custom config', () => {
    const custom = new MiddlewareExecutor({ maxConcurrent: 10, retryDelay: 200 });
    expect(custom.config.maxConcurrent).toBe(10);
    expect(custom.config.retryDelay).toBe(200);
  });

  it('should execute middleware chain', async () => {
    const mw: MiddlewareFn = vi.fn(async (ctx, next) => 'result');
    await executor.execute('exec1', [mw], {});
    expect(executor.getExecutors()).toHaveLength(1);
  });

  it('should throw on failed execution', async () => {
    const mw: MiddlewareFn = vi.fn(async () => {
      throw new Error('fail');
    });
    await expect(executor.execute('exec2', [mw], {})).rejects.toThrow('fail');
  });

  it('should run with retry logic', async () => {
    let attempts = 0;
    const mw: MiddlewareFn = vi.fn(async () => {
      attempts++;
      if (attempts < 2) throw new Error('transient');
      return 'success';
    });
    const result = await executor.run('retry-exec', mw, {}, { retries: 3 });
    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  it('should get executor status', () => {
    const status = executor.getStatus();
    expect(status.active).toBe(0);
    expect(status.completed).toBe(0);
    expect(status.failed).toBe(0);
  });

  it('should get snapshot', () => {
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics.timestamp).toBeDefined();
    expect(snapshot.metrics.status).toBeDefined();
  });

  it('should reset executor', () => {
    executor.reset();
    expect(executor.getExecutors()).toHaveLength(0);
  });

  it('should generate report', () => {
    const report = executor.getReport();
    expect(report).toContain('MiddlewareExecutor Report');
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toContain('V85');
  });
});

describe('MiddlewareRegistry', () => {
  let registry: MiddlewareRegistry;

  beforeEach(() => {
    registry = new MiddlewareRegistry({ namespace: 'test' });
  });

  it('should create with default config', () => {
    expect(registry.config.namespace).toBe('test');
    expect(registry.config.autoRegister).toBe(true);
  });

  it('should create with custom config', () => {
    const custom = new MiddlewareRegistry({ namespace: 'custom', validateMiddleware: false });
    expect(custom.config.namespace).toBe('custom');
    expect(custom.config.validateMiddleware).toBe(false);
  });

  it('should register middleware', () => {
    const mw: MiddlewareFn = vi.fn(async (ctx, next) => next());
    const id = registry.register(mw, { name: 'test-mw', version: '1.0.0' });
    expect(id).toBeDefined();
    expect(registry.has(id)).toBe(true);
  });

  it('should unregister middleware', () => {
    const mw: MiddlewareFn = vi.fn(async (ctx, next) => next());
    const id = registry.register(mw);
    expect(registry.unregister(id)).toBe(true);
    expect(registry.has(id)).toBe(false);
  });

  it('should get middleware by id', () => {
    const mw: MiddlewareFn = vi.fn(async (ctx, next) => next());
    const id = registry.register(mw, { name: 'get-test' });
    const entry = registry.get(id);
    expect(entry?.name).toBe('get-test');
    expect(entry?.usageCount).toBe(1);
  });

  it('should get all middleware', () => {
    const mw: MiddlewareFn = vi.fn(async (ctx, next) => next());
    registry.register(mw);
    registry.register(mw);
    expect(registry.getAll()).toHaveLength(2);
  });

  it('should enable and disable middleware', () => {
    const mw: MiddlewareFn = vi.fn(async (ctx, next) => next());
    const id = registry.register(mw);
    expect(registry.disable(id)).toBe(true);
    expect(registry.getEnabled()).toHaveLength(0);
    expect(registry.enable(id)).toBe(true);
    expect(registry.getEnabled()).toHaveLength(1);
  });

  it('should get snapshot', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.timestamp).toBeDefined();
    expect(snapshot.metrics.total).toBeDefined();
  });

  it('should reset registry', () => {
    const mw: MiddlewareFn = vi.fn(async (ctx, next) => next());
    registry.register(mw);
    const countBefore = registry.count();
    expect(countBefore).toBeGreaterThan(0);
    registry.reset();
    expect(registry.count()).toBe(countBefore); // entries remain
    expect(registry.getAll()[0].usageCount).toBe(0); // but usageCount reset
  });

  it('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('MiddlewareRegistry Report');
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toContain('V85');
  });
});

describe('MiddlewareMonitor', () => {
  let monitor: MiddlewareMonitor;

  beforeEach(() => {
    monitor = new MiddlewareMonitor({ historySize: 100, sampleRate: 1.0 });
  });

  it('should create with default config', () => {
    expect(monitor.config.historySize).toBe(100);
    expect(monitor.config.sampleRate).toBe(1.0);
  });

  it('should create with custom config', () => {
    const custom = new MiddlewareMonitor({ historySize: 500, sampleRate: 0.5 });
    expect(custom.config.historySize).toBe(500);
    expect(custom.config.sampleRate).toBe(0.5);
  });

  it('should track execution', () => {
    monitor.track('mw1', 50, true);
    const metrics = monitor.getMetrics();
    expect(metrics.totalExecutions).toBe(1);
    expect(metrics.successRate).toBe(1.0);
  });

  it('should track failed execution', () => {
    monitor.track('mw1', 30, false, 'error message');
    const metrics = monitor.getMetrics();
    expect(metrics.errorCount).toBe(1);
    expect(metrics.successRate).toBe(0);
  });

  it('should mark middleware active', () => {
    const id = monitor.markActive('mw1', { key: 'value' });
    expect(id).toBeDefined();
    expect(monitor.getActive()).toHaveLength(1);
  });

  it('should mark middleware complete', () => {
    const id = monitor.markActive('mw1');
    expect(monitor.markComplete(id)).toBe(true);
    expect(monitor.getActive()).toHaveLength(0);
  });

  it('should get aggregated metrics', () => {
    monitor.track('mw1', 100, true);
    monitor.track('mw2', 200, true);
    monitor.track('mw3', 300, false);
    const metrics = monitor.getMetrics();
    expect(metrics.totalExecutions).toBe(3);
    expect(metrics.successRate).toBeCloseTo(0.667, 2);
    expect(metrics.averageDuration).toBeCloseTo(200, 0);
  });

  it('should get history with limit', () => {
    for (let i = 0; i < 10; i++) {
      monitor.track(`mw${i}`, i * 10, true);
    }
    const history = monitor.getHistory(5);
    expect(history).toHaveLength(5);
  });

  it('should get snapshot', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics.timestamp).toBeDefined();
    expect(snapshot.metrics.metrics).toBeDefined();
  });

  it('should reset monitor', () => {
    monitor.track('mw1', 50, true);
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.totalExecutions).toBe(0);
    expect(metrics.errorCount).toBe(0);
  });

  it('should generate report', () => {
    monitor.track('mw1', 50, true);
    const report = monitor.getReport();
    expect(report).toContain('MiddlewareMonitor Report');
    expect(report).toContain('Total Executions:');
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toContain('V85');
  });
});