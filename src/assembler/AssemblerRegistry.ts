/**
 * V127 Assembler Registry
 * Central registry for managing assembler instances
 */

import { Assembler, AssemblerConfig } from './Assembler.js';

export type RegistryConfig = {
  maxSize?: number;
  allowDuplicates?: boolean;
  autoCleanup?: boolean;
};

export type RegistryEntry = {
  id: string;
  assembler: Assembler;
  registeredAt: number;
  lastAccessed: number;
};

export class AssemblerRegistry {
  private config: RegistryConfig;
  private entries: Map<string, RegistryEntry> = new Map();
  private accessOrder: string[] = [];

  constructor(config: RegistryConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? 100,
      allowDuplicates: config.allowDuplicates ?? false,
      autoCleanup: config.autoCleanup ?? true,
    };
  }

  /**
   * Register a new assembler
   */
  register(id: string, assembler: Assembler): boolean {
    if (!id || !assembler) return false;

    if (this.entries.has(id)) {
      if (!this.config.allowDuplicates) {
        return false;
      }
      // Replace existing
      this.unregister(id);
    }

    if (this.entries.size >= (this.config.maxSize ?? 100)) {
      if (this.config.autoCleanup && this.accessOrder.length > 0) {
        const oldest = this.accessOrder.shift();
        if (oldest) this.unregister(oldest);
      } else {
        return false;
      }
    }

    this.entries.set(id, {
      id,
      assembler,
      registeredAt: Date.now(),
      lastAccessed: Date.now(),
    });
    this.accessOrder.push(id);
    return true;
  }

  /**
   * Unregister an assembler by ID
   */
  unregister(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    this.entries.delete(id);
    this.accessOrder = this.accessOrder.filter((eid) => eid !== id);
    return true;
  }

  /**
   * Get an assembler by ID
   */
  get(id: string): Assembler | null {
    const entry = this.entries.get(id);
    if (!entry) return null;

    entry.lastAccessed = Date.now();
    return entry.assembler;
  }

  /**
   * Get all registered assemblers
   */
  getAll(): Assembler[] {
    return Array.from(this.entries.values()).map((e) => e.assembler);
  }

  /**
   * Check if an assembler is registered
   */
  has(id: string): boolean {
    return this.entries.has(id);
  }

  /**
   * Get snapshot of registry state
   */
  getSnapshot(): { metrics: Record<string, unknown> } {
    return {
      metrics: {
        size: this.entries.size,
        maxSize: this.config.maxSize,
        ids: Array.from(this.entries.keys()),
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Reset registry to initial state
   */
  reset(): void {
    this.entries.clear();
    this.accessOrder = [];
  }

  /**
   * Generate a status report
   */
  getReport(): string {
    return JSON.stringify(
      {
        size: this.entries.size,
        maxSize: this.config.maxSize,
        allowDuplicates: this.config.allowDuplicates,
        autoCleanup: this.config.autoCleanup,
        entries: Array.from(this.entries.values()).map((e) => ({
          id: e.id,
          registeredAt: new Date(e.registeredAt).toISOString(),
          lastAccessed: new Date(e.lastAccessed).toISOString(),
        })),
      },
      null,
      2
    );
  }

  /**
   * Export metrics in standardized format
   */
  exportMetrics(): { version: string; data: Record<string, unknown> } {
    return {
      version: '1.0.0',
      data: {
        size: this.entries.size,
        maxSize: this.config.maxSize,
        entries: Array.from(this.entries.keys()),
      },
    };
  }

  /**
   * Get registry configuration
   */
  getConfig(): RegistryConfig {
    return { ...this.config };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.reset();
  }
}