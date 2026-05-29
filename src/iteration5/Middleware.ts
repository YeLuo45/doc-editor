/**
 * Middleware.ts - V35 Iteration 5
 * Middleware handler with use/apply/getMiddleware capabilities
 */

export type MiddlewareFn = (context: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>;

export interface MiddlewareEntry {
  name: string;
  fn: MiddlewareFn;
  order: number;
}

export interface MiddlewareSnapshot {
  entries: string[];
  count: number;
  metrics: {
    totalMiddleware: number;
    registrations: number;
    executions: number;
    rejections: number;
  };
}

export class Middleware {
  private middleware: MiddlewareEntry[] = [];
  private registrations: number = 0;
  private executions: number = 0;
  private rejections: number = 0;

  constructor() {
    this.middleware = [];
    this.registrations = 0;
    this.executions = 0;
    this.rejections = 0;
  }

  /**
   * Register a middleware function
   */
  use(name: string, fn: MiddlewareFn, order?: number): boolean {
    if (!name || typeof fn !== 'function') {
      return false;
    }

    const entry: MiddlewareEntry = {
      name,
      fn,
      order: order ?? this.middleware.length,
    };

    this.middleware.push(entry);
    this.middleware.sort((a, b) => b.order - a.order);
    this.registrations++;

    return true;
  }

  /**
   * Apply middleware chain to a context
   */
  async apply(context: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!context || typeof context !== 'object') {
      this.rejections++;
      return { error: 'Invalid context' };
    }

    let result = { ...context };

    for (const entry of this.middleware) {
      try {
        const output = await entry.fn(result);
        if (output && typeof output === 'object') {
          result = { ...result, ...output };
        }
        this.executions++;
      } catch (err) {
        this.rejections++;
        result = { ...result, error: String(err), failedAt: entry.name };
        break;
      }
    }

    return result;
  }

  /**
   * Get all registered middleware
   */
  getMiddleware(): MiddlewareEntry[] {
    return [...this.middleware];
  }

  /**
   * Get snapshot of current middleware state
   */
  getSnapshot(): MiddlewareSnapshot {
    return {
      entries: this.middleware.map(m => `${m.order}:${m.name}`),
      count: this.middleware.length,
      metrics: {
        totalMiddleware: this.middleware.length,
        registrations: this.registrations,
        executions: this.executions,
        rejections: this.rejections,
      },
    };
  }

  /**
   * Reset all middleware and metrics
   */
  reset(): void {
    this.middleware = [];
    this.registrations = 0;
    this.executions = 0;
    this.rejections = 0;
  }

  /**
   * Generate a human-readable report
   */
  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== Middleware Report ===',
      `Total Middleware: ${snapshot.count}`,
      `Registrations: ${snapshot.metrics.registrations}`,
      `Executions: ${snapshot.metrics.executions}`,
      `Rejections: ${snapshot.metrics.rejections}`,
      '',
      'Middleware Chain:',
    ];

    if (this.middleware.length === 0) {
      lines.push('  (none)');
    } else {
      this.middleware.forEach(m => {
        lines.push(`  [${m.order}] ${m.name}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as a plain object
   */
  exportMetrics(): Record<string, unknown> {
    const snapshot = this.getSnapshot();
    return {
      totalMiddleware: snapshot.count,
      registrations: snapshot.metrics.registrations,
      executions: snapshot.metrics.executions,
      rejections: snapshot.metrics.rejections,
      chain: snapshot.entries,
    };
  }

  /**
   * Clear middleware but keep registration count
   */
  clear(): void {
    this.middleware = [];
  }
}

export default Middleware;