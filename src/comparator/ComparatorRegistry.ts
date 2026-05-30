/**
 * ComparatorRegistry.ts - V135 Comparator Registry
 * Central registry for comparator instances
 */

export type ComparatorRegistryConfig = {
  maxComparators: number;
  allowOverride: boolean;
  enableAutoRegister: boolean;
};

export type ComparatorRegistryStats = {
  totalRegistered: number;
  totalUnregistered: number;
  lookupCount: number;
  failedLookups: number;
  activeComparators: number;
};

export interface RegisteredComparator {
  name: string;
  comparator: unknown;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class ComparatorRegistry {
  config: ComparatorRegistryConfig;
  private registry: Map<string, RegisteredComparator> = new Map();
  private totalRegistered: number = 0;
  private totalUnregistered: number = 0;
  private lookupCount: number = 0;
  private failedLookups: number = 0;

  constructor(config: ComparatorRegistryConfig) {
    this.config = { ...config };
  }

  register(name: string, comparator: unknown, metadata?: Record<string, unknown>): boolean {
    const existing = this.registry.get(name);
    if (existing && !this.config.allowOverride) return false;
    if (this.registry.size >= this.config.maxComparators && !existing) return false;
    this.registry.set(name, { name, comparator, timestamp: Date.now(), metadata });
    this.totalRegistered++;
    return true;
  }

  unregister(name: string): boolean {
    if (!this.registry.has(name)) return false;
    this.registry.delete(name);
    this.totalUnregistered++;
    return true;
  }

  get(name: string): unknown | undefined {
    this.lookupCount++;
    const registered = this.registry.get(name);
    if (!registered) { this.failedLookups++; return undefined; }
    return registered.comparator;
  }

  getAll(): Map<string, RegisteredComparator> { return new Map(this.registry); }
  has(name: string): boolean { return this.registry.has(name); }
  clear(): void { this.registry.clear(); }

  getStats(): ComparatorRegistryStats {
    return {
      totalRegistered: this.totalRegistered,
      totalUnregistered: this.totalUnregistered,
      lookupCount: this.lookupCount,
      failedLookups: this.failedLookups,
      activeComparators: this.registry.size,
    };
  }

  getSnapshot(): { metrics: ComparatorRegistryStats; timestamp: number } {
    return { metrics: this.getStats(), timestamp: Date.now() };
  }

  reset(): void {
    this.registry.clear();
    this.totalRegistered = 0;
    this.totalUnregistered = 0;
    this.lookupCount = 0;
    this.failedLookups = 0;
  }

  getReport(): string {
    const s = this.getSnapshot();
    return [`=== Comparator Registry Report ===`, `Registered: ${s.metrics.totalRegistered}`, `Unregistered: ${s.metrics.totalUnregistered}`, `Lookups: ${s.metrics.lookupCount}`, `Failed: ${s.metrics.failedLookups}`, `Active: ${s.metrics.activeComparators}`, `Time: ${new Date(s.timestamp).toISOString()}`].join('\n');
  }

  exportMetrics(): { version: string } & ComparatorRegistryStats {
    return { version: 'V135', ...this.getStats() };
  }
}