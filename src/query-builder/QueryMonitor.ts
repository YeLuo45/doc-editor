export type MonitorConfig = {
  enableLogging?: boolean;
  interval?: number;
  maxHistory?: number;
};

export type MetricEntry = {
  timestamp: number;
  name: string;
  value: number;
  tags?: Record<string, string>;
};

export type MonitorStatus = {
  active: boolean;
  trackedCount: number;
  historySize: number;
};

export class QueryMonitor {
  config: MonitorConfig;
  private history: MetricEntry[];
  private trackedCount: number;
  private active: boolean;

  constructor(config: MonitorConfig = {}) {
    this.config = config;
    this.history = [];
    this.trackedCount = 0;
    this.active = true;
  }

  track(name: string, value: number, tags?: Record<string, string>): void {
    this.trackedCount++;

    const entry: MetricEntry = {
      timestamp: Date.now(),
      name,
      value,
      tags,
    };

    if (this.config.maxHistory && this.history.length >= this.config.maxHistory) {
      this.history.shift();
    }

    this.history.push(entry);

    if (this.config.enableLogging) {
      console.log(`[Monitor] ${name}: ${value}`, tags || '');
    }
  }

  getMetrics(name?: string): MetricEntry[] {
    if (!name) return [...this.history];

    return this.history.filter(entry => entry.name === name);
  }

  getHistory(limit?: number): MetricEntry[] {
    if (!limit) return [...this.history];
    return this.history.slice(-limit);
  }

  getStatus(): MonitorStatus {
    return {
      active: this.active,
      trackedCount: this.trackedCount,
      historySize: this.history.length,
    };
  }

  reset(): void {
    this.history = [];
    this.trackedCount = 0;
    this.active = false;
  }

  getSnapshot(): { metrics: MonitorStatus } {
    return {
      metrics: this.getStatus(),
    };
  }

  getReport(): string {
    return JSON.stringify({
      config: this.config,
      status: this.getStatus(),
      recentHistory: this.history.slice(-10),
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V91-QueryMonitor-1.0.0',
    };
  }
}