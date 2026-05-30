/**
 * V108 Tracer Tests
 * Tests for Tracer, SpanContext, SpanProcessor, and TracerMonitor
 */

import { Tracer } from '../tracer/Tracer';
import { SpanContext } from '../tracer/SpanContext';
import { SpanProcessor } from '../tracer/SpanProcessor';
import { TracerMonitor } from '../tracer/TracerMonitor';

describe('Tracer', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer({
      serviceName: 'test-service',
      enabled: true,
      sampleRate: 1.0,
      maxSpans: 100,
    });
  });

  afterEach(() => {
    tracer.reset();
  });

  test('should create tracer with config', () => {
    expect(tracer.config.serviceName).toBe('test-service');
    expect(tracer.config.enabled).toBe(true);
    expect(tracer.config.sampleRate).toBe(1.0);
  });

  test('should start a span', () => {
    const span = tracer.start('test-operation');
    expect(span.operationName).toBe('test-operation');
    expect(span.traceId).toBeDefined();
    expect(span.spanId).toBeDefined();
    expect(span.status).toBe('started');
  });

  test('should end a span', () => {
    const span = tracer.start('test-operation');
    tracer.end(span.spanId);
    const ended = tracer.getSpan(span.spanId);
    expect(ended?.status).toBe('ended');
    expect(ended?.endTime).toBeDefined();
  });

  test('should get span by id', () => {
    const span = tracer.start('test-operation');
    const found = tracer.getSpan(span.spanId);
    expect(found).toBeDefined();
    expect(found?.operationName).toBe('test-operation');
  });

  test('should return undefined for non-existent span', () => {
    const found = tracer.getSpan('non-existent');
    expect(found).toBeUndefined();
  });

  test('should track stats correctly', () => {
    tracer.start('op1');
    tracer.start('op2');
    const stats = tracer.getStats();
    expect(stats.totalSpans).toBe(2);
    expect(stats.startedSpans).toBe(2);
  });

  test('should count error spans', () => {
    const span = tracer.start('test-operation');
    tracer.end(span.spanId, 'error');
    const stats = tracer.getStats();
    expect(stats.errorSpans).toBe(1);
  });

  test('should get snapshot with metrics', () => {
    tracer.start('op1');
    const snapshot = tracer.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.activeCount).toBe(1);
  });

  test('should reset tracer state', () => {
    tracer.start('op1');
    tracer.reset();
    const snapshot = tracer.getSnapshot();
    expect(snapshot.metrics.totalSpans).toBe(0);
    expect(snapshot.activeCount).toBe(0);
  });

  test('should generate report string', () => {
    const report = tracer.getReport();
    expect(report).toContain('Tracer Report');
    expect(report).toContain('test-service');
  });

  test('should export metrics with version', () => {
    const exported = tracer.exportMetrics();
    expect(exported.version).toBe('1.0.0');
    expect(exported.stats).toBeDefined();
    expect(exported.config).toBeDefined();
  });

  test('should use trace function with callback', () => {
    let executed = false;
    tracer.trace('test-op', (span) => {
      executed = true;
      return span.operationName;
    });
    expect(executed).toBe(true);
  });

  test('should track active spans', () => {
    tracer.start('op1');
    tracer.start('op2');
    const active = tracer.getActiveSpans();
    expect(active.length).toBe(2);
  });
});

describe('SpanContext', () => {
  test('should create span context', () => {
    const ctx = new SpanContext('trace-1', 'span-1');
    expect(ctx.getTraceId()).toBe('trace-1');
    expect(ctx.getSpanId()).toBe('span-1');
  });

  test('should get and set tags', () => {
    const ctx = new SpanContext('trace-1', 'span-1');
    ctx.setTag('key1', 'value1');
    const tags = ctx.getTags();
    expect(tags.key1).toBe('value1');
  });

  test('should get parent span id', () => {
    const ctx = new SpanContext('trace-1', 'span-1', 'parent-1');
    expect(ctx.getParent()).toBe('parent-1');
  });

  test('should return undefined for no parent', () => {
    const ctx = new SpanContext('trace-1', 'span-1');
    expect(ctx.getParent()).toBeUndefined();
  });

  test('should clone context', () => {
    const ctx = new SpanContext('trace-1', 'span-1');
    ctx.setTag('key1', 'value1');
    const cloned = ctx.clone();
    expect(cloned.getTraceId()).toBe('trace-1');
    expect(cloned.getTags().key1).toBe('value1');
  });

  test('should get snapshot', () => {
    const ctx = new SpanContext('trace-1', 'span-1');
    const snapshot = ctx.getSnapshot();
    expect(snapshot.traceId).toBe('trace-1');
    expect(snapshot.spanId).toBe('span-1');
    expect(snapshot.hasParent).toBe(false);
  });

  test('should reset context', () => {
    const ctx = new SpanContext('trace-1', 'span-1');
    ctx.setTag('key1', 'value1');
    ctx.reset();
    const tags = ctx.getTags();
    expect(Object.keys(tags).length).toBe(0);
  });

  test('should generate report', () => {
    const ctx = new SpanContext('trace-1', 'span-1', 'parent-1');
    const report = ctx.getReport();
    expect(report).toContain('SpanContext Report');
    expect(report).toContain('trace-1');
  });

  test('should export metrics', () => {
    const ctx = new SpanContext('trace-1', 'span-1');
    const exported = ctx.exportMetrics();
    expect(exported.version).toBe('1.0.0');
    expect(exported.data).toBeDefined();
  });

  test('should check if child of another context', () => {
    const parent = new SpanContext('trace-1', 'span-parent');
    const child = new SpanContext('trace-1', 'span-child', 'span-parent');
    expect(child.isChildOf(parent)).toBe(true);
  });
});

describe('SpanProcessor', () => {
  let processor: SpanProcessor;

  beforeEach(() => {
    processor = new SpanProcessor({
      batchSize: 10,
      flushInterval: 1000,
      maxQueueSize: 100,
      enableCompression: true,
    });
  });

  afterEach(() => {
    processor.reset();
  });

  test('should create processor with config', () => {
    expect(processor.config.batchSize).toBe(10);
    expect(processor.config.maxQueueSize).toBe(100);
  });

  test('should process span', () => {
    const processed = processor.process('trace-1', 'span-1', 'op1');
    expect(processed.traceId).toBe('trace-1');
    expect(processed.operationName).toBe('op1');
    expect(processed.duration).toBeDefined();
  });

  test('should track stats', () => {
    processor.process('trace-1', 'span-1', 'op1');
    const stats = processor.getStats();
    expect(stats.processed).toBe(1);
  });

  test('should start and end span', () => {
    processor.start('span-1');
    // Start must be followed by process before end
    processor.process('trace-1', 'span-1', 'op1');
    const ended = processor.end('span-1');
    expect(ended).toBeDefined();
  });

  test('should get spans', () => {
    processor.process('trace-1', 'span-1', 'op1');
    const spans = processor.getSpans();
    expect(spans.length).toBe(1);
  });

  test('should get span by id', () => {
    processor.process('trace-1', 'span-1', 'op1');
    const span = processor.getSpan('span-1');
    expect(span).toBeDefined();
  });

  test('should flush queue', () => {
    for (let i = 0; i < 15; i++) {
      processor.process(`trace-${i}`, `span-${i}`, `op${i}`);
    }
    const flushed = processor.flush();
    expect(flushed.length).toBe(10);
  });

  test('should get snapshot with avg duration', () => {
    processor.process('trace-1', 'span-1', 'op1');
    const snapshot = processor.getSnapshot();
    expect(snapshot.avgDuration).toBeDefined();
  });

  test('should reset processor', () => {
    processor.process('trace-1', 'span-1', 'op1');
    processor.reset();
    const stats = processor.getStats();
    expect(stats.processed).toBe(0);
  });

  test('should generate report', () => {
    const report = processor.getReport();
    expect(report).toContain('SpanProcessor Report');
  });

  test('should export metrics', () => {
    const exported = processor.exportMetrics();
    expect(exported.version).toBe('1.0.0');
    expect(exported.stats).toBeDefined();
  });
});

describe('TracerMonitor', () => {
  let monitor: TracerMonitor;

  beforeEach(() => {
    monitor = new TracerMonitor({
      historySize: 5,
      metricsInterval: 1000,
      enableAutoFlush: true,
      alertThreshold: 100,
    });
  });

  afterEach(() => {
    monitor.reset();
  });

  test('should create monitor with config', () => {
    expect(monitor.config.historySize).toBe(5);
    expect(monitor.config.alertThreshold).toBe(100);
  });

  test('should track metrics', () => {
    monitor.track('metric1', 50);
    const metrics = monitor.getMetrics();
    expect(metrics.length).toBe(1);
    expect(metrics[0].name).toBe('metric1');
  });

  test('should get metrics by name', () => {
    monitor.track('metric1', 50);
    monitor.track('metric1', 60);
    const filtered = monitor.getMetricByName('metric1');
    expect(filtered.length).toBe(2);
  });

  test('should get track count', () => {
    monitor.track('metric1', 50);
    monitor.track('metric2', 60);
    expect(monitor.getTrackCount()).toBe(2);
  });

  test('should get status', () => {
    expect(monitor.getStatus()).toBe('healthy');
  });

  test('should set critical status on threshold breach', () => {
    monitor.track('metric1', 150);
    expect(monitor.getStatus()).toBe('critical');
  });

  test('should set warning status', () => {
    monitor.track('metric1', 80);
    expect(monitor.getStatus()).toBe('warning');
  });

  test('should get history', () => {
    monitor.track('metric1', 50);
    const history = monitor.getHistory();
    expect(history).toBeDefined();
  });

  test('should get snapshot', () => {
    monitor.track('metric1', 50);
    const snapshot = monitor.getSnapshot();
    expect(snapshot.trackCount).toBe(1);
    expect(snapshot.status).toBe('healthy');
  });

  test('should reset monitor', () => {
    monitor.track('metric1', 50);
    monitor.reset();
    const snapshot = monitor.getSnapshot();
    expect(snapshot.trackCount).toBe(0);
  });

  test('should generate report', () => {
    const report = monitor.getReport();
    expect(report).toContain('TracerMonitor Report');
  });

  test('should export metrics', () => {
    const exported = monitor.exportMetrics();
    expect(exported.version).toBe('1.0.0');
    expect(exported.trackCount).toBeDefined();
  });

  test('should get aggregated metrics', () => {
    monitor.track('metric1', 50);
    monitor.track('metric1', 60);
    monitor.track('metric2', 70);
    const aggregated = monitor.getAggregatedMetrics();
    expect(aggregated.metric1.count).toBe(2);
    expect(aggregated.metric1.avg).toBe(55);
  });
});