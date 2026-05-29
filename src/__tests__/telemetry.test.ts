/**
 * Telemetry System Tests - V64 Telemetry
 */

import {
  TelemetryCollector,
  CollectorConfig,
  MetricRecord
} from '../telemetry/TelemetryCollector';
import {
  TelemetryAggregator,
  AggregatorConfig,
  AggregatedMetric
} from '../telemetry/TelemetryAggregator';
import {
  TelemetryExporter,
  ExporterConfig,
  ExportJob,
  ExportResult
} from '../telemetry/TelemetryExporter';
import {
  TelemetryDashboard,
  DashboardConfig,
  Widget
} from '../telemetry/TelemetryDashboard';

describe('TelemetryCollector', () => {
  let collector: TelemetryCollector;
  const config: CollectorConfig = {
    maxBufferSize: 100,
    flushInterval: 5000,
    batchSize: 10,
    enabled: true,
    serviceName: 'test-collector'
  };

  beforeEach(() => {
    collector = new TelemetryCollector(config);
  });

  test('should initialize with config', () => {
    const snapshot = collector.getSnapshot();
    expect(snapshot.bufferSize).toBe(0);
    expect(snapshot.recordCount).toBe(0);
  });

  test('should record metrics', () => {
    collector.record('cpu_usage', 45.5);
    expect(collector.getBufferSize()).toBe(1);
  });

  test('should record metrics with metadata', () => {
    collector.record('memory_usage', 1024, { unit: 'MB' });
    expect(collector.getBufferSize()).toBe(1);
  });

  test('should flush metrics', () => {
    collector.record('test_metric', 100);
    const flushed = collector.flush();
    expect(flushed.length).toBe(1);
    expect(collector.getBufferSize()).toBe(0);
  });

  test('should get metrics', () => {
    collector.record('metric1', 10);
    collector.record('metric2', 20);
    const metrics = collector.getMetrics();
    expect(metrics.length).toBe(2);
  });

  test('should get buffer size', () => {
    expect(collector.getBufferSize()).toBe(0);
    collector.record('test', 1);
    expect(collector.getBufferSize()).toBe(1);
  });

  test('should get snapshot', () => {
    collector.record('test', 1);
    const snapshot = collector.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.bufferSize).toBe(1);
  });

  test('should reset', () => {
    collector.record('test', 1);
    collector.reset();
    expect(collector.getBufferSize()).toBe(0);
  });

  test('should generate report', () => {
    collector.record('test', 1);
    const report = collector.getReport();
    expect(report).toContain('TelemetryCollector Report');
  });

  test('should export metrics', () => {
    collector.record('test', 1);
    const exported = collector.exportMetrics();
    expect(exported.version).toBe('1.0.0');
    expect(exported.count).toBe(1);
  });
});

describe('TelemetryAggregator', () => {
  let aggregator: TelemetryAggregator;
  const config: AggregatorConfig = {
    aggregationWindow: 1000,
    retentionPeriod: 60000,
    precision: 2,
    enabled: true,
    serviceName: 'test-aggregator'
  };

  beforeEach(() => {
    aggregator = new TelemetryAggregator(config);
  });

  test('should initialize with config', () => {
    const snapshot = aggregator.getSnapshot();
    expect(snapshot.metricCount).toBe(0);
  });

  test('should aggregate metrics', () => {
    aggregator.aggregate('cpu_usage', 50);
    aggregator.aggregate('cpu_usage', 60);
    const summary = aggregator.getSummary();
    expect(summary.totalProcessed).toBe(2);
  });

  test('should rollup metrics', () => {
    aggregator.aggregate('test', 100);
    const rollup = aggregator.rollup(5000);
    expect(rollup.metrics.length).toBeGreaterThan(0);
  });

  test('should get aggregates', () => {
    aggregator.aggregate('test', 10);
    const aggregates = aggregator.getAggregates();
    expect(aggregates.size).toBeGreaterThan(0);
  });

  test('should get summary', () => {
    aggregator.aggregate('test', 10);
    const summary = aggregator.getSummary();
    expect(summary.metricCount).toBe(1);
    expect(summary.totalProcessed).toBe(1);
  });

  test('should get snapshot', () => {
    aggregator.aggregate('test', 1);
    const snapshot = aggregator.getSnapshot();
    expect(snapshot.totalProcessed).toBe(1);
  });

  test('should reset', () => {
    aggregator.aggregate('test', 1);
    aggregator.reset();
    const snapshot = aggregator.getSnapshot();
    expect(snapshot.totalProcessed).toBe(0);
  });

  test('should generate report', () => {
    aggregator.aggregate('test', 1);
    const report = aggregator.getReport();
    expect(report).toContain('TelemetryAggregator Report');
  });

  test('should export metrics', () => {
    aggregator.aggregate('test', 1);
    const exported = aggregator.exportMetrics();
    expect(exported.version).toBe('1.0.0');
    expect(exported.totalProcessed).toBe(1);
  });
});

describe('TelemetryExporter', () => {
  let exporter: TelemetryExporter;
  const config: ExporterConfig = {
    endpoint: 'http://localhost:3000/api',
    format: 'json',
    interval: 10000,
    batchSize: 50,
    enabled: true,
    retryAttempts: 3,
    serviceName: 'test-exporter'
  };

  beforeEach(() => {
    exporter = new TelemetryExporter(config);
  });

  test('should initialize with config', () => {
    const snapshot = exporter.getSnapshot();
    expect(snapshot.exportCount).toBe(0);
  });

  test('should export data', () => {
    const result = exporter.export([{ name: 'test', value: 100 }]);
    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(1);
  });

  test('should export object data', () => {
    const result = exporter.export({ key: 'value' });
    expect(result.success).toBe(true);
  });

  test('should schedule job', () => {
    const job = exporter.schedule('job1', 5000);
    expect(job.id).toBe('job1');
    expect(job.interval).toBe(5000);
  });

  test('should cancel scheduled job', () => {
    exporter.schedule('job1', 5000);
    const cancelled = exporter.cancel('job1');
    expect(cancelled).toBe(true);
  });

  test('should fail to cancel non-existent job', () => {
    const cancelled = exporter.cancel('non-existent');
    expect(cancelled).toBe(false);
  });

  test('should get scheduled jobs', () => {
    exporter.schedule('job1', 5000);
    exporter.schedule('job2', 10000);
    const jobs = exporter.getScheduled();
    expect(jobs.length).toBe(2);
  });

  test('should get snapshot', () => {
    exporter.export({ test: 1 });
    const snapshot = exporter.getSnapshot();
    expect(snapshot.exportCount).toBe(1);
  });

  test('should reset', () => {
    exporter.export({ test: 1 });
    exporter.reset();
    const snapshot = exporter.getSnapshot();
    expect(snapshot.exportCount).toBe(0);
  });

  test('should generate report', () => {
    const report = exporter.getReport();
    expect(report).toContain('TelemetryExporter Report');
  });

  test('should export metrics', () => {
    exporter.schedule('job1', 5000);
    const exported = exporter.exportMetrics();
    expect(exported.version).toBe('1.0.0');
    expect(exported.scheduledJobs).toBe(1);
  });
});

describe('TelemetryDashboard', () => {
  let dashboard: TelemetryDashboard;
  const config: DashboardConfig = {
    refreshRate: 1000,
    maxWidgets: 10,
    theme: 'dark',
    layout: 'grid',
    enabled: true,
    serviceName: 'test-dashboard'
  };

  beforeEach(() => {
    dashboard = new TelemetryDashboard(config);
  });

  test('should initialize with config', () => {
    const snapshot = dashboard.getSnapshot();
    expect(snapshot.widgetCount).toBe(0);
  });

  test('should render dashboard', () => {
    const result = dashboard.render();
    expect(result.widgets).toBeDefined();
    expect(result.config.theme).toBe('dark');
  });

  test('should get widgets', () => {
    dashboard.update('widget1', { type: 'chart', title: 'Test Chart' });
    const widgets = dashboard.getWidgets();
    expect(widgets.length).toBe(1);
  });

  test('should update widget', () => {
    dashboard.update('widget1', { type: 'chart', title: 'Test' });
    const updated = dashboard.update('widget1', { title: 'Updated' });
    expect(updated?.title).toBe('Updated');
  });

  test('should add new widget', () => {
    const widget = dashboard.update('widget2', {
      type: 'metric',
      title: 'New Metric',
      dataKey: 'value'
    });
    expect(widget).toBeDefined();
    expect(widget?.id).toBe('widget2');
  });

  test('should respect max widgets limit', () => {
    const smallConfig = { ...config, maxWidgets: 1 };
    const limitedDashboard = new TelemetryDashboard(smallConfig);
    limitedDashboard.update('w1', { type: 'metric' });
    const result = limitedDashboard.update('w2', { type: 'chart' });
    expect(result).toBeNull();
  });

  test('should get config', () => {
    const cfg = dashboard.getConfig();
    expect(cfg.theme).toBe('dark');
    expect(cfg.layout).toBe('grid');
  });

  test('should get snapshot', () => {
    dashboard.update('widget1', { type: 'chart' });
    dashboard.render();
    const snapshot = dashboard.getSnapshot();
    expect(snapshot.widgetCount).toBe(1);
    expect(snapshot.renderCount).toBe(1);
  });

  test('should reset', () => {
    dashboard.update('widget1', { type: 'chart' });
    dashboard.reset();
    const snapshot = dashboard.getSnapshot();
    expect(snapshot.widgetCount).toBe(0);
  });

  test('should generate report', () => {
    dashboard.update('widget1', { type: 'chart', title: 'Test' });
    const report = dashboard.getReport();
    expect(report).toContain('TelemetryDashboard Report');
  });

  test('should export metrics', () => {
    dashboard.update('widget1', { type: 'chart' });
    const exported = dashboard.exportMetrics();
    expect(exported.version).toBe('1.0.0');
    expect(exported.widgetCount).toBe(1);
  });

  test('should track render count', () => {
    dashboard.render();
    dashboard.render();
    const snapshot = dashboard.getSnapshot();
    expect(snapshot.renderCount).toBe(2);
  });
});