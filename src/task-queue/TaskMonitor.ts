export interface TaskMonitorConfig {
  trackingWindow?: number;
  maxHistory?: number;
}

export interface TrackedTask {
  id: string;
  startedAt: number;
  endedAt?: number;
  status: 'running' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
}

export interface MetricsSummary {
  totalTracked: number;
  running: number;
  completed: number;
  failed: number;
  averageDuration?: number;
}

export class TaskMonitor {
  public config: TaskMonitorConfig;
  private tracked: Map<string, TrackedTask> = new Map();
  private history: TrackedTask[] = [];

  constructor(config: TaskMonitorConfig = {}) {
    this.config = config;
  }

  track(taskId: string, metadata?: Record<string, unknown>): void {
    this.tracked.set(taskId, {
      id: taskId,
      startedAt: Date.now(),
      status: 'running',
      metadata,
    });
  }

  complete(taskId: string, success: boolean = true): void {
    const task = this.tracked.get(taskId);
    if (task) {
      task.endedAt = Date.now();
      task.status = success ? 'completed' : 'failed';
      this.history.push(task);
      this.tracked.delete(taskId);
    }
  }

  getMetrics(): MetricsSummary {
    const completed = this.history.filter((t) => t.status === 'completed');
    const failed = this.history.filter((t) => t.status === 'failed');
    const durations = completed
      .filter((t) => t.endedAt)
      .map((t) => (t.endedAt as number) - t.startedAt);
    const averageDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : undefined;

    return {
      totalTracked: this.history.length,
      running: this.tracked.size,
      completed: completed.length,
      failed: failed.length,
      averageDuration,
    };
  }

  getRunning(): TrackedTask[] {
    return Array.from(this.tracked.values());
  }

  getCompleted(): TrackedTask[] {
    return this.history.filter((t) => t.status === 'completed');
  }

  getSnapshot(): { metrics: MetricsSummary } {
    return { metrics: this.getMetrics() };
  }

  reset(): void {
    this.tracked.clear();
    this.history = [];
  }

  getReport(): string {
    const m = this.getMetrics();
    return `TaskMonitor Report: total=${m.totalTracked}, running=${m.running}, completed=${m.completed}, failed=${m.failed}, avgDuration=${m.averageDuration || 'N/A'}ms`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}