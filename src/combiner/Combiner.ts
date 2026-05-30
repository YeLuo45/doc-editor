/**
 * V113 Combiner Module
 * Core data combination and merging functionality
 */

export type CombinerConfig = {
  id: string;
  name: string;
  version: string;
  maxItems?: number;
  mergeStrategy?: 'replace' | 'append' | 'merge';
  timestamp?: boolean;
};

export type CombineItem = {
  id: string;
  data: unknown;
  metadata?: Record<string, unknown>;
};

export type CombineResult = {
  items: CombineItem[];
  count: number;
  timestamp: number;
};

export type CombineStats = {
  totalItems: number;
  addedItems: number;
  removedItems: number;
  mergedItems: number;
  lastOperation?: string;
};

export class Combiner {
  readonly config: CombinerConfig;
  private items: Map<string, CombineItem> = new Map();
  private stats: CombineStats = {
    totalItems: 0,
    addedItems: 0,
    removedItems: 0,
    mergedItems: 0,
  };

  constructor(config: CombinerConfig) {
    this.config = { ...config };
  }

  /**
   * Combine multiple items into the combiner
   */
  combine(items: CombineItem[]): CombineResult {
    const results: CombineItem[] = [];
    for (const item of items) {
      const existing = this.items.get(item.id);
      if (existing) {
        const merged = this.mergeItems(existing, item);
        this.items.set(item.id, merged);
        results.push(merged);
        this.stats.mergedItems++;
      } else {
        this.items.set(item.id, item);
        results.push(item);
        this.stats.addedItems++;
      }
      this.stats.totalItems++;
    }
    this.stats.lastOperation = 'combine';
    return this.getResult();
  }

  /**
   * Add a single item to the combiner
   */
  add(item: CombineItem): CombineItem {
    if (this.config.maxItems && this.items.size >= this.config.maxItems) {
      throw new Error(`Maximum items limit reached: ${this.config.maxItems}`);
    }
    const existing = this.items.get(item.id);
    if (existing) {
      const merged = this.mergeItems(existing, item);
      this.items.set(item.id, merged);
      this.stats.mergedItems++;
      this.stats.lastOperation = 'add-merge';
      return merged;
    }
    this.items.set(item.id, item);
    this.stats.addedItems++;
    this.stats.totalItems++;
    this.stats.lastOperation = 'add';
    return item;
  }

  /**
   * Remove an item by ID
   */
  remove(id: string): boolean {
    const existed = this.items.delete(id);
    if (existed) {
      this.stats.removedItems++;
      this.stats.totalItems--;
      this.stats.lastOperation = 'remove';
    }
    return existed;
  }

  /**
   * Get the current result with all items
   */
  getResult(): CombineResult {
    return {
      items: Array.from(this.items.values()),
      count: this.items.size,
      timestamp: Date.now(),
    };
  }

  /**
   * Get current statistics
   */
  getStats(): CombineStats {
    return { ...this.stats };
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): { metrics: CombineStats; config: CombinerConfig; itemCount: number } {
    return {
      metrics: this.getStats(),
      config: this.config,
      itemCount: this.items.size,
    };
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.items.clear();
    this.stats = {
      totalItems: 0,
      addedItems: 0,
      removedItems: 0,
      mergedItems: 0,
      lastOperation: undefined,
    };
  }

  /**
   * Generate a report string
   */
  getReport(): string {
    const lines = [
      `=== Combiner Report ===`,
      `ID: ${this.config.id}`,
      `Name: ${this.config.name}`,
      `Version: ${this.config.version}`,
      `Total Items: ${this.stats.totalItems}`,
      `Added: ${this.stats.addedItems}`,
      `Removed: ${this.stats.removedItems}`,
      `Merged: ${this.stats.mergedItems}`,
      `Last Operation: ${this.stats.lastOperation || 'none'}`,
      `====================`,
    ];
    return lines.join('\n');
  }

  /**
   * Export metrics in standard format
   */
  exportMetrics(): { version: string; stats: CombineStats; config: { id: string; name: string } } {
    return {
      version: this.config.version,
      stats: this.getStats(),
      config: {
        id: this.config.id,
        name: this.config.name,
      },
    };
  }

  private mergeItems(existing: CombineItem, incoming: CombineItem): CombineItem {
    if (this.config.mergeStrategy === 'replace') {
      return incoming;
    }
    if (this.config.mergeStrategy === 'append' && existing.metadata && incoming.metadata) {
      return {
        ...incoming,
        metadata: { ...existing.metadata, ...incoming.metadata },
      };
    }
    return {
      ...incoming,
      metadata: {
        ...(existing.metadata || {}),
        ...(incoming.metadata || {}),
        merged: true,
      },
    };
  }
}