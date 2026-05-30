/**
 * CompressorRegistry.ts - V124 Compressor Registry
 * Central registry for compressor registration and lookup
 */

import { Compressor, CompressorConfig } from './Compressor';

export type CompressorRegistryConfig = {
  maxCompressors: number;
  allowOverride: boolean;
  enableAutoRegister: boolean;
  namespace?: string;
};

export type CompressorRegistryStats = {
  totalRegistered: number;
  totalUnregistered: number;
  lookupCount: number;
  failedLookups: number;
  activeCompressors: number;
};

export type CompressorRegistrySnapshot = {
  metrics: CompressorRegistryStats;
  timestamp: number;
  registeredCompressors: string[];
};

export interface RegisteredCompressor {
  name: string;
  compressor: Compressor;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * CompressorRegistry - Central registry for compressor management
 * Handles registration, unregistration, and lookup of compressors
 */
export class CompressorRegistry {
  config: CompressorRegistryConfig;
  private registry: Map<string, RegisteredCompressor> = new Map();
  private namespaces: Map<string, Set<string>> = new Map();
  private totalRegistered: number = 0;
  private totalUnregistered: number = 0;
  private lookupCount: number = 0;
  private failedLookups: number = 0;

  constructor(config: CompressorRegistryConfig) {
    this.config = { ...config };
  }

  /**
   * Register a compressor with a given name
   */
  register(name: string, compressor: Compressor, metadata?: Record<string, unknown>): boolean {
    if (this.registry.has(name) && !this.config.allowOverride) {
      return false;
    }

    if (this.registry.size >= this.config.maxCompressors && !this.registry.has(name)) {
      return false;
    }

    const registered: RegisteredCompressor = {
      name,
      compressor,
      timestamp: Date.now(),
      metadata,
    };

    this.registry.set(name, registered);
    this.totalRegistered++;

    // Handle namespace registration
    if (this.config.namespace) {
      if (!this.namespaces.has(this.config.namespace)) {
        this.namespaces.set(this.config.namespace, new Set());
      }
      this.namespaces.get(this.config.namespace)!.add(name);
    }

    return true;
  }

  /**
   * Unregister a compressor by name
   */
  unregister(name: string): boolean {
    if (!this.registry.has(name)) {
      return false;
    }

    this.registry.delete(name);
    this.totalUnregistered++;

    // Remove from namespace
    if (this.config.namespace) {
      const ns = this.namespaces.get(this.config.namespace);
      if (ns) {
        ns.delete(name);
      }
    }

    return true;
  }

  /**
   * Get a compressor by name
   */
  get(name: string): Compressor | undefined {
    this.lookupCount++;
    const compressor = this.registry.get(name);
    if (!compressor) {
      this.failedLookups++;
      return undefined;
    }
    return compressor.compressor;
  }

  /**
   * Get all registered compressor names
   */
  getAll(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Check if a compressor is registered
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Get current registry stats
   */
  getStats(): CompressorRegistryStats {
    return {
      totalRegistered: this.totalRegistered,
      totalUnregistered: this.totalUnregistered,
      lookupCount: this.lookupCount,
      failedLookups: this.failedLookups,
      activeCompressors: this.registry.size,
    };
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): CompressorRegistrySnapshot {
    return {
      metrics: this.getStats(),
      timestamp: Date.now(),
      registeredCompressors: this.getAll(),
    };
  }

  /**
   * Reset all registry statistics
   */
  reset(): void {
    this.totalRegistered = 0;
    this.totalUnregistered = 0;
    this.lookupCount = 0;
    this.failedLookups = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const stats = this.getStats();
    return [
      `Compressor Registry Report`,
      `===========================`,
      `Total Registered: ${stats.totalRegistered}`,
      `Total Unregistered: ${stats.totalUnregistered}`,
      `Active Compressors: ${stats.activeCompressors}`,
      `Lookup Count: ${stats.lookupCount}`,
      `Failed Lookups: ${stats.failedLookups}`,
      `Registered: [${this.getAll().join(', ')}]`,
    ].join('\n');
  }

  /**
   * Export metrics as portable object
   */
  exportMetrics(): { version: string; stats: CompressorRegistryStats; registered: string[] } {
    return {
      version: 'V124',
      stats: this.getStats(),
      registered: this.getAll(),
    };
  }
}

export default CompressorRegistry;