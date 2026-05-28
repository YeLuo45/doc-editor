/**
 * Performance Module
 * Exports PerfProfiler, MetricsDashboard, RealTimeMonitor, and AlertManager
 */

export { PerfProfiler, defaultProfiler } from './PerfProfiler';
export type { ProfilerMetric, ProfilerRecord, ProfilerSummary } from './PerfProfiler';

export { MetricsDashboard, defaultDashboard } from './MetricsDashboard';
export type { ModuleCategory, ModuleKPI, CategoryKPI, DashboardSnapshot } from './MetricsDashboard';

export { RealTimeMonitor, defaultMonitor } from './RealTimeMonitor';
export type { MonitorSample, MonitorCallback, MonitorConfig } from './RealTimeMonitor';

export { AlertManager, defaultAlertManager } from './AlertManager';
export type { AlertLevel, AlertThreshold, Alert, AlertConfig } from './AlertManager';