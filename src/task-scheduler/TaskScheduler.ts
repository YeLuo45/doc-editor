/**
 * TaskScheduler.ts - V73 Task Scheduling Module
 * Handles task scheduling with cron-like expressions and one-time scheduling
 */

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ScheduledTask {
  id: string;
  name: string;
  type: string;
  scheduledAt: number;
  interval?: number;
  recurring: boolean;
  status: TaskStatus;
  result?: unknown;
  error?: string;
}

export interface SchedulerConfig {
  maxConcurrent: number;
  defaultTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}

export interface TaskHistoryEntry {
  taskId: string;
  taskName: string;
  executedAt: number;
  duration: number;
  status: TaskStatus;
  result?: unknown;
  error?: string;
}

type TaskHandler = (task: ScheduledTask) => Promise<unknown>;

export class TaskScheduler {
  public config: SchedulerConfig;
  
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private taskHistory: TaskHistoryEntry[] = [];
  private taskHandlers: Map<string, TaskHandler> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private historyLimit = 1000;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 10,
      defaultTimeout: config.defaultTimeout ?? 30000,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      enableLogging: config.enableLogging ?? true,
    };
  }

  /**
   * Schedule a task for execution
   */
  schedule(
    id: string,
    name: string,
    type: string,
    handler: TaskHandler,
    options: { at?: number; interval?: number } = {}
  ): boolean {
    if (this.scheduledTasks.has(id)) {
      return false;
    }

    const task: ScheduledTask = {
      id,
      name,
      type,
      scheduledAt: options.at ?? Date.now(),
      interval: options.interval,
      recurring: !!options.interval,
      status: 'pending',
    };

    this.scheduledTasks.set(id, task);
    this.taskHandlers.set(id, handler);

    const delay = Math.max(0, task.scheduledAt - Date.now());
    
    const timer = setTimeout(async () => {
      await this.executeTask(id);
    }, delay);

    this.timers.set(id, timer);
    
    if (this.config.enableLogging) {
      console.log(`[TaskScheduler] Scheduled task: ${name} (${id}) at ${new Date(task.scheduledAt).toISOString()}`);
    }

    return true;
  }

  /**
   * Cancel a scheduled task
   */
  cancel(id: string): boolean {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    const task = this.scheduledTasks.get(id);
    if (task) {
      task.status = 'cancelled';
      this.addToHistory({
        taskId: task.id,
        taskName: task.name,
        executedAt: Date.now(),
        duration: 0,
        status: 'cancelled',
      });
      this.scheduledTasks.delete(id);
      this.taskHandlers.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Get all scheduled tasks
   */
  getScheduled(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  /**
   * Get task execution history
   */
  getHistory(limit?: number): TaskHistoryEntry[] {
    if (limit) {
      return this.taskHistory.slice(-limit);
    }
    return [...this.taskHistory];
  }

  /**
   * Get snapshot of current scheduler state
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    const pending = Array.from(this.scheduledTasks.values()).filter(t => t.status === 'pending').length;
    const running = Array.from(this.scheduledTasks.values()).filter(t => t.status === 'running').length;
    
    return {
      metrics: {
        totalScheduled: this.scheduledTasks.size,
        pendingTasks: pending,
        runningTasks: running,
        historySize: this.taskHistory.length,
        activeTimers: this.timers.size,
      },
    };
  }

  /**
   * Reset scheduler state
   */
  reset(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.scheduledTasks.clear();
    this.taskHandlers.clear();
    this.taskHistory = [];
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== TaskScheduler Report ===',
      `Scheduled Tasks: ${snapshot.metrics.totalScheduled}`,
      `Pending: ${snapshot.metrics.pendingTasks}`,
      `Running: ${snapshot.metrics.runningTasks}`,
      `History Entries: ${snapshot.metrics.historySize}`,
      `Active Timers: ${snapshot.metrics.activeTimers}`,
      '============================',
    ];
    return lines.join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; metrics: Record<string, unknown> } {
    return {
      version: 'V73-task-scheduler',
      metrics: this.getSnapshot().metrics,
    };
  }

  private async executeTask(id: string): Promise<void> {
    const task = this.scheduledTasks.get(id);
    const handler = this.taskHandlers.get(id);
    
    if (!task || !handler) {
      return;
    }

    task.status = 'running';
    const startTime = Date.now();

    try {
      if (this.config.enableLogging) {
        console.log(`[TaskScheduler] Executing task: ${task.name} (${id})`);
      }

      const result = await handler(task);
      task.status = 'completed';
      task.result = result;

      if (task.recurring && this.timers.has(id)) {
        const nextScheduled = Date.now() + (task.interval ?? 0);
        task.scheduledAt = nextScheduled;
        
        const nextTimer = setTimeout(() => {
          this.executeTask(id);
        }, task.interval);
        
        this.timers.set(id, nextTimer);
      } else {
        this.scheduledTasks.delete(id);
        this.taskHandlers.delete(id);
        this.timers.delete(id);
      }

      this.addToHistory({
        taskId: task.id,
        taskName: task.name,
        executedAt: startTime,
        duration: Date.now() - startTime,
        status: 'completed',
        result,
      });
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      
      this.addToHistory({
        taskId: task.id,
        taskName: task.name,
        executedAt: startTime,
        duration: Date.now() - startTime,
        status: 'failed',
        error: task.error,
      });

      if (task.recurring) {
        this.scheduledTasks.delete(id);
        this.taskHandlers.delete(id);
        this.timers.delete(id);
      }
    }
  }

  private addToHistory(entry: TaskHistoryEntry): void {
    this.taskHistory.push(entry);
    if (this.taskHistory.length > this.historyLimit) {
      this.taskHistory = this.taskHistory.slice(-this.historyLimit);
    }
  }
}