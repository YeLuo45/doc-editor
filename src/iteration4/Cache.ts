/**
 * Cache.ts - Memory cache module for V34 Iteration 4
 * Provides in-memory caching with set, get, clear, has operations
 */

export interface CacheMetrics {
  sets: number;
  hits: number;
  misses: number;
  evictions: number;
  clears: number;
  errors: number;
}

export interface CacheSnapshot {
  size: number;
  keys: string[];
  metrics: CacheMetrics;
}

export class Cache {
  private cache: Map<string, unknown> = new Map();
  private metrics: CacheMetrics = {
    sets: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    clears: 0,
    errors: 0,
  };

  /**
   * Set a value in cache
   */
  set(key: string, value: unknown): boolean {
    try {
      if (this.cache.has(key)) {
        this.metrics.evictions++;
      }
      this.cache.set(key, value);
      this.metrics.sets++;
      return true;
    } catch (e) {
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Get a value from cache
   */
  get<T = unknown>(key: string): T | undefined {
    try {
      if (this.cache.has(key)) {
        this.metrics.hits++;
        return this.cache.get(key) as T;
      }
      this.metrics.misses++;
      return undefined;
    } catch (e) {
      this.metrics.errors++;
      return undefined;
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.metrics.clears++;
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): boolean {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    if (existed) {
      this.metrics.evictions++;
    }
    return existed;
  }

  /**
   * Get current snapshot of cache state
   */
  getSnapshot(): CacheSnapshot {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset cache to initial state
   */
  reset(): void {
    this.cache.clear();
    this.metrics = {
      sets: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      clears: 0,
      errors: 0,
    };
  }

  /**
   * Get human-readable report
   */
  getReport(): string {
    const hitRate = this.metrics.hits + this.metrics.misses > 0
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
      : '0.00';
    return [
      '=== Cache Report ===',
      `Size: ${this.cache.size}`,
      `Sets: ${this.metrics.sets}`,
      `Hits: ${this.metrics.hits}`,
      `Misses: ${this.metrics.misses}`,
      `Hit Rate: ${hitRate}%`,
      `Evictions: ${this.metrics.evictions}`,
      `Clears: ${this.metrics.clears}`,
      `Errors: ${this.metrics.errors}`,
      '====================',
    ].join('\n');
  }

  /**
   * Export metrics as plain object
   */
  exportMetrics(): CacheMetrics {
    return { ...this.metrics };
  }
}

export default Cache;