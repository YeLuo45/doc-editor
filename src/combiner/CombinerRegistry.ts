/**
 * V113 CombinerRegistry Module
 * Registry for managing multiple combiner instances
 */

import { Combiner, CombinerConfig } from './Combiner';

export type RegistryConfig = {
  name: string;
  version: string;
  autoRegister?: boolean;
  maxCombiners?: number;
};

export type RegistryStats = {
  totalCombiners: number;
  activeCombiners: number;
  registeredCombiners: number;
  unregisteredCombiners: number;
};

export class CombinerRegistry {
  readonly config: RegistryConfig;
  private combiners: Map<string, Combiner> = new Map();
  private activeId: string | null = null;

  constructor(config: RegistryConfig) {
    this.config = { ...config };
  }

  /**
   * Register a new combiner instance
   */
  register(combiner: Combiner): void {
    if (this.config.maxCombiners && this.combiners.size >= this.config.maxCombiners) {
      throw new Error(`Maximum combiners limit reached: ${this.config.maxCombiners}`);
    }
    const existing = this.combiners.get(combiner.config.id);
    if (existing) {
      throw new Error(`Combiner already registered: ${combiner.config.id}`);
    }
    this.combiners.set(combiner.config.id, combiner);
    if (!this.activeId) {
      this.activeId = combiner.config.id;
    }
  }

  /**
   * Unregister a combiner by ID
   */
  unregister(id: string): boolean {
    const existed = this.combiners.delete(id);
    if (existed && this.activeId === id) {
      this.activeId = this.combiners.size > 0 ? this.combiners.keys().next().value : null;
    }
    return existed;
  }

  /**
   * Get a combiner by ID
   */
  get(id: string): Combiner | undefined {
    return this.combiners.get(id);
  }

  /**
   * Get all registered combiners
   */
  getAll(): Combiner[] {
    return Array.from(this.combiners.values());
  }

  /**
   * Check if a combiner exists
   */
  has(id: string): boolean {
    return this.combiners.has(id);
  }

  /**
   * Get the currently active combiner
   */
  getActive(): Combiner | undefined {
    return this.activeId ? this.combiners.get(this.activeId) : undefined;
  }

  /**
   * Set the active combiner
   */
  setActive(id: string): boolean {
    if (!this.combiners.has(id)) {
      return false;
    }
    this.activeId = id;
    return true;
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    return {
      totalCombiners: this.combiners.size,
      activeCombiners: this.activeId ? 1 : 0,
      registeredCombiners: this.combiners.size,
      unregisteredCombiners: 0,
    };
  }

  /**
   * Get a snapshot of current registry state
   */
  getSnapshot(): { metrics: RegistryStats; config: RegistryConfig; combinerIds: string[] } {
    return {
      metrics: this.getStats(),
      config: this.config,
      combinerIds: Array.from(this.combiners.keys()),
    };
  }

  /**
   * Reset the registry
   */
  reset(): void {
    this.combiners.clear();
    this.activeId = null;
  }

  /**
   * Generate a registry report
   */
  getReport(): string {
    const lines = [
      `=== CombinerRegistry Report ===`,
      `Name: ${this.config.name}`,
      `Version: ${this.config.version}`,
      `Total Combiners: ${this.combiners.size}`,
      `Active ID: ${this.activeId || 'none'}`,
      `Combiners: ${Array.from(this.combiners.keys()).join(', ')}`,
      `==============================`,
    ];
    return lines.join('\n');
  }

  /**
   * Export registry metrics
   */
  exportMetrics(): { version: string; stats: RegistryStats; combinerIds: string[] } {
    return {
      version: this.config.version,
      stats: this.getStats(),
      combinerIds: Array.from(this.combiners.keys()),
    };
  }
}