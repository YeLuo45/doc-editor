import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimeoutManager } from '../timeout-manager/TimeoutManager';
import { TimeoutRegistry } from '../timeout-manager/TimeoutRegistry';
import { TimeoutMonitor } from '../timeout-manager/TimeoutMonitor';
import { TimeoutStrategy } from '../timeout-manager/TimeoutStrategy';

describe('TimeoutManager', () => {
  let manager: TimeoutManager;

  beforeEach(() => {
    manager = new TimeoutManager();
  });

  afterEach(() => {
    manager.reset();
  });

  it('should create instance with default config', () => {
    expect(manager).toBeDefined();
    expect(manager.getSnapshot()).toBeDefined();
  });

  it('should set and clear timeout', () => new Promise((resolve) => {
    let executed = false;
    manager.set('test1', () => { executed = true; }, 50);
    expect(manager.getTimeout('test1')).toBeDefined();
    manager.clear('test1');
    expect(manager.getTimeout('test1')).toBeUndefined();
    setTimeout(() => { expect(executed).toBe(false); resolve(); }, 100);
  }));

  it('should execute timeout callback', () => new Promise((resolve) => {
    let executed = false;
    manager.set('test2', () => { executed = true; }, 50);
    setTimeout(() => { expect(executed).toBe(true); resolve(); }, 100);
  }));

  it('should get active timeouts', () => {
    manager.set('t1', () => {}, 100);
    manager.set('t2', () => {}, 100);
    const active = manager.getActiveTimeouts();
    expect(active.length).toBe(2);
  });

  it('should return correct snapshot', () => {
    manager.set('t1', () => {}, 100);
    const snapshot = manager.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.totalTimeouts).toBe(1);
  });

  it('should reset all timeouts', () => {
    manager.set('t1', () => {}, 100);
    manager.reset();
    const snapshot = manager.getSnapshot();
    expect(snapshot.metrics.activeTimeouts).toBe(0);
  });

  it('should generate report', () => {
    const report = manager.getReport();
    expect(report).toContain('TimeoutManager Report');
  });

  it('should export metrics', () => {
    const metrics = manager.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should enforce min timeout', () => new Promise((resolve) => {
    let executed = false;
    manager.set('t3', () => { executed = true; }, 1);
    setTimeout(() => {
      expect(manager.getTimeout('t3')?.duration).toBeGreaterThanOrEqual(100);
      resolve();
    }, 200);
  }));
});

describe('TimeoutRegistry', () => {
  let registry: TimeoutRegistry;

  beforeEach(() => {
    registry = new TimeoutRegistry();
  });

  afterEach(() => {
    registry.reset();
  });

  it('should create instance with default config', () => {
    expect(registry).toBeDefined();
  });

  it('should register and retrieve entry', () => {
    registry.register('key1', 'value1');
    expect(registry.get('key1')).toBe('value1');
  });

  it('should unregister entry', () => {
    registry.register('key1', 'value1');
    expect(registry.unregister('key1')).toBe(true);
    expect(registry.get('key1')).toBeNull();
  });

  it('should check if key exists', () => {
    registry.register('key1', 'value1');
    expect(registry.has('key1')).toBe(true);
    expect(registry.has('key2')).toBe(false);
  });

  it('should get all entries', () => {
    registry.register('k1', 'v1');
    registry.register('k2', 'v2');
    const all = registry.getAll();
    expect(all.size).toBe(2);
  });

  it('should track metrics on hits and misses', () => {
    registry.register('key1', 'value1');
    registry.get('key1');
    registry.get('nonexistent');
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics.hits).toBe(1);
    expect(snapshot.metrics.misses).toBe(1);
  });

  it('should reset registry', () => {
    registry.register('k1', 'v1');
    registry.reset();
    expect(registry.getAll().size).toBe(0);
  });

  it('should generate report', () => {
    const report = registry.getReport();
    expect(report).toContain('TimeoutRegistry Report');
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('TimeoutMonitor', () => {
  let monitor: TimeoutMonitor;

  beforeEach(() => {
    monitor = new TimeoutMonitor({ alertThreshold: 5 });
  });

  afterEach(() => {
    monitor.reset();
  });

  it('should create instance with config', () => {
    expect(monitor).toBeDefined();
    expect(monitor.getSnapshot()).toBeDefined();
  });

  it('should track events', () => {
    monitor.track('e1', 'test-event');
    expect(monitor.getMetrics().activeEvents).toBe(1);
  });

  it('should complete tracked event', () => {
    monitor.track('e1', 'test-event');
    monitor.complete('e1');
    const metrics = monitor.getMetrics();
    expect(metrics.completedEvents).toBe(1);
    expect(metrics.activeEvents).toBe(0);
  });

  it('should fail tracked event', () => {
    monitor.track('e1', 'test-event');
    monitor.fail('e1');
    const metrics = monitor.getMetrics();
    expect(metrics.failedEvents).toBe(1);
  });

  it('should cancel tracked event', () => {
    monitor.track('e1', 'test-event');
    monitor.cancel('e1');
    const metrics = monitor.getMetrics();
    expect(metrics.activeEvents).toBe(0);
  });

  it('should get history', () => {
    monitor.track('e1', 'test-event');
    monitor.complete('e1');
    const history = monitor.getHistory();
    expect(history.length).toBe(1);
  });

  it('should get status', () => {
    const status = monitor.getStatus();
    expect(status.isHealthy).toBe(true);
    expect(status.alertThreshold).toBe(5);
  });

  it('should report unhealthy when over threshold', () => {
    for (let i = 0; i < 6; i++) {
      monitor.track(`e${i}`, 'test-event');
    }
    const status = monitor.getStatus();
    expect(status.isHealthy).toBe(false);
  });

  it('should reset state', () => {
    monitor.track('e1', 'test-event');
    monitor.reset();
    expect(monitor.getMetrics().totalTracked).toBe(0);
  });

  it('should generate report', () => {
    const report = monitor.getReport();
    expect(report).toContain('TimeoutMonitor Report');
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('TimeoutStrategy', () => {
  let strategy: TimeoutStrategy;

  beforeEach(() => {
    strategy = new TimeoutStrategy({ baseTimeout: 1000 });
  });

  afterEach(() => {
    strategy.reset();
  });

  it('should create instance with config', () => {
    expect(strategy).toBeDefined();
  });

  it('should calculate exponential timeout', () => {
    const t1 = strategy.calculate(1000, 0, 'exponential');
    const t2 = strategy.calculate(1000, 1, 'exponential');
    expect(t2).toBeGreaterThan(t1);
  });

  it('should calculate linear timeout', () => {
    const t1 = strategy.calculate(1000, 0, 'linear');
    const t2 = strategy.calculate(1000, 1, 'linear');
    expect(t2).toBeGreaterThan(t1);
  });

  it('should return fixed timeout', () => {
    const fixedStrategy = new TimeoutStrategy({ baseTimeout: 500, enableJitter: false });
    const t1 = fixedStrategy.calculate(500, 0, 'fixed');
    const t2 = fixedStrategy.calculate(500, 5, 'fixed');
    expect(t1).toBe(t2);
  });

  it('should return default timeout', () => {
    expect(strategy.getDefault()).toBe(1000);
  });

  it('should apply strategy', () => {
    const result = strategy.apply(1000, 2);
    expect(result).toBeGreaterThan(0);
  });

  it('should get and set strategy', () => {
    expect(strategy.getStrategy()).toBe('exponential');
    strategy.setStrategy('linear');
    expect(strategy.getStrategy()).toBe('linear');
  });

  it('should track strategy usage', () => {
    strategy.calculate(1000, 0, 'linear');
    strategy.calculate(1000, 0, 'exponential');
    const snapshot = strategy.getSnapshot();
    expect(snapshot.metrics.strategyUsage.linear).toBe(1);
    expect(snapshot.metrics.strategyUsage.exponential).toBe(1);
  });

  it('should reset metrics', () => {
    strategy.calculate(1000, 0, 'linear');
    strategy.reset();
    const snapshot = strategy.getSnapshot();
    expect(snapshot.metrics.totalCalculations).toBe(0);
  });

  it('should generate report', () => {
    const report = strategy.getReport();
    expect(report).toContain('TimeoutStrategy Report');
  });

  it('should export metrics', () => {
    const metrics = strategy.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});