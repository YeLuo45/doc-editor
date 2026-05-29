/**
 * StorageCache.ts - V68 Storage Engine Cache
 * Provides caching layer with operations: set, get, evict, getCacheStats
 */

type CacheConfig = {
  maxEntries: number;
  ttlMs: number;
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  onEvict?: (key: string, value: unknown) => void;
};

interface CacheEntry<T> {
  key: string;
  value: T;
  accessCount: number;
  lastAccessed: number;
  createdAt: number;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

export class StorageCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, hitRate: 0 };
  public readonly config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 1000,
      ttlMs: config.ttlMs ?? 3600000, // 1 hour default
      evictionPolicy: config.evictionPolicy ?? 'lru',
      onEvict: config.onEvict,
    };
  }

  set<T>(key: string, value: T): boolean {
    if (!key) {
      throw new Error('Cache key cannot be empty');
    }

    if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
      this.evictOne();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      value,
      accessCount: 1,
      lastAccessed: now,
      createdAt: now,
      expiresAt: now + this.config.ttlMs,
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    return true;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();
    return entry.value;
  }

  evict(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry && this.config.onEvict) {
      this.config.onEvict(key, entry.value);
    }
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.evictions++;
    }
    return deleted;
  }

  getCacheStats(): CacheStats {
    return { ...this.stats };
  }

  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        entryCount: this.cache.size,
        maxEntries: this.config.maxEntries,
        ttlMs: this.config.ttlMs,
        evictionPolicy: this.config.evictionPolicy,
        hitRate: this.stats.hitRate,
        totalHits: this.stats.hits,
        totalMisses: this.stats.misses,
        totalEvictions: this.stats.evictions,
      },
    };
  }

  reset(): void {
    this.cache.clear();
    this.resetStats();
  }

  resetStats(): void {
    this.stats = { hits: 0, misses: 0, evictions: 0, hitRate: 0 };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== StorageCache Report ===',
      `Entries: ${snapshot.metrics.entryCount}/${snapshot.metrics.maxEntries}`,
      `Eviction Policy: ${snapshot.metrics.evictionPolicy}`,
      `TTL: ${snapshot.metrics.ttlMs}ms`,
      `Hit Rate: ${(snapshot.metrics.hitRate as number).toFixed(2)}%`,
      `Hits: ${snapshot.metrics.totalHits}`,
      `Misses: ${snapshot.metrics.totalMisses}`,
      `Evictions: ${snapshot.metrics.totalEvictions}`,
      '============================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v68-storage-engine' };
  }

  private evictOne(): void {
    let victimKey: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru':
        victimKey = this.findLRUKey();
        break;
      case 'lfu':
        victimKey = this.findLFUKey();
        break;
      case 'fifo':
        victimKey = this.findFIFOKey();
        break;
    }

    if (victimKey) {
      this.evict(victimKey);
    }
  }

  private findLRUKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    return oldestKey;
  }

  private findLFUKey(): string | null {
    let lowestFreqKey: string | null = null;
    let lowestFreq = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < lowestFreq) {
        lowestFreq = entry.accessCount;
        lowestFreqKey = key;
      }
    }
    return lowestFreqKey;
  }

  private findFIFOKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    return oldestKey;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}