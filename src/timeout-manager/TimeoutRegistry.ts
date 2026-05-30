export type RegistryConfig = {
  maxEntries: number;
  enablePruning: boolean;
  defaultTTL: number;
  enableMetrics: boolean;
};

export type RegistryEntry = {
  key: string;
  value: unknown;
  timestamp: number;
  expiresAt: number | null;
  accessCount: number;
  lastAccessTime: number;
};

export type RegistryMetrics = {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  hits: number;
  misses: number;
  evictions: number;
};

const DEFAULT_CONFIG: RegistryConfig = {
  maxEntries: 1000,
  enablePruning: true,
  defaultTTL: 60000,
  enableMetrics: true,
};

export class TimeoutRegistry {
  private entries: Map<string, RegistryEntry> = new Map();
  private config: RegistryConfig;
  private metrics: RegistryMetrics;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      totalEntries: 0,
      activeEntries: 0,
      expiredEntries: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  register(key: string, value: unknown, ttl?: number): boolean {
    if (this.entries.size >= this.config.maxEntries && !this.entries.has(key)) {
      if (this.config.enablePruning) {
        this.prune();
      }
      if (this.entries.size >= this.config.maxEntries) {
        return false;
      }
    }

    const now = Date.now();
    const expiresAt = ttl ? now + ttl : null;
    const entry: RegistryEntry = {
      key,
      value,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessTime: now,
    };

    this.entries.set(key, entry);
    this.metrics.totalEntries++;
    this.metrics.activeEntries++;
    return true;
  }

  unregister(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;

    this.entries.delete(key);
    this.metrics.activeEntries--;
    return true;
  }

  get(key: string): unknown | null {
    const entry = this.entries.get(key);
    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.unregister(key);
      this.metrics.expiredEntries++;
      this.metrics.misses++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccessTime = Date.now();
    this.metrics.hits++;
    return entry.value;
  }

  getAll(): Map<string, RegistryEntry> {
    return new Map(this.entries);
  }

  has(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.unregister(key);
      this.metrics.expiredEntries++;
      return false;
    }

    return true;
  }

  private prune(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.entries) {
      if (entry.expiresAt && now > entry.expiresAt) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.unregister(key);
      this.metrics.evictions++;
    }
  }

  getSnapshot(): { metrics: RegistryMetrics } {
    return {
      metrics: { ...this.metrics },
    };
  }

  reset(): void {
    this.entries.clear();
    this.metrics = {
      totalEntries: 0,
      activeEntries: 0,
      expiredEntries: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return `TimeoutRegistry Report:
  Total Entries: ${snapshot.metrics.totalEntries}
  Active: ${snapshot.metrics.activeEntries}
  Expired: ${snapshot.metrics.expiredEntries}
  Hits: ${snapshot.metrics.hits}
  Misses: ${snapshot.metrics.misses}
  Evictions: ${snapshot.metrics.evictions}`;
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.0.0',
    };
  }
}