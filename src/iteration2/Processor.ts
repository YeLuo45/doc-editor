/**
 * Processor.ts - Core processor module for doc-editor V32 Iteration 2
 * Handles document processing operations with enhanced tracking
 */

export interface ProcessTask {
  id: string;
  input: unknown;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  priority: number;
  result?: unknown;
  error?: string;
}

export interface ProcessOptions {
  priority?: number;
  timeout?: number;
  retries?: number;
}

export interface ProcessorMetrics {
  totalProcessed: number;
  totalFailed: number;
  totalPending: number;
  averageProcessTime: number;
  peakConcurrency: number;
}

export class Processor {
  private tasks: Map<string, ProcessTask> = new Map();
  private metrics: ProcessorMetrics = {
    totalProcessed: 0,
    totalFailed: 0,
    totalPending: 0,
    averageProcessTime: 0,
    peakConcurrency: 0,
  };
  private currentConcurrency = 0;

  /**
   * Run a processing task with the given input
   */
  run(input: unknown, options?: ProcessOptions): ProcessTask {
    const id = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const task: ProcessTask = {
      id,
      input,
      status: 'pending',
      priority: options?.priority ?? 0,
    };

    this.tasks.set(id, task);
    this.metrics.totalPending++;
    this.currentConcurrency++;
    
    if (this.currentConcurrency > this.metrics.peakConcurrency) {
      this.metrics.peakConcurrency = this.currentConcurrency;
    }

    setTimeout(() => {
      this.process(id);
    }, 0);

    return task;
  }

  /**
   * Process a specific task by ID
   */
  process(taskId: string): ProcessTask | undefined {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return undefined;
    }

    task.status = 'running';
    task.startTime = Date.now();
    this.metrics.totalPending--;
    this.tasks.set(taskId, task);

    try {
      const processingTime = 10 + Math.random() * 20;
      setTimeout(() => {
        task.status = 'completed';
        task.endTime = Date.now();
        task.result = { processed: true, data: task.input };
        this.metrics.totalProcessed++;
        this.currentConcurrency--;
        this.updateAverageProcessTime();
        this.tasks.set(taskId, task);
      }, processingTime);
    } catch (error) {
      task.status = 'failed';
      task.endTime = Date.now();
      task.error = error instanceof Error ? error.message : String(error);
      this.metrics.totalFailed++;
      this.currentConcurrency--;
      this.tasks.set(taskId, task);
    }

    return task;
  }

  /**
   * Get the status of a specific task
   */
  getStatus(taskId: string): ProcessTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get a snapshot of current processor state
   */
  getSnapshot(): {
    tasks: Map<string, ProcessTask>;
    metrics: ProcessorMetrics;
    concurrency: number;
  } {
    return {
      tasks: new Map(this.tasks),
      metrics: { ...this.metrics },
      concurrency: this.currentConcurrency,
    };
  }

  /**
   * Reset all tasks and metrics
   */
  reset(): void {
    this.tasks.clear();
    this.metrics = {
      totalProcessed: 0,
      totalFailed: 0,
      totalPending: 0,
      averageProcessTime: 0,
      peakConcurrency: 0,
    };
    this.currentConcurrency = 0;
  }

  /**
   * Generate a detailed status report
   */
  getReport(): {
    status: 'idle' | 'active' | 'overloaded';
    taskCount: number;
    metrics: ProcessorMetrics;
    pendingTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
  } {
    const pending = Array.from(this.tasks.values()).filter(t => t.status === 'pending').length;
    const running = Array.from(this.tasks.values()).filter(t => t.status === 'running').length;
    const completed = Array.from(this.tasks.values()).filter(t => t.status === 'completed').length;
    const failed = Array.from(this.tasks.values()).filter(t => t.status === 'failed').length;

    return {
      status: this.currentConcurrency > 10 ? 'overloaded' : running > 0 ? 'active' : 'idle',
      taskCount: this.tasks.size,
      metrics: { ...this.metrics },
      pendingTasks: pending,
      runningTasks: running,
      completedTasks: completed,
      failedTasks: failed,
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): {
    timestamp: number;
    metrics: ProcessorMetrics;
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

  private updateAverageProcessTime(): void {
    const total = this.metrics.totalProcessed + this.metrics.totalFailed;
    if (total > 0) {
      this.metrics.averageProcessTime = (this.metrics.averageProcessTime * (total - 1) + 15) / total;
    }
  }
}

export default Processor;