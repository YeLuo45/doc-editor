/**
 * JobMonitor.ts - V93 Job Monitor
 * Tracks job metrics, history, and status monitoring
 */

export type JobMonitorConfig = {
  enableMetrics: boolean;
  enableHistory: boolean;
  maxHistorySize: number;
  samplingRate: number;
  enableLogging: boolean;
};

export type JobMetric = {
  jobId: string;
  jobName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
};

export type JobMetricSummary = {
  totalTracked: number;
  completed: number;
  failed: number;
  cancelled: number;
  averageDuration: number;
  successRate: number;
};

export type JobMonitorSnapshot = {
  metrics: {
    totalTracked: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageDuration: number;
    successRate: number;
  };
  timestamp: number;
};

export class JobMonitor {
  config: JobMonitorConfig;
  private metrics: JobMetric[] = [];
  private metricCounter: number = 0;

  constructor(config: JobMonitorConfig) {
    this.config = { ...config };
  }

  track(jobId: string, jobName: string, status: JobMetric['status'] = 'started'): JobMetric {
    const metric: JobMetric = {
      jobId,
      jobName,
      startTime: Date.now(),
      status,
      progress: status === 'started' ? 0 : status === 'running' ? 50 : 100,
    };

    this.metrics.push(metric);
    this.metricCounter++;

    if (this.metrics.length > this.config.maxHistorySize) {
      this.metrics.shift();
    }

    return metric;
  }

  updateProgress(jobId: string, progress: number): boolean {
    const metric = this.metrics.find(m => m.jobId === jobId && m.status === 'running');
    if (!metric) return false;
    metric.progress = Math.min(100, Math.max(0, progress));
    return true;
  }

  complete(jobId: string, error?: string): boolean {
    const metric = this.metrics.find(m => m.jobId === jobId && m.status !== 'completed');
    if (!metric) return false;
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.status = error ? 'failed' : 'completed';
    metric.error = error;
    metric.progress = 100;
    return true;
  }

  cancel(jobId: string): boolean {
    const metric = this.metrics.find(m => m.jobId === jobId && m.status !== 'cancelled');
    if (!metric) return false;
    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.status = 'cancelled';
    return true;
  }

  getMetrics(jobId?: string): JobMetric | JobMetric[] | undefined {
    if (jobId) {
      return this.metrics.find(m => m.jobId === jobId);
    }
    return [...this.metrics];
  }

  getHistory(status?: JobMetric['status']): JobMetric[] {
    if (status) {
      return this.metrics.filter(m => m.status === status);
    }
    return [...this.metrics];
  }

  getStatus(): JobMonitorSnapshot['metrics'] {
    const summary = this.getMetricSummary();
    const active = this.metrics.filter(m => m.status === 'started' || m.status === 'running').length;
    return {
      totalTracked: summary.totalTracked,
      activeJobs: active,
      completedJobs: summary.completed,
      failedJobs: summary.failed,
      averageDuration: summary.averageDuration,
      successRate: summary.successRate,
    };
  }

  getMetricSummary(): JobMetricSummary {
    const completed = this.metrics.filter(m => m.status === 'completed');
    const failed = this.metrics.filter(m => m.status === 'failed');
    const cancelled = this.metrics.filter(m => m.status === 'cancelled');
    const completedWithDuration = completed.filter(m => m.duration !== undefined);
    const totalDuration = completedWithDuration.reduce((sum, m) => sum + (m.duration || 0), 0);

    return {
      totalTracked: this.metrics.length,
      completed: completed.length,
      failed: failed.length,
      cancelled: cancelled.length,
      averageDuration: completedWithDuration.length > 0 ? totalDuration / completedWithDuration.length : 0,
      successRate: this.metrics.length > 0 ? completed.length / this.metrics.length : 0,
    };
  }

  getSnapshot(): JobMonitorSnapshot {
    const status = this.getStatus();
    return {
      metrics: status,
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.metrics = [];
    this.metricCounter = 0;
  }

  getReport(): string {
    const s = this.getSnapshot();
    const summary = this.getMetricSummary();
    return [
      '=== Job Monitor Report ===',
      `Total Tracked: ${s.metrics.totalTracked}`,
      `Active Jobs: ${s.metrics.activeJobs}`,
      `Completed Jobs: ${s.metrics.completedJobs}`,
      `Failed Jobs: ${s.metrics.failedJobs}`,
      `Average Duration: ${s.metrics.averageDuration.toFixed(2)}ms`,
      `Success Rate: ${(s.metrics.successRate * 100).toFixed(2)}%`,
      `Timestamp: ${new Date(s.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & JobMonitorSnapshot['metrics'] {
    return { version: 'V93', ...this.getSnapshot().metrics };
  }
}