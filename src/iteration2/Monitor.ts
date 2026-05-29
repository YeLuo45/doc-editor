/**
 * Monitor.ts - System monitor module for doc-editor V32 Iteration 2
 * Tracks system metrics and health indicators
 */

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestCount: number;
  errorRate: number;
  uptime: number;
}

export interface HealthIndicator {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  value: number;
  threshold: number;
  message?: string;
}

export interface MonitorSnapshot {
  metrics: SystemMetrics;
  healthIndicators: HealthIndicator[];
  timestamp: number;
}

export class Monitor {
  private startTime: number = Date.now();
  private metrics: SystemMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    activeConnections: 0,
    requestCount: 0,
    errorRate: 0,
    uptime: 0,
  };
  private healthIndicators: Map<string, HealthIndicator> = new Map();
  private history: MonitorSnapshot[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.initializeHealthIndicators();
  }

  /**
   * Start monitoring the system
   */
  monitor(): void {
    this.updateMetrics();
    this.recordSnapshot();
  }

  /**
   * Update system metrics
   */
  updateMetrics(): void {
    this.metrics.uptime = Date.now() - this.startTime;
    this.metrics.cpuUsage = Math.random() * 100;
    this.metrics.memoryUsage = Math.random() * 100;
    this.metrics.activeConnections = Math.floor(Math.random() * 50);
    this.metrics.requestCount = Math.floor(Math.random() * 1000);
    this.metrics.errorRate = Math.random() * 5;

    this.updateHealthIndicators();
  }

  /**
   * Get current metrics
   */
  getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  /**
   * Get a specific health indicator
   */
  getHealthIndicator(name: string): HealthIndicator | undefined {
    return this.healthIndicators.get(name);
  }

  /**
   * Get all health indicators
   */
  getAllHealthIndicators(): HealthIndicator[] {
    return Array.from(this.healthIndicators.values());
  }

  /**
   * Get a status report
   */
  getReport(): {
    status: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    metrics: SystemMetrics;
    healthIndicators: HealthIndicator[];
    overallHealth: number;
  } {
    const indicators = this.getAllHealthIndicators();
    const criticalCount = indicators.filter(i => i.status === 'critical').length;
    const degradedCount = indicators.filter(i => i.status === 'degraded').length;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      status = 'critical';
    } else if (degradedCount > 0) {
      status = 'degraded';
    }

    const overallHealth = indicators.length > 0
      ? indicators.filter(i => i.status === 'healthy').length / indicators.length * 100
      : 100;

    return {
      status,
      uptime: this.metrics.uptime,
      metrics: { ...this.metrics },
      healthIndicators: indicators,
      overallHealth,
    };
  }

  /**
   * Get a snapshot of monitor state
   */
  getSnapshot(): MonitorSnapshot {
    return {
      metrics: { ...this.metrics },
      healthIndicators: Array.from(this.healthIndicators.values()),
      timestamp: Date.now(),
    };
  }

  /**
   * Reset all metrics and history
   */
  reset(): void {
    this.startTime = Date.now();
    this.metrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      activeConnections: 0,
      requestCount: 0,
      errorRate: 0,
      uptime: 0,
    };
    this.history = [];
    this.initializeHealthIndicators();
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): {
    timestamp: number;
    metrics: SystemMetrics;
    version: string;
    exportVersion: string;
    history: MonitorSnapshot[];
  } {
    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      version: '1.0.0',
      exportVersion: 'V32-I2',
      history: [...this.history],
    };
  }

  /**
   * Add a custom health indicator
   */
  addHealthIndicator(
    name: string,
    threshold: number,
    evaluator: (value: number) => 'healthy' | 'degraded' | 'critical'
  ): HealthIndicator {
    const value = this.getMetricValue(name);
    const status = evaluator(value);
    const indicator: HealthIndicator = {
      name,
      status,
      value,
      threshold,
      message: this.getStatusMessage(name, status),
    };

    this.healthIndicators.set(name, indicator);
    return indicator;
  }

  private initializeHealthIndicators(): void {
    const defaultIndicators = ['cpu', 'memory', 'connections', 'errors'];
    defaultIndicators.forEach(name => {
      this.healthIndicators.set(name, {
        name,
        status: 'healthy',
        value: 0,
        threshold: 80,
        message: `${name} is within normal range`,
      });
    });
  }

  private updateHealthIndicators(): void {
    this.healthIndicators.forEach((indicator, name) => {
      const value = this.getMetricValue(name);
      indicator.value = value;
      indicator.status = this.evaluateStatus(value, indicator.threshold);
      indicator.message = this.getStatusMessage(name, indicator.status);
      this.healthIndicators.set(name, indicator);
    });
  }

  private getMetricValue(name: string): number {
    switch (name) {
      case 'cpu': return this.metrics.cpuUsage;
      case 'memory': return this.metrics.memoryUsage;
      case 'connections': return this.metrics.activeConnections;
      case 'errors': return this.metrics.errorRate;
      default: return 0;
    }
  }

  private evaluateStatus(value: number, threshold: number): 'healthy' | 'degraded' | 'critical' {
    const ratio = value / threshold;
    if (ratio >= 1) return 'critical';
    if (ratio >= 0.7) return 'degraded';
    return 'healthy';
  }

  private getStatusMessage(name: string, status: string): string {
    const messages: Record<string, Record<string, string>> = {
      cpu: { healthy: 'CPU usage is normal', degraded: 'CPU usage is elevated', critical: 'CPU usage is critical' },
      memory: { healthy: 'Memory usage is normal', degraded: 'Memory usage is elevated', critical: 'Memory usage is critical' },
      connections: { healthy: 'Connection count is normal', degraded: 'Connection count is elevated', critical: 'Connection count is critical' },
      errors: { healthy: 'Error rate is acceptable', degraded: 'Error rate is concerning', critical: 'Error rate is critical' },
    };
    return messages[name]?.[status] ?? `${name} status: ${status}`;
  }

  private recordSnapshot(): void {
    const snapshot = this.getSnapshot();
    this.history.push(snapshot);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
}

export default Monitor;