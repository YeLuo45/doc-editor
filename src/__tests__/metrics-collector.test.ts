/**
 * Metrics Collector Tests
 * V76 Metrics Collector - Comprehensive test suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsCollector, type Metric } from '../metrics-collector/MetricsCollector.js';
import { MetricsAggregator } from '../metrics-collector/MetricsAggregator.js';
import { MetricsExporter } from '../metrics-collector/MetricsExporter.js';
import { MetricsDashboard, type DashboardWidget } from '../metrics-collector/MetricsDashboard.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({ name: 'test-collector', maxMetrics: 100 });
  });

  it('should create collector with default config', () => {
    const c = new MetricsCollector();
    expect(c.config.name).toBe('default-collector');
    expect(c.config.interval).toBe(60000);
    expect(c.config.maxMetrics).toBe(1000);
  });

  it('should create collector with custom config', () => {
    expect(collector.config.name).toBe('test-collector');
    expect(collector.config.maxMetrics).toBe(100);
  });

  it('should collect metrics', () => {
    collector.collect('cpu', 85.5);
    collector.collect('memory', 2048);
    expect(collector.getMetrics().length).toBe(2);
  });

  it('should collect with tags', () => {
    collector.collect('requests', 100, { env: 'test', region: 'us-east' });
    const metrics = collector.getMetrics();
    expect(metrics[0].tags.env).toBe('test');
    expect(metrics[0].tags.region).toBe('us-east');
  });

  it('should get metrics with filter', () => {
    collector.collect('cpu', 80);
    collector.collect('cpu', 90);
    collector.collect('memory', 100);
    const cpuMetrics = collector.getMetrics({ name: 'cpu' });
    expect(cpuMetrics.length).toBe(2);
  });

  it('should get snapshot', () => {
    collector.collect('test', 42);
    const snapshot = collector.getSnapshot();
    expect(snapshot.version).toBe('V76');
    expect(snapshot.metrics.length).toBe(1);
    expect(snapshot.collectedAt).toBeGreaterThan(0);
  });

  it('should reset metrics', () => {
    collector.collect('test', 42);
    collector.reset();
    expect(collector.getMetrics().length).toBe(0);
  });

  it('should get report', () => {
    collector.collect('cpu', 80);
    collector.collect('cpu', 90);
    const report = collector.getReport();
    expect(report).toContain('MetricsCollector Report');
    expect(report).toContain('test-collector');
    expect(report).toContain('Total Metrics: 2');
  });

  it('should export metrics', () => {
    collector.collect('test', 42);
    const exported = collector.exportMetrics();
    expect(exported.version).toBe('V76');
    expect(exported.count).toBe(1);
  });

  it('should enforce max metrics limit', () => {
    const c = new MetricsCollector({ maxMetrics: 3 });
    c.collect('a', 1);
    c.collect('b', 2);
    c.collect('c', 3);
    c.collect('d', 4);
    expect(c.getMetrics().length).toBe(3);
    expect(c.getMetrics()[0].name).toBe('b');
  });
});

describe('MetricsAggregator', () => {
  let aggregator: MetricsAggregator;

  beforeEach(() => {
    aggregator = new MetricsAggregator({ name: 'test-aggregator' });
  });

  it('should create with default config', () => {
    const a = new MetricsAggregator();
    expect(a.config.name).toBe('default-aggregator');
    expect(a.config.aggregationWindow).toBe(60000);
  });

  it('should create with custom config', () => {
    expect(aggregator.config.name).toBe('test-aggregator');
  });

  it('should aggregate metrics', () => {
    const metrics: Metric[] = [
      { name: 'cpu', value: 80, timestamp: Date.now(), tags: {} },
      { name: 'cpu', value: 90, timestamp: Date.now(), tags: {} },
      { name: 'memory', value: 2048, timestamp: Date.now(), tags: {} },
    ];
    const result = aggregator.aggregate(metrics);
    expect(result.aggregated.length).toBe(2);
    const cpuAgg = result.aggregated.find((a) => a.name === 'cpu');
    expect(cpuAgg?.count).toBe(2);
    expect(cpuAgg?.avg).toBe(85);
  });

  it('should calculate min/max correctly', () => {
    const metrics: Metric[] = [
      { name: 'test', value: 10, timestamp: Date.now(), tags: {} },
      { name: 'test', value: 50, timestamp: Date.now(), tags: {} },
      { name: 'test', value: 30, timestamp: Date.now(), tags: {} },
    ];
    const result = aggregator.aggregate(metrics);
    const agg = result.aggregated[0];
    expect(agg.min).toBe(10);
    expect(agg.max).toBe(50);
  });

  it('should get aggregates', () => {
    const metrics: Metric[] = [
      { name: 'cpu', value: 80, timestamp: Date.now(), tags: {} },
      { name: 'cpu', value: 90, timestamp: Date.now(), tags: {} },
    ];
    aggregator.aggregate(metrics);
    const aggs = aggregator.getAggregates('cpu');
    expect(aggs.length).toBeGreaterThan(0);
  });

  it('should get snapshot', () => {
    const snapshot = aggregator.getSnapshot();
    expect(snapshot.version).toBe('V76');
    expect(snapshot.lastAggregation).toBeGreaterThanOrEqual(0);
  });

  it('should reset', () => {
    aggregator.reset();
    expect(aggregator.getAggregates().length).toBe(0);
  });

  it('should get summary', () => {
    const summary = aggregator.getSummary();
    expect(summary).toContain('MetricsAggregator Summary');
  });

  it('should get report', () => {
    const report = aggregator.getReport();
    expect(report).toContain('MetricsAggregator Report');
  });

  it('should export metrics', () => {
    const exported = aggregator.exportMetrics();
    expect(exported.version).toBe('V76');
  });
});

describe('MetricsExporter', () => {
  let exporter: MetricsExporter;

  beforeEach(() => {
    exporter = new MetricsExporter({ name: 'test-exporter' });
  });

  it('should create with default config', () => {
    const e = new MetricsExporter();
    expect(e.config.name).toBe('default-exporter');
    expect(e.config.format).toBe('json');
  });

  it('should create with custom config', () => {
    expect(exporter.config.name).toBe('test-exporter');
    expect(exporter.config.format).toBe('json');
  });

  it('should export metrics', () => {
    const result = exporter.export([{ name: 'test', value: 42 }]);
    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(1);
    expect(result.format).toBe('json');
  });

  it('should export with different format', () => {
    const result = exporter.export([{ name: 'test', value: 42 }], 'csv');
    expect(result.format).toBe('csv');
  });

  it('should schedule export job', () => {
    const job = exporter.schedule([{ name: 'test', value: 42 }], 60000);
    expect(job.id).toBeDefined();
    expect(job.status).toBe('pending');
    expect(job.interval).toBe(60000);
  });

  it('should cancel scheduled job', () => {
    const job = exporter.schedule([{ name: 'test', value: 42 }], 60000);
    const cancelled = exporter.cancel(job.id);
    expect(cancelled).toBe(true);
  });

  it('should get scheduled jobs', () => {
    exporter.schedule([{ name: 'test', value: 42 }], 60000);
    const jobs = exporter.getScheduled();
    expect(jobs.length).toBeGreaterThan(0);
  });

  it('should reset', () => {
    exporter.reset();
    expect(exporter.getScheduled().length).toBe(0);
  });

  it('should get snapshot', () => {
    const snapshot = exporter.getSnapshot();
    expect(snapshot.version).toBe('V76');
  });

  it('should get report', () => {
    const report = exporter.getReport();
    expect(report).toContain('MetricsExporter Report');
  });

  it('should export metrics', () => {
    const exported = exporter.exportMetrics();
    expect(exported.version).toBe('V76');
  });
});

describe('MetricsDashboard', () => {
  let dashboard: MetricsDashboard;

  beforeEach(() => {
    dashboard = new MetricsDashboard({ name: 'test-dashboard' });
  });

  it('should create with default config', () => {
    const d = new MetricsDashboard();
    expect(d.config.name).toBe('default-dashboard');
    expect(d.config.layout).toBe('grid');
  });

  it('should create with custom config', () => {
    expect(dashboard.config.name).toBe('test-dashboard');
    expect(dashboard.config.layout).toBe('grid');
  });

  it('should add widget', () => {
    const widget: DashboardWidget = {
      id: 'w1',
      type: 'counter',
      title: 'CPU Usage',
      metricName: 'cpu',
      config: {},
    };
    dashboard.addWidget(widget);
    expect(dashboard.getWidgets().length).toBe(1);
  });

  it('should render', () => {
    const output = dashboard.render();
    expect(output).toContain('MetricsDashboard');
    expect(output).toContain('test-dashboard');
  });

  it('should get widgets with filter', () => {
    dashboard.addWidget({ id: 'w1', type: 'counter', title: 'A', metricName: 'a', config: {} });
    dashboard.addWidget({ id: 'w2', type: 'chart', title: 'B', metricName: 'b', config: {} });
    const counters = dashboard.getWidgets({ type: 'counter' });
    expect(counters.length).toBe(1);
  });

  it('should update widget', () => {
    dashboard.addWidget({ id: 'w1', type: 'counter', title: 'CPU', metricName: 'cpu', config: {} });
    const updated = dashboard.update('w1', { title: 'New CPU' });
    expect(updated).toBe(true);
    expect(dashboard.getWidgets()[0].title).toBe('New CPU');
  });

  it('should remove widget', () => {
    dashboard.addWidget({ id: 'w1', type: 'counter', title: 'A', metricName: 'a', config: {} });
    const removed = dashboard.removeWidget('w1');
    expect(removed).toBe(true);
    expect(dashboard.getWidgets().length).toBe(0);
  });

  it('should reset', () => {
    dashboard.addWidget({ id: 'w1', type: 'counter', title: 'A', metricName: 'a', config: {} });
    dashboard.reset();
    expect(dashboard.getWidgets().length).toBe(0);
  });

  it('should get snapshot', () => {
    const snapshot = dashboard.getSnapshot();
    expect(snapshot.version).toBe('V76');
  });

  it('should get report', () => {
    const report = dashboard.getReport();
    expect(report).toContain('MetricsDashboard Report');
  });

  it('should export metrics', () => {
    const exported = dashboard.exportMetrics();
    expect(exported.version).toBe('V76');
  });

  it('should set layout', () => {
    dashboard.setLayout('chart');
    expect(dashboard.config.layout).toBe('chart');
  });

  it('should set refresh interval', () => {
    dashboard.setRefreshInterval(60000);
    expect(dashboard.config.refreshInterval).toBe(60000);
  });
});