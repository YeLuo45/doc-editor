export interface TaskProcessorConfig {
  maxWorkers?: number;
  concurrency?: number;
  retryDelay?: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration?: number;
}

export class TaskProcessor {
  public config: TaskProcessorConfig;
  private workers: Map<string, boolean> = new Map();
  private stats = { processed: 0, failed: 0, running: 0 };

  constructor(config: TaskProcessorConfig = {}) {
    this.config = config;
  }

  async process<T>(task: { id: string; data: T }, handler: (data: T) => Promise<unknown>): Promise<TaskResult> {
    const workerId = `worker-${this.workers.size + 1}`;
    this.workers.set(workerId, true);
    this.stats.running++;

    const start = Date.now();
    try {
      const result = await handler(task.data);
      this.stats.processed++;
      return { taskId: task.id, success: true, result, duration: Date.now() - start };
    } catch (error) {
      this.stats.failed++;
      return { taskId: task.id, success: false, error: String(error), duration: Date.now() - start };
    } finally {
      this.workers.delete(workerId);
      this.stats.running--;
    }
  }

  getStats(): { processed: number; failed: number; running: number } {
    return { ...this.stats };
  }

  getWorkers(): { id: string; active: boolean }[] {
    return Array.from(this.workers.entries()).map(([id]) => ({ id, active: true }));
  }

  getStatus(): string {
    return this.stats.running > 0 ? 'busy' : 'idle';
  }

  getSnapshot(): { metrics: { processed: number; failed: number; running: number; workers: number } } {
    return {
      metrics: {
        processed: this.stats.processed,
        failed: this.stats.failed,
        running: this.stats.running,
        workers: this.workers.size,
      },
    };
  }

  reset(): void {
    this.workers.clear();
    this.stats = { processed: 0, failed: 0, running: 0 };
  }

  getReport(): string {
    return `TaskProcessor Report: processed=${this.stats.processed}, failed=${this.stats.failed}, running=${this.stats.running}, workers=${this.workers.size}`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}