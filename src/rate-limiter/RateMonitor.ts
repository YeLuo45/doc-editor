export interface RateMonitorConfig {
  maxHistorySize?: number;
  samplingInterval?: number;
}

interface MetricPoint {
  timestamp: number;
  value: number;
  label?: string;
}

interface TrackRecord {
  identifier: string;
  timestamp: number;
  success: boolean;
}

export class RateMonitor {
  readonly config: RateMonitorConfig;
  private metrics: Map<string, MetricPoint[]> = new Map();
  private history: TrackRecord[] = [];
  private totalTracked = 0;
  private successCount = 0;
  private failureCount = 0;

  constructor(config: RateMonitorConfig = {}) {
    this.config = {
      maxHistorySize: 1000,
      samplingInterval: 1000,
      ...config,
    };
  }

  track(identifier: string, success = true): void {
    const now = Date.now();
    const record: TrackRecord = { identifier, timestamp: now, success };

    this.history.push(record);
    if (this.history.length > (this.config.maxHistorySize || 1000)) {
      this.history = this.history.slice(-this.config.maxHistorySize!);
    }

    if (!this.metrics.has(identifier)) {
      this.metrics.set(identifier, []);
    }

    this.metrics.get(identifier)!.push({ timestamp: now, value: success ? 1 : 0 });
    this.totalTracked++;

    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }
  }

  getMetrics(identifier: string): MetricPoint[] {
    return this.metrics.get(identifier) || [];
  }

  getHistory(limit?: number): TrackRecord[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  getStatus(): { healthy: boolean; message: string } {
    const identifiers = [...this.metrics.keys()];
    const successRate = this.totalTracked > 0 ? (this.successCount / this.totalTracked) * 100 : 0;

    return {
      healthy: successRate >= 50,
      message: `${identifiers.length} metrics, ${this.totalTracked} total tracked, ${successRate.toFixed(1)}% success rate`,
    };
  }

  getStats() {
    const now = Date.now();
    const recentHistory = this.history.filter(r => r.timestamp > now - 60000);

    return {
      totalTracked: this.totalTracked,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: this.totalTracked > 0 ? (this.successCount / this.totalTracked) * 100 : 0,
      recentActivity: recentHistory.length,
      trackedIdentifiers: this.metrics.size,
    };
  }

  getSnapshot() {
    return {
      metrics: this.getStats(),
      identifiers: [...this.metrics.keys()].map(id => ({
        id,
        dataPoints: this.metrics.get(id)!.length,
      })),
    };
  }

  reset(): void {
    this.metrics.clear();
    this.history = [];
    this.totalTracked = 0;
    this.successCount = 0;
    this.failureCount = 0;
  }

  getReport(): string {
    const stats = this.getStats();
    return `RateMonitor Report: ${stats.totalTracked} tracked, ${stats.successRate.toFixed(1)}% success, ${stats.trackedIdentifiers} identifiers`;
  }

  exportMetrics() {
    return {
      version: '1.0.0',
      ...this.getStats(),
    };
  }
}