/**
 * PerformanceReport.ts - Report generation with recommendations for doc-editor V22
 */

import { PerformanceProfiler } from './PerformanceProfiler';
import { MetricsCollector } from './MetricsCollector';
import { MemoryMonitor } from './MemoryMonitor';
import { RenderAnalyzer } from './RenderAnalyzer';
import { OperationProfiler } from './OperationProfiler';

export interface Recommendation {
  id: string;
  category: 'memory' | 'render' | 'operation' | 'general';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  estimatedGain?: string;
}

export interface PerformanceReportData {
  generatedAt: number;
  duration: number;
  profiler: ReturnType<PerformanceProfiler['getReport']>;
  metrics: ReturnType<MetricsCollector['exportMetrics']>;
  memory: ReturnType<MemoryMonitor['exportMetrics']>;
  render: ReturnType<RenderAnalyzer['exportMetrics']>;
  operations: ReturnType<OperationProfiler['exportMetrics']>;
  recommendations: Recommendation[];
}

export class PerformanceReport {
  private profiler: PerformanceProfiler;
  private metrics: MetricsCollector;
  private memory: MemoryMonitor;
  private render: RenderAnalyzer;
  private operations: OperationProfiler;
  private startTime: number;

  constructor(
    profiler: PerformanceProfiler,
    metrics: MetricsCollector,
    memory: MemoryMonitor,
    render: RenderAnalyzer,
    operations: OperationProfiler
  ) {
    this.profiler = profiler;
    this.metrics = metrics;
    this.memory = memory;
    this.render = render;
    this.operations = operations;
    this.startTime = Date.now();
  }

  generateReport(): PerformanceReportData {
    const recommendations = this.getRecommendations();

    return {
      generatedAt: Date.now(),
      duration: (Date.now() - this.startTime) / 1000,
      profiler: this.profiler.getReport(),
      metrics: this.metrics.exportMetrics(),
      memory: this.memory.exportMetrics(),
      render: this.render.exportMetrics(),
      operations: this.operations.exportMetrics(),
      recommendations,
    };
  }

  getRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Memory recommendations
    const memLeak = this.memory.checkMemoryLeak();
    if (memLeak.isLeaking) {
      recommendations.push({
        id: 'mem_leak_001',
        category: 'memory',
        priority: memLeak.confidence === 'high' ? 'high' : 'medium',
        title: 'Potential Memory Leak Detected',
        description: memLeak.details,
        impact: 'Memory usage is growing over time, which may lead to performance degradation',
        estimatedGain: 'Reduce memory growth rate by identifying and clearing unnecessary references',
      });
    }

    // Render recommendations
    const renderReport = this.render.getReport();
    if (renderReport.totalUpdates > 100) {
      recommendations.push({
        id: 'render_001',
        category: 'render',
        priority: 'medium',
        title: 'High Update Frequency Detected',
        description: `${renderReport.totalUpdates} updates detected`,
        impact: 'Excessive re-renders may impact responsiveness',
        estimatedGain: 'Implement memoization or virtualization to reduce update frequency',
      });
    }

    // Operation recommendations
    const opReport = this.operations.getReport();
    if (opReport.failedOperations > opReport.totalOperations * 0.1) {
      recommendations.push({
        id: 'op_001',
        category: 'operation',
        priority: 'high',
        title: 'High Operation Failure Rate',
        description: `${opReport.failedOperations} failed out of ${opReport.totalOperations} operations`,
        impact: 'Operation failures may cause data inconsistencies',
        estimatedGain: 'Investigate failure causes and implement retry logic',
      });
    }

    // Profiler recommendations
    const profReport = this.profiler.getReport();
    if (profReport.averageRenderTime > 16) {
      recommendations.push({
        id: 'perf_001',
        category: 'general',
        priority: 'medium',
        title: 'Slow Render Times Detected',
        description: `Average render time: ${profReport.averageRenderTime.toFixed(2)}ms`,
        impact: 'Render times over 16ms may cause frame drops',
        estimatedGain: 'Profile specific components to identify bottlenecks',
      });
    }

    return recommendations;
  }

  exportMetrics(): Record<string, unknown> {
    const report = this.generateReport();
    return {
      timestamp: report.generatedAt,
      duration: report.duration,
      summary: {
        totalOperations: report.operations.summary?.totalOperations || 0,
        totalMemoryUsed: report.memory.current?.heapUsed || 0,
        totalRenderUpdates: report.render.summary?.totalUpdates || 0,
        recommendationCount: report.recommendations.length,
      },
      recommendations: report.recommendations.map(r => ({
        id: r.id,
        category: r.category,
        priority: r.priority,
        title: r.title,
      })),
      fullReport: report,
    };
  }

  getSnapshot(): {
    generatedAt: number;
    recommendationCount: number;
    priorityBreakdown: Record<string, number>;
  } {
    const recs = this.getRecommendations();
    const breakdown = recs.reduce((acc, r) => {
      acc[r.priority] = (acc[r.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      generatedAt: Date.now(),
      recommendationCount: recs.length,
      priorityBreakdown: breakdown,
    };
  }

  reset(): void {
    this.startTime = Date.now();
  }

  getReport(): PerformanceReportData {
    return this.generateReport();
  }
}

export function createPerformanceReport(
  profiler: PerformanceProfiler,
  metrics: MetricsCollector,
  memory: MemoryMonitor,
  render: RenderAnalyzer,
  operations: OperationProfiler
): PerformanceReport {
  return new PerformanceReport(profiler, metrics, memory, render, operations);
}

export const defaultReport = new PerformanceReport(
  new PerformanceProfiler(),
  new MetricsCollector(),
  new MemoryMonitor(),
  new RenderAnalyzer(),
  new OperationProfiler()
);