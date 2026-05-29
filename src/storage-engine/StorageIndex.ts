/**
 * StorageIndex.ts - V68 Storage Engine Index
 * Manages index storage with operations: index, build, lookup, getIndexSize
 */

type IndexConfig = {
  indexType: 'btree' | 'hash' | 'inverted';
  maxDepth: number;
  cacheEnabled: boolean;
  syncOnWrite: boolean;
};

interface IndexEntry {
  key: string;
  positions: number[];
  metadata: Record<string, unknown>;
  depth: number;
}

interface IndexStats {
  totalKeys: number;
  totalPositions: number;
  indexSize: number;
  avgDepth: number;
}

export class StorageIndex {
  private indexes: Map<string, IndexEntry> = new Map();
  public readonly config: IndexConfig;

  constructor(config: Partial<IndexConfig> = {}) {
    this.config = {
      indexType: config.indexType ?? 'btree',
      maxDepth: config.maxDepth ?? 16,
      cacheEnabled: config.cacheEnabled ?? true,
      syncOnWrite: config.syncOnWrite ?? false,
    };
  }

  index(key: string, positions: number[], metadata?: Record<string, unknown>): boolean {
    if (!key) {
      throw new Error('Index key cannot be empty');
    }

    const existing = this.indexes.get(key);
    const depth = this.calculateDepth(key);

    if (depth > this.config.maxDepth) {
      throw new Error(`Index depth exceeds max: ${depth} > ${this.config.maxDepth}`);
    }

    const entry: IndexEntry = {
      key,
      positions: existing ? [...existing.positions, ...positions] : positions,
      metadata: metadata ?? {},
      depth,
    };

    this.indexes.set(key, entry);
    return true;
  }

  build(keys: string[], data: Record<string, number[]>): void {
    if (!Array.isArray(keys) || !Array.isArray(data[keys[0]])) {
      throw new Error('Invalid build parameters');
    }

    for (const key of keys) {
      const positions = data[key] ?? [];
      this.index(key, positions, { builtAt: Date.now() });
    }
  }

  lookup(key: string): number[] {
    const entry = this.indexes.get(key);
    return entry ? [...entry.positions] : [];
  }

  getIndexSize(): number {
    return this.indexes.size;
  }

  remove(key: string): boolean {
    return this.indexes.delete(key);
  }

  getStats(): IndexStats {
    let totalPositions = 0;
    let totalDepth = 0;

    this.indexes.forEach(entry => {
      totalPositions += entry.positions.length;
      totalDepth += entry.depth;
    });

    const count = this.indexes.size || 1;
    return {
      totalKeys: this.indexes.size,
      totalPositions,
      indexSize: this.indexes.size,
      avgDepth: totalDepth / count,
    };
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    const stats = this.getStats();
    return {
      metrics: {
        indexType: this.config.indexType,
        totalKeys: stats.totalKeys,
        totalPositions: stats.totalPositions,
        avgDepth: stats.avgDepth,
        maxDepth: this.config.maxDepth,
        cacheEnabled: this.config.cacheEnabled,
      },
    };
  }

  reset(): void {
    this.indexes.clear();
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const stats = this.getStats();
    return [
      '=== StorageIndex Report ===',
      `Index Type: ${this.config.indexType}`,
      `Total Keys: ${stats.totalKeys}`,
      `Total Positions: ${stats.totalPositions}`,
      `Avg Depth: ${snapshot.metrics.avgDepth?.toFixed(2)}`,
      `Max Depth: ${this.config.maxDepth}`,
      `Cache: ${this.config.cacheEnabled ? 'ON' : 'OFF'}`,
      `Sync on Write: ${this.config.syncOnWrite ? 'ON' : 'OFF'}`,
      '============================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v68-storage-engine' };
  }

  private calculateDepth(key: string): number {
    if (this.config.indexType === 'hash') {
      return key.length % this.config.maxDepth;
    }
    return Math.ceil(Math.log(key.length + 1) / Math.log(2));
  }

  clearIndex(): void {
    this.indexes.clear();
  }
}