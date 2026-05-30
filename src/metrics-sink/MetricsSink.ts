/**
 * MetricsSink.ts - Metrics sink for doc-editor
 * Version 1.0.7
 */

export type SinkConfig = {
  enabled: boolean;
  endpoint: string;
  batchSize: number;
  flushIntervalMs: number;
  retryAttempts: number;
  timeoutMs: number;
  onSend?: (data: MetricData) => void;
  onError?: (error: Error) => void;
};

export interface MetricData {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface SinkMetrics {
  totalSent: number;
  totalFailed: number;
  totalRetried: number;
  pendingCount: number;
  lastSendTime: number | null;
  lastError: string | null;
}

export class MetricsSink {
  private _config: SinkConfig;
  private queue: MetricData[] = [];
  private totalSent = 0;
  private totalFailed = 0;
  private totalRetried = 0;
  private lastSendTime: number | null = null;
  private lastError: string | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<SinkConfig> = {}) {
    this._config = {
      enabled: true,
      endpoint: 'http://localhost:9090/metrics',
      batchSize: 100,
      flushIntervalMs: 5000,
      retryAttempts: 3,
      timeoutMs: 30000,
      onSend: undefined,
      onError: undefined,
      ...config,
    };
    this.startFlushTimer();
  }

  get config(): SinkConfig {
    return { ...this._config };
  }

  set config(value: Partial<SinkConfig>) {
    this._config = { ...this._config, ...value };
    this.restartFlushTimer();
  }

  send(data: MetricData | MetricData[]): boolean {
    if (!this._config.enabled) {
      return false;
    }

    const items = Array.isArray(data) ? data : [data];
    
    for (const item of items) {
      if (this.queue.length >= this._config.batchSize) {
        this.flush();
      }
      this.queue.push({
        ...item,
        timestamp: item.timestamp || Date.now(),
      });
    }

    return true;
  }

  flush(): boolean {
    if (this.queue.length === 0) {
      return false;
    }

    const batch = this.queue.splice(0, this._config.batchSize);
    
    try {
      this._config.onSend?.(batch[0]);
      
      this.totalSent += batch.length;
      this.lastSendTime = Date.now();
      this.lastError = null;
      
      return true;
    } catch (error) {
      this.totalFailed += batch.length;
      this.lastError = error instanceof Error ? error.message : String(error);
      this._config.onError?.(error instanceof Error ? error : new Error(String(error)));
      
      if (this.totalRetried < this._config.retryAttempts) {
        this.queue.unshift(...batch);
        this.totalRetried++;
      }
      
      return false;
    }
  }

  getStatus(): { enabled: boolean; queueSize: number; endpoint: string; batchSize: number } {
    return {
      enabled: this._config.enabled,
      queueSize: this.queue.length,
      endpoint: this._config.endpoint,
      batchSize: this._config.batchSize,
    };
  }

  getStats(): SinkMetrics {
    return {
      totalSent: this.totalSent,
      totalFailed: this.totalFailed,
      totalRetried: this.totalRetried,
      pendingCount: this.queue.length,
      lastSendTime: this.lastSendTime,
      lastError: this.lastError,
    };
  }

  getSnapshot(): { metrics: SinkMetrics; config: SinkConfig } {
    return {
      metrics: this.getStats(),
      config: this.config,
    };
  }

  reset(): void {
    this.queue = [];
    this.totalSent = 0;
    this.totalFailed = 0;
    this.totalRetried = 0;
    this.lastSendTime = null;
    this.lastError = null;
  }

  getReport(): string {
    const stats = this.getStats();
    const status = this.getStatus();
    return [
      'Metrics Sink Report',
      '===================',
      `Enabled: ${status.enabled}`,
      `Endpoint: ${status.endpoint}`,
      `Batch Size: ${status.batchSize}`,
      '',
      `Total Sent: ${stats.totalSent}`,
      `Total Failed: ${stats.totalFailed}`,
      `Total Retried: ${stats.totalRetried}`,
      `Pending: ${stats.pendingCount}`,
      `Last Send: ${stats.lastSendTime ? new Date(stats.lastSendTime).toISOString() : 'N/A'}`,
      `Last Error: ${stats.lastError || 'N/A'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: SinkMetrics; config: SinkConfig } {
    return {
      version: '1.0.7',
      metrics: this.getStats(),
      config: this.config,
    };
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this._config.flushIntervalMs);
  }

  private restartFlushTimer(): void {
    this.startFlushTimer();
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}