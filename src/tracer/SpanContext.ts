/**
 * V108 SpanContext Module
 * Manages span context for distributed tracing
 */

export type SpanContextConfig = {
  enableTags: boolean;
  maxTagLength: number;
  propagateParent: boolean;
};

export type SpanContextData = {
  traceId: string;
  spanId: string;
  parentId?: string;
  tags: Record<string, string>;
  startTime: number;
};

export class SpanContext {
  private traceId: string;
  private spanId: string;
  private parentId?: string;
  private tags: Record<string, string>;
  private startTime: number;
  private config: SpanContextConfig;

  constructor(
    traceId: string,
    spanId: string,
    parentId?: string,
    tags: Record<string, string> = {},
    config: SpanContextConfig = {
      enableTags: true,
      maxTagLength: 256,
      propagateParent: true,
    }
  ) {
    this.traceId = traceId;
    this.spanId = spanId;
    this.parentId = parentId;
    this.tags = { ...tags };
    this.startTime = Date.now();
    this.config = config;
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
    if (!this.config.enableTags) return;
    if (value.length > this.config.maxTagLength) {
      value = value.substring(0, this.config.maxTagLength);
    }
    this.tags[key] = value;
  }

  removeTag(key: string): void {
    delete this.tags[key];
  }

  hasTag(key: string): boolean {
    return key in this.tags;
  }

  getStartTime(): number {
    return this.startTime;
  }

  getConfig(): SpanContextConfig {
    return { ...this.config };
  }

  getData(): SpanContextData {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      parentId: this.parentId,
      tags: { ...this.tags },
      startTime: this.startTime,
    };
  }

  clone(): SpanContext {
    const cloned = new SpanContext(
      this.traceId,
      this.spanId,
      this.parentId,
      { ...this.tags },
      { ...this.config }
    );
    return cloned;
  }

  isChildOf(other: SpanContext): boolean {
    return this.parentId === other.spanId;
  }

  getSnapshot(): { traceId: string; spanId: string; tagCount: number; hasParent: boolean } {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
      tagCount: Object.keys(this.tags).length,
      hasParent: this.parentId !== undefined,
    };
  }

  reset(): void {
    this.tags = {};
    this.startTime = Date.now();
  }

  getReport(): string {
    const parentInfo = this.parentId ? `Parent: ${this.parentId}` : 'No parent';
    const tagList = Object.entries(this.tags).map(([k, v]) => `${k}=${v}`).join(', ');
    return `SpanContext Report:
  TraceId: ${this.traceId}
  SpanId: ${this.spanId}
  ${parentInfo}
  Tags: ${tagList || '(none)'}
  StartTime: ${this.startTime}`;
  }

  exportMetrics(): { version: string; data: SpanContextData; config: SpanContextConfig } {
    return {
      version: '1.0.0',
      data: this.getData(),
      config: { ...this.config },
    };
  }
}