/**
 * CacheStrategy.ts - V72 Cache Strategy for doc-editor
 * Provides cache eviction strategies: configure, evict, getStrategy, getMetrics
 */

export type EvictionStrategyType = 'lru' | 'lfu' | 'fifo' | 'random';

export interface StrategyConfig {
  type: EvictionStrategyType;
  maxMemory: number;
  minMemory: number;
  shrinkRatio: number;
  priorityEnabled: boolean;
}

export interface StrategyMetrics {
  evictionsTotal: number;
  evictionsLastHour: number;
  memoryFreed: number;
  hitRate: number;
  strategyType: EvictionStrategyType;
}

interface CacheEntry {
  key: string;
  value: unknown;
  priority: number;
  size: number;
  lastAccess: number;
  accessCount: number;
}

type CacheMap = Map<string, CacheEntry>;

export class CacheStrategy {
  public config: StrategyConfig = {
    type: 'lru',
    maxMemory: 10485760,
    minMemory: 1048576,
    shrinkRatio: 0.2,
    priorityEnabled: true
  };

  private cache: CacheMap = new Map();
  private evictions: number = 0;
  private memoryFreed: number = 0;
  private evictionHistory: number[] = [];

  constructor(config?: Partial<StrategyConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  configure(config: Partial<StrategyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  addEntry(key: string, value: unknown, priority: number = 1): void {
    if (this.cache.has(key)) {
      this.removeEntry(key);
    }

    const entry: CacheEntry = {
      key,
      value,
      priority,
      size: JSON.stringify(value).length,
      lastAccess: Date.now(),
      accessCount: 0
    };

    this.cache.set(key, entry);
    this.ensureMemoryConstraints();
  }

  getEntry(key: string): unknown | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    entry.lastAccess = Date.now();
    entry.accessCount++;
    
    return entry.value;
  }

  evict(count: number = 1): string[] {
    const evictedKeys: string[] = [];
    
    for (let i = 0; i < count && this.cache.size > 0; i++) {
      const victim = this.selectVictim();
      
      if (victim) {
        const entry = this.cache.get(victim);
        if (entry) {
          this.memoryFreed += entry.size;
          this.evictions++;
          this.evictionHistory.push(Date.now());
          evictedKeys.push(victim);
          this.cache.delete(victim);
        }
      }
    }
    
    this.cleanupHistory();
    return evictedKeys;
  }

  getStrategy(): EvictionStrategyType {
    return this.config.type;
  }

  getMetrics(): StrategyMetrics {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    const recentEvictions = this.evictionHistory.filter(
      timestamp => timestamp >= oneHourAgo
    ).length;

    return {
      evictionsTotal: this.evictions,
      evictionsLastHour: recentEvictions,
      memoryFreed: this.memoryFreed,
      hitRate: this.calculateHitRate(),
      strategyType: this.config.type
    };
  }

  setStrategy(type: EvictionStrategyType): void {
    this.config.type = type;
  }

  getPriority(key: string): number {
    const entry = this.cache.get(key);
    return entry ? entry.priority : 0;
  }

  setPriority(key: string, priority: number): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    entry.priority = priority;
    return true;
  }

  private selectVictim(): string | null {
    if (this.cache.size === 0) {
      return null;
    }

    switch (this.config.type) {
      case 'lru':
        return this.selectLRU();
      case 'lfu':
        return this.selectLFU();
      case 'fifo':
        return this.selectFIFO();
      case 'random':
        return this.selectRandom();
      default:
        return this.selectLRU();
    }
  }

  private selectLRM(): string | null {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldest = key;
      }
    }

    return oldest;
  }

  private selectLRU(): string | null {
    let lruKey: string | null = null;
    let lruTime = Date.now() + 1;

    for (const [key, entry] of this.cache) {
      if (this.config.priorityEnabled) {
        const effectiveTime = entry.lastAccess / (entry.priority || 1);
        if (effectiveTime < lruTime) {
          lruTime = effectiveTime;
          lruKey = key;
        }
      } else {
        if (entry.lastAccess < lruTime) {
          lruTime = entry.lastAccess;
          lruKey = key;
        }
      }
    }

    return lruKey;
  }

  private selectLFU(): string | null {
    let lfuKey: string | null = null;
    let minHits = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < minHits) {
        minHits = entry.accessCount;
        lfuKey = key;
      }
    }

    return lfuKey;
  }

  private selectFIFO(): string | null {
    let fifoKey: string | null = null;
    let oldestTime = Date.now() + 1;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        fifoKey = key;
      }
    }

    return fifoKey;
  }

  private selectRandom(): string | null {
    const keys = Array.from(this.cache.keys());
    return keys[Math.floor(Math.random() * keys.length)];
  }

  private ensureMemoryConstraints(): void {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    while (totalSize > this.config.maxMemory && this.cache.size > 0) {
      const victim = this.selectVictim();
      
      if (victim) {
        const entry = this.cache.get(victim);
        if (entry) {
          totalSize -= entry.size;
          this.memoryFreed += entry.size;
          this.evictions++;
          this.evictionHistory.push(Date.now());
          this.cache.delete(victim);
        }
      } else {
        break;
      }
    }
  }

  private cleanupHistory(): void {
    const oneHourAgo = Date.now() - 3600000;
    this.evictionHistory = this.evictionHistory.filter(
      timestamp => timestamp >= oneHourAgo
    );
  }

  private calculateHitRate(): number {
    let totalAccess = 0;
    let hits = 0;

    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
      hits += entry.accessCount > 0 ? 1 : 0;
    }

    return totalAccess > 0 ? hits / this.cache.size : 0;
  }

  private removeEntry(key: string): void {
    this.cache.delete(key);
  }

  getSnapshot(): { metrics: StrategyMetrics } {
    return {
      metrics: this.getMetrics()
    };
  }

  reset(): void {
    this.cache.clear();
    this.evictions = 0;
    this.memoryFreed = 0;
    this.evictionHistory = [];
  }

  getReport(): string {
    const metrics = this.getMetrics();
    const entries = Array.from(this.cache.entries());
    
    return `CacheStrategy Report
=====================
Strategy Type: ${metrics.strategyType}
Total Evictions: ${metrics.evictionsTotal}
Recent Evictions (1h): ${metrics.evictionsLastHour}
Memory Freed: ${this.memoryFreed} bytes
Hit Rate: ${(metrics.hitRate * 100).toFixed(2)}%
Cache Entries: ${this.cache.size}
Max Memory: ${this.config.maxMemory}
Priority Enabled: ${this.config.priorityEnabled}`;
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V72-CacheStrategy-1.0'
    };
  }
}

export default CacheStrategy;