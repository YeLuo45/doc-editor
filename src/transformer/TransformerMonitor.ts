/**
 * V139 Transformer Monitor
 * Tracks and monitors transformer execution metrics
 */

export type MonitorConfig = {
  historySize: number;
  collectInterval: number;
  enableLogging: boolean;
};

export type MetricEntry = {
  timestamp: number;
  name: string;
  value: number;
  tags: Record<string, string>;
};

export type MonitorStatus = 'active' | 'paused' | 'error';

export class TransformerMonitor {
  private _config: MonitorConfig;
  private _metrics: MetricEntry[] = [];
  private _status: MonitorStatus = 'active';
  private _stats: {
    trackCount: number;
    lastTrack: number | null;
    errors: string[];
  };

  constructor(config: Partial<MonitorConfig> = {}) {
    this._config = {
      historySize: config.historySize || 1000,
      collectInterval: config.collectInterval || 1000,
      enableLogging: config.enableLogging !== false,
    };
    this._stats = {
      trackCount: 0,
      lastTrack: null,
      errors: [],
    };
  }

  getStats(): Readonly<typeof this._stats> {
    return { ...this._stats };
  }

  get config(): MonitorConfig {
    return { ...this._config };
  }

  getStatus(): MonitorStatus {
    return this._status;
  }

  track(name: string, value: number, tags: Record<string, string> = {}): void {
    if (this._status !== 'active') {
      return;
    }

    this._stats.trackCount++;
    this._stats.lastTrack = Date.now();

    const entry: MetricEntry = {
      timestamp: Date.now(),
      name,
      value,
      tags,
    };

    this._metrics.push(entry);

    if (this._metrics.length > this._config.historySize) {
      this._metrics.shift();
    }
  }

  getMetrics(name?: string): MetricEntry[] {
    if (name) {
      return this._metrics.filter(m => m.name === name);
    }
    return [...this._metrics];
  }

  getHistory(limit?: number): MetricEntry[] {
    if (limit) {
      return this._metrics.slice(-limit);
    }
    return [...this._metrics];
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        trackCount: this._stats.trackCount,
        lastTrack: this._stats.lastTrack,
        errors: this._stats.errors,
        status: this._status,
        historySize: this._config.historySize,
        collectInterval: this._config.collectInterval,
        enableLogging: this._config.enableLogging,
        storedMetrics: this._metrics.length,
      },
    };
  }

  reset(): void {
    this._metrics = [];
    this._stats.trackCount = 0;
    this._stats.lastTrack = null;
    this._stats.errors = [];
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return JSON.stringify(snap, null, 2);
  }

  exportMetrics(): { version: string } & ReturnType<typeof this.getSnapshot>['metrics'] {
    return {
      version: '1.0.0',
      ...this.getSnapshot().metrics,
    };
  }
}