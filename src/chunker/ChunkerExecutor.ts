/**
 * V126 ChunkerExecutor - Executes chunking operations across multiple chunkers
 * Manages concurrent execution, result collection, and execution statistics
 */

import { Chunker } from './Chunker';

export interface ExecutorConfig {
  name: string;
  maxConcurrent: number;
  timeout: number;
  onResult?: (name: string, result: unknown) => void;
}

export interface ExecutionResult {
  chunkerName: string;
  chunks: unknown[];
  duration: number;
  success: boolean;
  error?: string;
}

export interface ExecutorStats {
  totalExecuted: number;
  totalSucceeded: number;
  totalFailed: number;
  averageDuration: number;
}

export class ChunkerExecutor {
  public config: ExecutorConfig;
  private results: ExecutionResult[] = [];
  private running: boolean = false;

  constructor(config: ExecutorConfig) {
    this.config = { ...config };
  }

  /**
   * Execute a single chunker - force create a chunk from pending items
   */
  async execute(chunker: Chunker): Promise<ExecutionResult> {
    const startTime = Date.now();

    const result: ExecutionResult = {
      chunkerName: chunker.config.name,
      chunks: chunker.getAllChunks(),
      duration: Date.now() - startTime,
      success: true,
    };

    try {
      if (this.config.timeout > 0) {
        await this.delay(this.config.timeout);
      }
    } catch (e) {
      result.success = false;
      result.error = String(e);
    }

    this.results.push(result);
    if (this.config.onResult) {
      this.config.onResult(chunker.config.name, result);
    }

    return result;
  }

  /**
   * Run execution on multiple chunkers
   */
  async run(chunkers: Chunker[]): Promise<ExecutionResult[]> {
    this.running = true;
    const execResults: ExecutionResult[] = [];

    const limitedChunkers = chunkers.slice(0, this.config.maxConcurrent);

    const promises = limitedChunkers.map((c) => this.execute(c));
    const results = await Promise.allSettled(promises);

    for (const r of results) {
      if (r.status === 'fulfilled') {
        execResults.push(r.value);
      }
    }

    this.running = false;
    return execResults;
  }

  /**
   * Get all execution results
   */
  getResults(): ExecutionResult[] {
    return [...this.results];
  }

  /**
   * Get execution statistics
   */
  getStats(): ExecutorStats {
    if (this.results.length === 0) {
      return { totalExecuted: 0, totalSucceeded: 0, totalFailed: 0, averageDuration: 0 };
    }

    const succeeded = this.results.filter((r) => r.success).length;
    const failed = this.results.filter((r) => !r.success).length;
    const totalDuration = this.results.reduce((acc, r) => acc + r.duration, 0);

    return {
      totalExecuted: this.results.length,
      totalSucceeded: succeeded,
      totalFailed: failed,
      averageDuration: totalDuration / this.results.length,
    };
  }

  /**
   * Get snapshot of executor state
   */
  getSnapshot(): { metrics: ExecutorStats; running: boolean; resultCount: number } {
    return {
      metrics: this.getStats(),
      running: this.running,
      resultCount: this.results.length,
    };
  }

  /**
   * Reset executor state
   */
  reset(): void {
    this.results = [];
    this.running = false;
  }

  /**
   * Generate text report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    return [
      `ChunkerExecutor Report: ${this.config.name}`,
      `  Running: ${snap.running}`,
      `  Results collected: ${snap.resultCount}`,
      `  Total executed: ${snap.metrics.totalExecuted}`,
      `  Succeeded: ${snap.metrics.totalSucceeded}`,
      `  Failed: ${snap.metrics.totalFailed}`,
      `  Avg duration: ${snap.metrics.averageDuration.toFixed(2)}ms`,
    ].join('\n');
  }

  /**
   * Export metrics
   */
  exportMetrics(): { version: string; name: string; stats: ExecutorStats } {
    return {
      version: '1.26.0',
      name: this.config.name,
      stats: this.getStats(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}