/**
 * V65 Workflow Engine - WorkflowMonitor
 * Monitor execution with track/getMetrics/getRunning/getCompleted
 */

export interface WorkflowMetric {
  workflowId: string;
  executionId: string;
  stepCount: number;
  completedSteps: number;
  failedSteps: number;
  durationMs: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  timestamp: Date;
}

export interface MonitorConfig {
  retentionPeriod: number;
  metricsInterval: number;
  enableAlerting: boolean;
  alertThreshold: number;
}

type MonConfig = Required<MonitorConfig>;

export class WorkflowMonitor {
  private _config: MonConfig;
  private metrics: WorkflowMetric[];
  private running: Map<string, WorkflowMetric>;
  private completed: WorkflowMetric[];

  constructor(config: Partial<MonitorConfig> = {}) {
    this._config = {
      retentionPeriod: config.retentionPeriod ?? 86400000,
      metricsInterval: config.metricsInterval ?? 5000,
      enableAlerting: config.enableAlerting ?? false,
      alertThreshold: config.alertThreshold ?? 10,
    };
    this.metrics = [];
    this.running = new Map();
    this.completed = [];
  }

  get config(): MonConfig {
    return { ...this._config };
  }

  track(
    workflowId: string,
    executionId: string,
    stepCount: number
  ): WorkflowMetric {
    const metric: WorkflowMetric = {
      workflowId,
      executionId,
      stepCount,
      completedSteps: 0,
      failedSteps: 0,
      durationMs: 0,
      status: 'running',
      timestamp: new Date(),
    };
    this.metrics.push(metric);
    this.running.set(executionId, metric);
    return metric;
  }

  updateMetric(executionId: string, updates: Partial<WorkflowMetric>): void {
    const metric = this.metrics.find((m) => m.executionId === executionId);
    if (metric) {
      Object.assign(metric, updates);
      if (updates.status === 'completed' || updates.status === 'failed') {
        this.running.delete(executionId);
        this.completed.push(metric);
      }
    }
  }

  getMetrics(limit = 100): WorkflowMetric[] {
    const cutoff = Date.now() - this._config.retentionPeriod;
    return this.metrics
      .filter((m) => m.timestamp.getTime() > cutoff)
      .slice(-limit);
  }

  getRunning(): WorkflowMetric[] {
    return Array.from(this.running.values());
  }

  getCompleted(limit = 50): WorkflowMetric[] {
    return this.completed.slice(-limit);
  }

  getSnapshot(): { metrics: { total: number; running: number; completed: number } } {
    return {
      metrics: {
        total: this.metrics.length,
        running: this.running.size,
        completed: this.completed.length,
      },
    };
  }

  reset(): void {
    this.metrics = [];
    this.running.clear();
    this.completed = [];
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return `WorkflowMonitor Report: ${snap.metrics.total} total, ${snap.metrics.running} running, ${snap.metrics.completed} completed`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}
