/**
 * Scheduler.ts - Task scheduler module for doc-editor V32 Iteration 2
 * Manages scheduled tasks with cron-like functionality
 */

export interface ScheduledTask {
  id: string;
  name: string;
  interval: number;
  callback: () => void;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  runCount: number;
}

export interface ScheduleOptions {
  name?: string;
  enabled?: boolean;
  immediate?: boolean;
}

export interface SchedulerMetrics {
  totalScheduled: number;
  totalCancelled: number;
  totalExecuted: number;
  totalMissed: number;
  averageInterval: number;
  activeTasks: number;
}

export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private metrics: SchedulerMetrics = {
    totalScheduled: 0,
    totalCancelled: 0,
    totalExecuted: 0,
    totalMissed: 0,
    averageInterval: 0,
    activeTasks: 0,
  };

  /**
   * Schedule a recurring task
   */
  schedule(callback: () => void, interval: number, options?: ScheduleOptions): ScheduledTask {
    const id = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const task: ScheduledTask = {
      id,
      name: options?.name ?? `Task_${id}`,
      interval,
      callback,
      enabled: options?.enabled ?? true,
      runCount: 0,
    };

    this.tasks.set(id, task);
    this.metrics.totalScheduled++;
    this.metrics.activeTasks++;
    this.updateAverageInterval();

    if (task.enabled) {
      this.startTask(task);
    }

    return task;
  }

  /**
   * Cancel a scheduled task by ID
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    this.stopTask(taskId);
    this.tasks.delete(taskId);
    this.metrics.totalCancelled++;
    this.metrics.activeTasks--;

    return true;
  }

  /**
   * Get a scheduled task by ID
   */
  getScheduled(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all scheduled tasks
   */
  getAllScheduled(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Pause a scheduled task
   */
  pause(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }
    task.enabled = false;
    this.stopTask(taskId);
    this.tasks.set(taskId, task);
    return true;
  }

  /**
   * Resume a paused task
   */
  resume(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.enabled) {
      return false;
    }
    task.enabled = true;
    this.startTask(task);
    this.tasks.set(taskId, task);
    return true;
  }

  /**
   * Get a snapshot of scheduler state
   */
  getSnapshot(): {
    tasks: Map<string, ScheduledTask>;
    metrics: SchedulerMetrics;
  } {
    return {
      tasks: new Map(this.tasks),
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset all scheduled tasks and metrics
   */
  reset(): void {
    for (const taskId of this.timers.keys()) {
      this.stopTask(taskId);
    }
    this.tasks.clear();
    this.timers.clear();
    this.metrics = {
      totalScheduled: 0,
      totalCancelled: 0,
      totalExecuted: 0,
      totalMissed: 0,
      averageInterval: 0,
      activeTasks: 0,
    };
  }

  /**
   * Generate a status report
   */
  getReport(): {
    status: 'idle' | 'active' | 'paused';
    taskCount: number;
    metrics: SchedulerMetrics;
    activeTasks: number;
    pausedTasks: number;
    upcomingTasks: ScheduledTask[];
  } {
    const active = Array.from(this.tasks.values()).filter(t => t.enabled);
    const paused = Array.from(this.tasks.values()).filter(t => !t.enabled);

    return {
      status: active.length > 0 ? 'active' : paused.length > 0 ? 'paused' : 'idle',
      taskCount: this.tasks.size,
      metrics: { ...this.metrics },
      activeTasks: active.length,
      pausedTasks: paused.length,
      upcomingTasks: active.slice(0, 5),
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): {
    timestamp: number;
    metrics: SchedulerMetrics;
    version: string;
    exportVersion: string;
  } {
    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      version: '1.0.0',
      exportVersion: 'V32-I2',
    };
  }

  private startTask(task: ScheduledTask): void {
    if (this.timers.has(task.id)) {
      return;
    }

    task.lastRun = Date.now();
    task.nextRun = Date.now() + task.interval;

    const timer = setInterval(() => {
      this.executeTask(task);
    }, task.interval);

    this.timers.set(task.id, timer);
  }

  private stopTask(taskId: string): void {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(taskId);
    }
  }

  private executeTask(task: ScheduledTask): void {
    if (!task.enabled) {
      return;
    }

    try {
      task.callback();
      task.runCount++;
      task.lastRun = Date.now();
      task.nextRun = Date.now() + task.interval;
      this.metrics.totalExecuted++;
      this.tasks.set(task.id, task);
    } catch (error) {
      console.error(`Scheduled task ${task.name} failed:`, error);
      this.metrics.totalMissed++;
    }
  }

  private updateAverageInterval(): void {
    if (this.tasks.size > 0) {
      const total = Array.from(this.tasks.values()).reduce((sum, t) => sum + t.interval, 0);
      this.metrics.averageInterval = total / this.tasks.size;
    }
  }
}

export default Scheduler;