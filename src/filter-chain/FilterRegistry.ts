/**
 * FilterRegistry.ts - V110 Filter Registry
 * Central registry for filter registration/unregistration with lookup capabilities
 */

export type FilterRegistryConfig = {
  maxFilters: number;
  allowOverride: boolean;
  enableAutoRegister: boolean;
  namespace?: string;
};

export type FilterRegistryStats = {
  totalRegistered: number;
  totalUnregistered: number;
  lookupCount: number;
  namespaceLookups: number;
  failedLookups: number;
};

export type FilterRegistrySnapshot = {
  metrics: {
    totalRegistered: number;
    totalUnregistered: number;
    lookupCount: number;
    namespaceLookups: number;
    failedLookups: number;
  };
  timestamp: number;
};

export interface RegisteredFilter {
  name: string;
  filter: unknown;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class FilterRegistry {
  config: FilterRegistryConfig;
  private registry: Map<string, RegisteredFilter> = new Map();
  private namespaces: Map<string, Set<string>> = new Map();
  private totalRegistered: number = 0;
  private totalUnregistered: number = 0;
  private lookupCount: number = 0;
  private namespaceLookups: number = 0;
  private failedLookups: number = 0;

  constructor(config: FilterRegistryConfig) {
    this.config = { ...config };
    if (config.namespace) {
      this.namespaces.set(config.namespace, new Set());
    }
  }

  register(name: string, filter: unknown, metadata?: Record<string, unknown>): boolean {
    const existing = this.registry.get(name);
    if (existing && !this.config.allowOverride) {
      return false;
    }
    if (this.registry.size >= this.config.maxFilters && !existing) {
      return false;
    }

    const registeredFilter: RegisteredFilter = {
      name,
      filter,
      timestamp: Date.now(),
      metadata,
    };

    this.registry.set(name, registeredFilter);
    this.totalRegistered++;

    if (metadata?.namespace && typeof metadata.namespace === 'string') {
      this.addToNamespace(metadata.namespace, name);
    }

    return true;
  }

  unregister(name: string): boolean {
    const removed = this.registry.get(name);
    if (!removed) {
      return false;
    }

    this.registry.delete(name);
    this.totalUnregistered++;

    if (removed.metadata?.namespace && typeof removed.metadata.namespace === 'string') {
      this.removeFromNamespace(removed.metadata.namespace, name);
    }

    return true;
  }

  get(name: string): unknown | undefined {
    this.lookupCount++;
    const registered = this.registry.get(name);
    if (!registered) {
      this.failedLookups++;
      return undefined;
    }
    return registered.filter;
  }

  getAll(): Map<string, RegisteredFilter> {
    return new Map(this.registry);
  }

  has(name: string): boolean {
    return this.registry.has(name);
  }

  getByNamespace(namespace: string): Array<{ name: string; filter: unknown }> {
    this.namespaceLookups++;
    const namespaceFilters = this.namespaces.get(namespace);
    if (!namespaceFilters) {
      return [];
    }

    const results: Array<{ name: string; filter: unknown }> = [];
    for (const name of namespaceFilters) {
      const registered = this.registry.get(name);
      if (registered) {
        results.push({ name: registered.name, filter: registered.filter });
      }
    }
    return results;
  }

  clear(): void {
    this.registry.clear();
    this.namespaces.clear();
    this.totalRegistered = 0;
    this.totalUnregistered = 0;
    this.lookupCount = 0;
    this.namespaceLookups = 0;
    this.failedLookups = 0;
  }

  private addToNamespace(namespace: string, name: string): void {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Set());
    }
    this.namespaces.get(namespace)!.add(name);
  }

  private removeFromNamespace(namespace: string, name: string): void {
    const namespaceSet = this.namespaces.get(namespace);
    if (namespaceSet) {
      namespaceSet.delete(name);
    }
  }

  getStats(): FilterRegistryStats {
    return {
      totalRegistered: this.totalRegistered,
      totalUnregistered: this.totalUnregistered,
      lookupCount: this.lookupCount,
      namespaceLookups: this.namespaceLookups,
      failedLookups: this.failedLookups,
    };
  }

  getSnapshot(): FilterRegistrySnapshot {
    return {
      metrics: {
        totalRegistered: this.totalRegistered,
        totalUnregistered: this.totalUnregistered,
        lookupCount: this.lookupCount,
        namespaceLookups: this.namespaceLookups,
        failedLookups: this.failedLookups,
      },
      timestamp: Date.now(),
    };
  }

  reset(): void {
    this.registry.clear();
    this.namespaces.clear();
    this.totalRegistered = 0;
    this.totalUnregistered = 0;
    this.lookupCount = 0;
    this.namespaceLookups = 0;
    this.failedLookups = 0;
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    const lines = [
      '=== Filter Registry Report ===',
      `Total Registered: ${snapshot.metrics.totalRegistered}`,
      `Total Unregistered: ${snapshot.metrics.totalUnregistered}`,
      `Lookup Count: ${snapshot.metrics.lookupCount}`,
      `Namespace Lookups: ${snapshot.metrics.namespaceLookups}`,
      `Failed Lookups: ${snapshot.metrics.failedLookups}`,
      `Registry Size: ${this.registry.size}`,
      `Namespaces: ${this.namespaces.size}`,
      `Timestamp: ${new Date(snapshot.timestamp).toISOString()}`,
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } & FilterRegistrySnapshot['metrics'] {
    return {
      version: 'V110',
      ...this.getSnapshot().metrics,
    };
  }
}