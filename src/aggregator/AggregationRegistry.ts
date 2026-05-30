/**
 * AggregationRegistry - V104 for doc-editor
 * Registry for managing multiple aggregators
 */

export type AggregationRegistryConfig = {
  namespace?: string;
  enableValidation?: boolean;
  maxEntries?: number;
};

export interface RegistryEntry {
  id: string;
  name: string;
  data: unknown;
  registeredAt: number;
  metadata?: Record<string, unknown>;
}

export interface RegistryMetrics {
  totalEntries: number;
  activeEntries: number;
  lastRegistration: number;
}

export class AggregationRegistry {
  config: AggregationRegistryConfig;
  private entries: Map<string, RegistryEntry>;
  private metrics: RegistryMetrics;

  constructor(config: AggregationRegistryConfig) {
    this.config = config;
    this.entries = new Map();
    this.metrics = {
      totalEntries: 0,
      activeEntries: 0,
      lastRegistration: 0,
    };
  }

  register(id: string, name: string, data: unknown, metadata?: Record<string, unknown>): boolean {
    if (this.config.enableValidation && this.entries.has(id)) {
      return false;
    }
    if (this.config.maxEntries && this.entries.size >= this.config.maxEntries) {
      return false;
    }
    const entry: RegistryEntry = {
      id,
      name,
      data,
      registeredAt: Date.now(),
      metadata,
    };
    this.entries.set(id, entry);
    this.metrics.totalEntries++;
    this.metrics.activeEntries++;
    this.metrics.lastRegistration = Date.now();
    return true;
  }

  unregister(id: string): boolean {
    const deleted = this.entries.delete(id);
    if (deleted) {
      this.metrics.activeEntries--;
    }
    return deleted;
  }

  get(id: string): RegistryEntry | undefined {
    return this.entries.get(id);
  }

  getAll(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  getStats(): RegistryMetrics {
    return { ...this.metrics };
  }

  getSnapshot(): { metrics: RegistryMetrics } {
    return {
      metrics: this.getStats(),
    };
  }

  reset(): void {
    this.entries.clear();
    this.metrics = {
      totalEntries: 0,
      activeEntries: 0,
      lastRegistration: 0,
    };
  }

  getReport(): string {
    return JSON.stringify({
      namespace: this.config.namespace,
      metrics: this.metrics,
      entries: this.entries.size,
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.4',
      ...this.getSnapshot(),
    };
  }

  getEntriesByName(name: string): RegistryEntry[] {
    return this.getAll().filter(e => e.name === name);
  }

  size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
    this.metrics.activeEntries = 0;
  }
}