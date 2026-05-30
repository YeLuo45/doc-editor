export interface LoadMonitorConfig {
  windowSize: number;
  sampleInterval: number;
  alertThreshold: number;
}

export interface LoadMetrics {
  timestamp: number;
  cpu: number;
  memory: number;
  requests: number;
  latency: number;
}

export interface LoadSnapshot {
  current: LoadMetrics | null;
  avg: number;
  peak: number;
  samples: number;
}

export class LoadMonitor {
  private history: LoadMetrics[] = [];
  private config: LoadMonitorConfig;

  constructor(config: LoadMonitorConfig) {
    this.config = config;
  }

  track(metrics: Omit<LoadMetrics, 'timestamp'>): void {
    const entry: LoadMetrics = { ...metrics, timestamp: Date.now() };
    this.history.push(entry);
    if (this.history.length > this.config.windowSize) {
      this.history.shift();
    }
  }

  getMetrics(): LoadMetrics | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  getHistory(): LoadMetrics[] {
    return [...this.history];
  }

  getStatus(): { healthy: boolean; message: string } {
    const current = this.getMetrics();
    if (!current) return { healthy: false, message: 'No metrics available' };

    const isHealthy = current.cpu < this.config.alertThreshold && current.memory < this.config.alertThreshold;
    return {
      healthy: isHealthy,
      message: isHealthy ? 'System load normal' : 'System load high',
    };
  }

  getStats() {
    if (this.history.length === 0) {
      return { avgCpu: 0, avgMemory: 0, avgLatency: 0, peakCpu: 0, totalRequests: 0 };
    }

    const cpus = this.history.map(h => h.cpu);
    const memories = this.history.map(h => h.memory);
    const latencies = this.history.map(h => h.latency);

    return {
      avgCpu: cpus.reduce((a, b) => a + b, 0) / cpus.length,
      avgMemory: memories.reduce((a, b) => a + b, 0) / memories.length,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      peakCpu: Math.max(...cpus),
      totalRequests: this.history.reduce((sum, h) => sum + h.requests, 0),
    };
  }

  getSnapshot(): LoadSnapshot {
    const stats = this.getStats();
    const current = this.getMetrics();
    return {
      current,
      avg: stats.avgCpu,
      peak: stats.peakCpu,
      samples: this.history.length,
    };
  }

  reset(): void {
    this.history = [];
  }

  getReport(): string {
    const stats = this.getStats();
    return `LoadMonitor Report: avg CPU ${stats.avgCpu.toFixed(1)}%, avg latency ${stats.avgLatency.toFixed(1)}ms`;
  }

  exportMetrics() {
    return { version: '1.0.0', stats: this.getStats(), samples: this.history.length };
  }
}