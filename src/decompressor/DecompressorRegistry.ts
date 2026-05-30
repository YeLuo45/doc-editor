/**
 * DecompressorRegistry.ts - V125 Decompressor Registry
 * Registry for managing multiple decompressor instances
 */

import { Decompressor, DecompressorConfig, DecompressorSnapshot } from './Decompressor';

export type RegistryConfig = {
  maxDecompressors?: number;
  defaultAlgorithm?: string;
  autoCleanup?: boolean;
};

export type RegistryStats = {
  totalDecompressors: number;
  activeDecompressors: number;
  totalDecompressions: number;
  registeredAlgorithms: string[];
};

export interface RegistrySnapshot {
  metrics: RegistryStats;
  timestamp: number;
  config: RegistryConfig;
}

/**
 * DecompressorRegistry - Manages multiple decompressor instances
 * Provides registration, lookup, and lifecycle management
 */
export class DecompressorRegistry {
  config: RegistryConfig;
  private decompressors: Map<string, Decompressor> = new Map();
  private algorithmIndex: Map<string, string[]> = new Map();
  private totalDecompressions: number = 0;

  constructor(config: RegistryConfig = {}) {
    this.config = {
      maxDecompressors: config.maxDecompressors ?? 100,
      defaultAlgorithm: config.defaultAlgorithm ?? 'gzip',
      autoCleanup: config.autoCleanup ?? true,
    };
  }

  /**
   * Register a decompressor with a given name
   */
  register(name: string, decompressor: Decompressor): boolean {
    if (this.decompressors.size >= (this.config.maxDecompressors ?? 100)) {
      return false;
    }

    if (this.decompressors.has(name)) {
      return false;
    }

    this.decompressors.set(name, decompressor);
    
    // Index by algorithm
    const algo = decompressor.getDecompressor();
    if (!this.algorithmIndex.has(algo)) {
      this.algorithmIndex.set(algo, []);
    }
    this.algorithmIndex.get(algo)!.push(name);

    return true;
  }

  /**
   * Unregister a decompressor by name
   */
  unregister(name: string): boolean {
    const decompressor = this.decompressors.get(name);
    if (!decompressor) {
      return false;
    }

    // Remove from algorithm index
    const algo = decompressor.getDecompressor();
    const algoList = this.algorithmIndex.get(algo);
    if (algoList) {
      const idx = algoList.indexOf(name);
      if (idx !== -1) {
        algoList.splice(idx, 1);
      }
    }

    return this.decompressors.delete(name);
  }

  /**
   * Get a decompressor by name
   */
  get(name: string): Decompressor | undefined {
    return this.decompressors.get(name);
  }

  /**
   * Get all registered decompressor names
   */
  getAll(): string[] {
    return Array.from(this.decompressors.keys());
  }

  /**
   * Check if a decompressor exists
   */
  has(name: string): boolean {
    return this.decompressors.has(name);
  }

  /**
   * Get decompressors by algorithm type
   */
  getByAlgorithm(algorithm: string): Decompressor[] {
    const names = this.algorithmIndex.get(algorithm) ?? [];
    return names.map(name => this.decompressors.get(name)!).filter(Boolean);
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const registeredAlgorithms = Array.from(this.algorithmIndex.keys());
    
    return {
      totalDecompressors: this.decompressors.size,
      activeDecompressors: this.decompressors.size,
      totalDecompressions: this.totalDecompressions,
      registeredAlgorithms,
    };
  }

  /**
   * Increment decompression counter
   */
  recordDecompression(count: number = 1): void {
    this.totalDecompressions += count;
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): RegistrySnapshot {
    return {
      metrics: this.getStats(),
      timestamp: Date.now(),
      config: { ...this.config },
    };
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.totalDecompressions = 0;
    // Note: decompressors themselves need to be reset individually
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const stats = this.getStats();
    return [
      `Decompressor Registry Report`,
      `=============================`,
      `Total Decompressors: ${stats.totalDecompressors}`,
      `Active Decompressors: ${stats.activeDecompressors}`,
      `Total Decompressions: ${stats.totalDecompressions}`,
      `Registered Algorithms: ${stats.registeredAlgorithms.join(', ') || 'None'}`,
      `Max Decompressors: ${this.config.maxDecompressors}`,
    ].join('\n');
  }

  /**
   * Export metrics as portable object
   */
  exportMetrics(): { version: string; stats: RegistryStats; config: RegistryConfig } {
    return {
      version: 'V125',
      stats: this.getStats(),
      config: { ...this.config },
    };
  }

  /**
   * Clear all registered decompressors
   */
  clear(): void {
    this.decompressors.clear();
    this.algorithmIndex.clear();
  }
}

export default DecompressorRegistry;