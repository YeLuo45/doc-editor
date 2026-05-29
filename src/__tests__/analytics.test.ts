/**
 * V67 Analytics Engine Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsCollector, type AnalyticsConfig, type Metrics, type SessionData } from '../analytics/AnalyticsCollector';
import { AnalyticsAggregator, type AggregationConfig } from '../analytics/AnalyticsAggregator';
import { AnalyticsDashboard, type DashboardConfig, type Widget } from '../analytics/AnalyticsDashboard';
import { AnalyticsExporter, type ExportConfig, type ScheduledExport, type ExportResult } from '../analytics/AnalyticsExporter';

describe('AnalyticsCollector', () => {
  let collector: AnalyticsCollector;
  const config: AnalyticsConfig = {
    appId: 'test-app',
    sessionTimeout: 30000,
    enableLogging: true,
    batchSize: 10,
    flushInterval: 1000,
  };

  beforeEach(() => {
    collector = new AnalyticsCollector(config);
  });

  it('should create collector with config', () => {
    expect(collector.config).toEqual(config);
  });

  it('should track events', () => {
    collector.track('test_event', { key: 'value' });
    const metrics = collector.getMetrics();
    expect(metrics.totalEvents).toBe(1);
    expect(metrics.eventsByType['test_event']).toBe(1);
  });

  it('should get session data', () => {
    collector.track('page_view');
    const sessionData = collector.getSessionData();
    expect(sessionData.sessionId).toBeTruthy();
    expect(sessionData.events.length).toBe(1);
  });

  it('should get snapshot', () => {
    collector.track('event1');
    const snapshot = collector.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
    expect(snapshot.metrics.totalEvents).toBe(1);
  });

  it('should reset', () => {
    collector.track('event1');
    collector.reset();
    const metrics = collector.getMetrics();
    expect(metrics.totalEvents).toBe(0);
  });

  it('should get report', () => {
    const report = collector.getReport();
    expect(report).toBeTruthy();
    expect(report.includes('sessionId')).toBe(true);
  });

  it('should export metrics', () => {
    const result = collector.exportMetrics();
    expect(result.version).toBe('v67.0.0');
  });
});

describe('AnalyticsAggregator', () => {
  let aggregator: AnalyticsAggregator;
  const config: AggregationConfig = {
    timeWindow: 60000,
    groupingEnabled: true,
    retentionDays: 7,
    precision: 2,
  };

  beforeEach(() => {
    aggregator = new AnalyticsAggregator(config);
  });

  it('should create aggregator with config', () => {
    expect(aggregator.config).toEqual(config);
  });

  it('should aggregate data', () => {
    aggregator.aggregate('clicks', 10);
    aggregator.aggregate('clicks', 20);
    const summary = aggregator.getSummary('clicks');
    expect(summary?.totalValue).toBe(30);
    expect(summary?.count).toBe(2);
  });

  it('should get aggregates', () => {
    aggregator.aggregate('page_views', 100);
    const aggregates = aggregator.getAggregates('page_views');
    expect(aggregates.length).toBe(1);
  });

  it('should get summary', () => {
    aggregator.aggregate('requests', 5);
    aggregator.aggregate('requests', 15);
    const summary = aggregator.getSummary('requests');
    expect(summary?.average).toBe(10);
    expect(summary?.min).toBe(5);
    expect(summary?.max).toBe(15);
  });

  it('should export data', () => {
    aggregator.aggregate('test', 42);
    const data = aggregator.exportData();
    expect(data.length).toBeGreaterThan(0);
  });

  it('should get snapshot', () => {
    aggregator.aggregate('key1', 100);
    const snapshot = aggregator.getSnapshot();
    expect(snapshot.dataPoints).toBe(1);
  });

  it('should reset', () => {
    aggregator.aggregate('test', 50);
    aggregator.reset();
    const snapshot = aggregator.getSnapshot();
    expect(snapshot.dataPoints).toBe(0);
  });

  it('should get report', () => {
    const report = aggregator.getReport();
    expect(report).toBeTruthy();
  });

  it('should export metrics', () => {
    const result = aggregator.exportMetrics();
    expect(result.version).toBe('v67.0.0');
  });
});

describe('AnalyticsDashboard', () => {
  let dashboard: AnalyticsDashboard;
  const config: DashboardConfig = {
    theme: 'dark',
    refreshRate: 5000,
    layout: 'grid',
    widgets: ['chart', 'table', 'metric'],
    autoRefresh: true,
  };

  beforeEach(() => {
    dashboard = new AnalyticsDashboard(config);
  });

  it('should create dashboard with config', () => {
    expect(dashboard.config).toEqual(config);
  });

  it('should render', () => {
    const state = dashboard.render();
    expect(state.widgets.length).toBe(3);
  });

  it('should get widgets', () => {
    const widgets = dashboard.getWidgets();
    expect(widgets.length).toBe(3);
  });

  it('should update widget', () => {
    const widgets = dashboard.getWidgets();
    const result = dashboard.update(widgets[0].id, { value: 42 });
    expect(result).toBe(true);
  });

  it('should get config', () => {
    const cfg = dashboard.getConfig();
    expect(cfg.theme).toBe('dark');
  });

  it('should add widget', () => {
    const widget = dashboard.addWidget('gauge', 'New Widget');
    expect(widget.type).toBe('gauge');
    expect(dashboard.getWidgets().length).toBe(4);
  });

  it('should remove widget', () => {
    const widgets = dashboard.getWidgets();
    const result = dashboard.removeWidget(widgets[0].id);
    expect(result).toBe(true);
    expect(dashboard.getWidgets().length).toBe(2);
  });

  it('should get snapshot', () => {
    const snapshot = dashboard.getSnapshot();
    expect(snapshot.widgetCount).toBe(3);
  });

  it('should reset', () => {
    dashboard.reset();
    const widgets = dashboard.getWidgets();
    expect(widgets.length).toBe(3);
  });

  it('should get report', () => {
    const report = dashboard.getReport();
    expect(report).toBeTruthy();
  });

  it('should export metrics', () => {
    const result = dashboard.exportMetrics();
    expect(result.version).toBe('v67.0.0');
  });
});

describe('AnalyticsExporter', () => {
  let exporter: AnalyticsExporter;
  const config: ExportConfig = {
    format: 'json',
    destination: 'file',
    compression: false,
    maxFileSize: 1024 * 1024,
  };

  beforeEach(() => {
    exporter = new AnalyticsExporter(config);
  });

  it('should create exporter with config', () => {
    expect(exporter.config).toEqual(config);
  });

  it('should export data', () => {
    const result = exporter.export({ test: 'data' });
    expect(result.success).toBe(true);
    expect(result.path).toBeTruthy();
  });

  it('should schedule export', () => {
    const scheduled = exporter.schedule('job1', { data: 123 }, 60000);
    expect(scheduled.id).toBe('job1');
    expect(scheduled.active).toBe(true);
    exporter.cancel('job1');
  });

  it('should cancel scheduled export', () => {
    exporter.schedule('job2', { data: 456 }, 60000);
    const result = exporter.cancel('job2');
    expect(result).toBe(true);
    const scheduled = exporter.getScheduled();
    const job = scheduled.find(s => s.id === 'job2');
    expect(job?.active).toBe(false);
  });

  it('should get scheduled exports', () => {
    exporter.schedule('job3', {}, 60000);
    const scheduled = exporter.getScheduled();
    expect(scheduled.length).toBe(1);
    exporter.cancel('job3');
  });

  it('should get snapshot', () => {
    const snapshot = exporter.getSnapshot();
    expect(snapshot.scheduledCount).toBe(0);
    expect(snapshot.historyCount).toBe(0);
  });

  it('should reset', () => {
    exporter.export({ test: 1 });
    exporter.reset();
    const snapshot = exporter.getSnapshot();
    expect(snapshot.historyCount).toBe(0);
  });

  it('should get report', () => {
    const report = exporter.getReport();
    expect(report).toBeTruthy();
  });

  it('should export metrics', () => {
    const result = exporter.exportMetrics();
    expect(result.version).toBe('v67.0.0');
  });
});