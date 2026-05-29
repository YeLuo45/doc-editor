/**
 * CacheIndex.ts - V88 Cache Index
 * Handles index operations with index/add/remove/find/getIndex/getStats
 */

export type IndexType = 'string' | 'number' | 'date' | 'boolean' | 'array';

export interface CacheIndexConfig {
  enableIndexing: boolean;
  maxIndices: number;
  indexType: IndexType;
  caseSensitive: boolean;
  namespace?: string;
}

export interface IndexEntry {
  key: string;
  value: string | number | boolean | Date | array;
  metadata?: Record<string, unknown>;
}

export interface IndexStats {
  totalIndices: number;
  totalLookups: number;
  totalInserts: number;
  totalRemovals: number;
  avgLookupTime: number;
  indexSize: number;
}

export class CacheIndex {
  private indices: Map<string, Map<string, IndexEntry>> = new Map();
  public config: CacheIndexConfig;
  private stats: IndexStats;
  private startTime: number;

  constructor(config: CacheIndexConfig) {
    this.config = config;
    this.startTime = Date.now();
    this.stats = {
      totalIndices: 0,
      totalLookups: 0,
      totalInserts: 0,
      totalRemovals: 0,
      avgLookupTime: 0,
      indexSize: 0
    };
  }

  index(key: string, value: string | number | boolean | Date | array, metadata?: Record<string, unknown>): boolean {
    if (!this.config.enableIndexing) return false;
    if (this.indices.size >= this.config.maxIndices) return false;

    const normalizedKey = this.normalizeKey(key);
    const entry: IndexEntry = { key, value, metadata };
    
    if (!this.indices.has(normalizedKey)) {
      this.indices.set(normalizedKey, new Map());
    }
    
    this.indices.get(normalizedKey)!.set(key, entry);
    this.stats.totalIndices++;
    this.stats.totalInserts++;
    this.updateIndexSize();
    return true;
  }

  add(key: string, value: string | number | boolean | Date | array, metadata?: Record<string, unknown>): boolean {
    return this.index(key, value, metadata);
  }

  remove(key: string): boolean {
    const normalizedKey = this.normalizeKey(key);
    const indexMap = this.indices.get(normalizedKey);
    
    if (!indexMap) return false;
    
    const existed = indexMap.delete(key);
    if (existed) {
      this.stats.totalIndices--;
      this.stats.totalRemovals++;
      if (indexMap.size === 0) {
        this.indices.delete(normalizedKey);
      }
      this.updateIndexSize();
    }
    return existed;
  }

  find(query: string): IndexEntry[] {
    const startTime = performance.now();
    const results: IndexEntry[] = [];
    const normalizedQuery = this.config.caseSensitive ? query : query.toLowerCase();

    for (const [, indexMap] of this.indices.entries()) {
      for (const [, entry] of indexMap.entries()) {
        const entryValue = String(entry.value);
        const normalizedValue = this.config.caseSensitive ? entryValue : entryValue.toLowerCase();
        
        if (normalizedValue.includes(normalizedQuery)) {
          results.push(entry);
        }
      }
    }

    const elapsed = performance.now() - startTime;
    this.stats.totalLookups++;
    this.updateAvgLookupTime(elapsed);
    return results;
  }

  getIndex(key: string): IndexEntry[] {
    const normalizedKey = this.normalizeKey(key);
    const indexMap = this.indices.get(normalizedKey);
    
    if (!indexMap) return [];
    
    return Array.from(indexMap.values());
  }

  getStats(): IndexStats {
    return { ...this.stats };
  }

  private normalizeKey(key: string): string {
    return this.config.caseSensitive ? key : key.toLowerCase();
  }

  private updateIndexSize(): void {
    let size = 0;
    for (const [, indexMap] of this.indices.entries()) {
      size += indexMap.size;
    }
    this.stats.indexSize = size;
  }

  private updateAvgLookupTime(elapsed: number): void {
    const n = this.stats.totalLookups;
    const currentAvg = this.stats.avgLookupTime;
    this.stats.avgLookupTime = (currentAvg * (n - 1) + elapsed) / n;
  }

  getSnapshot(): { metrics: IndexStats } {
    return {
      metrics: { ...this.stats }
    };
  }

  reset(): void {
    this.indices.clear();
    this.stats = {
      totalIndices: 0,
      totalLookups: 0,
      totalInserts: 0,
      totalRemovals: 0,
      avgLookupTime: 0,
      indexSize: 0
    };
  }

  getReport(): string {
    return [
      '=== CacheIndex Report ===',
      `Namespace: ${this.config.namespace || 'default'}`,
      `Indexing Enabled: ${this.config.enableIndexing}`,
      `Total Indices: ${this.stats.totalIndices}`,
      `Lookups: ${this.stats.totalLookups}`,
      `Inserts: ${this.stats.totalInserts}`,
      `Removals: ${this.stats.totalRemovals}`,
      `Avg Lookup Time: ${this.stats.avgLookupTime.toFixed(2)}ms`,
      `Index Size: ${this.stats.indexSize}`,
      `Uptime: ${Date.now() - this.startTime}ms`
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: IndexStats } {
    return {
      version: 'V88',
      stats: { ...this.stats }
    };
  }
}