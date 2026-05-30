export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
}

export interface HealthStatus {
  id: string;
  healthy: boolean;
  latency: number;
  lastCheck: number;
  failures: number;
}

export class HealthCheck {
  private healthMap: Map<string, HealthStatus> = new Map();
  private config: HealthCheckConfig;

  constructor(config: HealthCheckConfig) {
    this.config = config;
  }

  register(id: string): void {
    this.healthMap.set(id, {
      id,
      healthy: true,
      latency: 0,
      lastCheck: Date.now(),
      failures: 0,
    });
  }

  unregister(id: string): boolean {
    return this.healthMap.delete(id);
  }

  check(id: string): boolean {
    const health = this.healthMap.get(id);
    if (!health) return false;

    // Simulate a health check
    const isHealthy = Math.random() > 0.1; // 90% success rate simulation
    const latency = Math.floor(Math.random() * 50) + 5;

    health.latency = latency;
    health.lastCheck = Date.now();

    if (isHealthy) {
      health.failures = 0;
      health.healthy = true;
    } else {
      health.failures++;
      health.healthy = health.failures < this.config.unhealthyThreshold;
    }

    return health.healthy;
  }

  getHealth(id: string): HealthStatus | null {
    return this.healthMap.get(id) || null;
  }

  getAllHealth(): HealthStatus[] {
    return [...this.healthMap.values()];
  }

  getStatus(): { healthy: boolean; message: string } {
    const all = this.getAllHealth();
    const healthyCount = all.filter(h => h.healthy).length;
    return {
      healthy: healthyCount > 0,
      message: `${healthyCount}/${all.length} endpoints healthy`,
    };
  }

  getStats() {
    const all = this.getAllHealth();
    const latencies = all.map(h => h.latency).filter(l => l > 0);
    return {
      total: all.length,
      healthy: all.filter(h => h.healthy).length,
      unhealthy: all.filter(h => !h.healthy).length,
      avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    };
  }

  getSnapshot() {
    return { metrics: this.getStats(), healthList: this.getAllHealth() };
  }

  reset(): void {
    this.healthMap.forEach(h => {
      h.failures = 0;
      h.healthy = true;
    });
  }

  getReport(): string {
    const stats = this.getStats();
    return `HealthCheck Report: ${stats.healthy}/${stats.total} healthy, avg latency ${stats.avgLatency.toFixed(2)}ms`;
  }

  exportMetrics() {
    return { version: '1.0.0', stats: this.getStats() };
  }
}