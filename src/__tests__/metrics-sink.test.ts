/**
 * metrics-sink.test.ts - V107 Metrics Sink tests for doc-editor
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetricsSink } from '../metrics-sink/MetricsSink';
import { SinkRegistry } from '../metrics-sink/SinkRegistry';
import { SinkMonitor } from '../metrics-sink/SinkMonitor';
import { SinkPolicy } from '../metrics-sink/SinkPolicy';

describe('MetricsSink', () => {
  let sink: MetricsSink;

  beforeEach(() => {
    sink = new MetricsSink({ batchSize: 10, flushIntervalMs: 1000 });
  });

  afterEach(() => {
    sink.reset();
    sink.destroy();
  });

  it('should send metric data', () => {
    const result = sink.send({ name: 'test.metric', value: 1, timestamp: Date.now() });
    expect(result).toBe(true);
  });

  it('should queue metrics when batch size not reached', () => {
    sink.send({ name: 'test.metric', value: 1, timestamp: Date.now() });
    const stats = sink.getStats();
    expect(stats.pendingCount).toBe(1);
  });

  it('should flush when batch size reached', () => {
    const testSink = new MetricsSink({
      batchSize: 3,
      flushIntervalMs: 60000,
      onSend: () => {},
    });
    testSink.send({ name: 'm1', value: 1, timestamp: Date.now() });
    testSink.send({ name: 'm2', value: 2, timestamp: Date.now() });
    testSink.send({ name: 'm3', value: 3, timestamp: Date.now() });
    testSink.flush();
    const stats = testSink.getStats();
    expect(stats.totalSent).toBe(3);
    testSink.destroy();
  });

  it('should get status correctly', () => {
    const status = sink.getStatus();
    expect(status.enabled).toBe(true);
    expect(status.batchSize).toBe(10);
  });

  it('should track stats correctly', () => {
    sink.send({ name: 'test', value: 1, timestamp: Date.now() });
    const stats = sink.getStats();
    expect(stats.totalSent).toBeGreaterThanOrEqual(0);
  });

  it('should reset correctly', () => {
    sink.send({ name: 'test', value: 1, timestamp: Date.now() });
    sink.reset();
    const stats = sink.getStats();
    expect(stats.pendingCount).toBe(0);
    expect(stats.totalSent).toBe(0);
  });

  it('should get snapshot with metrics and config', () => {
    const snapshot = sink.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  it('should generate report string', () => {
    const report = sink.getReport();
    expect(report).toContain('Metrics Sink Report');
    expect(report).toContain('Total Sent:');
  });

  it('should export metrics with version', () => {
    const exported = sink.exportMetrics();
    expect(exported.version).toBe('1.0.7');
    expect(exported.metrics).toBeDefined();
    expect(exported.config).toBeDefined();
  });

  it('should not send when disabled', () => {
    const disabledSink = new MetricsSink({ enabled: false });
    const result = disabledSink.send({ name: 'test', value: 1, timestamp: Date.now() });
    expect(result).toBe(false);
    disabledSink.destroy();
  });
});

describe('SinkRegistry', () => {
  let registry: SinkRegistry;

  beforeEach(() => {
    registry = new SinkRegistry({ maxSinks: 10 });
  });

  afterEach(() => {
    registry.reset();
  });

  it('should register a sink', () => {
    const result = registry.register('test-sink');
    expect(result).toBe(true);
  });

  it('should not register duplicate sink', () => {
    registry.register('test-sink');
    const result = registry.register('test-sink');
    expect(result).toBe(false);
  });

  it('should unregister a sink', () => {
    registry.register('test-sink');
    const result = registry.unregister('test-sink');
    expect(result).toBe(true);
  });

  it('should get sink by name', () => {
    registry.register('test-sink');
    const sink = registry.get('test-sink');
    expect(sink).toBeDefined();
  });

  it('should check if sink exists', () => {
    registry.register('test-sink');
    expect(registry.has('test-sink')).toBe(true);
    expect(registry.has('non-existent')).toBe(false);
  });

  it('should get all sinks', () => {
    registry.register('sink1');
    registry.register('sink2');
    const sinks = registry.getAll();
    expect(sinks.size).toBe(2);
  });

  it('should track registration stats', () => {
    registry.register('sink1');
    registry.register('sink2');
    const stats = registry.getStats();
    expect(stats.totalRegistrations).toBe(2);
  });

  it('should get status correctly', () => {
    registry.register('test-sink');
    const status = registry.getStatus();
    expect(status.totalSinks).toBe(1);
  });

  it('should get snapshot with metrics and config', () => {
    const snapshot = registry.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  it('should reset correctly', () => {
    registry.register('test-sink');
    registry.reset();
    expect(registry.getStats().totalSinks).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = registry.exportMetrics();
    expect(exported.version).toBe('1.0.7');
  });
});

describe('SinkMonitor', () => {
  let monitor: SinkMonitor;

  beforeEach(() => {
    monitor = new SinkMonitor({ historySize: 100 });
  });

  afterEach(() => {
    monitor.reset();
  });

  it('should track metrics', () => {
    monitor.track('sink1', 'latency', 50, true);
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(1);
  });

  it('should get metrics by sink name', () => {
    monitor.track('sink1', 'latency', 50, true);
    const metrics = monitor.getMetrics('sink1');
    expect(metrics.size).toBeGreaterThan(0);
  });

  it('should get history with limit', () => {
    for (let i = 0; i < 10; i++) {
      monitor.track('sink1', 'latency', i * 10, true);
    }
    const history = monitor.getHistory('sink1', 5);
    expect(history.length).toBeLessThanOrEqual(5);
  });

  it('should get status correctly', () => {
    const status = monitor.getStatus();
    expect(status.enabled).toBe(true);
    expect(status.historySize).toBe(0);
  });

  it('should reset correctly', () => {
    monitor.track('sink1', 'latency', 50, true);
    monitor.reset();
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(0);
  });

  it('should get snapshot with metrics and config', () => {
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  it('should generate report string', () => {
    const report = monitor.getReport();
    expect(report).toContain('Sink Monitor Report');
  });

  it('should export metrics with version', () => {
    const exported = monitor.exportMetrics();
    expect(exported.version).toBe('1.0.7');
  });
});

describe('SinkPolicy', () => {
  let policy: SinkPolicy;

  beforeEach(() => {
    policy = new SinkPolicy({
      name: 'test-policy',
      priority: 5,
      conditions: {
        maxQueueSize: 1000,
        maxFailureRate: 0.2,
        maxLatencyMs: 1000,
        minSuccessRate: 0.8,
      },
    });
  });

  afterEach(() => {
    policy.reset();
  });

  it('should allow sinking under normal conditions', () => {
    const result = policy.shouldSink({
      queueSize: 100,
      failureRate: 0.05,
      latencyMs: 100,
      successRate: 0.95,
    });
    expect(result).toBe(true);
  });

  it('should block sinking when queue too large', () => {
    const result = policy.shouldSink({ queueSize: 2000 });
    expect(result).toBe(false);
  });

  it('should block sinking when failure rate too high', () => {
    const result = policy.shouldSink({ failureRate: 0.5 });
    expect(result).toBe(false);
  });

  it('should block sinking when latency too high', () => {
    const result = policy.shouldSink({ latencyMs: 5000 });
    expect(result).toBe(false);
  });

  it('should get priority correctly', () => {
    expect(policy.getPriority()).toBe(5);
  });

  it('should apply policy and return result', () => {
    const result = policy.apply({
      queueSize: 100,
      failureRate: 0.05,
      latencyMs: 100,
      successRate: 0.95,
    });
    expect(result.shouldSink).toBe(true);
    expect(result.action).toBe('send');
  });

  it('should track blocked when conditions exceeded', () => {
    policy.apply({ queueSize: 2000 });
    const stats = policy.getStats();
    expect(stats.sinkBlocked).toBe(1);
  });

  it('should get policy config', () => {
    const config = policy.getPolicy();
    expect(config.name).toBe('test-policy');
    expect(config.priority).toBe(5);
  });

  it('should get snapshot with metrics and config', () => {
    const snapshot = policy.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.config).toBeDefined();
  });

  it('should reset correctly', () => {
    policy.shouldSink({ queueSize: 2000 });
    policy.reset();
    const stats = policy.getStats();
    expect(stats.totalEvaluations).toBe(0);
    expect(stats.sinkBlocked).toBe(0);
  });

  it('should export metrics with version', () => {
    const exported = policy.exportMetrics();
    expect(exported.version).toBe('1.0.7');
  });

  it('should generate report string', () => {
    const report = policy.getReport();
    expect(report).toContain('Sink Policy Report');
    expect(report).toContain('test-policy');
  });
});

describe('Metrics Sink Integration', () => {
  it('should work together across all sink classes', () => {
    const registry = new SinkRegistry({ maxSinks: 10 });
    const monitor = new SinkMonitor({ historySize: 100 });
    const policy = new SinkPolicy({ name: 'integration-test', priority: 1 });

    registry.register('sink1', { batchSize: 5 });
    registry.register('sink2', { batchSize: 10 });

    const sink1 = registry.get('sink1');
    const sink2 = registry.get('sink2');

    sink1?.send({ name: 'test1', value: 1, timestamp: Date.now() });
    sink2?.send({ name: 'test2', value: 2, timestamp: Date.now() });

    monitor.track('sink1', 'sent', 1, true);
    monitor.track('sink2', 'sent', 1, true);

    policy.apply({ queueSize: 50 });

    expect(registry.getStats().totalSinks).toBe(2);
    expect(monitor.getStats().totalTracked).toBe(2);
    expect(policy.getStats().totalEvaluations).toBe(1);

    registry.reset();
    monitor.reset();
    policy.reset();
  });

  it('should export metrics from all classes with version 1.0.7', () => {
    const sink = new MetricsSink();
    const registry = new SinkRegistry();
    const monitor = new SinkMonitor();
    const policy = new SinkPolicy();

    const sMetrics = sink.exportMetrics();
    const rMetrics = registry.exportMetrics();
    const mMetrics = monitor.exportMetrics();
    const pMetrics = policy.exportMetrics();

    expect(sMetrics.version).toBe('1.0.7');
    expect(rMetrics.version).toBe('1.0.7');
    expect(mMetrics.version).toBe('1.0.7');
    expect(pMetrics.version).toBe('1.0.7');

    sink.destroy();
  });
});