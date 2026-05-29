import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookManager } from '../hook-manager/HookManager';
import { HookExecutor } from '../hook-manager/HookExecutor';
import { HookRegistry } from '../hook-manager/HookRegistry';
import { HookMonitor } from '../hook-manager/HookMonitor';

describe('HookManager', () => {
  let manager: HookManager;

  beforeEach(() => {
    manager = new HookManager({ maxHooks: 10 });
  });

  it('should have config property', () => {
    expect(manager.config).toBeDefined();
    expect(manager.config.maxHooks).toBe(10);
  });

  it('should register a hook', () => {
    const id = manager.register({ name: 'test', handler: () => {}, config: {}, enabled: true });
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  it('should unregister a hook', () => {
    const id = manager.register({ name: 'test', handler: () => {}, config: {}, enabled: true });
    expect(manager.unregister(id)).toBe(true);
  });

  it('should trigger a hook', async () => {
    const fn = vi.fn(() => 'result');
    const id = manager.register({ name: 'test', handler: fn, config: {}, enabled: true });
    const result = await manager.trigger(id, 'arg1');
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledWith('arg1');
  });

  it('should getHooks with optional tag filter', () => {
    manager.register({ name: 'a', handler: () => {}, config: { tags: ['dev'] }, enabled: true });
    manager.register({ name: 'b', handler: () => {}, config: { tags: ['prod'] }, enabled: true });
    expect(manager.getHooks().length).toBe(2);
    expect(manager.getHooks('dev').length).toBe(1);
  });

  it('should enable and disable hooks', () => {
    const id = manager.register({ name: 'test', handler: () => {}, config: {}, enabled: true });
    expect(manager.disable(id)).toBe(true);
    expect(manager.enable(id)).toBe(true);
  });

  it('should export metrics', () => {
    const metrics = manager.exportMetrics();
    expect(metrics.version).toBeDefined();
    expect(metrics.totalRegistered).toBeDefined();
  });

  it('should get snapshot', () => {
    const snap = manager.getSnapshot();
    expect(snap.metrics).toBeDefined();
    expect(snap.hookCount).toBeDefined();
  });

  it('should reset all hooks', () => {
    manager.register({ name: 'test', handler: () => {}, config: {}, enabled: true });
    manager.reset();
    expect(manager.getHooks().length).toBe(0);
  });

  it('should generate report', () => {
    const report = manager.getReport();
    expect(report).toContain('HookManager Report');
  });

  it('should throw when max hooks reached', () => {
    const m = new HookManager({ maxHooks: 1 });
    m.register({ name: 'a', handler: () => {}, config: {}, enabled: true });
    expect(() => m.register({ name: 'b', handler: () => {}, config: {}, enabled: true })).toThrow();
  });
});

describe('HookExecutor', () => {
  let executor: HookExecutor;

  beforeEach(() => {
    executor = new HookExecutor({ defaultParallel: false });
  });

  it('should have config property', () => {
    expect(executor.config).toBeDefined();
    expect(executor.config.defaultParallel).toBe(false);
  });

  it('should add executor', () => {
    const id = executor.addExecutor({ name: 'exec', fn: () => {}, config: {} });
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  it('should remove executor', () => {
    const id = executor.addExecutor({ name: 'exec', fn: () => {}, config: {} });
    expect(executor.removeExecutor(id)).toBe(true);
  });

  it('should execute executor', async () => {
    const fn = vi.fn(() => 'done');
    const id = executor.addExecutor({ name: 'exec', fn, config: {} });
    const result = await executor.execute(id, 'arg');
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledWith('arg');
  });

  it('should run executors sequentially', async () => {
    const fn1 = vi.fn(() => 'a');
    const fn2 = vi.fn(() => 'b');
    const id1 = executor.addExecutor({ name: 'e1', fn: fn1, config: {} });
    const id2 = executor.addExecutor({ name: 'e2', fn: fn2, config: {} });
    const results = await executor.run([id1, id2]);
    expect(results).toEqual(['a', 'b']);
  });

  it('should get executors', () => {
    executor.addExecutor({ name: 'a', fn: () => {}, config: {} });
    executor.addExecutor({ name: 'b', fn: () => {}, config: {} });
    expect(executor.getExecutors().length).toBe(2);
  });

  it('should get stats', () => {
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBeDefined();
    expect(stats.totalErrors).toBeDefined();
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toContain('HookExecutor');
  });

  it('should get snapshot', () => {
    const snap = executor.getSnapshot();
    expect(snap.stats).toBeDefined();
    expect(snap.executorCount).toBeDefined();
  });

  it('should reset executors', () => {
    executor.addExecutor({ name: 'a', fn: () => {}, config: {} });
    executor.reset();
    expect(executor.getExecutors().length).toBe(0);
  });

  it('should generate report', () => {
    const report = executor.getReport();
    expect(report).toContain('HookExecutor Report');
  });

  it('should throw on missing executor', () => {
    expect(() => executor.execute('nonexistent')).toThrow('Executor not found');
  });
});

describe('HookRegistry', () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry({ defaultMaxSize: 10 });
  });

  it('should have config property', () => {
    expect(registry.config).toBeDefined();
    expect(registry.config.defaultMaxSize).toBe(10);
  });

  it('should add entry', () => {
    const id = registry.add({ name: 'entry', handler: () => {} });
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  it('should remove entry', () => {
    const id = registry.add({ name: 'entry', handler: () => {} });
    expect(registry.remove(id)).toBe(true);
  });

  it('should get entry by id', () => {
    const id = registry.add({ name: 'entry', handler: () => {} });
    expect(registry.get(id)).toBeDefined();
  });

  it('should get all entries by name', () => {
    registry.add({ name: 'test', handler: () => {} });
    registry.add({ name: 'test', handler: () => {} });
    expect(registry.getAll('test').length).toBe(2);
  });

  it('should check has by id', () => {
    const id = registry.add({ name: 'entry', handler: () => {} });
    expect(registry.has(id)).toBe(true);
    expect(registry.has('nope')).toBe(false);
  });

  it('should check hasName', () => {
    registry.add({ name: 'myEntry', handler: () => {} });
    expect(registry.hasName('myEntry')).toBe(true);
    expect(registry.hasName('other')).toBe(false);
  });

  it('should update entry', () => {
    const id = registry.add({ name: 'entry', handler: () => {} });
    expect(registry.update(id, { metadata: { key: 'value' } })).toBe(true);
    expect(registry.get(id)?.metadata?.key).toBe('value');
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toContain('HookRegistry');
  });

  it('should get snapshot', () => {
    const snap = registry.getSnapshot();
    expect(snap.entryCount).toBeDefined();
  });

  it('should reset entries', () => {
    registry.add({ name: 'a', handler: () => {} });
    registry.reset();
    expect(registry.getAll().length).toBe(0);
  });

  it('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('HookRegistry Report');
  });
});

describe('HookMonitor', () => {
  let monitor: HookMonitor;

  beforeEach(() => {
    monitor = new HookMonitor({ maxHistorySize: 100 });
  });

  it('should have config property', () => {
    expect(monitor.config).toBeDefined();
    expect(monitor.config.maxHistorySize).toBe(100);
  });

  it('should track event', () => {
    const id = monitor.track({ type: 'test', success: true });
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  it('should get metrics', () => {
    monitor.track({ type: 'a', success: true });
    monitor.track({ type: 'b', success: false });
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(2);
    expect(metrics.totalSuccess).toBe(1);
    expect(metrics.totalFailure).toBe(1);
  });

  it('should get history with limit', () => {
    monitor.track({ type: 'a' });
    monitor.track({ type: 'b' });
    monitor.track({ type: 'c' });
    const history = monitor.getHistory(2);
    expect(history.length).toBe(2);
  });

  it('should get status', () => {
    const status = monitor.getStatus();
    expect(status.status).toBeDefined();
    expect(status.metrics).toBeDefined();
    expect(status.eventCount).toBeDefined();
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toContain('HookMonitor');
  });

  it('should get snapshot', () => {
    const snap = monitor.getSnapshot();
    expect(snap.metrics).toBeDefined();
    expect(snap.status).toBeDefined();
  });

  it('should clear history', () => {
    monitor.track({ type: 'a' });
    monitor.clear();
    expect(monitor.getHistory().length).toBe(0);
  });

  it('should reset monitor', () => {
    monitor.track({ type: 'a', success: true });
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(0);
  });

  it('should generate report', () => {
    const report = monitor.getReport();
    expect(report).toContain('HookMonitor Report');
  });

  it('should maintain event order in history', () => {
    monitor.track({ type: 'first' });
    monitor.track({ type: 'second' });
    const history = monitor.getHistory();
    expect(history[0].type).toBe('first');
    expect(history[history.length - 1].type).toBe('second');
  });

  it('should update average duration on track', () => {
    monitor.track({ type: 'a', duration: 100 });
    monitor.track({ type: 'b', duration: 200 });
    const metrics = monitor.getMetrics();
    expect(metrics.averageDuration).toBeGreaterThan(0);
  });
});

describe('HookManager integration', () => {
  it('should work with multiple classes', () => {
    const manager = new HookManager();
    const executor = new HookExecutor();
    const registry = new HookRegistry();
    const monitor = new HookMonitor();

    const hookId = manager.register({ name: 'h1', handler: () => 'ok', config: {}, enabled: true });
    const execId = executor.addExecutor({ name: 'e1', fn: () => {}, config: {} });
    const regId = registry.add({ name: 'r1', handler: () => {} });
    const evtId = monitor.track({ type: 'integration' });

    expect(hookId).toBeDefined();
    expect(execId).toBeDefined();
    expect(regId).toBeDefined();
    expect(evtId).toBeDefined();

    expect(manager.getHooks().length).toBe(1);
    expect(executor.getExecutors().length).toBe(1);
    expect(registry.getAll().length).toBe(1);
    expect(monitor.getHistory().length).toBe(1);
  });
});