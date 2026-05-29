/**
 * CacheWarming.ts - V72 Cache Warming for doc-editor
 * Provides cache warming operations: warm, prefetch, getWarmed, getProgress
 */

export interface WarmingConfig {
  batchSize: number;
  concurrency: number;
  priorityOrder: boolean;
  maxDuration: number;
  retryAttempts: number;
}

export interface WarmEntry {
  key: string;
  data: unknown;
  priority: number;
  loadedAt: number;
  status: 'pending' | 'loading' | 'loaded' | 'failed';
}

export interface WarmingProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  percentage: number;
}

export interface WarmingMetrics {
  totalWarmed: number;
  totalPrefetched: number;
  averageLoadTime: number;
  cacheHits: number;
  cacheMisses: number;
}

type WarmStore = Map<string, WarmEntry>;

export class CacheWarming {
  public config: WarmingConfig = {
    batchSize: 10,
    concurrency: 3,
    priorityOrder: true,
    maxDuration: 300000,
    retryAttempts: 3
  };

  private warmStore: WarmStore = new Map();
  private metrics: WarmingMetrics = {
    totalWarmed: 0,
    totalPrefetched: 0,
    averageLoadTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };
  private loadTimes: number[] = [];
  private startTime: number = 0;

  constructor(config?: Partial<WarmingConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  warm(keys: string[], loader: (key: string) => Promise<unknown>): Promise<void> {
    this.startTime = Date.now();
    
    // First register all keys as pending entries
    for (const key of keys) {
      if (!this.warmStore.has(key)) {
        this.warmStore.set(key, {
          key,
          data: null,
          priority: 0,
          loadedAt: 0,
          status: 'pending'
        });
      }
    }
    
    const sortedKeys = this.config.priorityOrder 
      ? this.sortByPriority(keys)
      : keys;

    const batches = this.createBatches(sortedKeys);
    
    return this.processBatches(batches, loader);
  }

  prefetch(keys: string[], loader: (key: string) => Promise<unknown>): Promise<void> {
    for (const key of keys) {
      if (!this.warmStore.has(key)) {
        this.warmStore.set(key, {
          key,
          data: null,
          priority: 0,
          loadedAt: 0,
          status: 'pending'
        });
      }
    }

    return this.warm(keys, loader);
  }

  getWarmed(key: string): unknown | null {
    const entry = this.warmStore.get(key);
    
    if (!entry) {
      this.metrics.cacheMisses++;
      return null;
    }

    if (entry.status === 'loaded') {
      this.metrics.cacheHits++;
      return entry.data;
    }

    this.metrics.cacheMisses++;
    return null;
  }

  getProgress(): WarmingProgress {
    const entries = Array.from(this.warmStore.values());
    const total = entries.length;
    const completed = entries.filter(e => e.status === 'loaded').length;
    const failed = entries.filter(e => e.status === 'failed').length;
    const inProgress = entries.filter(e => e.status === 'loading').length;
    
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      failed,
      inProgress,
      percentage: Math.round(percentage * 100) / 100
    };
  }

  getMetrics(): WarmingMetrics {
    return { ...this.metrics };
  }

  isWarmed(key: string): boolean {
    const entry = this.warmStore.get(key);
    return entry ? entry.status === 'loaded' : false;
  }

  getStatus(key: string): WarmEntry['status'] | null {
    const entry = this.warmStore.get(key);
    return entry ? entry.status : null;
  }

  setPriority(key: string, priority: number): void {
    const entry = this.warmStore.get(key);
    if (entry) {
      entry.priority = priority;
    }
  }

  getAllWarmed(): string[] {
    return Array.from(this.warmStore.entries())
      .filter(([_, entry]) => entry.status === 'loaded')
      .map(([key]) => key);
  }

  clear(): void {
    this.warmStore.clear();
    this.metrics = {
      totalWarmed: 0,
      totalPrefetched: 0,
      averageLoadTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.loadTimes = [];
  }

  private sortByPriority(keys: string[]): string[] {
    return keys.sort((a, b) => {
      const entryA = this.warmStore.get(a);
      const entryB = this.warmStore.get(b);
      
      const priorityA = entryA ? entryA.priority : 0;
      const priorityB = entryB ? entryB.priority : 0;
      
      return priorityB - priorityA;
    });
  }

  private createBatches(keys: string[]): string[][] {
    const batches: string[][] = [];
    
    for (let i = 0; i < keys.length; i += this.config.batchSize) {
      batches.push(keys.slice(i, i + this.config.batchSize));
    }
    
    return batches;
  }

  private async processBatches(
    batches: string[][],
    loader: (key: string) => Promise<unknown>
  ): Promise<void> {
    for (const batch of batches) {
      const promises = batch.map(key => this.loadEntry(key, loader));
      await Promise.all(promises);
    }
  }

  private async loadEntry(
    key: string,
    loader: (key: string) => Promise<unknown>
  ): Promise<void> {
    const entry = this.warmStore.get(key);
    
    if (!entry) return;

    entry.status = 'loading';
    const start = Date.now();

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const data = await loader(key);
        entry.data = data;
        entry.status = 'loaded';
        entry.loadedAt = Date.now();
        
        const loadTime = Date.now() - start;
        this.loadTimes.push(loadTime);
        this.updateAverageLoadTime();
        this.metrics.totalWarmed++;
        
        return;
      } catch {
        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(100 * (attempt + 1));
        } else {
          entry.status = 'failed';
          this.metrics.totalPrefetched++;
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateAverageLoadTime(): void {
    if (this.loadTimes.length > 100) {
      this.loadTimes = this.loadTimes.slice(-100);
    }
    
    const sum = this.loadTimes.reduce((acc, time) => acc + time, 0);
    this.metrics.averageLoadTime = sum / this.loadTimes.length;
  }

  getSnapshot(): { metrics: WarmingMetrics } {
    return {
      metrics: this.getMetrics()
    };
  }

  reset(): void {
    this.clear();
    this.startTime = 0;
  }

  getReport(): string {
    const progress = this.getProgress();
    const elapsed = this.startTime > 0 ? Date.now() - this.startTime : 0;
    
    return `CacheWarming Report
===================
Total Entries: ${progress.total}
Completed: ${progress.completed}
Failed: ${progress.failed}
In Progress: ${progress.inProgress}
Progress: ${progress.percentage}%
Total Warmed: ${this.metrics.totalWarmed}
Total Prefetched: ${this.metrics.totalPrefetched}
Average Load Time: ${this.metrics.averageLoadTime.toFixed(2)}ms
Cache Hits: ${this.metrics.cacheHits}
Cache Misses: ${this.metrics.cacheMisses}
Elapsed Time: ${elapsed}ms`;
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V72-CacheWarming-1.0'
    };
  }
}

export default CacheWarming;