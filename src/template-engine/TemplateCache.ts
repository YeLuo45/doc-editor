/**
 * TemplateCache.ts - V69 Template Engine Cache
 * Caches compiled templates for fast retrieval
 */

type CacheConfig = {
  maxEntries: number;
  ttlMs: number;
  evictionPolicy: 'lru' | 'fifo' | 'lfu';
  compressCached: boolean;
  persistToStorage: boolean;
};

interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  size: number;
}

export class TemplateCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private accessOrder: string[] = [];
  public readonly config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 100,
      ttlMs: config.ttlMs ?? 3600000, // 1 hour default
      evictionPolicy: config.evictionPolicy ?? 'lru',
      compressCached: config.compressCached ?? false,
      persistToStorage: config.persistToStorage ?? false,
    };
  }

  set(key: string, value: unknown, size?: number): boolean {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid cache key: must be non-empty string');
    }

    // Check if we need to evict
    if (!this.cache.has(key) && this.cache.size >= this.config.maxEntries) {
      this.evict();
    }

    const entry: CacheEntry<unknown> = {
      key,
      value,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      size: size ?? this.calculateSize(value),
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    
    return true;
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.createdAt > this.config.ttlMs) {
      this.delete(key);
      return null;
    }

    // Update access metadata
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;
    this.updateAccessOrder(key);
    
    return entry.value;
  }

  delete(key: string): boolean {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    return existed;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  getCached(key: string): { exists: boolean; entry: unknown | null; metadata?: Record<string, unknown> } {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { exists: false, entry: null };
    }

    // Check TTL
    if (Date.now() - entry.createdAt > this.config.ttlMs) {
      this.delete(key);
      return { exists: false, entry: null };
    }

    return {
      exists: true,
      entry: entry.value,
      metadata: {
        createdAt: entry.createdAt,
        lastAccessedAt: entry.lastAccessedAt,
        accessCount: entry.accessCount,
        size: entry.size,
        age: Date.now() - entry.createdAt,
      },
    };
  }

  private evict(): void {
    if (this.accessOrder.length === 0) return;

    let keyToEvict: string;

    switch (this.config.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder[0]; // oldest accessed first
        break;
      case 'fifo':
        keyToEvict = this.accessOrder[0]; // oldest created first
        break;
      case 'lfu':
        // Find entry with lowest access count
        let minAccess = Infinity;
        keyToEvict = this.accessOrder[0];
        for (const key of this.accessOrder) {
          const entry = this.cache.get(key);
          if (entry && entry.accessCount < minAccess) {
            minAccess = entry.accessCount;
            keyToEvict = key;
          }
        }
        break;
      default:
        keyToEvict = this.accessOrder[0];
    }

    this.delete(keyToEvict);
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  private calculateSize(value: unknown): number {
    return JSON.stringify(value).length;
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    let totalAccessCount = 0;
    let oldestEntry = 0;
    let newestEntry = 0;

    if (this.cache.size > 0) {
      const entries = Array.from(this.cache.values());
      totalAccessCount = entries.reduce((sum, e) => sum + e.accessCount, 0);
      oldestEntry = Math.min(...entries.map(e => e.createdAt));
      newestEntry = Math.max(...entries.map(e => e.createdAt));
    }

    return {
      metrics: {
        entryCount: this.cache.size,
        maxEntries: this.config.maxEntries,
        ttlMs: this.config.ttlMs,
        evictionPolicy: this.config.evictionPolicy,
        totalAccessCount,
        avgAccessCount: this.cache.size > 0 ? totalAccessCount / this.cache.size : 0,
        oldestEntryAge: oldestEntry ? Date.now() - oldestEntry : 0,
        newestEntryAge: newestEntry ? Date.now() - newestEntry : 0,
      },
    };
  }

  reset(): void {
    this.clear();
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== TemplateCache Report ===',
      `Entries: ${snapshot.metrics.entryCount} / ${snapshot.metrics.maxEntries}`,
      `TTL: ${snapshot.metrics.ttlMs}ms`,
      `Eviction Policy: ${snapshot.metrics.evictionPolicy}`,
      `Total Accesses: ${snapshot.metrics.totalAccessCount}`,
      `Avg Access/Entry: ${snapshot.metrics.avgAccessCount?.toFixed(2)}`,
      `Oldest Entry Age: ${snapshot.metrics.oldestEntryAge}ms`,
      `Newest Entry Age: ${snapshot.metrics.newestEntryAge}ms`,
      '============================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v69-template-engine/cache' };
  }
}