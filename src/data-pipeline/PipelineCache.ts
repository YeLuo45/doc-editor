/**
 * V66 Data Pipeline - PipelineCache
 * Cache pipeline results with set/get/delete/clear/getCached
 */

export type CacheConfig = {
  ttl?: number;
  maxSize?: number;
  compression?: boolean;
};

export type CacheEntry<T> = {
  key: string;
  value: T;
  timestamp: number;
  expiresAt: number;
};

export class PipelineCache {
  config: CacheConfig;
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private hits = 0;
  private misses = 0;

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl || 3600000,
      maxSize: config.maxSize || 1000,
      compression: config.compression || false,
    };
  }

  set(key: string, value: unknown, ttl?: number): void {
    const now = Date.now();
    const entryTtl = ttl || this.config.ttl || 3600000;

    if (this.store.size >= (this.config.maxSize || 1000) && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      key,
      value,
      timestamp: now,
      expiresAt: now + entryTtl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getCached(key: string): unknown | null {
    return this.get(key);
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  size(): number {
    return this.store.size;
  }

  getSnapshot(): { metrics: { size: number; hits: number; misses: number; hitRate: number } } {
    const total = this.hits + this.misses;
    return {
      metrics: {
        size: this.store.size,
        hits: this.hits,
        misses: this.misses,
        hitRate: total > 0 ? this.hits / total : 0,
      },
    };
  }

  reset(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getReport(): string {
    const total = this.hits + this.misses;
    return `PipelineCache Report
========================
Size: ${this.store.size}
MaxSize: ${this.config.maxSize || 1000}
Hits: ${this.hits}
Misses: ${this.misses}
HitRate: ${total > 0 ? (this.hits / total * 100).toFixed(2) : 0}%
TTL: ${this.config.ttl || 3600000}ms`;
  }

  exportMetrics(): { version: string; size: number; hits: number; misses: number } {
    return {
      version: 'v66',
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
    };
  }
}

export default PipelineCache;