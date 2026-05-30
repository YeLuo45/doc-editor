/**
 * V134 Analyzer Executor - Executes analysis across registered analyzers
 * Manages execution context, results aggregation, and performance tracking
 */

import { Analyzer } from './Analyzer.js';
import { AnalyzerRegistry } from './AnalyzerRegistry.js';

export type ExecutorConfig = {
  concurrency: number;
  stopOnError: boolean;
  timeout: number;
};

export interface ExecutionResult {
  analyzerName: string;
  results: object[];
  duration: number;
  success: boolean;
  error?: string;
}

export interface ExecutorSnapshot {
  timestamp: number;
  config: ExecutorConfig;
  stats: {
    totalExecuted: number;
    successCount: number;
    failureCount: number;
    lastExecutedAt: number | null;
  };
}

export class AnalyzerExecutor {
  public config: ExecutorConfig;
  private registry: AnalyzerRegistry;
  private executionHistory: ExecutionResult[] = [];
  private stats = {
    totalExecuted: 0,
    successCount: 0,
    failureCount: 0,
    lastExecutedAt: null as number | null,
  };

  constructor(config: ExecutorConfig, registry: AnalyzerRegistry) {
    this.config = { ...config };
    this.registry = registry;
  }

  execute(content: string): Map<string, object[]> {
    const results = new Map<string, object[]>();

    this.registry.getAll().forEach((analyzer) => {
      try {
        const analyzerResults = analyzer.analyze(content);
        results.set(analyzer.getAnalyzer().getStats().totalAnalyzed.toString(), analyzerResults);
      } catch (error) {
        if (this.config.stopOnError) {
          throw error;
        }
      }
    });

    this.stats.totalExecuted++;
    this.stats.lastExecutedAt = Date.now();
    return results;
  }

  async run(content: string, analyzerNames?: string[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    const names = analyzerNames || Array.from((this.registry as any).analyzers.keys());

    for (const name of names) {
      const analyzer = this.registry.get(name);
      if (!analyzer) {
        results.push({
          analyzerName: name,
          results: [],
          duration: 0,
          success: false,
          error: 'Analyzer not found',
        });
        continue;
      }

      const start = Date.now();
      try {
        const analyzerResults = analyzer.analyze(content);
        results.push({
          analyzerName: name,
          results: analyzerResults,
          duration: Date.now() - start,
          success: true,
        });
        this.stats.successCount++;
      } catch (error) {
        results.push({
          analyzerName: name,
          results: [],
          duration: Date.now() - start,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        this.stats.failureCount++;
        if (this.config.stopOnError) {
          break;
        }
      }
      this.stats.totalExecuted++;
      this.stats.lastExecutedAt = Date.now();
    }

    this.executionHistory.push(...results);
    return results;
  }

  getResults(): ExecutionResult[] {
    return [...this.executionHistory];
  }

  getStats(): { totalExecuted: number; successCount: number; failureCount: number; lastExecutedAt: number | null } {
    return { ...this.stats };
  }

  getSnapshot(): ExecutorSnapshot {
    return {
      timestamp: Date.now(),
      config: { ...this.config },
      stats: { ...this.stats },
    };
  }

  reset(): void {
    this.executionHistory = [];
    this.stats.totalExecuted = 0;
    this.stats.successCount = 0;
    this.stats.failureCount = 0;
    this.stats.lastExecutedAt = null;
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return JSON.stringify({
      version: 'V134',
      timestamp: snapshot.timestamp,
      config: snapshot.config,
      stats: snapshot.stats,
      recentExecutions: this.executionHistory.slice(-10),
    }, null, 2);
  }

  exportMetrics(): { version: string; stats: object } {
    return {
      version: 'V134',
      stats: {
        ...this.stats,
        historySize: this.executionHistory.length,
      },
    };
  }
}