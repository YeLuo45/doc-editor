/**
 * MiddlewareStack.ts
 * V85 Middleware Stack - Core stack management for doc-editor
 * Manages middleware registration, removal, and execution order
 */

export type MiddlewareFn<T = unknown, R = unknown> = (
  context: T,
  next: () => Promise<R>
) => Promise<R>;

export interface MiddlewareConfig {
  name: string;
  priority?: number;
  timeout?: number;
  enabled?: boolean;
  tags?: string[];
}

export interface MiddlewareItem<T = unknown, R = unknown> extends MiddlewareConfig {
  fn: MiddlewareFn<T, R>;
  addedAt: number;
  callCount: number;
  errorCount: number;
}

export interface StackStats {
  totalCalls: number;
  totalErrors: number;
  averageDuration: number;
  activeMiddleware: number;
}

export interface StackSnapshot {
  timestamp: number;
  stats: StackStats;
  middleware: Array<{ name: string; priority: number; callCount: number }>;
}

type Config = {
  defaultTimeout: number;
  enableStats: boolean;
  maxDepth: number;
  errorHandling: 'throw' | 'collect' | 'skip';
};

export class MiddlewareStack<T = unknown, R = unknown> {
  readonly config: Config;
  private readonly _middleware: MiddlewareItem<T, R>[] = [];
  private _stats: StackStats = {
    totalCalls: 0,
    totalErrors: 0,
    averageDuration: 0,
    activeMiddleware: 0,
  };
  private _totalDuration = 0;

  constructor(config?: Partial<Config>) {
    this.config = {
      defaultTimeout: config?.defaultTimeout ?? 5000,
      enableStats: config?.enableStats ?? true,
      maxDepth: config?.maxDepth ?? 10,
      errorHandling: config?.errorHandling ?? 'throw',
    };
  }

  /**
   * Register a middleware function with optional config
   */
  use(fn: MiddlewareFn<T, R>, config?: MiddlewareConfig): this {
    const item: MiddlewareItem<T, R> = {
      fn,
      name: config?.name ?? `middleware_${this._middleware.length}`,
      priority: config?.priority ?? 0,
      timeout: config?.timeout ?? this.config.defaultTimeout,
      enabled: config?.enabled ?? true,
      tags: config?.tags ?? [],
      addedAt: Date.now(),
      callCount: 0,
      errorCount: 0,
    };

    this._middleware.push(item);
    this._middleware.sort((a, b) => b.priority - a.priority);
    this._stats.activeMiddleware = this._middleware.filter(m => m.enabled).length;

    return this;
  }

  /**
   * Remove a middleware by name
   */
  remove(name: string): boolean {
    const index = this._middleware.findIndex(m => m.name === name);
    if (index === -1) return false;

    this._middleware.splice(index, 1);
    this._stats.activeMiddleware = this._middleware.filter(m => m.enabled).length;
    return true;
  }

  /**
   * Execute the middleware stack
   */
  async execute(context: T): Promise<R> {
    const startTime = Date.now();
    const enabled = this._middleware.filter(m => m.enabled);

    if (enabled.length === 0) {
      throw new Error('No middleware registered');
    }

    let index = 0;

    const next = async (): Promise<R | undefined> => {
      if (index >= enabled.length) {
        return undefined;
      }

      const current = enabled[index++];
      current.callCount++;

      try {
        const result = await Promise.race([
          current.fn(context, next),
          this._createTimeout(current.timeout!),
        ]);
        return result as R;
      } catch (err) {
        current.errorCount++;
        this._stats.totalErrors++;

        if (this.config.errorHandling === 'throw') {
          throw err;
        }

        if (this.config.errorHandling === 'skip') {
          return next();
        }

        return undefined as R;
      }
    };

    try {
      let result: R | undefined;
      await next();
      this._stats.totalCalls++;
      this._totalDuration += Date.now() - startTime;
      this._stats.averageDuration = this._totalDuration / this._stats.totalCalls;
      return result as R;
    } catch (err) {
      this._stats.totalCalls++;
      throw err;
    }
  }

  /**
   * Get current middleware stack
   */
  getStack(): Array<{ name: string; priority: number; enabled: boolean; tags: string[] }> {
    return this._middleware.map(m => ({
      name: m.name,
      priority: m.priority,
      enabled: m.enabled,
      tags: m.tags,
    }));
  }

  /**
   * Get execution statistics
   */
  getStats(): StackStats {
    return { ...this._stats };
  }

  /**
   * Take a snapshot of current state
   */
  getSnapshot(): { metrics: StackSnapshot } {
    return {
      metrics: {
        timestamp: Date.now(),
        stats: this.getStats(),
        middleware: this._middleware.map(m => ({
          name: m.name,
          priority: m.priority,
          callCount: m.callCount,
        })),
      },
    };
  }

  /**
   * Reset all statistics and state
   */
  reset(): void {
    this._middleware.forEach(m => {
      m.callCount = 0;
      m.errorCount = 0;
    });
    this._stats = {
      totalCalls: 0,
      totalErrors: 0,
      averageDuration: 0,
      activeMiddleware: this._middleware.filter(m => m.enabled).length,
    };
    this._totalDuration = 0;
  }

  /**
   * Generate a human-readable report
   */
  getReport(): string {
    const lines = [
      '=== MiddlewareStack Report ===',
      `Config: defaultTimeout=${this.config.defaultTimeout}ms, errorHandling=${this.config.errorHandling}`,
      `Stats: totalCalls=${this._stats.totalCalls}, errors=${this._stats.totalErrors}, avgDuration=${this._stats.averageDuration.toFixed(2)}ms`,
      `Active Middleware (${this._middleware.filter(m => m.enabled).length}):`,
    ];

    this._middleware.forEach(m => {
      const status = m.enabled ? '[ACTIVE]' : '[DISABLED]';
      lines.push(`  ${status} ${m.name} (priority=${m.priority}, calls=${m.callCount}, errors=${m.errorCount})`);
    });

    return lines.join('\n');
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): { version: string } {
    return {
      version: 'V85-middleware-stack-1.0.0',
    };
  }

  private _createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Middleware timeout after ${ms}ms`)), ms);
    });
  }
}

export default MiddlewareStack;