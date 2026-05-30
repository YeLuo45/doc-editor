/**
 * JobQueue.ts - V93 Job Queue Manager
 * Handles job enqueuing, dequeuing, and queue management
 */

export type JobQueueConfig = {
  maxQueueSize: number;
  defaultPriority: number;
  enableFairScheduling: boolean;
  timeout: number;
  enableLogging: boolean;
};

export type QueuedJob = {
  id: string;
  name: string;
  handler: () => Promise<void>;
  priority: number;
  enqueuedAt: number;
  scheduledStart?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
};

export type JobQueueSnapshot = {
  metrics: {
    pendingJobs: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    queueUtilization: number;
  };
  timestamp: number;
};

export class JobQueue {
  config: JobQueueConfig;
  private queue: QueuedJob[] = [];
  private processingCount: number = 0;
  private completedCount: number = 0;
  private failedCount: number = 0;
  private completedJobs: Map<string, QueuedJob> = new Map();
  private failedJobs: Map<string, QueuedJob> = new Map();
  private processingJobs: Map<string, QueuedJob> = new Map();
  private jobCounter: number = 0;

  constructor(config: JobQueueConfig) {
    this.config = { ...config };
  }

  enqueue(id: string, name: string, handler: () => Promise<void>, priority?: number): QueuedJob {
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Queue is full');
    }

    const job: QueuedJob = {
      id,
      name,
      handler,
      priority: priority ?? this.config.defaultPriority,
      enqueuedAt: Date.now(),
      status: 'pending',
    };

    this.queue.push(job);
    this.jobCounter++;
    this.sortByPriority();
    return job;
  }

  dequeue(): QueuedJob | undefined {
    const job = this.queue.shift();
    if (job) {
      job.status = 'processing';
      this.processingCount++;
      this.processingJobs.set(job.id, job);
    }
    return job;
  }

  peek(): QueuedJob | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  getPending(): QueuedJob[] {
    return this.queue.filter(j => j.status === 'pending');
  }

  remove(jobId: string): boolean {
    const index = this.queue.findIndex(j => j.id === jobId);
    if (index === -1) return false;
    this.queue.splice(index, 1);
    return true;
  }

  markCompleted(jobId: string): void {
    const job = this.processingJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      this.processingCount--;
      this.completedCount++;
      this.processingJobs.delete(jobId);
      this.completedJobs.set(jobId, job);
    }
  }

  markFailed(jobId: string): void {
    const job = this.processingJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      this.processingCount--;
      this.failedCount++;
      this.processingJobs.delete(jobId);
      this.failedJobs.set(jobId, job);
    }
  }

  private sortByPriority(): void {
    if (this.config.enableFairScheduling) {
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.enqueuedAt - b.enqueuedAt;
      });
    }
  }

  clear(): void {
    this.queue = [];
    this.processingCount = 0;
  }

  getSnapshot(): JobQueueSnapshot {
    return {
      metrics: {
        pendingJobs: this.queue.filter(j => j.status === 'pending').length,
        processingJobs: this.processingCount,
        completedJobs: this.completedCount,
        failedJobs: this.failedCount,
        queueUtilization: this.queue.length / this.config.maxQueueSize,
      },
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.queue = [];
    this.processingCount = 0;
    this.completedCount = 0;
    this.failedCount = 0;
    this.jobCounter = 0;
    this.completedJobs.clear();
    this.failedJobs.clear();
    this.processingJobs.clear();
  }

  getReport(): string {
    const s = this.getSnapshot();
    return [
      '=== Job Queue Report ===',
      `Pending Jobs: ${s.metrics.pendingJobs}`,
      `Processing Jobs: ${s.metrics.processingJobs}`,
      `Completed Jobs: ${s.metrics.completedJobs}`,
      `Failed Jobs: ${s.metrics.failedJobs}`,
      `Queue Utilization: ${(s.metrics.queueUtilization * 100).toFixed(2)}%`,
      `Timestamp: ${new Date(s.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & JobQueueSnapshot['metrics'] {
    return { version: 'V93', ...this.getSnapshot().metrics };
  }
}