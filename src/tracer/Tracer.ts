/**
 * V108 Tracer Module
 * Provides distributed tracing capabilities for doc-editor
 */

export type TracerConfig = {
  serviceName: string;
  enabled: boolean;
  sampleRate: number;
  maxSpans: number;
  exporterEndpoint?: string;
};

export type Span = {
  traceId: string;
  spanId: string;
  parentId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  tags: Record<string, string>;
  status: 'started' | 'ended' | 'error';
};

export class SpanContext {
  private traceId: string;
  private spanId: string;
  private parentId?: string;
  private tags: Record<string, string>;

  constructor(traceId: string, spanId: string, parentId?: string, tags: Record<string, string> = {}) {
    this.traceId = traceId;
    this.spanId = spanId;
    this.parentId = parentId;
    this.tags = { ...tags };
  }

  getTraceId(): string {
    return this.traceId;
  }

  getSpanId(): string {
    return this.spanId;
  }

  getParent(): string | undefined {
    return this.parentId;
  }

  getTags(): Record<string, string> {
    return { ...this.tags };
  }

  setTag(key: string, value: string): void {
    this.tags[key] = value;
  }

  clone(): SpanContext {
    return new SpanContext(this.traceId, this.spanId, this.parentId, { ...this.tags });
  }
}

export class Tracer {
  config: TracerConfig;
  private spans: Map<string, Span>;
  private activeSpans: Set<string>;
  private stats: {
    totalSpans: number;
    startedSpans: number;
    endedSpans: number;
    errorSpans: number;
  };

  constructor(config: TracerConfig) {
    this.config = config;
    this.spans = new Map();
    this.activeSpans = new Set();
    this.stats = {
      totalSpans: 0,
      startedSpans: 0,
      endedSpans: 0,
      errorSpans: 0,
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  trace<T>(operationName: string, fn: (span: Span) => T): T {
    const span = this.start(operationName);
    try {
      const result = fn(span);
      this.end(span.spanId);
      return result;
    } catch (error) {
      this.end(span.spanId, 'error');
      throw error;
    }
  }

  start(operationName: string, parentId?: string): Span {
    const traceId = this.generateId();
    const spanId = this.generateId();
    
    const span: Span = {
      traceId,
      spanId,
      parentId,
      operationName,
      startTime: Date.now(),
      tags: {},
      status: 'started',
    };

    this.spans.set(spanId, span);
    this.activeSpans.add(spanId);
    this.stats.totalSpans++;
    this.stats.startedSpans++;

    return span;
  }

  end(spanId: string, status: 'ended' | 'error' = 'ended'): void {
    const span = this.spans.get(spanId);
    if (!span) {
      throw new Error(`Span ${spanId} not found`);
    }

    span.endTime = Date.now();
    span.status = status;
    this.activeSpans.delete(spanId);
    this.stats.endedSpans++;

    if (status === 'error') {
      this.stats.errorSpans++;
    }
  }

  getSpan(spanId: string): Span | undefined {
    return this.spans.get(spanId);
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  getActiveSpans(): Span[] {
    return Array.from(this.activeSpans).map(id => this.spans.get(id)!).filter(Boolean);
  }

  getSnapshot(): { metrics: typeof this.stats; activeCount: number; spanCount: number } {
    return {
      metrics: { ...this.stats },
      activeCount: this.activeSpans.size,
      spanCount: this.spans.size,
    };
  }

  reset(): void {
    this.spans.clear();
    this.activeSpans.clear();
    this.stats = {
      totalSpans: 0,
      startedSpans: 0,
      endedSpans: 0,
      errorSpans: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return `Tracer Report for ${this.config.serviceName}:
  Enabled: ${this.config.enabled}
  Sample Rate: ${this.config.sampleRate}
  Total Spans: ${snapshot.metrics.totalSpans}
  Started: ${snapshot.metrics.startedSpans}
  Ended: ${snapshot.metrics.endedSpans}
  Errors: ${snapshot.metrics.errorSpans}
  Active: ${snapshot.activeCount}
  Stored: ${snapshot.spanCount}`;
  }

  exportMetrics(): { version: string; stats: typeof this.stats; config: TracerConfig } {
    return {
      version: '1.0.0',
      stats: { ...this.stats },
      config: { ...this.config },
    };
  }
}