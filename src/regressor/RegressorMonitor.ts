/**
 * V143 RegressorMonitor - Real-time monitoring and metrics tracking for regressors
 * Tracks performance, history, and health status of regression operations
 */

import { RegressorExecutor, ExecutionResult } from './RegressorExecutor';
import { RegressorRegistry } from './RegressorRegistry';

export type MonitorConfig = {
  historySize: number;
  enableAlerting: boolean;
  alertThreshold: number;
  samplingInterval: number;
};

export type MetricPoint = {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
};

export type MonitorMetrics = {
  executionCount: number;
  successCount: number;
  failureCount: number;
  totalLatency: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  percentile95: number;
  percentile99: number;
};

export type HealthStatus = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  issues: string[];
  lastCheck: number;
};

export class RegressorMonitor {
  private config: MonitorConfig;
  private history: ExecutionResult[] = [];
  private metricsCache: MonitorMetrics | null = null;
  private lastUpdate: number = 0;
  private alertCallback?: (message: string, severity: string) => void;

  constructor(config?: Partial<MonitorConfig>) {
    this.config = {
      historySize: config?.historySize ?? 1000,
      enableAlerting: config?.enableAlerting ?? false,
      alertThreshold: config?.alertThreshold ?? 0.8,
      samplingInterval: config?.samplingInterval ?? 5000,
    };
  }

  track(result: ExecutionResult): void {
    this.history.push(result);
    
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }
    
    this.metricsCache = null;
    this.lastUpdate = Date.now();

    if (this.config.enableAlerting) {
      this.checkAlerts(result);
    }
  }

  getMetrics(): MonitorMetrics {
    if (this.metricsCache && Date.now() - this.lastUpdate < this.config.samplingInterval) {
      return this.metricsCache;
    }

    return this.calculateMetrics();
  }

  private calculateMetrics(): MonitorMetrics {
    if (this.history.length === 0) {
      return {
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        totalLatency: 0,
        averageLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        percentile95: 0,
        percentile99: 0,
      };
    }

    const latencies = this.history
      .filter(r => r.success)
      .map(r => r.executionTime)
      .sort((a, b) => a - b);

    const successCount = this.history.filter(r => r.success).length;
    const failureCount = this.history.filter(r => !r.success).length;
    const totalLatency = latencies.reduce((a, b) => a + b, 0);

    return {
      executionCount: this.history.length,
      successCount,
      failureCount,
      totalLatency,
      averageLatency: latencies.length > 0 ? totalLatency / latencies.length : 0,
      minLatency: latencies.length > 0 ? latencies[0] : 0,
      maxLatency: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
      percentile95: this.calculatePercentile(latencies, 0.95),
      percentile99: this.calculatePercentile(latencies, 0.99),
    };
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.floor(sortedValues.length * percentile);
    return sortedValues[Math.min(index, sortedValues.length - 1)];
  }

  getHistory(limit?: number): ExecutionResult[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  getStatus(registry: RegressorRegistry, executor: RegressorExecutor): HealthStatus {
    const metrics = this.getMetrics();
    const executorStats = executor.getStats();
    const registrySnapshot = registry.getSnapshot();
    
    const issues: string[] = [];
    let score = 100;

    const successRate = metrics.executionCount > 0 
      ? metrics.successCount / metrics.executionCount 
      : 1;

    if (successRate < this.config.alertThreshold) {
      issues.push(`Low success rate: ${(successRate * 100).toFixed(2)}%`);
      score -= (1 - successRate) * 50;
    }

    if (metrics.averageLatency > 1000) {
      issues.push(`High average latency: ${metrics.averageLatency.toFixed(2)}ms`);
      score -= Math.min(20, (metrics.averageLatency - 1000) / 100);
    }

    if (executorStats.failedTasks > metrics.executionCount * 0.2) {
      issues.push(`High failure count: ${executorStats.failedTasks} failures`);
      score -= 20;
    }

    if (registrySnapshot.count === 0) {
      issues.push('No regressors registered');
      score -= 10;
    }

    score = Math.max(0, Math.min(100, score));

    let status: HealthStatus['status'] = 'healthy';
    if (score < 50) {
      status = 'unhealthy';
    } else if (score < 80) {
      status = 'degraded';
    }

    return {
      status,
      score,
      issues,
      lastCheck: Date.now(),
    };
  }

  private checkAlerts(result: ExecutionResult): void {
    if (!this.alertCallback) return;

    if (!result.success) {
      this.alertCallback(`Execution failed: ${result.error}`, 'error');
    }

    if (result.executionTime > 5000) {
      this.alertCallback(`Slow execution: ${result.executionTime}ms`, 'warning');
    }
  }

  onAlert(callback: (message: string, severity: string) => void): void {
    this.alertCallback = callback;
  }

  getSnapshot(): { 
    metrics: MonitorMetrics; 
    historySize: number;
    lastUpdate: number;
    config: MonitorConfig;
  } {
    return {
      metrics: this.getMetrics(),
      historySize: this.history.length,
      lastUpdate: this.lastUpdate,
      config: this.config,
    };
  }

  reset(): void {
    this.history = [];
    this.metricsCache = null;
    this.lastUpdate = 0;
  }

  getReport(): string {
    const metrics = this.getMetrics();
    const historySample = this.history.slice(-5).map(r => 
      `  - ${r.taskId}: ${r.success ? 'OK' : 'FAIL'} (${r.executionTime}ms)`
    ).join('\n');

    return `=== RegressorMonitor Report ===
Config:
  History Size: ${this.config.historySize}
  Enable Alerting: ${this.config.enableAlerting}
  Alert Threshold: ${(this.config.alertThreshold * 100).toFixed(0)}%
  Sampling Interval: ${this.config.samplingInterval}ms

Metrics:
  Total Executions: ${metrics.executionCount}
  Success Rate: ${metrics.executionCount > 0 ? ((metrics.successCount / metrics.executionCount) * 100).toFixed(2) : 0}%
  Average Latency: ${metrics.averageLatency.toFixed(2)}ms
  Min Latency: ${metrics.minLatency.toFixed(2)}ms
  Max Latency: ${metrics.maxLatency.toFixed(2)}ms
  P95 Latency: ${metrics.percentile95.toFixed(2)}ms
  P99 Latency: ${metrics.percentile99.toFixed(2)}ms

Recent History:
${historySample || '  No history'}
`;
  }

  exportMetrics(): { version: string; config: MonitorConfig; metrics: MonitorMetrics; historyCount: number } {
    return {
      version: '1.4.3',
      config: this.config,
      metrics: this.getMetrics(),
      historyCount: this.history.length,
    };
  }
}