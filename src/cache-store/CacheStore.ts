/**
 * CacheStore.ts - V88 Cache Store Core
 * Handles cache operations with set/get/delete/clear/has/keys
 */

export type CacheValue = string | number | boolean | object | null;

export interface CacheStoreConfig {
  maxSize: number;
  ttl: number;
  enableCompression: boolean;
  enablePersistence: boolean;
  namespace?: string;
}

export interface CacheEntry {
  key: string;
  value: CacheValue;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

export interface CacheStoreStats {
  totalKeys: number;
  totalHits: number;
  totalMisses: number;
  totalSets: number;
  totalDeletes: number;
  memoryUsage: number;
  hitRate: number;
}

export class CacheStore {
  private store: Map<string, CacheEntry> = new Map();
  public config: CacheStoreConfig;
  private stats: CacheStoreStats;
  private startTime: number;

  constructor(config: CacheStoreConfig) {
    this.config = config;
    this.startTime = Date.now();
    this.stats = {
      totalKeys: 0,
      totalHits: 0,
      totalMisses: 0,
      totalSets: 0,
      totalDeletes: 0,
      memoryUsage: 0,
      hitRate: 0
    };
  }

  set(key: string, value: CacheValue, ttl?: number): boolean {
    const now = Date.now();
    const expiresAt = ttl ? now + ttl : now + this.config.ttl;
    const entry: CacheEntry = {
      key,
      value,
      timestamp: now,
      expiresAt,
      hits: 0
    };
    
    if (this.store.size >= this.config.maxSize && !this.store.has(key)) {
      this.evictOldest();
    }
    
    this.store.set(key, entry);
    this.stats.totalSets++;
    this.stats.totalKeys = this.store.size;
    this.updateMemoryUsage();
    return true;
  }

  get(key: string): CacheValue | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      this.stats.totalMisses++;
      this.updateHitRate();
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.totalMisses++;
      this.stats.totalKeys = this.store.size;
      this.updateMemoryUsage();
      return null;
    }
    
    entry.hits++;
    this.stats.totalHits++;
    this.updateHitRate();
    return entry.value;
  }

  delete(key: string): boolean {
    const existed = this.store.delete(key);
    if (existed) {
      this.stats.totalDeletes++;
      this.stats.totalKeys = this.store.size;
      this.updateMemoryUsage();
    }
    return existed;
  }

  clear(): void {
    this.store.clear();
    this.stats.totalKeys = 0;
    this.updateMemoryUsage();
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.totalKeys = this.store.size;
      this.updateMemoryUsage();
      return false;
    }
    
    return true;
  }

  keys(): string[] {
    const now = Date.now();
    const validKeys: string[] = [];
    
    for (const [key, entry] of this.store.entries()) {
      if (now <= entry.expiresAt) {
        validKeys.push(key);
      } else {
        this.store.delete(key);
      }
    }
    
    this.stats.totalKeys = validKeys.length;
    return validKeys;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  private updateMemoryUsage(): void {
    let usage = 0;
    for (const entry of this.store.values()) {
      usage += JSON.stringify(entry.value).length;
    }
    this.stats.memoryUsage = usage;
  }

  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
  }

  getSnapshot(): { metrics: CacheStoreStats } {
    return {
      metrics: { ...this.stats }
    };
  }

  reset(): void {
    this.store.clear();
    this.stats = {
      totalKeys: 0,
      totalHits: 0,
      totalMisses: 0,
      totalSets: 0,
      totalDeletes: 0,
      memoryUsage: 0,
      hitRate: 0
    };
  }

  getReport(): string {
    return [
      '=== CacheStore Report ===',
      `Namespace: ${this.config.namespace || 'default'}`,
      `Keys: ${this.stats.totalKeys}/${this.config.maxSize}`,
      `Hit Rate: ${(this.stats.hitRate * 100).toFixed(2)}%`,
      `Total Hits: ${this.stats.totalHits}`,
      `Total Misses: ${this.stats.totalMisses}`,
      `Sets: ${this.stats.totalSets}`,
      `Deletes: ${this.stats.totalDeletes}`,
      `Memory: ${this.stats.memoryUsage} bytes`,
      `Uptime: ${Date.now() - this.startTime}ms`
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: CacheStoreStats } {
    return {
      version: 'V88',
      stats: { ...this.stats }
    };
  }
}