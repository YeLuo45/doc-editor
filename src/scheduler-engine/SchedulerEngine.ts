/**
 * SchedulerEngine.ts - V93 Scheduler Engine Core
 * Handles job scheduling, cancellation, and scheduled job management
 */

export type SchedulerConfig = {
  maxScheduledJobs: number;
  defaultTimeout: number;
  enableHistory: boolean;
  maxHistorySize: number;
  enableLogging: boolean;
};

export type ScheduledJob = {
  id: string;
  name: string;
  handler: () => Promise<void>;
  scheduledAt: number;
  interval?: number;
  repeat: boolean;
  status: 'pending' | 'active' | 'cancelled' | 'completed';
  createdAt: number;
};

export type ScheduledJobHistory = {
  jobId: string;
  executedAt: number;
  duration: number;
  success: boolean;
  error?: string;
};

export type SchedulerEngineSnapshot = {
  metrics: {
    totalScheduledJobs: number;
    activeJobs: number;
    pendingJobs: number;
    cancelledJobs: number;
    historySize: number;
  };
  timestamp: number;
};

export class SchedulerEngine {
  config: SchedulerConfig;
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private history: ScheduledJobHistory[] = [];
  private jobCounter: number = 0;

  constructor(config: SchedulerConfig) {
    this.config = { ...config };
  }

  schedule(id: string, name: string, handler: () => Promise<void>, scheduledAt: number, interval?: number): ScheduledJob {
    if (this.scheduledJobs.size >= this.config.maxScheduledJobs) {
      throw new Error('Maximum number of scheduled jobs reached');
    }

    const job: ScheduledJob = {
      id,
      name,
      handler,
      scheduledAt,
      interval,
      repeat: interval !== undefined && interval > 0,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.scheduledJobs.set(id, job);
    this.jobCounter++;
    return job;
  }

  cancel(jobId: string): boolean {
    const job = this.scheduledJobs.get(jobId);
    if (!job) return false;
    job.status = 'cancelled';
    return true;
  }

  getScheduled(jobId?: string): ScheduledJob | ScheduledJob[] | undefined {
    if (jobId) {
      return this.scheduledJobs.get(jobId);
    }
    return Array.from(this.scheduledJobs.values());
  }

  getHistory(jobId?: string): ScheduledJobHistory[] {
    if (jobId) {
      return this.history.filter(h => h.jobId === jobId);
    }
    return [...this.history];
  }

  recordExecution(jobId: string, duration: number, success: boolean, error?: string): void {
    if (!this.config.enableHistory) return;
    
    this.history.push({
      jobId,
      executedAt: Date.now(),
      duration,
      success,
      error,
    });

    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }

  getNextScheduledTime(): number | null {
    let nextTime: number | null = null;
    this.scheduledJobs.forEach(job => {
      if (job.status === 'pending' && (nextTime === null || job.scheduledAt < nextTime)) {
        nextTime = job.scheduledAt;
      }
    });
    return nextTime;
  }

  getSnapshot(): SchedulerEngineSnapshot {
    let activeCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    this.scheduledJobs.forEach(job => {
      if (job.status === 'active') activeCount++;
      else if (job.status === 'pending') pendingCount++;
      else if (job.status === 'cancelled') cancelledCount++;
    });

    return {
      metrics: {
        totalScheduledJobs: this.scheduledJobs.size,
        activeJobs: activeCount,
        pendingJobs: pendingCount,
        cancelledJobs: cancelledCount,
        historySize: this.history.length,
      },
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.scheduledJobs.clear();
    this.history = [];
    this.jobCounter = 0;
  }

  getReport(): string {
    const s = this.getSnapshot();
    return [
      '=== Scheduler Engine Report ===',
      `Total Scheduled Jobs: ${s.metrics.totalScheduledJobs}`,
      `Active Jobs: ${s.metrics.activeJobs}`,
      `Pending Jobs: ${s.metrics.pendingJobs}`,
      `Cancelled Jobs: ${s.metrics.cancelledJobs}`,
      `History Size: ${s.metrics.historySize}`,
      `Next Scheduled Time: ${this.getNextScheduledTime() ? new Date(this.getNextScheduledTime()!).toISOString() : 'N/A'}`,
      `Timestamp: ${new Date(s.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & SchedulerEngineSnapshot['metrics'] {
    return { version: 'V93', ...this.getSnapshot().metrics };
  }
}