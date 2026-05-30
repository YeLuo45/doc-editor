/**
 * V118 Streamer Module Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Streamer, StreamerConfig, StreamData } from '../streamer/Streamer';
import { StreamerRegistry, RegistryConfig } from '../streamer/StreamerRegistry';
import { StreamerExecutor, ExecutorConfig, ExecutionResult } from '../streamer/StreamerExecutor';
import { StreamerMonitor, MonitorConfig } from '../streamer/StreamerMonitor';

describe('Streamer', () => {
  let streamer: Streamer;
  const testConfig: StreamerConfig = { id: 'test-1', name: 'TestStreamer' };

  beforeEach(() => { streamer = new Streamer(testConfig); });

  it('should create with config', () => {
    expect(streamer.config.id).toBe('test-1');
    expect(streamer.config.name).toBe('TestStreamer');
  });

  it('should stream data', () => {
    const data: StreamData = { id: 'd1', timestamp: Date.now(), payload: 'test' };
    streamer.stream(data);
    expect(streamer.getStats().messagesSent).toBe(1);
  });

  it('should publish to subscribers', () => {
    let received = false;
    const data: StreamData = { id: 'd1', timestamp: Date.now(), payload: 'test' };
    streamer.subscribe('topic1', () => { received = true; });
    streamer.publish('topic1', data);
    expect(received).toBe(true);
  });

  it('should get stream by topic', () => {
    const data: StreamData = { id: 'd1', timestamp: Date.now(), payload: 'test', metadata: { topic: 't1' } };
    streamer.stream(data);
    const results = streamer.getStream('t1');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should get stats', () => {
    const stats = streamer.getStats();
    expect(stats.bytesSent).toBeDefined();
    expect(stats.messagesSent).toBe(0);
    expect(stats.subscribers).toBe(0);
  });

  it('should get snapshot', () => {
    const snap = streamer.getSnapshot();
    expect(snap.metrics).toBeDefined();
    expect(snap.bufferLength).toBe(0);
    expect(Array.isArray(snap.topics)).toBe(true);
  });

  it('should reset', () => {
    streamer.stream({ id: 'd1', timestamp: Date.now(), payload: 'x' });
    streamer.reset();
    expect(streamer.getStats().messagesSent).toBe(0);
  });

  it('should get report', () => {
    const report = streamer.getReport();
    expect(report).toContain('Streamer');
    expect(report).toContain('test-1');
  });

  it('should export metrics', () => {
    const metrics = streamer.exportMetrics();
    expect(metrics.version).toBe('V118');
    expect(metrics.stats).toBeDefined();
  });
});

describe('StreamerRegistry', () => {
  let registry: StreamerRegistry;

  beforeEach(() => { registry = new StreamerRegistry(); });

  it('should create with config', () => {
    const cfg: RegistryConfig = { maxStreamers: 50 };
    const r = new StreamerRegistry(cfg);
    expect(r.config.maxStreamers).toBe(50);
  });

  it('should register streamer', () => {
    const s = new Streamer({ id: 's1', name: 'S1' });
    expect(registry.register('s1', s)).toBe(true);
  });

  it('should not register duplicate', () => {
    const s = new Streamer({ id: 's1', name: 'S1' });
    registry.register('s1', s);
    expect(registry.register('s1', s)).toBe(false);
  });

  it('should unregister streamer', () => {
    const s = new Streamer({ id: 's1', name: 'S1' });
    registry.register('s1', s);
    const removed = registry.unregister('s1');
    expect(removed).toBeDefined();
    expect(registry.has('s1')).toBe(false);
  });

  it('should get streamer', () => {
    const s = new Streamer({ id: 's1', name: 'S1' });
    registry.register('s1', s);
    expect(registry.get('s1')).toBe(s);
  });

  it('should get all streamers', () => {
    registry.register('s1', new Streamer({ id: 's1', name: 'S1' }));
    registry.register('s2', new Streamer({ id: 's2', name: 'S2' }));
    const all = registry.getAll();
    expect(all.size).toBe(2);
  });

  it('should check has', () => {
    registry.register('s1', new Streamer({ id: 's1', name: 'S1' }));
    expect(registry.has('s1')).toBe(true);
    expect(registry.has('s2')).toBe(false);
  });

  it('should create streamer', () => {
    const s = registry.createStreamer({ id: 's1', name: 'Test' });
    expect(s).toBeDefined();
    expect(registry.has('s1')).toBe(true);
  });

  it('should list ids', () => {
    registry.register('s1', new Streamer({ id: 's1', name: 'S1' }));
    registry.register('s2', new Streamer({ id: 's2', name: 'S2' }));
    expect(registry.listIds()).toContain('s1');
    expect(registry.listIds()).toContain('s2');
  });

  it('should get snapshot', () => {
    registry.register('s1', new Streamer({ id: 's1', name: 'S1' }));
    const snap = registry.getSnapshot();
    expect(snap.count).toBe(1);
  });

  it('should reset', () => {
    registry.register('s1', new Streamer({ id: 's1', name: 'S1' }));
    registry.reset();
    expect(registry.getSnapshot().count).toBe(0);
  });

  it('should get report', () => {
    const report = registry.getReport();
    expect(report).toContain('StreamerRegistry');
  });

  it('should export metrics', () => {
    const metrics = registry.exportMetrics();
    expect(metrics.version).toBe('V118');
  });
});

describe('StreamerExecutor', () => {
  let registry: StreamerRegistry;
  let executor: StreamerExecutor;

  beforeEach(() => {
    registry = new StreamerRegistry();
    registry.createStreamer({ id: 'exec-s1', name: 'ExecS1' });
    registry.createStreamer({ id: 'exec-s2', name: 'ExecS2' });
    executor = new StreamerExecutor(registry);
  });

  it('should create with config', () => {
    const cfg: ExecutorConfig = { maxConcurrent: 5 };
    const e = new StreamerExecutor(registry, cfg);
    expect(e.config.maxConcurrent).toBe(5);
  });

  it('should execute on streamer', () => {
    const data: StreamData = { id: 'd1', timestamp: Date.now(), payload: 'test' };
    const result = executor.execute('exec-s1', data);
    expect(result.success).toBe(true);
  });

  it('should fail on missing streamer', () => {
    const data: StreamData = { id: 'd1', timestamp: Date.now(), payload: 'test' };
    const result = executor.execute('missing', data);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should run on multiple streamers', () => {
    const data: StreamData = { id: 'd1', timestamp: Date.now(), payload: 'test' };
    const results = executor.run(['exec-s1', 'exec-s2'], [data]);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should get stats', () => {
    const data: StreamData = { id: 'd1', timestamp: Date.now(), payload: 'test' };
    executor.execute('exec-s1', data);
    const stats = executor.getStats();
    expect(stats.totalExecutions).toBe(1);
    expect(stats.successfulExecutions).toBe(1);
  });

  it('should get snapshot', () => {
    const snap = executor.getSnapshot();
    expect(snap.stats).toBeDefined();
  });

  it('should reset', () => {
    executor.reset();
    expect(executor.getStats().totalExecutions).toBe(0);
  });

  it('should get report', () => {
    const report = executor.getReport();
    expect(report).toContain('StreamerExecutor');
  });

  it('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBe('V118');
  });
});

describe('StreamerMonitor', () => {
  let registry: StreamerRegistry;
  let monitor: StreamerMonitor;

  beforeEach(() => {
    registry = new StreamerRegistry();
    registry.createStreamer({ id: 'mon-s1', name: 'MonS1' });
    registry.createStreamer({ id: 'mon-s2', name: 'MonS2' });
    monitor = new StreamerMonitor(registry);
  });

  it('should create with config', () => {
    const cfg: MonitorConfig = { historySize: 500 };
    const m = new StreamerMonitor(registry, cfg);
    expect(m.config.historySize).toBe(500);
  });

  it('should track events', () => {
    monitor.track('mon-s1', 'test-event', { data: 123 });
    const history = monitor.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].event).toBe('test-event');
  });

  it('should get metrics', () => {
    const metrics = monitor.getMetrics();
    expect(metrics.totalStreamers).toBe(2);
    expect(metrics.totalMessages).toBeDefined();
  });

  it('should get history by streamer', () => {
    monitor.track('mon-s1', 'event1');
    monitor.track('mon-s2', 'event2');
    const history = monitor.getHistory('mon-s1');
    expect(history.length).toBe(1);
    expect(history[0].streamerId).toBe('mon-s1');
  });

  it('should get status', () => {
    const status = monitor.getStatus('mon-s1');
    expect(status).toBeDefined();
  });

  it('should get snapshot', () => {
    const snap = monitor.getSnapshot();
    expect(snap.metrics).toBeDefined();
    expect(snap.historyLength).toBeDefined();
  });

  it('should reset', () => {
    monitor.track('mon-s1', 'event');
    monitor.reset();
    expect(monitor.getSnapshot().historyLength).toBe(0);
  });

  it('should get report', () => {
    const report = monitor.getReport();
    expect(report).toContain('StreamerMonitor');
  });

  it('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('V118');
  });
});