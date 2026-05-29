/**
 * TaskExecutor.ts - V73 Task Execution Module
 * Manages task execution lifecycle with pause/resume/cancel support
 */

export type ExecutorStatus = 'idle' | 'running' | 'paused' | 'stopped';

export interface ExecutionContext {
  taskId: string;
  taskName: string;
  startedAt: number;
  metadata: Record<string, unknown>;
}

export interface ExecutorConfig {
  maxConcurrent: number;
  defaultTimeout: number;
  enableRetry: boolean;
  healthCheckInterval: number;
}

interface ExecutorMetrics {
  totalExecuted: number;
  currentlyRunning: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  paused: number;
}

interface RunningTask {
  context: ExecutionContext;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeoutId: NodeJS.Timeout;
}

export class TaskExecutor {
  public config: ExecutorConfig;
  
  private status: ExecutorStatus = 'idle';
  private runningTasks: Map<string, RunningTask> = new Map();
  private completedTasks: ExecutionContext[] = [];
  private metrics: ExecutorMetrics = {
    totalExecuted: 0,
    currentlyRunning: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
    paused: 0,
  };
  private historyLimit = 500;

  constructor(config: Partial<ExecutorConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 5,
      defaultTimeout: config.defaultTimeout ?? 60000,
      enableRetry: config.enableRetry ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 5000,
    };
  }

  /**
   * Execute a task
   */
  async execute(
    taskId: string,
    taskName: string,
    handler: () => Promise<unknown>,
    options: { timeout?: number; metadata?: Record<string, unknown> } = {}
  ): Promise<unknown> {
    if (this.status === 'stopped') {
      throw new Error('Executor is stopped');
    }

    if (this.runningTasks.size >= this.config.maxConcurrent) {
      throw new Error('Max concurrent tasks reached');
    }

    const timeout = options.timeout ?? this.config.defaultTimeout;
    const context: ExecutionContext = {
      taskId,
      taskName,
      startedAt: Date.now(),
      metadata: options.metadata ?? {},
    };

    if (this.status !== 'paused') {
      this.status = 'running';
    }
    this.metrics.totalExecuted++;
    this.metrics.currentlyRunning++;

    return new Promise<unknown>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.handleTaskTimeout(taskId);
        reject(new Error('Task timed out'));
      }, timeout);

      this.runningTasks.set(taskId, {
        context,
        resolve,
        reject,
        timeoutId,
      });

      // Execute the handler
      handler()
        .then((result) => {
          clearTimeout(timeoutId);
          context.metadata['completedAt'] = Date.now();
          context.metadata['success'] = true;
          this.metrics.succeeded++;
          this.metrics.currentlyRunning = Math.max(0, this.metrics.currentlyRunning - 1);
          this.addToHistory(context);
          this.runningTasks.delete(taskId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          context.metadata['completedAt'] = Date.now();
          context.metadata['success'] = false;
          context.metadata['error'] = error instanceof Error ? error.message : String(error);
          this.metrics.failed++;
          this.metrics.currentlyRunning = Math.max(0, this.metrics.currentlyRunning - 1);
          this.addToHistory(context);
          this.runningTasks.delete(taskId);
          reject(error);
        });
    });
  }

  /**
   * Pause task execution
   */
  pause(): boolean {
    if (this.status !== 'running') {
      return false;
    }
    this.status = 'paused';
    this.metrics.paused++;
    return true;
  }

  /**
   * Resume task execution
   */
  resume(): boolean {
    if (this.status !== 'paused') {
      return false;
    }
    this.status = 'running';
    return true;
  }

  /**
   * Cancel a running task
   */
  cancel(taskId: string): boolean {
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      clearTimeout(runningTask.timeoutId);
      runningTask.reject(new Error('Task cancelled'));
      this.runningTasks.delete(taskId);
      this.metrics.currentlyRunning = Math.max(0, this.metrics.currentlyRunning - 1);
      this.metrics.cancelled++;
      return true;
    }
    return false;
  }

  /**
   * Get current executor status
   */
  getStatus(): ExecutorStatus {
    return this.status;
  }

  /**
   * Get snapshot of executor state
   */
  getSnapshot(): { metrics: ExecutorMetrics } {
    return {
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset executor state
   */
  reset(): void {
    for (const task of this.runningTasks.values()) {
      clearTimeout(task.timeoutId);
      task.reject(new Error('Executor reset'));
    }
    this.runningTasks.clear();
    this.completedTasks = [];
    this.status = 'idle';
    this.metrics = {
      totalExecuted: 0,
      currentlyRunning: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      paused: 0,
    };
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const lines = [
      '=== TaskExecutor Report ===',
      `Status: ${this.status}`,
      `Running: ${this.metrics.currentlyRunning}/${this.config.maxConcurrent}`,
      `Total Executed: ${this.metrics.totalExecuted}`,
      `Succeeded: ${this.metrics.succeeded}`,
      `Failed: ${this.metrics.failed}`,
      `Cancelled: ${this.metrics.cancelled}`,
      `Paused: ${this.metrics.paused}`,
      '===========================',
    ];
    return lines.join('\n');
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; metrics: ExecutorMetrics } {
    return {
      version: 'V73-task-executor',
      metrics: { ...this.metrics },
    };
  }

  private handleTaskTimeout(taskId: string): void {
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      this.runningTasks.delete(taskId);
      this.metrics.currentlyRunning = Math.max(0, this.metrics.currentlyRunning - 1);
      this.metrics.failed++;
      
      runningTask.context.metadata['timedOut'] = true;
      this.addToHistory(runningTask.context);
    }
  }

  private addToHistory(context: ExecutionContext): void {
    this.completedTasks.push(context);
    if (this.completedTasks.length > this.historyLimit) {
      this.completedTasks = this.completedTasks.slice(-this.historyLimit);
    }
  }
}