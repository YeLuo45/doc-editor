/**
 * MiddlewareExecutor.ts
 * V85 Middleware Executor - Executes middleware chains with error handling
 * Provides execution context and status tracking
 */

import { MiddlewareFn } from './MiddlewareStack';

export type ExecutorConfig = {
  maxConcurrent?: number;
  retryAttempts?: number;
  retryDelay?: number;
  context?: Record<string, unknown>;
};

export interface ExecutionContext {
  id: string;
  startedAt: number;
  completedAt?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: Error;
  middleware: string[];
}

export interface ExecutorStatus {
  active: number;
  completed: number;
  failed: number;
  pending: number;
}

export interface ExecutorSnapshot {
  timestamp: number;
  status: ExecutorStatus;
  contexts: ExecutionContext[];
}

const defaultConfig: ExecutorConfig = {
  maxConcurrent: 5,
  retryAttempts: 3,
  retryDelay: 100,
  context: {},
};

export class MiddlewareExecutor {
  readonly config: ExecutorConfig;
  private readonly _executors: Map<string, ExecutionContext> = new Map();
  private _activeCount = 0;
  private _completedCount = 0;
  private _failedCount = 0;
  private _pendingCount = 0;

  constructor(config?: ExecutorConfig) {
    this.config = {
      maxConcurrent: config?.maxConcurrent ?? defaultConfig.maxConcurrent,
      retryAttempts: config?.retryAttempts ?? defaultConfig.retryAttempts,
      retryDelay: config?.retryDelay ?? defaultConfig.retryDelay,
      context: config?.context ?? {},
    };
  }

  /**
   * Execute a middleware chain with context
   */
  async execute(
    id: string,
    chain: MiddlewareFn[],
    initialContext: unknown
  ): Promise<unknown> {
    const context: ExecutionContext = {
      id,
      startedAt: Date.now(),
      status: 'running',
      middleware: chain.map(m => (m as { name?: string }).name ?? 'anonymous'),
    };

    this._executors.set(id, context);
    this._activeCount++;
    this._pendingCount--;

    try {
      let result: unknown;
      for (const fn of chain) {
        result = await fn(initialContext, async () => undefined);
      }
      context.completedAt = Date.now();
      context.status = 'completed';
      context.result = result;
      this._completedCount++;
      this._activeCount--;
      return result;
    } catch (err) {
      context.completedAt = Date.now();
      context.status = 'failed';
      context.error = err as Error;
      this._failedCount++;
      this._activeCount--;
      throw err;
    }
  }

  /**
   * Run middleware with retry logic
   */
  async run(
    id: string,
    fn: MiddlewareFn,
    context: unknown,
    options?: { retries?: number }
  ): Promise<unknown> {
    const maxRetries = options?.retries ?? this.config.retryAttempts ?? 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await this._delay(this.config.retryDelay ?? 100);
      }

      const execContext: ExecutionContext = {
        id: `${id}_attempt_${attempt}`,
        startedAt: Date.now(),
        status: 'running',
        middleware: [fn.name ?? 'anonymous'],
      };

      this._executors.set(execContext.id, execContext);

      try {
        const result = await fn(context, async () => undefined);
        execContext.completedAt = Date.now();
        execContext.status = 'completed';
        execContext.result = result;
        return result;
      } catch (err) {
        lastError = err as Error;
        execContext.completedAt = Date.now();
        execContext.status = 'failed';
        execContext.error = lastError;
      }
    }

    throw lastError ?? new Error('Middleware execution failed');
  }

  /**
   * Get all active executors
   */
  getExecutors(): ExecutionContext[] {
    return Array.from(this._executors.values());
  }

  /**
   * Get executor status overview
   */
  getStatus(): ExecutorStatus {
    return {
      active: this._activeCount,
      completed: this._completedCount,
      failed: this._failedCount,
      pending: this._pendingCount,
    };
  }

  /**
   * Get snapshot of current executor state
   */
  getSnapshot(): { metrics: ExecutorSnapshot } {
    return {
      metrics: {
        timestamp: Date.now(),
        status: this.getStatus(),
        contexts: this.getExecutors(),
      },
    };
  }

  /**
   * Reset executor state
   */
  reset(): void {
    this._executors.clear();
    this._activeCount = 0;
    this._completedCount = 0;
    this._failedCount = 0;
    this._pendingCount = 0;
  }

  /**
   * Generate execution report
   */
  getReport(): string {
    const lines = [
      '=== MiddlewareExecutor Report ===',
      `Config: maxConcurrent=${this.config.maxConcurrent}, retries=${this.config.retryAttempts}`,
      `Status: active=${this._activeCount}, completed=${this._completedCount}, failed=${this._failedCount}, pending=${this._pendingCount}`,
      `Total Executions: ${this._executors.size}`,
    ];

    if (this._executors.size > 0) {
      lines.push('\nExecution History:');
      this._executors.forEach((ctx, id) => {
        const duration = ctx.completedAt ? ctx.completedAt - ctx.startedAt : '...';
        lines.push(`  ${id}: ${ctx.status} (${duration}ms) ${ctx.error ? `- ${ctx.error.message}` : ''}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export metrics for monitoring systems
   */
  exportMetrics(): { version: string } {
    return {
      version: 'V85-middleware-executor-1.0.0',
    };
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default MiddlewareExecutor;