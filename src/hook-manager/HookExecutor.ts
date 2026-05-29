export type ExecutorConfig = {
  parallel?: boolean;
  maxConcurrency?: number;
  bailOnFirstError?: boolean;
};

export type Executor = {
  id: string;
  name: string;
  fn: Function;
  config: ExecutorConfig;
  runs: number;
  errors: number;
  lastRunAt: number;
};

export type HookExecutorConfig = {
  defaultParallel?: boolean;
  defaultMaxConcurrency?: number;
  enableStats?: boolean;
};

const defaultHookExecutorConfig: HookExecutorConfig = {
  defaultParallel: false,
  defaultMaxConcurrency: 5,
  enableStats: true,
};

export class HookExecutor {
  public config: HookExecutorConfig;
  private executors: Map<string, Executor> = new Map();
  private stats = {
    totalExecutions: 0,
    totalErrors: 0,
    averageDuration: 0,
    totalDuration: 0,
  };

  constructor(config: HookExecutorConfig = {}) {
    this.config = { ...defaultHookExecutorConfig, ...config };
  }

  execute(executorId: string, ...args: any[]): Promise<any> {
    const executor = this.executors.get(executorId);
    if (!executor) throw new Error(`Executor not found: ${executorId}`);
    this.stats.totalExecutions++;
    const start = Date.now();
    return Promise.resolve(executor.fn(...args))
      .then(result => {
        executor.runs++;
        executor.lastRunAt = Date.now();
        this.stats.totalDuration += Date.now() - start;
        this.stats.averageDuration = this.stats.totalDuration / this.stats.totalExecutions;
        return result;
      })
      .catch(err => {
        executor.errors++;
        executor.lastRunAt = Date.now();
        this.stats.totalErrors++;
        throw err;
      });
  }

  async run(executorIds: string[], ...args: any[]): Promise<any[]> {
    if (this.config.defaultParallel) {
      return Promise.all(executorIds.map(id => this.execute(id, ...args)));
    }
    const results: any[] = [];
    for (const id of executorIds) {
      const result = await this.execute(id, ...args);
      results.push(result);
    }
    return results;
  }

  addExecutor(executor: Omit<Executor, 'runs' | 'errors' | 'lastRunAt'>): string {
    const id = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.executors.set(id, {
      ...executor,
      runs: 0,
      errors: 0,
      lastRunAt: 0,
    });
    return id;
  }

  removeExecutor(executorId: string): boolean {
    return this.executors.delete(executorId);
  }

  getExecutors(): Executor[] {
    return Array.from(this.executors.values());
  }

  getStats() {
    return { ...this.stats };
  }

  getSnapshot(): { stats: typeof this.stats; executorCount: number } {
    return {
      stats: { ...this.stats },
      executorCount: this.executors.size,
    };
  }

  reset(): void {
    this.executors.clear();
    this.stats = { totalExecutions: 0, totalErrors: 0, averageDuration: 0, totalDuration: 0 };
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      'HookExecutor Report',
      `  Executors: ${snap.executorCount}`,
      `  Total executions: ${snap.stats.totalExecutions}`,
      `  Errors: ${snap.stats.totalErrors}`,
      `  Average duration: ${snap.stats.averageDuration.toFixed(2)}ms`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & typeof this.stats {
    return {
      version: 'V84-HookExecutor-1.0',
      ...this.stats,
    };
  }
}