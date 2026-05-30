/**
 * bulkhead.test.ts - V105 Bulkhead Tests
 * Tests for Bulkhead, BulkheadPool, BulkheadMonitor, and BulkheadPolicy
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Bulkhead, BulkheadConfig, BulkheadMetrics, BulkheadState } from '../bulkhead/Bulkhead';
import { BulkheadPool, BulkheadPoolConfig, PooledBulkhead, BulkheadPoolMetrics } from '../bulkhead/BulkheadPool';
import { BulkheadMonitor, MonitoringConfig, MonitoredBulkhead, BulkheadMonitorMetrics } from '../bulkhead/BulkheadMonitor';
import { BulkheadPolicy, PolicyConfig, IsolationLevel, PolicyResult } from '../bulkhead/BulkheadPolicy';

describe('Bulkhead', () => {
  let bulkhead: Bulkhead;
  const config: BulkheadConfig = {
    name: 'test-bulkhead',
    maxConcurrent: 3,
    maxQueue: 5,
    timeout: 1000,
    isolationLevel: 'shared',
  };

  beforeEach(() => {
    bulkhead = new Bulkhead(config);
  });

  afterEach(() => {
    bulkhead.reset();
  });

  it('should initialize with correct config', () => {
    expect(bulkhead.config).toEqual(config);
    expect(bulkhead.getStatus()).toBe('idle');
  });

  it('should acquire slot when capacity available', () => {
    expect(bulkhead.acquire()).toBe(true);
    expect(bulkhead.getStats().activeCount).toBe(1);
    expect(bulkhead.getStatus()).toBe('active');
  });

  it('should reject when at max concurrent', () => {
    bulkhead.acquire();
    bulkhead.acquire();
    bulkhead.acquire();
    expect(bulkhead.acquire()).toBe(false);
    expect(bulkhead.getStats().totalRejected).toBe(1);
  });

  it('should release slot correctly', () => {
    bulkhead.acquire();
    bulkhead.release();
    expect(bulkhead.getStats().activeCount).toBe(0);
    expect(bulkhead.getStats().totalReleased).toBe(1);
  });

  it('should track total acquired count', () => {
    bulkhead.acquire();
    bulkhead.acquire();
    expect(bulkhead.getStats().totalAcquired).toBe(2);
  });

  it('should update state based on activity', () => {
    expect(bulkhead.getStatus()).toBe('idle');
    bulkhead.acquire();
    expect(bulkhead.getStatus()).toBe('active');
    bulkhead.release();
    expect(bulkhead.getStatus()).toBe('idle');
  });

  it('should isolate and restore bulkhead', () => {
    bulkhead.acquire();
    bulkhead.isolate();
    expect(bulkhead.getStatus()).toBe('isolated');
    bulkhead.restore();
    expect(bulkhead.getStatus()).toBe('idle');
  });

  it('should get snapshot with metrics', () => {
    bulkhead.acquire();
    const snapshot = bulkhead.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.activeCount).toBe(1);
  });

  it('should reset all counters', () => {
    bulkhead.acquire();
    bulkhead.acquire();
    bulkhead.reset();
    const stats = bulkhead.getStats();
    expect(stats.activeCount).toBe(0);
    expect(stats.totalAcquired).toBe(0);
    expect(stats.totalReleased).toBe(0);
  });

  it('should generate report string', () => {
    const report = bulkhead.getReport();
    expect(report).toContain('Bulkhead Report');
    expect(report).toContain('test-bulkhead');
  });

  it('should export metrics with version', () => {
    const metrics = bulkhead.exportMetrics();
    expect(metrics.version).toBe('V105');
  });

  it('should calculate wait time correctly', () => {
    expect(bulkhead.getWaitTime()).toBe(0);
    bulkhead.acquire();
    bulkhead.acquire();
    bulkhead.acquire();
    expect(bulkhead.getWaitTime()).toBe(0);
  });

  it('should check if can acquire', () => {
    expect(bulkhead.canAcquire()).toBe(true);
    bulkhead.acquire();
    bulkhead.acquire();
    bulkhead.acquire();
    expect(bulkhead.canAcquire()).toBe(true);
  });
});

describe('BulkheadPool', () => {
  let pool: BulkheadPool;
  const config: BulkheadPoolConfig = {
    name: 'test-pool',
    poolSize: 3,
    defaultConfig: {
      name: 'default',
      maxConcurrent: 2,
      maxQueue: 3,
      timeout: 500,
      isolationLevel: 'shared',
    },
    strategy: 'round-robin',
  };

  beforeEach(() => {
    pool = new BulkheadPool(config);
  });

  afterEach(() => {
    pool.reset();
  });

  it('should initialize with correct pool size', () => {
    expect(pool.size()).toBe(3);
  });

  it('should create new bulkhead in pool', () => {
    const bh = pool.create('new-bulkhead');
    expect(bh).toBeDefined();
    expect(pool.size()).toBe(4);
  });

  it('should get existing bulkhead by id', () => {
    const bh = pool.get('test-pool-0');
    expect(bh).toBeDefined();
  });

  it('should return undefined for non-existent id', () => {
    const bh = pool.get('non-existent');
    expect(bh).toBeUndefined();
  });

  it('should get pool using round-robin strategy', () => {
    const bh1 = pool.getPool();
    const bh2 = pool.getPool();
    const bh3 = pool.getPool();
    const bh4 = pool.getPool();
    expect(bh1).toBeDefined();
    expect(bh2).toBeDefined();
    expect(bh3).toBeDefined();
    expect(bh4).toBeDefined();
  });

  it('should get stats for specific bulkhead', () => {
    const stats = pool.getStats('test-pool-0');
    expect(stats).toBeDefined();
    expect(stats!.activeCount).toBe(0);
  });

  it('should get all pooled bulkheads', () => {
    const pools = pool.getPools();
    expect(pools).toHaveLength(3);
    expect(pools[0].id).toBe('test-pool-0');
  });

  it('should get pool stats', () => {
    const stats = pool.getPoolStats();
    expect(stats.poolSize).toBe(3);
    expect(stats.totalAcquired).toBeDefined();
  });

  it('should reset all bulkheads in pool', () => {
    const bh = pool.getPool();
    bh.acquire();
    pool.reset();
    expect(pool.getPoolStats().activeCount).toBe(0);
  });

  it('should remove bulkhead from pool', () => {
    expect(pool.remove('test-pool-0')).toBe(true);
    expect(pool.size()).toBe(2);
  });

  it('should get snapshot of pool state', () => {
    const snapshot = pool.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.poolSize).toBe(3);
  });

  it('should generate pool report', () => {
    const report = pool.getReport();
    expect(report).toContain('BulkheadPool Report');
    expect(report).toContain('test-pool');
  });

  it('should export pool metrics', () => {
    const metrics = pool.exportMetrics();
    expect(metrics.version).toBe('V105');
  });
});

describe('BulkheadMonitor', () => {
  let monitor: BulkheadMonitor;
  let bulkhead: Bulkhead;
  const config: MonitoringConfig = {
    name: 'test-monitor',
    historySize: 100,
    alertThreshold: 5,
    samplingInterval: 1000,
  };

  beforeEach(() => {
    monitor = new BulkheadMonitor(config);
    bulkhead = new Bulkhead({
      name: 'test-bh',
      maxConcurrent: 3,
      maxQueue: 5,
      timeout: 1000,
      isolationLevel: 'shared',
    });
  });

  afterEach(() => {
    monitor.reset();
  });

  it('should track a bulkhead', () => {
    monitor.track(bulkhead);
    expect(monitor.getStatus().tracked).toBe(1);
  });

  it('should untrack a bulkhead', () => {
    monitor.track(bulkhead);
    monitor.untrack('test-bh');
    expect(monitor.getStatus().tracked).toBe(0);
  });

  it('should record snapshots', () => {
    monitor.track(bulkhead);
    monitor.recordSnapshot();
    const history = monitor.getHistory();
    expect(history.length).toBeGreaterThan(0);
  });

  it('should get metrics for tracked bulkhead', () => {
    monitor.track(bulkhead);
    const metrics = monitor.getMetrics('test-bh');
    expect(metrics).toBeDefined();
    expect(metrics!.activeCount).toBe(0);
  });

  it('should return undefined for untracked bulkhead', () => {
    const metrics = monitor.getMetrics('non-existent');
    expect(metrics).toBeUndefined();
  });

  it('should get history for specific bulkhead', () => {
    monitor.track(bulkhead);
    monitor.recordSnapshot();
    const history = monitor.getHistory('test-bh');
    expect(history.length).toBeGreaterThan(0);
  });

  it('should get aggregated metrics', () => {
    monitor.track(bulkhead);
    const metrics = monitor.getAggregatedMetrics();
    expect(metrics.totalMonitored).toBe(1);
    expect(metrics.totalAcquired).toBeDefined();
  });

  it('should detect at-capacity bulkheads', () => {
    monitor.track(bulkhead);
    for (let i = 0; i < 3; i++) {
      bulkhead.acquire();
    }
    expect(monitor.isAnyAtCapacity()).toBe(true);
  });

  it('should find least utilized bulkhead', () => {
    monitor.track(bulkhead);
    const least = monitor.getLeastUtilized();
    expect(least).toBeDefined();
  });

  it('should reset monitor state', () => {
    monitor.track(bulkhead);
    monitor.recordSnapshot();
    monitor.reset();
    expect(monitor.getStatus().historySize).toBe(0);
  });

  it('should get snapshot of monitor state', () => {
    monitor.track(bulkhead);
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  it('should generate monitor report', () => {
    const report = monitor.getReport();
    expect(report).toContain('BulkheadMonitor Report');
  });

  it('should export monitor metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V105');
  });
});

describe('BulkheadPolicy', () => {
  let policy: BulkheadPolicy;
  const config: PolicyConfig = {
    name: 'test-policy',
    defaultIsolationLevel: 'shared',
    maxConcurrent: 5,
    maxQueue: 10,
    timeout: 2000,
    autoScale: true,
    scaleThreshold: 0.8,
    scaleFactor: 1.5,
  };

  beforeEach(() => {
    policy = new BulkheadPolicy(config);
  });

  afterEach(() => {
    policy.reset();
  });

  it('should determine isolation correctly', () => {
    expect(policy.shouldIsolate('context1', 1)).toBe(false);
    expect(policy.shouldIsolate('context1', 5)).toBe(true);
  });

  it('should get limit for context', () => {
    const limit = policy.getLimit('context1');
    expect(limit).toBe(5);
  });

  it('should get policy for context', () => {
    policy.applyPolicy('context1', 3);
    const result = policy.getPolicy('context1');
    expect(result).toBeDefined();
  });

  it('should get isolation level', () => {
    const level = policy.getIsolationLevel('context1');
    expect(level).toBe('shared');
  });

  it('should set isolation level override', () => {
    policy.setIsolationLevel('context1', 'exclusive');
    expect(policy.getIsolationLevel('context1')).toBe('exclusive');
  });

  it('should apply policy based on load', () => {
    const result = policy.applyPolicy('context1', 4);
    expect(result.shouldIsolate).toBe(true);
    expect(result.limit).toBeLessThan(5);
  });

  it('should create bulkhead config from policy', () => {
    const bhConfig = policy.createConfig('new-context');
    expect(bhConfig.name).toBe('new-context');
    expect(bhConfig.maxConcurrent).toBeDefined();
  });

  it('should clear policy for context', () => {
    policy.applyPolicy('context1', 3);
    expect(policy.clearPolicy('context1')).toBe(true);
    expect(policy.getPolicy('context1')).toBeUndefined();
  });

  it('should clear all policies', () => {
    policy.applyPolicy('context1', 3);
    policy.applyPolicy('context2', 4);
    policy.clearAllPolicies();
    const snapshot = policy.getSnapshot();
    expect(snapshot.activePolicies).toBe(0);
  });

  it('should determine if scaling should occur', () => {
    expect(policy.shouldScale(3, 5)).toBe(false);
    expect(policy.shouldScale(4.5, 5)).toBe(true);
  });

  it('should calculate scaled capacity', () => {
    const scaled = policy.getScaledCapacity(10);
    expect(scaled).toBe(15);
  });

  it('should get snapshot of policy state', () => {
    const snapshot = policy.getSnapshot();
    expect(snapshot.activePolicies).toBe(0);
    expect(snapshot.overrides).toBe(0);
  });

  it('should generate policy report', () => {
    const report = policy.getReport();
    expect(report).toContain('BulkheadPolicy Report');
    expect(report).toContain('test-policy');
  });

  it('should export policy metrics', () => {
    const metrics = policy.exportMetrics();
    expect(metrics.version).toBe('V105');
  });
});