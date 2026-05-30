import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoadBalancer } from '../load-balancer/LoadBalancer';
import { WorkerPool } from '../load-balancer/WorkerPool';
import { HealthCheck } from '../load-balancer/HealthCheck';
import { LoadMonitor } from '../load-balancer/LoadMonitor';

describe('LoadBalancer', () => {
  let lb: LoadBalancer;

  beforeEach(() => {
    lb = new LoadBalancer({
      algorithm: 'round-robin',
      maxWorkers: 5,
      timeout: 3000,
      retryAttempts: 3,
    });
  });

  it('should add workers', () => {
    expect(lb.addWorker('w1')).toBe(true);
    expect(lb.addWorker('w2')).toBe(true);
  });

  it('should reject duplicate workers', () => {
    lb.addWorker('w1');
    expect(lb.addWorker('w1')).toBe(false);
  });

  it('should enforce max workers limit', () => {
    const lbSmall = new LoadBalancer({ algorithm: 'round-robin', maxWorkers: 2, timeout: 1000, retryAttempts: 1 });
    expect(lbSmall.addWorker('w1')).toBe(true);
    expect(lbSmall.addWorker('w2')).toBe(true);
    expect(lbSmall.addWorker('w3')).toBe(false);
  });

  it('should remove workers', () => {
    lb.addWorker('w1');
    expect(lb.removeWorker('w1')).toBe(true);
    expect(lb.removeWorker('w1')).toBe(false);
  });

  it('should route to available workers', () => {
    lb.addWorker('w1');
    lb.addWorker('w2');
    const route1 = lb.route();
    const route2 = lb.route();
    expect(['w1', 'w2']).toContain(route1);
    expect(['w1', 'w2']).toContain(route2);
  });

  it('should return null when no workers available', () => {
    expect(lb.route()).toBeNull();
  });

  it('should get stats correctly', () => {
    lb.addWorker('w1');
    lb.addWorker('w2');
    const stats = lb.getStats();
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(2);
  });

  it('should get workers list', () => {
    lb.addWorker('w1');
    lb.addWorker('w2');
    const workers = lb.getWorkers();
    expect(workers).toHaveLength(2);
  });

  it('should report healthy when workers exist', () => {
    lb.addWorker('w1');
    const status = lb.getStatus();
    expect(status.healthy).toBe(true);
  });

  it('should report unhealthy when no workers', () => {
    const status = lb.getStatus();
    expect(status.healthy).toBe(false);
  });

  it('should get snapshot', () => {
    lb.addWorker('w1');
    const snap = lb.getSnapshot();
    expect(snap.metrics).toBeDefined();
    expect(snap.workers).toBeDefined();
  });

  it('should reset state', () => {
    lb.addWorker('w1');
    lb.route();
    lb.reset();
    const stats = lb.getStats();
    expect(stats.totalConnections).toBe(0);
  });

  it('should generate report', () => {
    lb.addWorker('w1');
    const report = lb.getReport();
    expect(report).toContain('LoadBalancer');
  });

  it('should export metrics with version', () => {
    const metrics = lb.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('WorkerPool', () => {
  let pool: WorkerPool;

  beforeEach(() => {
    pool = new WorkerPool({
      minSize: 1,
      maxSize: 10,
      scaleUpThreshold: 0.8,
      scaleDownThreshold: 0.2,
    });
  });

  it('should add workers', () => {
    expect(pool.add('p1')).toBe(true);
  });

  it('should reject duplicate workers', () => {
    pool.add('p1');
    expect(pool.add('p1')).toBe(false);
  });

  it('should remove workers', () => {
    pool.add('p1');
    expect(pool.remove('p1')).toBe(true);
  });

  it('should get single worker', () => {
    pool.add('p1');
    const worker = pool.get('p1');
    expect(worker).not.toBeNull();
    expect(worker?.id).toBe('p1');
  });

  it('should return null for missing worker', () => {
    const worker = pool.get('nonexistent');
    expect(worker).toBeNull();
  });

  it('should update worker', () => {
    pool.add('p1');
    expect(pool.update('p1', { tasks: 5 })).toBe(true);
    const worker = pool.get('p1');
    expect(worker?.tasks).toBe(5);
  });

  it('should get stats', () => {
    pool.add('p1');
    pool.add('p2');
    const stats = pool.getStats();
    expect(stats.total).toBe(2);
  });

  it('should get all workers', () => {
    pool.add('p1');
    pool.add('p2');
    const workers = pool.getWorkers();
    expect(workers).toHaveLength(2);
  });

  it('should report status', () => {
    const status = pool.getStatus();
    expect(status.healthy).toBe(false); // minSize=1, none active
    pool.add('p1');
    const status2 = pool.getStatus();
    expect(status2.healthy).toBe(true);
  });

  it('should get snapshot', () => {
    pool.add('p1');
    const snap = pool.getSnapshot();
    expect(snap.metrics).toBeDefined();
  });

  it('should reset workers', () => {
    pool.add('p1');
    pool.update('p1', { tasks: 5, memory: 100 });
    pool.reset();
    const w = pool.get('p1');
    expect(w?.tasks).toBe(0);
  });

  it('should generate report', () => {
    const report = pool.getReport();
    expect(report).toContain('WorkerPool');
  });

  it('should export metrics', () => {
    const metrics = pool.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('HealthCheck', () => {
  let hc: HealthCheck;

  beforeEach(() => {
    hc = new HealthCheck({
      interval: 5000,
      timeout: 3000,
      healthyThreshold: 2,
      unhealthyThreshold: 3,
    });
  });

  it('should register endpoints', () => {
    hc.register('ep1');
    const health = hc.getHealth('ep1');
    expect(health).not.toBeNull();
    expect(health?.id).toBe('ep1');
  });

  it('should unregister endpoints', () => {
    hc.register('ep1');
    expect(hc.unregister('ep1')).toBe(true);
    expect(hc.getHealth('ep1')).toBeNull();
  });

  it('should perform health checks', () => {
    hc.register('ep1');
    const result = hc.check('ep1');
    expect(typeof result).toBe('boolean');
  });

  it('should get single health status', () => {
    hc.register('ep1');
    const health = hc.getHealth('ep1');
    expect(health).toBeDefined();
  });

  it('should get all health statuses', () => {
    hc.register('ep1');
    hc.register('ep2');
    const all = hc.getAllHealth();
    expect(all).toHaveLength(2);
  });

  it('should report status', () => {
    hc.register('ep1');
    const status = hc.getStatus();
    expect(status.message).toContain('healthy');
  });

  it('should get stats', () => {
    hc.register('ep1');
    hc.register('ep2');
    const stats = hc.getStats();
    expect(stats.total).toBe(2);
  });

  it('should get snapshot', () => {
    hc.register('ep1');
    const snap = hc.getSnapshot();
    expect(snap.metrics).toBeDefined();
  });

  it('should reset health status', () => {
    hc.register('ep1');
    hc.check('ep1');
    hc.reset();
    const health = hc.getHealth('ep1');
    expect(health?.failures).toBe(0);
  });

  it('should generate report', () => {
    const report = hc.getReport();
    expect(report).toContain('HealthCheck');
  });

  it('should export metrics', () => {
    const metrics = hc.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('LoadMonitor', () => {
  let monitor: LoadMonitor;

  beforeEach(() => {
    monitor = new LoadMonitor({
      windowSize: 100,
      sampleInterval: 1000,
      alertThreshold: 90,
    });
  });

  it('should track metrics', () => {
    monitor.track({ cpu: 50, memory: 40, requests: 10, latency: 25 });
    const metrics = monitor.getMetrics();
    expect(metrics).not.toBeNull();
    expect(metrics?.cpu).toBe(50);
  });

  it('should get history', () => {
    monitor.track({ cpu: 50, memory: 40, requests: 10, latency: 25 });
    monitor.track({ cpu: 60, memory: 50, requests: 15, latency: 30 });
    const history = monitor.getHistory();
    expect(history).toHaveLength(2);
  });

  it('should report status', () => {
    monitor.track({ cpu: 50, memory: 40, requests: 10, latency: 25 });
    const status = monitor.getStatus();
    expect(status.healthy).toBe(true);
  });

  it('should report unhealthy when threshold exceeded', () => {
    monitor.track({ cpu: 95, memory: 40, requests: 10, latency: 25 });
    const status = monitor.getStatus();
    expect(status.healthy).toBe(false);
  });

  it('should get stats', () => {
    monitor.track({ cpu: 50, memory: 40, requests: 10, latency: 25 });
    monitor.track({ cpu: 60, memory: 50, requests: 15, latency: 30 });
    const stats = monitor.getStats();
    expect(stats.avgCpu).toBe(55);
  });

  it('should get snapshot', () => {
    monitor.track({ cpu: 50, memory: 40, requests: 10, latency: 25 });
    const snap = monitor.getSnapshot();
    expect(snap.current).toBeDefined();
  });

  it('should reset history', () => {
    monitor.track({ cpu: 50, memory: 40, requests: 10, latency: 25 });
    monitor.reset();
    expect(monitor.getMetrics()).toBeNull();
  });

  it('should generate report', () => {
    monitor.track({ cpu: 50, memory: 40, requests: 10, latency: 25 });
    const report = monitor.getReport();
    expect(report).toContain('LoadMonitor');
  });

  it('should export metrics', () => {
    monitor.track({ cpu: 50, memory: 40, requests: 10, latency: 25 });
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});