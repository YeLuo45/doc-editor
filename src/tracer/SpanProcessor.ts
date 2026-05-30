/**
 * V108 SpanProcessor Module
 * Processes and manages spans during tracing operations
 */

export type SpanProcessorConfig = {
  batchSize: number;
  flushInterval: number;
  maxQueueSize: number;
  enableCompression: boolean;
};

export type ProcessedSpan = {
  id: string;
  traceId: string;
  spanId: string;
  operationName: string;
  duration: number;
  tags: Record<string, string>;
  status: 'success' | 'failure';
  timestamp: number;
};

export class SpanProcessor {
  config: SpanProcessorConfig;
  private queue: ProcessedSpan[];
  private spans: Map<string, ProcessedSpan>;
  private stats: {
    processed: number;
    queued: number;
    flushed: number;
    errors: number;
  };
  private startTime: Map<string, number>;

  constructor(config: SpanProcessorConfig) {
    this.config = config;
    this.queue = [];
    this.spans = new Map();
    this.stats = {
      processed: 0,
      queued: 0,
      flushed: 0,
      errors: 0,
    };
    this.startTime = new Map();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  process(
    traceId: string,
    spanId: string,
    operationName: string,
    tags: Record<string, string> = {},
    status: 'success' | 'failure' = 'success'
  ): ProcessedSpan {
    const timestamp = Date.now();
    const start = this.startTime.get(spanId) || timestamp;
    const duration = timestamp - start;

    const processed: ProcessedSpan = {
      id: this.generateId(),
      traceId,
      spanId,
      operationName,
      duration,
      tags: { ...tags },
      status,
      timestamp,
    };

    this.spans.set(spanId, processed);
    this.stats.processed++;

    if (this.queue.length < this.config.maxQueueSize) {
      this.queue.push(processed);
      this.stats.queued++;
    }

    return processed;
  }

  start(spanId: string): void {
    this.startTime.set(spanId, Date.now());
  }

  end(spanId: string, status: 'success' | 'failure' = 'success'): ProcessedSpan | undefined {
    const span = this.spans.get(spanId);
    if (!span) {
      this.stats.errors++;
      return undefined;
    }

    span.status = status;
    span.timestamp = Date.now();

    return span;
  }

  getSpans(): ProcessedSpan[] {
    return Array.from(this.spans.values());
  }

  getSpan(spanId: string): ProcessedSpan | undefined {
    return this.spans.get(spanId);
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  flush(): ProcessedSpan[] {
    const flushed = this.queue.splice(0, this.config.batchSize);
    this.stats.flushed += flushed.length;
    return flushed;
  }

  clear(): void {
    this.queue = [];
  }

  getSnapshot(): {
    metrics: typeof this.stats;
    queueSize: number;
    spanCount: number;
    avgDuration: number;
  } {
    const spans = this.getSpans();
    const totalDuration = spans.reduce((sum, s) => sum + s.duration, 0);
    const avgDuration = spans.length > 0 ? totalDuration / spans.length : 0;

    return {
      metrics: { ...this.stats },
      queueSize: this.queue.length,
      spanCount: this.spans.size,
      avgDuration,
    };
  }

  reset(): void {
    this.queue = [];
    this.spans.clear();
    this.startTime.clear();
    this.stats = {
      processed: 0,
      queued: 0,
      flushed: 0,
      errors: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return `SpanProcessor Report:
  Batch Size: ${this.config.batchSize}
  Max Queue: ${this.config.maxQueueSize}
  Processed: ${snapshot.metrics.processed}
  Queued: ${snapshot.metrics.queued}
  Flushed: ${snapshot.metrics.flushed}
  Errors: ${snapshot.metrics.errors}
  Queue Size: ${snapshot.queueSize}
  Span Count: ${snapshot.spanCount}
  Avg Duration: ${snapshot.avgDuration.toFixed(2)}ms`;
  }

  exportMetrics(): { version: string; stats: typeof this.stats; config: SpanProcessorConfig } {
    return {
      version: '1.0.0',
      stats: { ...this.stats },
      config: { ...this.config },
    };
  }
}