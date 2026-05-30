/**
 * throttle.test.ts - V106 Throttle tests for doc-editor
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Throttle } from '../throttle/Throttle';
import { ThrottlePolicy } from '../throttle/ThrottlePolicy';
import { ThrottleMonitor } from '../throttle/ThrottleMonitor';
import { ThrottleStrategy } from '../throttle/ThrottleStrategy';

describe('Throttle', () => {
  let throttle: Throttle;

  beforeEach(() => {
    throttle = new Throttle({ maxRequests: 5, windowMs: 1000, strategy: 'fixed' });
  });

  afterEach(() => {
    throttle.reset();
  });

  it('should allow requests under limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(throttle.throttle('key1')).toBe(false);
    }
  });

  it('should throttle requests over limit', () => {
    for (let i = 0; i < 5; i++) throttle.throttle('key1');
    expect(throttle.throttle('key1')).toBe(true);
  });

  it('should track stats correctly', () => {
    throttle.throttle('key1');
    throttle.throttle('key1');
    throttle.throttle('key1');
    const stats = throttle.getStats();
    expect(stats.totalRequests).toBe(3);
    expect(stats.passedRequests).toBe(3);
  });

  it('should reset correctly', () => {
    throttle.throttle('key1');
    throttle.reset();
    const stats = throttle.getStats();
    expect(stats.totalRequests).toBe(0);
  });

  it('should check method work same as throttle', () => {
    expect(throttle.check('key1')).toBe(false);
    throttle.check('key1'); // pass 1
    throttle.check('key1'); // pass 2
    throttle.check('key1'); // pass 3
    throttle.check('key1'); // pass 4
    expect(throttle.check('key1')).toBe(true); // 6th request should throttle
  });

  it('should get status correctly', () => {
    const status = throttle.getStatus();
    expect(status.enabled).toBe(true);
    expect(status.maxRequests).toBe(5);
    expect(status.windowMs).toBe(1000);
  });

  it('should export metrics with version', () => {
    const exported = throttle.exportMetrics();
    expect(exported.version).toBe('1.0.6');
    expect(exported.metrics).toBeDefined();
  });

  it('should get snapshot correctly', () => {
    const snapshot = throttle.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  it('should generate report string', () => {
    const report = throttle.getReport();
    expect(report).toContain('Throttle Report');
    expect(report).toContain('Total Requests:');
  });
});

describe('ThrottlePolicy', () => {
  let policy: ThrottlePolicy;

  beforeEach(() => {
    policy = new ThrottlePolicy({
      limits: {
        requestsPerSecond: 10,
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        burstAllowance: 5,
      },
      delayMs: 50,
    });
  });

  afterEach(() => {
    policy.reset();
  });

  it('should not throttle under limits', () => {
    expect(policy.shouldThrottle('key1')).toBe(false);
    expect(policy.shouldThrottle('key1')).toBe(false);
  });

  it('should get limit correctly', () => {
    const limit = policy.getLimit('key1');
    expect(limit).toBeLessThanOrEqual(10);
  });

  it('should get delay when throttled', () => {
    for (let i = 0; i < 10; i++) policy.apply('key1');
    const delay = policy.getDelay('key1');
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  it('should apply policy correctly', () => {
    const result = policy.apply('key1');
    expect(result).toHaveProperty('shouldThrottle');
    expect(result).toHaveProperty('delay');
    expect(result).toHaveProperty('limit');
  });

  it('should track evaluations', () => {
    policy.shouldThrottle('key1');
    policy.shouldThrottle('key1');
    const stats = policy.getStats();
    expect(stats.totalEvaluations).toBe(2);
  });

  it('should reset correctly', () => {
    policy.shouldThrottle('key1');
    policy.reset();
    const stats = policy.getStats();
    expect(stats.totalEvaluations).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = policy.exportMetrics();
    expect(exported.version).toBe('1.0.6');
  });

  it('should get snapshot correctly', () => {
    const snapshot = policy.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });
});

describe('ThrottleMonitor', () => {
  let monitor: ThrottleMonitor;

  beforeEach(() => {
    monitor = new ThrottleMonitor({ intervalMs: 500, retentionMs: 3000 });
  });

  afterEach(() => {
    monitor.reset();
  });

  it('should track values correctly', () => {
    monitor.track('key1', 10);
    monitor.track('key1', 20);
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(2);
  });

  it('should track throttled actions', () => {
    monitor.track('key1', 5, 'throttled');
    const metrics = monitor.getMetrics();
    expect(metrics.throttleRate).toBeGreaterThan(0);
  });

  it('should get history correctly', () => {
    monitor.track('key1', 10);
    monitor.track('key2', 20);
    const history = monitor.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter history by key', () => {
    monitor.track('key1', 10);
    monitor.track('key2', 20);
    const history = monitor.getHistory('key1');
    expect(history.every(h => h.key === 'key1')).toBe(true);
  });

  it('should get status correctly', () => {
    monitor.track('key1', 10);
    const status = monitor.getStatus();
    expect(status.trackedKeys).toBe(1);
    expect(status.historySize).toBe(1);
  });

  it('should reset correctly', () => {
    monitor.track('key1', 10);
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.totalTracked).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = monitor.exportMetrics();
    expect(exported.version).toBe('1.0.6');
  });

  it('should generate report correctly', () => {
    monitor.track('key1', 10);
    const report = monitor.getReport();
    expect(report).toContain('Throttle Monitor Report');
  });
});

describe('ThrottleStrategy', () => {
  let strategy: ThrottleStrategy;

  beforeEach(() => {
    strategy = new ThrottleStrategy({
      type: 'moderate',
      baseDelay: 100,
      maxDelay: 1000,
    });
  });

  afterEach(() => {
    strategy.reset();
  });

  it('should calculate delay correctly', () => {
    const delay = strategy.calculate('key1', 5);
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  it('should select strategy type', () => {
    strategy.select('aggressive');
    expect(strategy.getStrategy()).toBe('aggressive');
  });

  it('should apply strategy correctly', () => {
    const result = strategy.apply('key1', 5);
    expect(result).toHaveProperty('delay');
    expect(result).toHaveProperty('strategy');
    expect(result).toHaveProperty('calculated');
  });

  it('should track stats correctly', () => {
    strategy.calculate('key1', 5);
    strategy.calculate('key1', 5);
    const stats = strategy.getStats();
    expect(stats.totalCalculations).toBe(2);
  });

  it('should reset correctly', () => {
    strategy.calculate('key1', 5);
    strategy.reset();
    const stats = strategy.getStats();
    expect(stats.totalCalculations).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = strategy.exportMetrics();
    expect(exported.version).toBe('1.0.6');
  });

  it('should get snapshot correctly', () => {
    const snapshot = strategy.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  it('should generate report correctly', () => {
    const report = strategy.getReport();
    expect(report).toContain('Throttle Strategy Report');
  });

  it('should respect max delay', () => {
    const strategy2 = new ThrottleStrategy({ baseDelay: 100, maxDelay: 500 });
    strategy2.select('aggressive');
    const delay = strategy2.calculate('key1', 100);
    expect(delay).toBeLessThanOrEqual(500);
  });
});

describe('Throttle Integration', () => {
  it('should work together across all throttle classes', () => {
    const throttle = new Throttle({ maxRequests: 3 });
    const policy = new ThrottlePolicy({ delayMs: 10 });
    const monitor = new ThrottleMonitor();
    const strategy = new ThrottleStrategy();

    for (let i = 0; i < 3; i++) {
      throttle.throttle('key1');
      policy.apply('key1');
      monitor.track('key1', 1);
      strategy.apply('key1', i);
    }

    expect(throttle.getStats().totalRequests).toBe(3);
    expect(policy.getStats().totalEvaluations).toBe(3);
    expect(monitor.getMetrics().totalTracked).toBe(3);
    expect(strategy.getStats().totalCalculations).toBe(3);
  });

  it('should export metrics from all classes', () => {
    const throttle = new Throttle();
    const policy = new ThrottlePolicy({});
    const monitor = new ThrottleMonitor();
    const strategy = new ThrottleStrategy();

    const tMetrics = throttle.exportMetrics();
    const pMetrics = policy.exportMetrics();
    const mMetrics = monitor.exportMetrics();
    const sMetrics = strategy.exportMetrics();

    expect(tMetrics.version).toBe('1.0.6');
    expect(pMetrics.version).toBe('1.0.6');
    expect(mMetrics.version).toBe('1.0.6');
    expect(sMetrics.version).toBe('1.0.6');
  });
});