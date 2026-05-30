/**
 * Aggregator - V104 for doc-editor
 * Core aggregation functionality for collecting and processing data
 */

export type AggregatorConfig = {
  name: string;
  maxItems?: number;
  timeout?: number;
  enableMetrics?: boolean;
};

export interface AggregatorItem {
  id: string;
  data: unknown;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface AggregatorMetrics {
  totalItems: number;
  processedItems: number;
  failedItems: number;
  averageLatency: number;
  lastUpdated: number;
}

export class Aggregator {
  config: AggregatorConfig;
  private items: Map<string, AggregatorItem>;
  private metrics: AggregatorMetrics;
  private listeners: Set<(item: AggregatorItem) => void>;

  constructor(config: AggregatorConfig) {
    this.config = config;
    this.items = new Map();
    this.metrics = {
      totalItems: 0,
      processedItems: 0,
      failedItems: 0,
      averageLatency: 0,
      lastUpdated: Date.now(),
    };
    this.listeners = new Set();
  }

  aggregate(item: AggregatorItem): boolean {
    if (this.items.size >= (this.config.maxItems ?? Infinity)) {
      return false;
    }
    this.items.set(item.id, item);
    this.metrics.totalItems++;
    this.metrics.processedItems++;
    this.metrics.lastUpdated = Date.now();
    this.notifyListeners(item);
    return true;
  }

  add(item: Omit<AggregatorItem, 'timestamp'>): boolean {
    const fullItem: AggregatorItem = {
      ...item,
      timestamp: Date.now(),
    };
    return this.aggregate(fullItem);
  }

  remove(id: string): boolean {
    const deleted = this.items.delete(id);
    if (deleted) {
      this.metrics.lastUpdated = Date.now();
    }
    return deleted;
  }

  getResult(): AggregatorItem[] {
    return Array.from(this.items.values());
  }

  getStats(): AggregatorMetrics {
    return { ...this.metrics };
  }

  getSnapshot(): { metrics: AggregatorMetrics } {
    return {
      metrics: this.getStats(),
    };
  }

  reset(): void {
    this.items.clear();
    this.metrics = {
      totalItems: 0,
      processedItems: 0,
      failedItems: 0,
      averageLatency: 0,
      lastUpdated: Date.now(),
    };
  }

  getReport(): string {
    return JSON.stringify({
      name: this.config.name,
      metrics: this.metrics,
      itemCount: this.items.size,
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.4',
      ...this.getSnapshot(),
    };
  }

  onItem(listener: (item: AggregatorItem) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(item: AggregatorItem): void {
    this.listeners.forEach(listener => listener(item));
  }

  size(): number {
    return this.items.size;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  get(id: string): AggregatorItem | undefined {
    return this.items.get(id);
  }
}