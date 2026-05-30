/**
 * SplitterRegistry.ts - V114 Splitter Registry
 * Central registry for managing splitter instances
 */

import { SplitterConfig, SplitResult } from './Splitter';

export interface RegistryConfig {
  maxSplitters: number;
  enableLogging: boolean;
  defaultConfig?: Partial<SplitterConfig>;
}

export interface RegistryStats {
  totalRegistered: number;
  totalUnregistered: number;
  activeSplitters: number;
  lookupCount: number;
}

export class SplitterRegistry {
  public config: RegistryConfig;
  private splitters: Map<string, {
    instance: unknown;
    config: SplitterConfig;
    createdAt: number;
    callCount: number;
  }> = new Map();
  private stats: RegistryStats;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = {
      maxSplitters: config.maxSplitters ?? 100,
      enableLogging: config.enableLogging ?? false,
      defaultConfig: config.defaultConfig,
    };
    this.stats = {
      totalRegistered: 0,
      totalUnregistered: 0,
      activeSplitters: 0,
      lookupCount: 0,
    };
  }

  register(id: string, instance: unknown, config?: SplitterConfig): boolean {
    if (this.splitters.size >= this.config.maxSplitters) {
      if (this.config.enableLogging) {
        console.warn(`Registry at max capacity (${this.config.maxSplitters})`);
      }
      return false;
    }

    if (this.splitters.has(id)) {
      if (this.config.enableLogging) {
        console.warn(`Splitter '${id}' already registered`);
      }
      return false;
    }

    this.splitters.set(id, {
      instance,
      config: config ?? this.config.defaultConfig ?? {
        maxChunkSize: 1000,
        overlap: 0,
        delimiter: '\n',
        enableMetadata: true,
      },
      createdAt: Date.now(),
      callCount: 0,
    });

    this.stats.totalRegistered++;
    this.stats.activeSplitters++;
    return true;
  }

  unregister(id: string): boolean {
    if (this.splitters.has(id)) {
      this.splitters.delete(id);
      this.stats.totalUnregistered++;
      this.stats.activeSplitters--;
      return true;
    }
    return false;
  }

  get(id: string): unknown | undefined {
    this.stats.lookupCount++;
    const entry = this.splitters.get(id);
    if (entry) {
      entry.callCount++;
      return entry.instance;
    }
    return undefined;
  }

  getAll(): Array<{ id: string; instance: unknown; config: SplitterConfig }> {
    const result: Array<{ id: string; instance: unknown; config: SplitterConfig }> = [];
    for (const [id, entry] of this.splitters) {
      result.push({
        id,
        instance: entry.instance,
        config: entry.config,
      });
    }
    return result;
  }

  has(id: string): boolean {
    return this.splitters.has(id);
  }

  getSnapshot(): { metrics: RegistryStats; splitters: string[] } {
    return {
      metrics: { ...this.stats },
      splitters: Array.from(this.splitters.keys()),
    };
  }

  reset(): void {
    this.splitters.clear();
    this.stats = {
      totalRegistered: 0,
      totalUnregistered: 0,
      activeSplitters: 0,
      lookupCount: 0,
    };
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      '=== SplitterRegistry Report ===',
      `Total Registered: ${snap.metrics.totalRegistered}`,
      `Total Unregistered: ${snap.metrics.totalUnregistered}`,
      `Active Splitters: ${snap.metrics.activeSplitters}`,
      `Lookup Count: ${snap.metrics.lookupCount}`,
      `Registered IDs: [${snap.splitters.join(', ')}]`,
      '==============================',
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: RegistryStats } {
    return {
      version: '1.14.0',
      stats: this.getStats(),
    };
  }

  getStats(): RegistryStats {
    return { ...this.stats };
  }
}