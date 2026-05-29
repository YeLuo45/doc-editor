/**
 * CacheManager.ts - V72 Cache Management for doc-editor
 * Provides core cache operations: set, get, delete, clear, getStats
 */

export interface CacheConfig {
  maxSize: number;
  ttl: number;
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  enableStats: boolean;
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  hits: number;
  size: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
}

type CacheStore = Map<string, CacheEntry>;

export class CacheManager {
  private store: CacheStore = new Map();
  private accessOrder: string[] = [];
  
  public config: CacheConfig = {
    maxSize: 1000,
    ttl: 3600000,
    evictionPolicy: 'lru',
    enableStats: true
  };

  private stats: CacheStats = {
    size: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0
  };

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  set<T = unknown>(key: string, value: T, ttl?: number): boolean {
    const now = Date.now();
    const size = this.calculateSize(value);
    
    if (this.store.has(key)) {
      const existing = this.store.get(key)!;
      this.stats.totalSize -= existing.size;
      this.store.delete(key);
    }
    
    while (this.store.size >= this.config.maxSize) {
      this.evictOne();
    }
    
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      hits: 0,
      size
    };
    
    this.store.set(key, entry);
    this.accessOrder.push(key);
    this.stats.size = this.store.size;
    this.stats.totalSize += size;
    
    return true;
  }

  get<T = unknown>(key: string): T | null {
    const entry = this.store.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    const now = Date.now();
    const age = this.config.ttl > 0 ? now - entry.timestamp : 0;
    
    if (this.config.ttl > 0 && age > this.config.ttl) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }
    
    entry.hits++;
    entry.timestamp = now;
    this.stats.hits++;
    
    this.updateAccessOrder(key);
    
    return entry.value as T;
  }

  delete(key: string): boolean {
    const entry = this.store.get(key);
    
    if (!entry) {
      return false;
    }
    
    this.stats.totalSize -= entry.size;
    this.store.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.stats.size = this.store.size;
    
    return true;
  }

  clear(): void {
    this.store.clear();
    this.accessOrder = [];
    this.stats = {
      size: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0
    };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (this.config.ttl > 0) {
      const age = Date.now() - entry.timestamp;
      if (age > this.config.ttl) {
        this.delete(key);
        return false;
      }
    }
    
    return true;
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  size(): number {
    return this.store.size;
  }

  private evictOne(): void {
    if (this.accessOrder.length === 0) return;
    
    const keyToEvict = this.accessOrder.shift()!;
    const entry = this.store.get(keyToEvict);
    
    if (entry) {
      this.stats.totalSize -= entry.size;
      this.stats.evictions++;
    }
    
    this.store.delete(keyToEvict);
    this.stats.size = this.store.size;
  }

  private updateAccessOrder(key: string): void {
    if (this.config.evictionPolicy === 'lru') {
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
    }
  }

  private calculateSize(value: unknown): number {
    return JSON.stringify(value).length;
  }

  getSnapshot(): { metrics: CacheStats } {
    return {
      metrics: this.getStats()
    };
  }

  reset(): void {
    this.clear();
  }

  getReport(): string {
    const stats = this.getStats();
    return `CacheManager Report
==================
Size: ${stats.size} / ${this.config.maxSize}
Hits: ${stats.hits}
Misses: ${stats.misses}
Evictions: ${stats.evictions}
Total Size: ${stats.totalSize} bytes
Eviction Policy: ${this.config.evictionPolicy}
Stats Enabled: ${this.config.enableStats}`;
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V72-CacheManager-1.0'
    };
  }
}

export default CacheManager;