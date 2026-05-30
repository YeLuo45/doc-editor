/**
 * V116 BatcherRegistry - Registry for managing multiple batchers
 * Provides centralized batcher registration, lookup, and management
 */

import { Batcher, BatcherConfig } from './Batcher';

export interface RegistryConfig {
  maxBatchers: number;
  allowDuplicateNames: boolean;
}

export interface RegistryStats {
  totalRegistered: number;
  activeBatchers: number;
}

export class BatcherRegistry {
  public config: RegistryConfig;
  private batchers: Map<string, Batcher> = new Map();

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      maxBatchers: config.maxBatchers ?? 100,
      allowDuplicateNames: config.allowDuplicateNames ?? false,
    };
  }

  /**
   * Register a new batcher
   */
  register(name: string, batcher: Batcher): boolean {
    if (this.batchers.has(name)) {
      if (!this.config.allowDuplicateNames) {
        return false;
      }
    }

    if (this.batchers.size >= this.config.maxBatchers) {
      return false;
    }

    this.batchers.set(name, batcher);
    return true;
  }

  /**
   * Register a batcher with config
   */
  registerWithConfig(name: string, config: BatcherConfig): boolean {
    const batcher = new Batcher(config);
    return this.register(name, batcher);
  }

  /**
   * Unregister a batcher by name
   */
  unregister(name: string): boolean {
    return this.batchers.delete(name);
  }

  /**
   * Get a batcher by name
   */
  get(name: string): Batcher | undefined {
    return this.batchers.get(name);
  }

  /**
   * Get all registered batcher names
   */
  getAll(): string[] {
    return Array.from(this.batchers.keys());
  }

  /**
   * Check if batcher exists
   */
  has(name: string): boolean {
    return this.batchers.has(name);
  }

  /**
   * Clear all batchers
   */
  clear(): void {
    this.batchers.clear();
  }

  /**
   * Get snapshot of registry state
   */
  getSnapshot(): { metrics: RegistryStats; names: string[] } {
    return {
      metrics: this.getStats(),
      names: this.getAll(),
    };
  }

  /**
   * Get statistics
   */
  getStats(): RegistryStats {
    return {
      totalRegistered: this.batchers.size,
      activeBatchers: this.batchers.size,
    };
  }

  /**
   * Reset registry
   */
  reset(): void {
    this.batchers.clear();
  }

  /**
   * Generate text report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    return [
      `BatcherRegistry Report`,
      `  Total batchers: ${snap.metrics.totalRegistered}`,
      `  Active: ${snap.metrics.activeBatchers}`,
      `  Max allowed: ${this.config.maxBatchers}`,
      `  Names: ${snap.names.join(', ') || '(none)'}`,
    ].join('\n');
  }

  /**
   * Export metrics
   */
  exportMetrics(): { version: string; stats: RegistryStats; names: string[] } {
    return {
      version: '1.16.0',
      stats: this.getStats(),
      names: this.getAll(),
    };
  }
}