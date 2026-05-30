/**
 * V115 Accumulator Module
 * Core accumulation functionality for doc-editor
 */

export interface AccumulatorConfig {
  readonly id: string;
  readonly name: string;
  readonly maxSize?: number;
  readonly ttl?: number;
  readonly persistent?: boolean;
}

export interface AccumulatorItem<T = unknown> {
  readonly key: string;
  readonly value: T;
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
}

export interface AccumulatorMetrics {
  readonly totalItems: number;
  readonly uniqueKeys: number;
  readonly addedCount: number;
  readonly removedCount: number;
  readonly lastUpdated: number;
  readonly startTime: number;
}

export interface AccumulatorSnapshot {
  readonly metrics: AccumulatorMetrics;
  readonly config: AccumulatorConfig;
  readonly items: AccumulatorItem[];
}

export class Accumulator<T = unknown> {
  private readonly _config: AccumulatorConfig;
  private readonly _items: Map<string, AccumulatorItem<T>>;
  private _addedCount: number = 0;
  private _removedCount: number = 0;
  private readonly _startTime: number;
  private _lastUpdated: number;

  constructor(config: AccumulatorConfig) {
    this._config = Object.freeze({ ...config });
    this._items = new Map();
    this._startTime = Date.now();
    this._lastUpdated = this._startTime;
  }

  get config(): AccumulatorConfig {
    return this._config;
  }

  getSnapshot(): AccumulatorSnapshot {
    return {
      metrics: this.getStats(),
      config: this._config,
      items: Array.from(this._items.values()),
    };
  }

  reset(): void {
    this._items.clear();
    this._addedCount = 0;
    this._removedCount = 0;
    this._lastUpdated = Date.now();
  }

  getReport(): string {
    const stats = this.getStats();
    const uptime = Date.now() - this._startTime;
    return [
      `Accumulator Report: ${this._config.name}`,
      `  ID: ${this._config.id}`,
      `  Uptime: ${uptime}ms`,
      `  Total Items: ${stats.totalItems}`,
      `  Unique Keys: ${stats.uniqueKeys}`,
      `  Added: ${stats.addedCount}`,
      `  Removed: ${stats.removedCount}`,
      `  Last Updated: ${new Date(stats.lastUpdated).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & AccumulatorMetrics {
    return {
      version: 'v115',
      ...this.getStats(),
    };
  }

  accumulate(key: string, value: T, metadata?: Record<string, unknown>): boolean {
    if (this._config.maxSize && this._items.size >= this._config.maxSize) {
      const oldestKey = this._findOldestKey();
      if (oldestKey) {
        this._items.delete(oldestKey);
        this._removedCount++;
      }
    }

    const item: AccumulatorItem<T> = {
      key,
      value,
      timestamp: Date.now(),
      metadata,
    };

    const isUpdate = this._items.has(key);
    this._items.set(key, item);
    
    if (!isUpdate) {
      this._addedCount++;
    }
    
    this._lastUpdated = Date.now();
    return true;
  }

  add(key: string, value: T, metadata?: Record<string, unknown>): boolean {
    if (this._items.has(key)) {
      return false;
    }
    return this.accumulate(key, value, metadata);
  }

  remove(key: string): boolean {
    if (!this._items.has(key)) {
      return false;
    }
    this._items.delete(key);
    this._removedCount++;
    this._lastUpdated = Date.now();
    return true;
  }

  getResult(key: string): T | undefined {
    return this._items.get(key)?.value;
  }

  getStats(): AccumulatorMetrics {
    const uniqueKeys = new Set(this._items.values()).size;
    return {
      totalItems: this._items.size,
      uniqueKeys: this._items.size,
      addedCount: this._addedCount,
      removedCount: this._removedCount,
      lastUpdated: this._lastUpdated,
      startTime: this._startTime,
    };
  }

  private _findOldestKey(): string | undefined {
    let oldest: { key: string; timestamp: number } | undefined;
    for (const item of this._items.values()) {
      if (!oldest || item.timestamp < oldest.timestamp) {
        oldest = { key: item.key, timestamp: item.timestamp };
      }
    }
    return oldest?.key;
  }

  has(key: string): boolean {
    return this._items.has(key);
  }

  size(): number {
    return this._items.size;
  }

  clear(): void {
    this.reset();
  }

  keys(): string[] {
    return Array.from(this._items.keys());
  }

  values(): T[] {
    return Array.from(this._items.values()).map(item => item.value);
  }

  entries(): Array<[string, T]> {
    return Array.from(this._items.entries()).map(([k, v]) => [k, v.value]);
  }
}

export default Accumulator;