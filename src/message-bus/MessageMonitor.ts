/**
 * V97 MessageMonitor - Message monitoring and metrics for doc-editor
 * Handles message tracking with comprehensive metrics collection
 */

export type MessageMonitorConfig = {
  enableHistory?: boolean;
  maxHistorySize?: number;
  enableMetrics?: boolean;
  enableLogging?: boolean;
  metricsInterval?: number;
};

export type MessageMetric = {
  messageId: string;
  topic: string;
  timestamp: number;
  latency: number;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  metadata?: Record<string, unknown>;
};

export type MonitorStatus = {
  isMonitoring: boolean;
  totalTracked: number;
  pendingCount: number;
  errorCount: number;
};

type MessageMonitorConfigType = MessageMonitorConfig;

export class MessageMonitor {
  private config: MessageMonitorConfigType;
  private metrics: Map<string, MessageMetric> = new Map();
  private history: MessageMetric[] = [];
  private stats = {
    totalTracked: 0,
    pending: 0,
    delivered: 0,
    failed: 0,
    sent: 0,
  };

  constructor(config: MessageMonitorConfig = {}) {
    this.config = {
      enableHistory: config.enableHistory ?? true,
      maxHistorySize: config.maxHistorySize ?? 500,
      enableMetrics: config.enableMetrics ?? true,
      enableLogging: config.enableLogging ?? true,
      metricsInterval: config.metricsInterval ?? 60000,
    };
  }

  track(
    messageId: string,
    topic: string,
    status: 'sent' | 'delivered' | 'failed' | 'pending',
    metadata?: Record<string, unknown>
  ): void {
    const latency = Date.now();
    const metric: MessageMetric = {
      messageId,
      topic,
      timestamp: Date.now(),
      latency,
      status,
      metadata,
    };
    this.metrics.set(messageId, metric);
    this.stats.totalTracked++;

    switch (status) {
      case 'pending':
        this.stats.pending++;
        break;
      case 'delivered':
        this.stats.delivered++;
        break;
      case 'failed':
        this.stats.failed++;
        break;
      case 'sent':
        this.stats.sent++;
        break;
    }

    if (this.config.enableHistory) {
      this.history.push(metric);
      if (this.history.length > (this.config.maxHistorySize ?? 500)) {
        this.history.shift();
      }
    }
  }

  getMetrics(messageId?: string): MessageMetric | MessageMetric[] {
    if (messageId) {
      return this.metrics.get(messageId) ?? {
        messageId: '',
        topic: '',
        timestamp: 0,
        latency: 0,
        status: 'failed' as const,
      };
    }
    return Array.from(this.metrics.values());
  }

  getHistory(limit?: number): MessageMetric[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  getStatus(): MonitorStatus {
    return {
      isMonitoring: true,
      totalTracked: this.stats.totalTracked,
      pendingCount: this.stats.pending,
      errorCount: this.stats.failed,
    };
  }

  getStats(): {
    totalTracked: number;
    pending: number;
    delivered: number;
    failed: number;
    sent: number;
  } {
    return { ...this.stats };
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.stats.totalTracked = 0;
    this.stats.pending = 0;
    this.stats.delivered = 0;
    this.stats.failed = 0;
    this.stats.sent = 0;
  }

  clearHistory(): void {
    this.history = [];
  }

  getAverageLatency(): number {
    if (this.metrics.size === 0) return 0;
    let total = 0;
    for (const metric of this.metrics.values()) {
      total += metric.latency;
    }
    return total / this.metrics.size;
  }

  getSuccessRate(): number {
    const total = this.stats.delivered + this.stats.failed;
    if (total === 0) return 0;
    return (this.stats.delivered / total) * 100;
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        tracked: Array.from(this.metrics.values()),
        history: [...this.history],
        stats: this.getStats(),
        config: this.config,
      },
    };
  }

  reset(): void {
    this.metrics.clear();
    this.history = [];
    this.stats = {
      totalTracked: 0,
      pending: 0,
      delivered: 0,
      failed: 0,
      sent: 0,
    };
  }

  getReport(): string {
    const stats = this.getStats();
    const lines = [
      '=== Message Monitor Report ===',
      `Total Tracked: ${stats.totalTracked}`,
      `Pending: ${stats.pending}`,
      `Delivered: ${stats.delivered}`,
      `Failed: ${stats.failed}`,
      `Sent: ${stats.sent}`,
      `Success Rate: ${this.getSuccessRate().toFixed(2)}%`,
      `Avg Latency: ${this.getAverageLatency().toFixed(2)}ms`,
      `History Size: ${this.history.length}`,
      `Config: ${JSON.stringify(this.config)}`,
      '==============================',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v97',
      totalTracked: this.stats.totalTracked,
      pending: this.stats.pending,
      delivered: this.stats.delivered,
      failed: this.stats.failed,
      sent: this.stats.sent,
      successRate: this.getSuccessRate(),
      avgLatency: this.getAverageLatency(),
    };
  }
}