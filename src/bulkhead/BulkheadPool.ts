/**
 * BulkheadPool.ts - V105 Bulkhead Pool Management
 * Manages multiple bulkhead instances with pool-based access
 */

import { Bulkhead, BulkheadConfig, BulkheadMetrics, BulkheadState } from './Bulkhead';

export type BulkheadPoolConfig = {
  name: string;
  poolSize: number;
  defaultConfig: BulkheadConfig;
  strategy: 'round-robin' | 'least-loaded' | 'random' | 'session-affinity';
};

export type PooledBulkhead = {
  id: string;
  bulkhead: Bulkhead;
  stats: BulkheadMetrics;
};

export type BulkheadPoolMetrics = {
  poolSize: number;
  activeCount: number;
  totalAcquired: number;
  totalReleased: number;
  totalRejected: number;
  averageLoad: number;
};

export class BulkheadPool {
  readonly config: BulkheadPoolConfig;
  private pool: Map<string, Bulkhead> = new Map();
  private roundRobinIndex: number = 0;
  private totalAcquired: number = 0;
  private totalReleased: number = 0;
  private totalRejected: number = 0;

  constructor(config: BulkheadPoolConfig) {
    this.config = config;
    this.initialize();
  }

  /**
   * Initialize the pool with configured number of bulkheads
   */
  private initialize(): void {
    for (let i = 0; i < this.config.poolSize; i++) {
      const id = `${this.config.name}-${i}`;
      const bulkhead = new Bulkhead({
        ...this.config.defaultConfig,
        name: id,
      });
      this.pool.set(id, bulkhead);
    }
  }

  /**
   * Create a new bulkhead with custom config (adds to pool)
   */
  create(id: string, config?: Partial<BulkheadConfig>): Bulkhead {
    if (this.pool.has(id)) {
      return this.pool.get(id)!;
    }
    
    const bulkhead = new Bulkhead({
      ...this.config.defaultConfig,
      ...config,
      name: id,
    });
    this.pool.set(id, bulkhead);
    return bulkhead;
  }

  /**
   * Get a bulkhead by ID
   */
  get(id: string): Bulkhead | undefined {
    return this.pool.get(id);
  }

  /**
   * Get a bulkhead using the configured strategy
   */
  getPool(): Bulkhead {
    const ids = Array.from(this.pool.keys());
    
    switch (this.config.strategy) {
      case 'round-robin':
        const rrId = ids[this.roundRobinIndex % ids.length];
        this.roundRobinIndex++;
        return this.pool.get(rrId)!;
      
      case 'least-loaded': {
        let minLoad = Infinity;
        let selectedId = ids[0];
        for (const id of ids) {
          const bh = this.pool.get(id)!;
          const stats = bh.getStats();
          if (stats.activeCount < minLoad) {
            minLoad = stats.activeCount;
            selectedId = id;
          }
        }
        return this.pool.get(selectedId)!;
      }
      
      case 'random':
        const randomIdx = Math.floor(Math.random() * ids.length);
        return this.pool.get(ids[randomIdx])!;
      
      case 'session-affinity':
        // Default to first bulkhead for session affinity
        return this.pool.get(ids[0])!;
      
      default:
        return this.pool.get(ids[0])!;
    }
  }

  /**
   * Get statistics for a specific bulkhead
   */
  getStats(id: string): BulkheadMetrics | undefined {
    const bulkhead = this.pool.get(id);
    return bulkhead ? bulkhead.getStats() : undefined;
  }

  /**
   * Get statistics for all pooled bulkheads
   */
  getPools(): PooledBulkhead[] {
    const result: PooledBulkhead[] = [];
    for (const [id, bulkhead] of this.pool) {
      result.push({
        id,
        bulkhead,
        stats: bulkhead.getStats(),
      });
    }
    return result;
  }

  /**
   * Get pool-level metrics
   */
  getPoolStats(): BulkheadPoolMetrics {
    let activeCount = 0;
    let totalAcquired = 0;
    
    for (const bulkhead of this.pool.values()) {
      const stats = bulkhead.getStats();
      activeCount += stats.activeCount;
      totalAcquired += stats.totalAcquired;
    }
    
    return {
      poolSize: this.pool.size,
      activeCount,
      totalAcquired: this.totalAcquired,
      totalReleased: this.totalReleased,
      totalRejected: this.totalRejected,
      averageLoad: this.pool.size > 0 ? activeCount / this.pool.size : 0,
    };
  }

  /**
   * Record acquisition across pool
   */
  recordAcquire(): void {
    this.totalAcquired++;
  }

  /**
   * Record release across pool
   */
  recordRelease(): void {
    this.totalReleased++;
  }

  /**
   * Record rejection across pool
   */
  recordReject(): void {
    this.totalRejected++;
  }

  /**
   * Reset all bulkheads in the pool
   */
  reset(): void {
    for (const bulkhead of this.pool.values()) {
      bulkhead.reset();
    }
    this.roundRobinIndex = 0;
    this.totalAcquired = 0;
    this.totalReleased = 0;
    this.totalRejected = 0;
  }

  /**
   * Clear specific bulkhead from pool
   */
  remove(id: string): boolean {
    return this.pool.delete(id);
  }

  /**
   * Get current pool size
   */
  size(): number {
    return this.pool.size;
  }

  /**
   * Get snapshot of pool state
   */
  getSnapshot(): { metrics: BulkheadPoolMetrics } {
    return {
      metrics: this.getPoolStats(),
    };
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const name = this.config.name;
    const size = this.pool.size;
    const stats = this.getPoolStats();
    
    return [
      `=== BulkheadPool Report: ${name} ===`,
      `Pool Size: ${size}`,
      `Strategy: ${this.config.strategy}`,
      `Active Count: ${stats.activeCount}`,
      `Average Load: ${stats.averageLoad.toFixed(2)}`,
      `Total Acquired: ${stats.totalAcquired}`,
      `Total Released: ${stats.totalReleased}`,
      `Total Rejected: ${stats.totalRejected}`,
    ].join('\n');
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): { version: string } {
    return {
      version: 'V105',
    };
  }
}