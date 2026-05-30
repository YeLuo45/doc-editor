/**
 * V140 Interpolator Registry
 * Central registry for managing multiple interpolator instances
 */

import { Interpolator, InterpolatorConfig } from './Interpolator';

export interface RegistryConfig {
  enableAutoCleanup: boolean;
  maxEntries: number;
  defaultConfig: Partial<InterpolatorConfig>;
}

export interface RegistryMetrics {
  registeredCount: number;
  activeCount: number;
  totalExecutions: number;
  cacheHits: number;
  cacheMisses: number;
}

export class InterpolatorRegistry {
  public config: RegistryConfig;
  private registry: Map<string, Interpolator>;
  private metrics: RegistryMetrics;
  private executionHistory: Array<{ name: string; timestamp: number }>;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      enableAutoCleanup: true,
      maxEntries: 100,
      defaultConfig: {},
      ...config,
    };
    this.registry = new Map();
    this.metrics = {
      registeredCount: 0,
      activeCount: 0,
      totalExecutions: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    this.executionHistory = [];
  }

  /**
   * Register a new interpolator with a given name
   */
  register(name: string, interpolator: Interpolator): boolean {
    if (this.registry.size >= this.config.maxEntries && !this.registry.has(name)) {
      return false;
    }

    this.registry.set(name, interpolator);
    this.metrics.registeredCount++;
    this.metrics.activeCount = this.registry.size;
    return true;
  }

  /**
   * Unregister an interpolator by name
   */
  unregister(name: string): boolean {
    const deleted = this.registry.delete(name);
    if (deleted) {
      this.metrics.activeCount = this.registry.size;
    }
    return deleted;
  }

  /**
   * Get an interpolator by name
   */
  get(name: string): Interpolator | undefined {
    this.metrics.cacheHits++;
    this.metrics.totalExecutions++;
    return this.registry.get(name);
  }

  /**
   * Get all registered interpolators
   */
  getAll(): Map<string, Interpolator> {
    return new Map(this.registry);
  }

  /**
   * Check if an interpolator exists
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get current registry statistics
   */
  getStats(): RegistryMetrics {
    return { ...this.metrics };
  }

  /**
   * Get a snapshot of current state
   */
  getSnapshot(): { metrics: RegistryMetrics; entries: string[] } {
    return {
      metrics: this.getStats(),
      entries: Array.from(this.registry.keys()),
    };
  }

  /**
   * Reset all metrics and clear execution history
   */
  reset(): void {
    this.metrics = {
      registeredCount: 0,
      activeCount: 0,
      totalExecutions: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    this.executionHistory = [];
  }

  /**
   * Generate a text report of current state
   */
  getReport(): string {
    const cacheHitRate = this.metrics.totalExecutions > 0
      ? ((this.metrics.cacheHits / this.metrics.totalExecutions) * 100).toFixed(2)
      : '0.00';
    return `InterpolatorRegistry Report:
  Registered: ${this.metrics.registeredCount}
  Active: ${this.metrics.activeCount}
  Total Executions: ${this.metrics.totalExecutions}
  Cache Hits: ${this.metrics.cacheHits}
  Cache Misses: ${this.metrics.cacheMisses}
  Cache Hit Rate: ${cacheHitRate}%
  Execution History: ${this.executionHistory.length} entries`;
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; metrics: RegistryMetrics } {
    return {
      version: '1.4.0',
      metrics: this.getStats(),
    };
  }

  /**
   * Create and register a new interpolator with default config
   */
  createInterpolator<T>(name: string, config?: Partial<InterpolatorConfig>): Interpolator<T> {
    const interpolator = new Interpolator<T>({
      ...this.config.defaultConfig,
      ...config,
    });
    this.register(name, interpolator);
    return interpolator;
  }

  /**
   * Clear all registered interpolators
   */
  clear(): void {
    this.registry.clear();
    this.metrics.activeCount = 0;
  }

  /**
   * Get names of all registered interpolators
   */
  getNames(): string[] {
    return Array.from(this.registry.keys());
  }
}

export default InterpolatorRegistry;