export interface TaskSchedulerConfig {
  maxScheduled?: number;
  interval?: number;
}

export interface ScheduledTask {
  id: string;
  scheduledAt: number;
  interval?: number;
  data?: unknown;
}

export interface ScheduledHistoryEntry {
  id: string;
  executedAt: number;
  cancelled: boolean;
}

export class TaskScheduler {
  public config: TaskSchedulerConfig;
  private scheduled: Map<string, ScheduledTask> = new Map();
  private history: ScheduledHistoryEntry[] = [];

  constructor(config: TaskSchedulerConfig = {}) {
    this.config = config;
  }

  schedule(task: { id: string; delay?: number; interval?: number; data?: unknown }): boolean {
    if (this.config.maxScheduled && this.scheduled.size >= this.config.maxScheduled) {
      return false;
    }
    const scheduledAt = Date.now() + (task.delay || 0);
    this.scheduled.set(task.id, {
      id: task.id,
      scheduledAt,
      interval: task.interval,
      data: task.data,
    });
    return true;
  }

  cancel(taskId: string): boolean {
    const deleted = this.scheduled.delete(taskId);
    if (deleted) {
      this.history.push({ id: taskId, executedAt: Date.now(), cancelled: true });
    }
    return deleted;
  }

  getScheduled(): ScheduledTask[] {
    return Array.from(this.scheduled.values());
  }

  getHistory(): ScheduledHistoryEntry[] {
    return [...this.history];
  }

  getSnapshot(): { metrics: { scheduled: number; historySize: number } } {
    return { metrics: { scheduled: this.scheduled.size, historySize: this.history.length } };
  }

  reset(): void {
    this.scheduled.clear();
    this.history = [];
  }

  getReport(): string {
    return `TaskScheduler Report: scheduled=${this.scheduled.size}, history=${this.history.length}, maxScheduled=${this.config.maxScheduled || 'unlimited'}`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}