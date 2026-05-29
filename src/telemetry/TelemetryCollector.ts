/**
 * TelemetryCollector - V64 Telemetry System
 * Collects and buffers metrics data for the doc-editor application
 */

export interface CollectorConfig {
  maxBufferSize: number;
  flushInterval: number;
  batchSize: number;
  enabled: boolean;
  serviceName: string;
}

export interface MetricRecord {
  id: string;
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class TelemetryCollector {
  private buffer: MetricRecord[] = [];
  private config: CollectorConfig;
  private recordCount: number = 0;

  constructor(config: CollectorConfig) {
    this.config = { ...config };
    this.buffer = [];
    this.recordCount = 0;
  }

  /**
   * Record a new metric value
   */
  record(name: string, value: number, metadata?: Record<string, unknown>): void {
    if (!this.config.enabled) return;

    const record: MetricRecord = {
      id: `${Date.now()}-${this.recordCount++}`,
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.buffer.push(record);

    // Auto-flush if buffer exceeds max size
    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Flush buffered metrics to persistent storage
   */
  flush(): MetricRecord[] {
    const flushed = [...this.buffer];
    this.buffer = [];
    return flushed;
  }

  /**
   * Get all currently buffered metrics
   */
  getMetrics(): MetricRecord[] {
    return [...this.buffer];
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Get a snapshot of current collector state
   */
  getSnapshot(): { metrics: MetricRecord[]; bufferSize: number; recordCount: number } {
    return {
      metrics: [...this.buffer],
      bufferSize: this.buffer.length,
      recordCount: this.recordCount
    };
  }

  /**
   * Reset the collector state
   */
  reset(): void {
    this.buffer = [];
    this.recordCount = 0;
  }

  /**
   * Generate a text report of collector state
   */
  getReport(): string {
    const lines = [
      `TelemetryCollector Report`,
      `===========================`,
      `Service: ${this.config.serviceName}`,
      `Enabled: ${this.config.enabled}`,
      `Buffer Size: ${this.buffer.length}/${this.config.maxBufferSize}`,
      `Total Records: ${this.recordCount}`,
      `Flush Interval: ${this.config.flushInterval}ms`,
      `Batch Size: ${this.config.batchSize}`,
      `Metrics:`,
      ...this.buffer.map(m => `  - ${m.name}: ${m.value} (${m.id})`)
    ];
    return lines.join('\n');
  }

  /**
   * Export metrics in a standardized format
   */
  exportMetrics(): { version: string; exportedAt: string; count: number; metrics: MetricRecord[] } {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      count: this.buffer.length,
      metrics: [...this.buffer]
    };
  }
}