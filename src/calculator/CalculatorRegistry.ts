/**
 * V132 Calculator Registry
 * Manages calculator instances registration and lookup
 */

export type RegistryConfig = {
  maxRegistrations: number;
  enableLookupCache: boolean;
  defaultScope: string;
};

export type RegistryEntry = {
  id: string;
  name: string;
  calculator: unknown;
  scope: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
};

export type RegistryStats = {
  totalRegistrations: number;
  activeRegistrations: number;
  lookupsPerformed: number;
  cacheHits: number;
  cacheMisses: number;
};

export class CalculatorRegistry {
  private _config: RegistryConfig;
  private registry: Map<string, RegistryEntry>;
  private lookupCache: Map<string, RegistryEntry>;
  private stats: RegistryStats;

  constructor(config: RegistryConfig) {
    this._config = { ...config };
    this.registry = new Map();
    this.lookupCache = new Map();
    this.stats = {
      totalRegistrations: 0,
      activeRegistrations: 0,
      lookupsPerformed: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  get config(): RegistryConfig {
    return { ...this._config };
  }

  register(id: string, calculator: unknown, scope?: string): boolean {
    if (this.registry.size >= this._config.maxRegistrations) {
      throw new Error('Maximum registrations limit reached');
    }

    if (this.registry.has(id)) {
      throw new Error(`Calculator with id '${id}' already registered`);
    }

    const entry: RegistryEntry = {
      id,
      name: id,
      calculator,
      scope: scope || this._config.defaultScope,
      createdAt: Date.now(),
    };

    this.registry.set(id, entry);

    if (this._config.enableLookupCache) {
      this.lookupCache.set(id, entry);
    }

    this.stats.totalRegistrations++;
    this.stats.activeRegistrations = this.registry.size;

    return true;
  }

  unregister(id: string): boolean {
    const deleted = this.registry.delete(id);

    if (deleted) {
      this.lookupCache.delete(id);
      this.stats.activeRegistrations = this.registry.size;
    }

    return deleted;
  }

  get(id: string): unknown | undefined {
    this.stats.lookupsPerformed++;

    if (this._config.enableLookupCache && this.lookupCache.has(id)) {
      this.stats.cacheHits++;
      return this.lookupCache.get(id)?.calculator;
    }

    this.stats.cacheMisses++;
    const entry = this.registry.get(id);

    if (entry && this._config.enableLookupCache) {
      this.lookupCache.set(id, entry);
    }

    return entry?.calculator;
  }

  getAll(): Map<string, RegistryEntry> {
    return new Map(this.registry);
  }

  has(id: string): boolean {
    return this.registry.has(id);
  }

  getStats(): RegistryStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: RegistryStats } {
    return { metrics: this.getStats() };
  }

  reset(): void {
    this.registry.clear();
    this.lookupCache.clear();
    this.stats = {
      totalRegistrations: 0,
      activeRegistrations: 0,
      lookupsPerformed: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  getReport(): string {
    return [
      '=== Calculator Registry Report ===',
      `Total Registrations: ${this.stats.totalRegistrations}`,
      `Active Registrations: ${this.stats.activeRegistrations}`,
      `Total Lookups: ${this.stats.lookupsPerformed}`,
      `Cache Hits: ${this.stats.cacheHits}`,
      `Cache Misses: ${this.stats.cacheMisses}`,
      `Cache Enabled: ${this._config.enableLookupCache}`,
      '=================================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}