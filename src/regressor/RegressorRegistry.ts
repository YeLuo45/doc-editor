/**
 * V143 RegressorRegistry - Central registry for managing Regressor instances
 * Provides registration, retrieval, and management of regression analyzers
 */

import { Regressor, RegressorConfig } from './Regressor';

export type RegistryConfig = {
  maxEntries: number;
  enablePersistence: boolean;
  autoCleanup: boolean;
  cleanupThreshold: number;
};

export type RegistryEntry = {
  id: string;
  name: string;
  regressor: Regressor;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
};

export class RegressorRegistry {
  private entries: Map<string, RegistryEntry> = new Map();
  private idCounter: number = 0;

  readonly config: RegistryConfig;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 100,
      enablePersistence: config.enablePersistence ?? false,
      autoCleanup: config.autoCleanup ?? true,
      cleanupThreshold: config.cleanupThreshold ?? 0.8,
    };
  }

  register(name: string, regressor: Regressor): string {
    if (this.entries.size >= this.config.maxEntries && this.config.autoCleanup) {
      this.cleanup();
    }

    if (this.entries.size >= this.config.maxEntries) {
      throw new Error(`Registry is full (max: ${this.config.maxEntries})`);
    }

    const id = `reg_${++this.idCounter}_${Date.now()}`;
    const entry: RegistryEntry = {
      id,
      name,
      regressor,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
    };

    this.entries.set(id, entry);
    return id;
  }

  unregister(id: string): boolean {
    return this.entries.delete(id);
  }

  get(id: string): Regressor | undefined {
    const entry = this.entries.get(id);
    if (entry) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      return entry.regressor;
    }
    return undefined;
  }

  getAll(): Regressor[] {
    return Array.from(this.entries.values()).map(entry => entry.regressor);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  findByName(name: string): Regressor[] {
    return Array.from(this.entries.values())
      .filter(entry => entry.name === name)
      .map(entry => entry.regressor);
  }

  getEntry(id: string): RegistryEntry | undefined {
    return this.entries.get(id);
  }

  getEntries(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getCount(): number {
    return this.entries.size;
  }

  private cleanup(): void {
    const threshold = Math.floor(this.config.maxEntries * this.config.cleanupThreshold);
    const sortedEntries = Array.from(this.entries.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    while (this.entries.size > threshold) {
      const oldest = sortedEntries.shift();
      if (oldest) {
        this.entries.delete(oldest[0]);
      }
    }
  }

  clear(): void {
    this.entries.clear();
    this.idCounter = 0;
  }

  getSnapshot(): { 
    count: number; 
    oldestEntry: number | null; 
    newestEntry: number | null;
    totalAccessCount: number;
  } {
    const entries = Array.from(this.entries.values());
    const timestamps = entries.map(e => e.createdAt);
    
    return {
      count: this.entries.size,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
      totalAccessCount: entries.reduce((acc, e) => acc + e.accessCount, 0),
    };
  }

  reset(): void {
    this.clear();
  }

  getReport(): string {
    const entriesList = Array.from(this.entries.values())
      .map(e => `  - ${e.name} (id: ${e.id}, accesses: ${e.accessCount}, created: ${new Date(e.createdAt).toISOString()})`)
      .join('\n');

    const snapshot = this.getSnapshot();

    return `=== RegressorRegistry Report ===
Config:
  Max Entries: ${this.config.maxEntries}
  Enable Persistence: ${this.config.enablePersistence}
  Auto Cleanup: ${this.config.autoCleanup}
  Cleanup Threshold: ${this.config.cleanupThreshold}

Entries: ${this.entries.size}/${this.config.maxEntries}
Total Access Count: ${snapshot.totalAccessCount}
Oldest Entry: ${snapshot.oldestEntry ? new Date(snapshot.oldestEntry).toISOString() : 'N/A'}
Newest Entry: ${snapshot.newestEntry ? new Date(snapshot.newestEntry).toISOString() : 'N/A'}

Registered Regressors:
${entriesList || '  No regressors registered'}
`;
  }

  exportMetrics(): { version: string; config: RegistryConfig; count: number; snapshot: ReturnType<RegressorRegistry['getSnapshot']> } {
    return {
      version: '1.4.3',
      config: this.config,
      count: this.entries.size,
      snapshot: this.getSnapshot(),
    };
  }
}