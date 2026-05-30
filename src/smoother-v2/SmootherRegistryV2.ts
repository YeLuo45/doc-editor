/**
 * V144 SmootherRegistryV2 - Registry for managing SmootherV2 instances
 * Handles registration, lookup, and management of smoother instances
 */

import { SmootherV2, SmootherConfig } from './SmootherV2';

export interface RegistryEntry {
  smoother: SmootherV2;
  registeredAt: number;
  tags: string[];
  enabled: boolean;
}

export interface RegistryStats {
  totalRegistered: number;
  totalUnregistered: number;
  activeCount: number;
  disabledCount: number;
  lookupCount: number;
  lastLookupTime: number;
}

export interface RegistrySnapshot {
  metrics: RegistryStats;
  entries: number;
  timestamp: number;
}

export class SmootherRegistryV2 {
  config: { name: string; maxEntries?: number; allowDuplicates?: boolean };
  private entries: Map<string, RegistryEntry>;
  private stats: RegistryStats;
  private snapshot: RegistrySnapshot | null;
  private tagIndex: Map<string, Set<string>>;

  constructor(config?: { name?: string; maxEntries?: number; allowDuplicates?: boolean }) {
    this.config = {
      name: config?.name || 'smoother-registry-v2',
      maxEntries: config?.maxEntries || 100,
      allowDuplicates: config?.allowDuplicates ?? false,
    };
    this.entries = new Map();
    this.stats = {
      totalRegistered: 0,
      totalUnregistered: 0,
      activeCount: 0,
      disabledCount: 0,
      lookupCount: 0,
      lastLookupTime: 0,
    };
    this.snapshot = null;
    this.tagIndex = new Map();
  }

  register(smoother: SmootherV2, tags?: string[]): boolean {
    const name = smoother.config.name;

    if (!this.config.allowDuplicates && this.entries.has(name)) {
      return false;
    }

    if (this.entries.size >= (this.config.maxEntries || 100)) {
      return false;
    }

    const entry: RegistryEntry = {
      smoother,
      registeredAt: Date.now(),
      tags: tags || [],
      enabled: true,
    };

    this.entries.set(name, entry);
    this.stats.totalRegistered++;
    this.stats.activeCount++;

    if (tags) {
      for (const tag of tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(name);
      }
    }

    this.snapshot = {
      metrics: { ...this.stats },
      entries: this.entries.size,
      timestamp: Date.now(),
    };

    return true;
  }

  unregister(name: string): boolean {
    const entry = this.entries.get(name);

    if (!entry) {
      return false;
    }

    for (const tag of entry.tags) {
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(name);
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    this.entries.delete(name);
    this.stats.totalUnregistered++;

    if (entry.enabled) {
      this.stats.activeCount--;
    } else {
      this.stats.disabledCount--;
    }

    this.snapshot = {
      metrics: { ...this.stats },
      entries: this.entries.size,
      timestamp: Date.now(),
    };

    return true;
  }

  get(name: string): SmootherV2 | null {
    this.stats.lookupCount++;
    this.stats.lastLookupTime = Date.now();

    const entry = this.entries.get(name);
    return entry?.enabled ? entry.smoother : null;
  }

  getAll(): SmootherV2[] {
    this.stats.lookupCount++;
    this.stats.lastLookupTime = Date.now();

    const result: SmootherV2[] = [];
    for (const entry of this.entries.values()) {
      if (entry.enabled) {
        result.push(entry.smoother);
      }
    }
    return result;
  }

  has(name: string): boolean {
    this.stats.lookupCount++;
    this.stats.lastLookupTime = Date.now();

    const entry = this.entries.get(name);
    return entry !== undefined && entry.enabled;
  }

  getByTag(tag: string): SmootherV2[] {
    this.stats.lookupCount++;
    const tagSet = this.tagIndex.get(tag);
    if (!tagSet) return [];

    const result: SmootherV2[] = [];
    for (const name of tagSet) {
      const entry = this.entries.get(name);
      if (entry?.enabled) {
        result.push(entry.smoother);
      }
    }
    return result;
  }

  enable(name: string): boolean {
    const entry = this.entries.get(name);
    if (!entry) return false;

    if (!entry.enabled) {
      entry.enabled = true;
      this.stats.activeCount++;
      this.stats.disabledCount--;
    }

    return true;
  }

  disable(name: string): boolean {
    const entry = this.entries.get(name);
    if (!entry) return false;

    if (entry.enabled) {
      entry.enabled = false;
      this.stats.activeCount--;
      this.stats.disabledCount++;
    }

    return true;
  }

  listNames(): string[] {
    return Array.from(this.entries.keys());
  }

  getStats(): RegistryStats {
    return { ...this.stats };
  }

  getSnapshot(): { metrics: RegistryStats } {
    return {
      metrics: this.snapshot?.metrics || { ...this.stats },
    };
  }

  reset(): void {
    this.entries.clear();
    this.tagIndex.clear();
    this.stats = {
      totalRegistered: 0,
      totalUnregistered: 0,
      activeCount: 0,
      disabledCount: 0,
      lookupCount: 0,
      lastLookupTime: 0,
    };
    this.snapshot = null;
  }

  getReport(): string {
    const activeSmoothers = this.getAll();
    const smootherNames = activeSmoothers.map(s => s.config.name).join(', ') || 'none';

    return [
      `SmootherRegistryV2 Report: ${this.config.name}`,
      `Max Entries: ${this.config.maxEntries}`,
      `Allow Duplicates: ${this.config.allowDuplicates}`,
      `Total Registered: ${this.stats.totalRegistered}`,
      `Total Unregistered: ${this.stats.totalUnregistered}`,
      `Active Count: ${this.stats.activeCount}`,
      `Disabled Count: ${this.stats.disabledCount}`,
      `Lookup Count: ${this.stats.lookupCount}`,
      `Last Lookup: ${new Date(this.stats.lastLookupTime).toISOString()}`,
      `Active Smoothers: ${smootherNames}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: '1.44.0',
    };
  }
}

export default SmootherRegistryV2;