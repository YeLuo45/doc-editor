/**
 * JobRunner.ts - V93 Job Runner
 * Handles job execution, stop, pause, resume, and status tracking
 */

export type JobRunnerConfig = {
  maxConcurrentJobs: number;
  defaultTimeout: number;
  enableRetries: boolean;
  maxRetries: number;
  retryDelay: number;
  enableLogging: boolean;
};

export type RunningJob = {
  id: string;
  name: string;
  startedAt: number;
  status: 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
  progress: number;
  handler: () => Promise<void>;
};

export type JobRunnerStats = {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDuration: number;
  totalDuration: number;
};

export type JobRunnerSnapshot = {
  metrics: {
    activeJobs: number;
    pausedJobs: number;
    stoppedJobs: number;
    completedJobs: number;
    failedJobs: number;
    concurrentUtilization: number;
  };
  timestamp: number;
};

export class JobRunner {
  config: JobRunnerConfig;
  private runningJobs: Map<string, RunningJob> = new Map();
  private jobCounter: number = 0;
  private totalRuns: number = 0;
  private successfulRuns: number = 0;
  private failedRuns: number = 0;
  private totalDuration: number = 0;

  constructor(config: JobRunnerConfig) {
    this.config = { ...config };
  }

  async run(id: string, name: string, handler: () => Promise<void>): Promise<void> {
    if (this.runningJobs.size >= this.config.maxConcurrentJobs) {
      throw new Error('Maximum concurrent jobs reached');
    }

    const job: RunningJob = {
      id,
      name,
      startedAt: Date.now(),
      status: 'running',
      progress: 0,
      handler,
    };

    this.runningJobs.set(id, job);
    this.totalRuns++;
    this.jobCounter++;

    const startTime = Date.now();

    try {
      await handler();
      job.status = 'completed';
      job.progress = 100;
      this.successfulRuns++;
    } catch (err) {
      job.status = 'failed';
      this.failedRuns++;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      this.totalDuration += duration;
    }
  }

  stop(jobId: string): boolean {
    const job = this.runningJobs.get(jobId);
    if (!job) return false;
    job.status = 'stopped';
    return true;
  }

  pause(jobId: string): boolean {
    const job = this.runningJobs.get(jobId);
    if (!job || job.status !== 'running') return false;
    job.status = 'paused';
    return true;
  }

  resume(jobId: string): boolean {
    const job = this.runningJobs.get(jobId);
    if (!job || job.status !== 'paused') return false;
    job.status = 'running';
    return true;
  }

  getStatus(jobId: string): RunningJob['status'] | null {
    const job = this.runningJobs.get(jobId);
    return job ? job.status : null;
  }

  getStats(): JobRunnerStats {
    const avgDuration = this.totalRuns > 0 ? this.totalDuration / this.totalRuns : 0;
    return {
      totalRuns: this.totalRuns,
      successfulRuns: this.successfulRuns,
      failedRuns: this.failedRuns,
      averageDuration: avgDuration,
      totalDuration: this.totalDuration,
    };
  }

  getRunningJob(jobId: string): RunningJob | undefined {
    return this.runningJobs.get(jobId);
  }

  getAllRunningJobs(): RunningJob[] {
    return Array.from(this.runningJobs.values());
  }

  removeJob(jobId: string): boolean {
    return this.runningJobs.delete(jobId);
  }

  getSnapshot(): JobRunnerSnapshot {
    let pausedCount = 0;
    let stoppedCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    this.runningJobs.forEach(job => {
      switch (job.status) {
        case 'paused': pausedCount++; break;
        case 'stopped': stoppedCount++; break;
        case 'completed': completedCount++; break;
        case 'failed': failedCount++; break;
      }
    });

    return {
      metrics: {
        activeJobs: this.runningJobs.size - pausedCount - stoppedCount,
        pausedJobs: pausedCount,
        stoppedJobs: stoppedCount,
        completedJobs: completedCount,
        failedJobs: failedCount,
        concurrentUtilization: this.runningJobs.size / this.config.maxConcurrentJobs,
      },
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.runningJobs.clear();
    this.jobCounter = 0;
    this.totalRuns = 0;
    this.successfulRuns = 0;
    this.failedRuns = 0;
    this.totalDuration = 0;
  }

  getReport(): string {
    const s = this.getSnapshot();
    const stats = this.getStats();
    return [
      '=== Job Runner Report ===',
      `Active Jobs: ${s.metrics.activeJobs}`,
      `Paused Jobs: ${s.metrics.pausedJobs}`,
      `Stopped Jobs: ${s.metrics.stoppedJobs}`,
      `Completed Jobs: ${s.metrics.completedJobs}`,
      `Failed Jobs: ${s.metrics.failedJobs}`,
      `Total Runs: ${stats.totalRuns}`,
      `Successful Runs: ${stats.successfulRuns}`,
      `Failed Runs: ${stats.failedRuns}`,
      `Average Duration: ${stats.averageDuration.toFixed(2)}ms`,
      `Concurrent Utilization: ${(s.metrics.concurrentUtilization * 100).toFixed(2)}%`,
      `Timestamp: ${new Date(s.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & JobRunnerSnapshot['metrics'] {
    return { version: 'V93', ...this.getSnapshot().metrics };
  }
}