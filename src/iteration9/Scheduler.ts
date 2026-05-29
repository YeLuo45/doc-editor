/**
 * Scheduler - Task scheduling module for V39 Iteration 9
 * Manages task scheduling, cancellation, and scheduled task retrieval
 */

export interface ScheduledTask {
  id: string;
  name: string;
  scheduledAt: number;
  interval?: number;
  recurring: boolean;
  taskFn: () => Promise<unknown>;
}

export interface SchedulerConfig {
  maxScheduledTasks: number;
  defaultTimeout: number;
  enableRecurring: boolean;
}

export interface SchedulerState {
  isRunning: boolean;
  scheduledTasks: Map<string, ScheduledTask>;
  executedCount: number;
  lastExecution: number | null;
  errors: string[];
}

export interface SchedulerMetrics {
  totalScheduled: number;
  activeTasks: number;
  executedCount: number;
  lastExecution: number | null;
  uptime: number;
}

export class Scheduler {
  private config: SchedulerConfig;
  private state: SchedulerState;
  private startTime: number;
  private timers: Map<string, NodeJS.Timeout>;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      maxScheduledTasks: config.maxScheduledTasks ?? 100,
      defaultTimeout: config.defaultTimeout ?? 60000,
      enableRecurring: config.enableRecurring ?? true,
    };
    this.state = {
      isRunning: false,
      scheduledTasks: new Map(),
      executedCount: 0,
      lastExecution: null,
      errors: [],
    };
    this.startTime = Date.now();
    this.timers = new Map();
  }

  /**
   * Schedule a new task
   */
  schedule(task: Omit<ScheduledTask, 'id' | 'scheduledAt' | 'recurring'>): ScheduledTask | null {
    if (this.state.scheduledTasks.size >= this.config.maxScheduledTasks) {
      this.state.errors.push(`Maximum tasks (${this.config.maxScheduledTasks}) reached`);
      return null;
    }

    const scheduledTask: ScheduledTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: task.name,
      scheduledAt: Date.now(),
      interval: task.interval,
      recurring: !!task.interval && this.config.enableRecurring,
      taskFn: task.taskFn,
    };

    this.state.scheduledTasks.set(scheduledTask.id, scheduledTask);
    this.state.isRunning = true;

    if (scheduledTask.recurring && scheduledTask.interval) {
      this.setupRecurringTask(scheduledTask);
    }

    return scheduledTask;
  }

  /**
   * Cancel a scheduled task
   */
  cancel(taskId: string): boolean {
    const task = this.state.scheduledTasks.get(taskId);
    if (!task) {
      return false;
    }

    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }

    this.state.scheduledTasks.delete(taskId);

    if (this.state.scheduledTasks.size === 0) {
      this.state.isRunning = false;
    }

    return true;
  }

  /**
   * Get all scheduled tasks
   */
  getScheduled(): ScheduledTask[] {
    return Array.from(this.state.scheduledTasks.values());
  }

  /**
   * Get snapshot of current scheduler state
   */
  getSnapshot(): SchedulerState & { metrics: SchedulerMetrics } {
    return {
      ...this.state,
      metrics: this.exportMetrics(),
    };
  }

  /**
   * Reset scheduler to initial state
   */
  reset(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.state = {
      isRunning: false,
      scheduledTasks: new Map(),
      executedCount: 0,
      lastExecution: null,
      errors: [],
    };
    this.startTime = Date.now();
  }

  /**
   * Get formatted report
   */
  getReport(): string {
    const metrics = this.exportMetrics();
    return [
      '=== Scheduler Report ===',
      `Running: ${this.state.isRunning}`,
      `Scheduled Tasks: ${this.state.scheduledTasks.size}`,
      `Executed Count: ${this.state.executedCount}`,
      `Last Execution: ${this.state.lastExecution ? new Date(this.state.lastExecution).toISOString() : 'Never'}`,
      `Total Uptime: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`,
      `Errors: ${this.state.errors.length > 0 ? this.state.errors.join('; ') : 'None'}`,
    ].join('\n');
  }

  /**
   * Export scheduler metrics
   */
  exportMetrics(): SchedulerMetrics {
    return {
      totalScheduled: this.state.scheduledTasks.size,
      activeTasks: this.timers.size,
      executedCount: this.state.executedCount,
      lastExecution: this.state.lastExecution,
      uptime: Date.now() - this.startTime,
    };
  }

  private setupRecurringTask(task: ScheduledTask): void {
    if (!task.interval) return;

    const runTask = async () => {
      try {
        await task.taskFn();
        this.state.executedCount++;
        this.state.lastExecution = Date.now();
      } catch (error) {
        this.state.errors.push(
          `Task ${task.id} failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    };

    const timer = setInterval(() => {
      runTask();
    }, task.interval);

    this.timers.set(task.id, timer);
  }

  /**
   * Execute a specific scheduled task immediately
   */
  async executeNow(taskId: string): Promise<unknown | null> {
    const task = this.state.scheduledTasks.get(taskId);
    if (!task) {
      return null;
    }

    try {
      const result = await task.taskFn();
      this.state.executedCount++;
      this.state.lastExecution = Date.now();
      return result;
    } catch (error) {
      this.state.errors.push(
        `Immediate execution of ${taskId} failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.state.errors = [];
  }

  /**
   * Get scheduler configuration
   */
  getConfig(): SchedulerConfig {
    return { ...this.config };
  }
}

export default Scheduler;