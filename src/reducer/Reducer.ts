/**
 * Reducer.ts - V112 Reducer Core
 * Handles data reduction operations with configurable processing
 */

export interface ReducerConfig {
  id: string;
  name: string;
  version: string;
  maxItems?: number;
  timeout?: number;
  enabled?: boolean;
}

export interface ReducerResult<T = unknown> {
  data: T;
  timestamp: number;
  itemCount: number;
  processingTime: number;
}

export interface ReducerStats {
  totalItems: number;
  processedItems: number;
  failedItems: number;
  averageTime: number;
  lastUpdated: number;
}

export type ReduceFunction<TInput, TOutput> = (input: TInput[]) => TOutput;

export class Reducer<TInput = unknown, TOutput = unknown> {
  private items: TInput[] = [];
  private config: ReducerConfig;
  private stats: ReducerStats;

  constructor(config: ReducerConfig) {
    this.config = { ...config };
    this.stats = {
      totalItems: 0,
      processedItems: 0,
      failedItems: 0,
      averageTime: 0,
      lastUpdated: Date.now()
    };
  }

  get config(): ReducerConfig {
    return { ...this.config };
  }

  add(item: TInput): boolean {
    if (this.config.maxItems && this.items.length >= this.config.maxItems) {
      return false;
    }
    this.items.push(item);
    this.stats.totalItems++;
    this.stats.lastUpdated = Date.now();
    return true;
  }

  remove(index: number): boolean {
    if (index < 0 || index >= this.items.length) {
      return false;
    }
    this.items.splice(index, 1);
    this.stats.lastUpdated = Date.now();
    return true;
  }

  reduce(fn: ReduceFunction<TInput, TOutput>): ReducerResult<TOutput> {
    const startTime = Date.now();
    try {
      const data = fn(this.items);
      const processingTime = Date.now() - startTime;
      
      this.stats.processedItems++;
      this.stats.averageTime = 
        (this.stats.averageTime * (this.stats.processedItems - 1) + processingTime) 
        / this.stats.processedItems;
      this.stats.lastUpdated = Date.now();

      return {
        data,
        timestamp: Date.now(),
        itemCount: this.items.length,
        processingTime
      };
    } catch (error) {
      this.stats.failedItems++;
      this.stats.lastUpdated = Date.now();
      throw error;
    }
  }

  getResult(fn?: ReduceFunction<TInput, TOutput>): TOutput | null {
    if (!fn && this.items.length === 0) {
      return null;
    }
    if (!fn) {
      return this.items as unknown as TOutput;
    }
    try {
      return fn(this.items);
    } catch {
      return null;
    }
  }

  getStats(): ReducerStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: ReducerStats; config: ReducerConfig } {
    return {
      metrics: this.getStats(),
      config: this.config
    };
  }

  reset(): void {
    this.items = [];
    this.stats = {
      totalItems: 0,
      processedItems: 0,
      failedItems: 0,
      averageTime: 0,
      lastUpdated: Date.now()
    };
  }

  getReport(): string {
    return [
      `Reducer Report: ${this.config.name}`,
      `Version: ${this.config.version}`,
      `ID: ${this.config.id}`,
      `Status: ${this.config.enabled ? 'Enabled' : 'Disabled'}`,
      `Total Items: ${this.stats.totalItems}`,
      `Processed: ${this.stats.processedItems}`,
      `Failed: ${this.stats.failedItems}`,
      `Average Time: ${this.stats.averageTime.toFixed(2)}ms`,
      `Last Updated: ${new Date(this.stats.lastUpdated).toISOString()}`
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: ReducerStats; config: ReducerConfig } {
    return {
      version: this.config.version,
      stats: this.getStats(),
      config: this.config
    };
  }
}

export default Reducer;