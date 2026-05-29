/**
 * MiddlewareMonitor.ts
 * V85 Middleware Monitor - Monitors and tracks middleware execution metrics
 * Provides real-time metrics, history, and active middleware tracking
 */

export interface MonitorConfig {
  historySize?: number;
  enableMetrics?: boolean;
  sampleRate?: number;
}

export interface MetricPoint {
  timestamp: number;
  name: string;
  duration: number;
  success: boolean;
  error?: string;
}

export interface AggregatedMetrics {
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  p95Duration: number;
  errorCount: number;
}

export interface ActiveMiddleware {
  name: string;
  startedAt: number;
  context: unknown;
}

export interface MonitorSnapshot {
  timestamp: number;
  metrics: AggregatedMetrics;
  activeCount: number;
  historyCount: number;
}

const defaultConfig: Required<MonitorConfig> = {
  historySize: 1000,
  enableMetrics: true,
  sampleRate: 1.0,
};

export class MiddlewareMonitor {
  readonly config: MonitorConfig;
  private _metrics: MetricPoint[] = [];
  private _active: Map<string, ActiveMiddleware> = new Map();
  private _totalExecutions = 0;
  private _totalErrors = 0;
  private _totalDuration = 0;

  constructor(config?: MonitorConfig) {
    this.config = {
      historySize: config?.historySize ?? defaultConfig.historySize,
      enableMetrics: config?.enableMetrics ?? defaultConfig.enableMetrics,
      sampleRate: config?.sampleRate ?? defaultConfig.sampleRate,
    };
  }

  /**
   * Track a middleware execution
   */
  track(
    name: string,
    duration: number,
    success: boolean,
    error?: string,
    context?: unknown
  ): void {
    if (Math.random() > this.config.sampleRate) return;

    this._totalExecutions++;
    if (!success) this._totalErrors++;
    this._totalDuration += duration;

    const point: MetricPoint = {
      timestamp: Date.now(),
      name,
      duration,
      success,
      error,
    };

    this._metrics.push(point);

    if (this._metrics.length > this.config.historySize) {
      this._metrics.shift();
    }

    return;
  }

  /**
   * Mark a middleware as active
   */
  markActive(name: string, context?: unknown): string {
    const id = `${name}_${Date.now()}`;
    this._active.set(id, {
      name,
      startedAt: Date.now(),
      context,
    });
    return id;
  }

  /**
   * Mark a middleware as completed (no longer active)
   */
  markComplete(id: string): boolean {
    return this._active.delete(id);
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): AggregatedMetrics {
    const durations = this._metrics
      .map(m => m.duration)
      .sort((a, b) => a - b);

    const p95Index = Math.floor(durations.length * 0.95);
    const successCount = this._metrics.filter(m => m.success).length;

    return {
      totalExecutions: this._totalExecutions,
      successRate: this._totalExecutions > 0 ? successCount / this._totalExecutions : 0,
      averageDuration: this._totalExecutions > 0 ? this._totalDuration / this._totalExecutions : 0,
      p95Duration: durations[p95Index] ?? 0,
      errorCount: this._totalErrors,
    };
  }

  /**
   * Get execution history
   */
  getHistory(limit?: number): MetricPoint[] {
    const sorted = [...this._metrics].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get currently active middleware
   */
  getActive(): ActiveMiddleware[] {
    return Array.from(this._active.values());
  }

  /**
   * Get snapshot of current monitor state
   */
  getSnapshot(): { metrics: MonitorSnapshot } {
    return {
      metrics: {
        timestamp: Date.now(),
        metrics: this.getMetrics(),
        activeCount: this._active.size,
        historyCount: this._metrics.length,
      },
    };
  }

  /**
   * Reset all metrics and history
   */
  reset(): void {
    this._metrics = [];
    this._active.clear();
    this._totalExecutions = 0;
    this._totalErrors = 0;
    this._totalDuration = 0;
  }

  /**
   * Generate a human-readable report
   */
  getReport(): string {
    const m = this.getMetrics();
    const lines = [
      '=== MiddlewareMonitor Report ===',
      `Config: historySize=${this.config.historySize}, sampleRate=${this.config.sampleRate}`,
      `Metrics:`,
      `  Total Executions: ${m.totalExecutions}`,
      `  Success Rate: ${(m.successRate * 100).toFixed(2)}%`,
      `  Average Duration: ${m.averageDuration.toFixed(2)}ms`,
      `  P95 Duration: ${m.p95Duration.toFixed(2)}ms`,
      `  Error Count: ${m.errorCount}`,
      `Active: ${this._active.size}`,
      `History Size: ${this._metrics.length}`,
    ];

    if (this._active.size > 0) {
      lines.push('\nCurrently Active:');
      this._active.forEach((am, id) => {
        const elapsed = Date.now() - am.startedAt;
        lines.push(`  ${am.name} (${id}) - ${elapsed}ms elapsed`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): { version: string } {
    return {
      version: 'V85-middleware-monitor-1.0.0',
    };
  }
}

export default MiddlewareMonitor;