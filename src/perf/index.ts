/**
 * Performance profiling modules for doc-editor V22
 */

// Core profiler
export { PerformanceProfiler, defaultProfiler, ProfilerSnapshot, ProfilerConfig } from './PerformanceProfiler';

// Metrics collection
export { MetricsCollector, defaultMetricsCollector, MetricRecord, PercentileResult, MetricsReport } from './MetricsCollector';

// Memory monitoring
export { MemoryMonitor, defaultMemoryMonitor, MemorySnapshot, MemoryLeakResult, MemoryStats } from './MemoryMonitor';

// Render analysis
export { RenderAnalyzer, defaultRenderAnalyzer, RenderEvent, ComponentRenderStats, RenderReport } from './RenderAnalyzer';

// Operation profiling
export { OperationProfiler, defaultOperationProfiler, OperationRecord, OperationStats, OperationReport, OperationType } from './OperationProfiler';

// Report generation
export { PerformanceReport, defaultReport, createPerformanceReport, Recommendation, PerformanceReportData } from './PerformanceReport';