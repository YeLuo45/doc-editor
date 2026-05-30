/**
 * FilterExecutor.ts - V110 Filter Executor
 * Executes filters with run/execute/getResults/getStats methods
 */

export type FilterExecutorConfig = {
  timeout: number;
  enableRetry: boolean;
  maxRetries: number;
  continueOnError: boolean;
};

export type FilterExecutorStatus = 'idle' | 'running' | 'completed' | 'failed' | 'timeout';

export type FilterExecutorResult = {
  filterName: string;
  success: boolean;
  data: unknown;
  error?: string;
  duration: number;
  timestamp: number;
};

export type FilterExecutorStats = {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalDuration: number;
  averageDuration: number;
  retries: number;
};

export type FilterExecutorSnapshot = {
  metrics: {
    status: FilterExecutorStatus;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    totalDuration: number;
    retries: number;
  };
  timestamp: number;
};

export class FilterExecutor {
  config: FilterExecutorConfig;
  private status: FilterExecutorStatus = 'idle';
  private totalRuns: number = 0;
  private successfulRuns: number = 0;
  private failedRuns: number = 0;
  private totalDuration: number = 0;
  private retries: number = 0;
  private results: FilterExecutorResult[] = [];

  constructor(config: FilterExecutorConfig) {
    this.config = { ...config };
  }

  execute(filter: { name: string; execute: (data: unknown) => Promise<unknown> }, data: unknown): Promise<unknown> {
    return this.executeWithRetry(filter, data, 0);
  }

  private async executeWithRetry(
    filter: { name: string; execute: (data: unknown) => Promise<unknown> },
    data: unknown,
    attempt: number
  ): Promise<unknown> {
    this.status = 'running';
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        filter.execute(data),
        this.createTimeout(this.config.timeout),
      ]);

      const duration = Date.now() - startTime;
      this.totalRuns++;
      this.successfulRuns++;
      this.totalDuration += duration;

      const execResult: FilterExecutorResult = {
        filterName: filter.name,
        success: true,
        data: result,
        duration,
        timestamp: Date.now(),
      };
      this.results.push(execResult);
      this.status = 'completed';

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (this.config.enableRetry && attempt < this.config.maxRetries) {
        this.retries++;
        return this.executeWithRetry(filter, data, attempt + 1);
      }

      this.totalRuns++;
      this.failedRuns++;
      this.totalDuration += duration;

      const execResult: FilterExecutorResult = {
        filterName: filter.name,
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : String(error),
        duration,
        timestamp: Date.now(),
      };
      this.results.push(execResult);
      this.status = this.config.continueOnError ? 'completed' : 'failed';

      if (!this.config.continueOnError) {
        throw error;
      }

      return undefined;
    }
  }

  run(filters: Array<{ name: string; execute: (data: unknown) => Promise<unknown> }>, data: unknown): Promise<unknown> {
    return this.runFilters(filters, data, 0);
  }

  private async runFilters(
    filters: Array<{ name: string; execute: (data: unknown) => Promise<unknown> }>,
    data: unknown,
    index: number
  ): Promise<unknown> {
    if (index >= filters.length) {
      return data;
    }

    const filter = filters[index];
    data = await this.execute(filter, data);

    if (this.status === 'failed' && !this.config.continueOnError) {
      return data;
    }

    return this.runFilters(filters, data, index + 1);
  }

  getResults(): FilterExecutorResult[] {
    return [...this.results];
  }

  getStats(): FilterExecutorStats {
    return {
      totalRuns: this.totalRuns,
      successfulRuns: this.successfulRuns,
      failedRuns: this.failedRuns,
      totalDuration: this.totalDuration,
      averageDuration: this.totalRuns > 0 ? this.totalDuration / this.totalRuns : 0,
      retries: this.retries,
    };
  }

  getSnapshot(): FilterExecutorSnapshot {
    return {
      metrics: {
        status: this.status,
        totalRuns: this.totalRuns,
        successfulRuns: this.successfulRuns,
        failedRuns: this.failedRuns,
        totalDuration: this.totalDuration,
        retries: this.retries,
      },
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.status = 'idle';
    this.totalRuns = 0;
    this.successfulRuns = 0;
    this.failedRuns = 0;
    this.totalDuration = 0;
    this.retries = 0;
    this.results = [];
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const stats = this.getStats();
    const lines = [
      '=== Filter Executor Report ===',
      `Status: ${snapshot.metrics.status}`,
      `Total Runs: ${snapshot.metrics.totalRuns}`,
      `Successful: ${snapshot.metrics.successfulRuns}`,
      `Failed: ${snapshot.metrics.failedRuns}`,
      `Total Duration: ${snapshot.metrics.totalDuration}ms`,
      `Average Duration: ${stats.averageDuration.toFixed(2)}ms`,
      `Retries: ${snapshot.metrics.retries}`,
      `Results Count: ${this.results.length}`,
      `Timestamp: ${new Date(snapshot.timestamp).toISOString()}`,
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } & FilterExecutorSnapshot['metrics'] {
    return {
      version: 'V110',
      ...this.getSnapshot().metrics,
    };
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timeout after ${ms}ms`)), ms);
    });
  }
}