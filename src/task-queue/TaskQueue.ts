export interface TaskQueueConfig {
  maxSize?: number;
  retryAttempts?: number;
  timeout?: number;
}

export interface Task<T = unknown> {
  id: string;
  data: T;
  priority?: number;
  createdAt: number;
  attempts?: number;
}

export class TaskQueue<T = unknown> {
  private queue: Task<T>[] = [];
  public config: TaskQueueConfig;

  constructor(config: TaskQueueConfig = {}) {
    this.config = config;
  }

  enqueue(task: Task<T>): boolean {
    if (this.config.maxSize && this.queue.length >= this.config.maxSize) {
      return false;
    }
    this.queue.push(task);
    this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return true;
  }

  dequeue(): Task<T> | undefined {
    return this.queue.shift();
  }

  peek(): Task<T> | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  getPending(): Task<T>[] {
    return [...this.queue];
  }

  getSnapshot(): { metrics: { size: number; pending: number } } {
    return { metrics: { size: this.queue.length, pending: this.queue.length } };
  }

  reset(): void {
    this.queue = [];
  }

  getReport(): string {
    return `TaskQueue Report: size=${this.queue.length}, maxSize=${this.config.maxSize || 'unlimited'}`;
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}