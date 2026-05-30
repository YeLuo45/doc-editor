/**
 * V137 IntegratorExecutor Module
 * Executor for running integrations across multiple integrators
 */

import { Integrator, IntegratorConfig, IntegratorStats, IntegrationResult } from './Integrator';
import { IntegratorRegistry } from './IntegratorRegistry';

export interface ExecutorConfig {
  name: string;
  version: string;
  parallel: boolean;
  concurrency: number;
  failFast: boolean;
}

export interface ExecutionResult {
  integratorId: string;
  result: IntegrationResult;
}

export interface ExecutorStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  lastExecution?: ExecutionResult;
}

export class IntegratorExecutor {
  private registry: IntegratorRegistry;
  private config: ExecutorConfig;
  private stats: ExecutorStats;
  private results: ExecutionResult[] = [];
  private lastSnapshot: { metrics: ExecutorStats } | null = null;

  constructor(registry: IntegratorRegistry, config: Partial<ExecutorConfig> = {}) {
    this.registry = registry;
    this.config = {
      name: config.name ?? 'DefaultExecutor',
      version: config.version ?? '1.0.0',
      parallel: config.parallel ?? true,
      concurrency: config.concurrency ?? 5,
      failFast: config.failFast ?? false,
    };

    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
    };
  }

  /**
   * Execute integration for a specific integrator
   */
  async execute(integratorId: string, data: unknown): Promise<ExecutionResult | null> {
    const integrator = this.registry.get(integratorId);
    if (!integrator) {
      return null;
    }

    this.stats.totalExecutions++;
    const result = await integrator.integrate(data);

    const executionResult: ExecutionResult = {
      integratorId,
      result,
    };

    this.results.push(executionResult);
    this.stats.lastExecution = executionResult;

    if (result.success) {
      this.stats.successfulExecutions++;
    } else {
      this.stats.failedExecutions++;
    }

    this.updateAverageDuration(result.duration);
    return executionResult;
  }

  /**
   * Run integrations across all registered integrators
   */
  async run(data: unknown): Promise<ExecutionResult[]> {
    const integrators = this.registry.getAll();

    if (this.config.parallel) {
      const promises = integrators.map((integrator) =>
        this.execute(integrator.config.id, data)
      );
      const results = await Promise.all(promises);
      return results.filter((r): r is ExecutionResult => r !== null);
    } else {
      const results: ExecutionResult[] = [];
      for (const integrator of integrators) {
        const result = await this.execute(integrator.config.id, data);
        if (result) {
          results.push(result);
          if (this.config.failFast && !result.result.success) {
            break;
          }
        }
      }
      return results;
    }
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
    return { ...this.stats };
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): { metrics: ExecutorStats } {
    this.lastSnapshot = { metrics: this.getStats() };
    return this.lastSnapshot;
  }

  /**
   * Reset all statistics and results
   */
  reset(): void {
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      lastExecution: undefined,
    };
    this.results = [];
    this.lastSnapshot = null;
  }

  /**
   * Generate a status report
   */
  getReport(): string {
    const successRate =
      this.stats.totalExecutions > 0
        ? ((this.stats.successfulExecutions / this.stats.totalExecutions) * 100).toFixed(2)
        : '0.00';

    return [
      `=== Integrator Executor Report ===`,
      `Name: ${this.config.name}`,
      `Version: ${this.config.version}`,
      `Parallel: ${this.config.parallel}`,
      `Concurrency: ${this.config.concurrency}`,
      `Fail Fast: ${this.config.failFast}`,
      `Total Executions: ${this.stats.totalExecutions}`,
      `Successful: ${this.stats.successfulExecutions}`,
      `Failed: ${this.stats.failedExecutions}`,
      `Success Rate: ${successRate}%`,
      `Average Duration: ${this.stats.averageDuration.toFixed(2)}ms`,
    ].join('\n');
  }

  /**
   * Export metrics in standard format
   */
  exportMetrics(): { version: string; metrics: ExecutorStats; config: ExecutorConfig } {
    return {
      version: '1.0.0',
      metrics: this.getStats(),
      config: this.config,
    };
  }

  private updateAverageDuration(newDuration: number): void {
    const total =
      this.stats.averageDuration * (this.stats.totalExecutions - 1) + newDuration;
    this.stats.averageDuration = total / this.stats.totalExecutions;
  }
}