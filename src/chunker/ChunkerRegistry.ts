/**
 * V126 ChunkerRegistry - Registry for managing multiple chunkers
 * Provides centralized chunker registration, lookup, and management
 */

import { Chunker, ChunkerConfig } from './Chunker';

export interface RegistryConfig {
  maxChunkers: number;
  allowDuplicateNames: boolean;
}

export interface RegistryStats {
  totalRegistered: number;
  activeChunkers: number;
}

export class ChunkerRegistry {
  public config: RegistryConfig;
  private chunkers: Map<string, Chunker> = new Map();

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      maxChunkers: config.maxChunkers ?? 100,
      allowDuplicateNames: config.allowDuplicateNames ?? false,
    };
  }

  /**
   * Register a new chunker
   */
  register(name: string, chunker: Chunker): boolean {
    if (this.chunkers.has(name)) {
      if (!this.config.allowDuplicateNames) {
        return false;
      }
    }

    if (this.chunkers.size >= this.config.maxChunkers) {
      return false;
    }

    this.chunkers.set(name, chunker);
    return true;
  }

  /**
   * Register a chunker with config
   */
  registerWithConfig(name: string, config: ChunkerConfig): boolean {
    const chunker = new Chunker(config);
    return this.register(name, chunker);
  }

  /**
   * Unregister a chunker by name
   */
  unregister(name: string): boolean {
    return this.chunkers.delete(name);
  }

  /**
   * Get a chunker by name
   */
  get(name: string): Chunker | undefined {
    return this.chunkers.get(name);
  }

  /**
   * Get all registered chunker names
   */
  getAll(): string[] {
    return Array.from(this.chunkers.keys());
  }

  /**
   * Check if chunker exists
   */
  has(name: string): boolean {
    return this.chunkers.has(name);
  }

  /**
   * Clear all chunkers
   */
  clear(): void {
    this.chunkers.clear();
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
      totalRegistered: this.chunkers.size,
      activeChunkers: this.chunkers.size,
    };
  }

  /**
   * Reset registry
   */
  reset(): void {
    this.chunkers.clear();
  }

  /**
   * Generate text report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    return [
      `ChunkerRegistry Report`,
      `  Total chunkers: ${snap.metrics.totalRegistered}`,
      `  Active: ${snap.metrics.activeChunkers}`,
      `  Max allowed: ${this.config.maxChunkers}`,
      `  Names: ${snap.names.join(', ') || '(none)'}`,
    ].join('\n');
  }

  /**
   * Export metrics
   */
  exportMetrics(): { version: string; stats: RegistryStats; names: string[] } {
    return {
      version: '1.26.0',
      stats: this.getStats(),
      names: this.getAll(),
    };
  }
}