/**
 * TaskMonitor.ts - V73 Task Monitoring Module
 * Tracks task metrics, running tasks, and completed tasks
 */

export type MonitorConfig = {
  retentionPeriod: number;
  samplingInterval: number;
  enableAlerts: boolean;
  maxTrackedTasks: number;
};

export interface TaskMetrics {
  totalTracked: number;
  currentlyRunning: number;
  completed: number;
  failed: number;
  averageDuration: number;
  successRate: number;
}

export interface TrackedTask {
  id: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  status: 'running' | 'completed' | 'failed';
  duration?: number;
  result?: unknown;
  error?: string;
}

export class TaskMonitor {
  public config: MonitorConfig;

  private trackedTasks: Map<string, TrackedTask> = new Map();
  private completedTasks: TrackedTask[] = [];
  private metrics: TaskMetrics = {
    totalTracked: 0,
    currentlyRunning: 0,
    completed: 0,
    failed: 0,
    averageDuration: 0,
    successRate: 0,
  };
  private samplingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      retentionPeriod: config.retentionPeriod ?? 3600000,
      samplingInterval: config.samplingInterval ?? 1000,
      enableAlerts: config.enableAlerts ?? true,
      maxTrackedTasks: config.maxTrackedTasks ?? 10000,
    };
  }

  /**
   * Start tracking a task
   */
  track(taskId: string, taskName: string): void {
    if (this.trackedTasks.has(taskId)) {
      return;
    }

    const task: TrackedTask = {
      id: taskId,
      name: taskName,
      startedAt: Date.now(),
      status: 'running',
    };

    this.trackedTasks.set(taskId, task);
    this.metrics.totalTracked++;
    this.metrics.currentlyRunning++;

    const samplingId = setInterval(() => {
      this.sampleTask(taskId);
    }, this.config.samplingInterval);

    this.samplingIntervals.set(taskId, samplingId);
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): TaskMetrics {
    this.recalculateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get all currently running tasks
   */
  getRunning(): TrackedTask[] {
    return Array.from(this.trackedTasks.values()).filter(t => t.status === 'running');
  }

  /**
   * Get all completed tasks
   */
  getCompleted(limit?: number): TrackedTask[] {
    const completed = this.completedTasks.filter(t => t.status === 'completed');
    if (limit) {
      return completed.slice(-limit);
    }
    return completed;
  }

  /**
   * Get snapshot of monitor state
   */
  getSnapshot(): { metrics: TaskMetrics } {
    this.recalculateMetrics();
    return {
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset monitor state
   */
  reset(): void {
    for (const interval of this.samplingIntervals.values()) {
      clearInterval(interval);
    }
    this.samplingIntervals.clear();
    this.trackedTasks.clear();
    this.completedTasks = [];
    this.metrics = {
      totalTracked: 0,
      currentlyRunning: 0,
      completed: 0,
      failed: 0,
      averageDuration: 0,
      successRate: 0,
    };
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const m = this.getMetrics();
    const lines = [
      '=== TaskMonitor Report ===',
      `Total Tracked: ${m.totalTracked}`,
      `Running: ${m.currentlyRunning}`,
      `Completed: ${m.completed}`,
      `Failed: ${m.failed}`,
      `Avg Duration: ${m.averageDuration.toFixed(2)}ms`,
      `Success Rate: ${(m.successRate * 100).toFixed(2)}%`,
      '==========================',
    ];
    return lines.join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; metrics: TaskMetrics } {
    return {
      version: 'V73-task-monitor',
      metrics: this.getMetrics(),
    };
  }

  /**
   * Complete a tracked task
   */
  complete(taskId: string, result?: unknown): void {
    this.finalizeTask(taskId, 'completed', result);
  }

  /**
   * Fail a tracked task
   */
  fail(taskId: string, error?: string): void {
    this.finalizeTask(taskId, 'failed', undefined, error);
  }

  private finalizeTask(taskId: string, status: 'completed' | 'failed', result?: unknown, error?: string): void {
    const interval = this.samplingIntervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.samplingIntervals.delete(taskId);
    }

    const task = this.trackedTasks.get(taskId);
    if (task) {
      task.status = status;
      task.endedAt = Date.now();
      task.duration = task.endedAt - task.startedAt;
      task.result = result;
      task.error = error;

      this.trackedTasks.delete(taskId);
      this.completedTasks.push(task);

      if (this.completedTasks.length > this.config.maxTrackedTasks) {
        this.completedTasks = this.completedTasks.slice(-this.config.maxTrackedTasks);
      }

      if (status === 'completed') {
        this.metrics.completed++;
      } else {
        this.metrics.failed++;
      }
      this.metrics.currentlyRunning = this.trackedTasks.size;
    }
  }

  private sampleTask(taskId: string): void {
    const task = this.trackedTasks.get(taskId);
    if (task) {
      const elapsed = Date.now() - task.startedAt;
      if (elapsed > this.config.retentionPeriod) {
        this.finalizeTask(taskId, 'failed', undefined, 'Task exceeded retention period');
      }
    }
  }

  private recalculateMetrics(): void {
    if (this.completedTasks.length === 0) {
      return;
    }

    const durations = this.completedTasks
      .filter(t => t.duration !== undefined)
      .map(t => t.duration as number);

    if (durations.length > 0) {
      this.metrics.averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    const completed = this.completedTasks.filter(t => t.status === 'completed').length;
    const total = this.completedTasks.length;
    this.metrics.successRate = total > 0 ? completed / total : 0;
  }
}