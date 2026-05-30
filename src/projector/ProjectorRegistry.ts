/**
 * V138 ProjectorRegistry - Registry for managing projectors
 * Provides centralized registration and lookup of projector instances
 */

import { Projector, ProjectorConfig } from './Projector';

export type RegistryConfig = {
  maxProjectors: number;
  allowDuplicates: boolean;
  autoInitialize: boolean;
};

export type RegistryStats = {
  registeredCount: number;
  activeCount: number;
  lookupHits: number;
  lookupMisses: number;
};

export class ProjectorRegistry {
  private _projectors: Map<string, Projector>;
  private _config: RegistryConfig;
  private _stats: RegistryStats;

  constructor(config: Partial<RegistryConfig> = {}) {
    this._projectors = new Map();
    this._config = {
      maxProjectors: config.maxProjectors ?? 100,
      allowDuplicates: config.allowDuplicates ?? false,
      autoInitialize: config.autoInitialize ?? true,
    };
    this._stats = {
      registeredCount: 0,
      activeCount: 0,
      lookupHits: 0,
      lookupMisses: 0,
    };
  }

  get config(): RegistryConfig {
    return { ...this._config };
  }

  getStats(): RegistryStats {
    return { ...this._stats };
  }

  register(projector: Projector): boolean {
    const id = projector.config.id;

    if (this._projectors.has(id) && !this._config.allowDuplicates) {
      return false;
    }

    if (this._projectors.size >= this._config.maxProjectors) {
      return false;
    }

    this._projectors.set(id, projector);
    this._stats.registeredCount++;
    this._stats.activeCount = this._projectors.size;

    return true;
  }

  unregister(id: string): boolean {
    const removed = this._projectors.delete(id);
    if (removed) {
      this._stats.activeCount = this._projectors.size;
    }
    return removed;
  }

  get(id: string): Projector | undefined {
    const projector = this._projectors.get(id);
    if (projector) {
      this._stats.lookupHits++;
    } else {
      this._stats.lookupMisses++;
    }
    return projector;
  }

  getAll(): Projector[] {
    return Array.from(this._projectors.values());
  }

  has(id: string): boolean {
    return this._projectors.has(id);
  }

  clear(): void {
    this._projectors.clear();
    this._stats.activeCount = 0;
  }

  getSnapshot(): { metrics: RegistryStats; config: RegistryConfig; projectorIds: string[] } {
    return {
      metrics: this.getStats(),
      config: this.config,
      projectorIds: Array.from(this._projectors.keys()),
    };
  }

  reset(): void {
    this._stats = {
      registeredCount: 0,
      activeCount: 0,
      lookupHits: 0,
      lookupMisses: 0,
    };
  }

  getReport(): string {
    const hitRate = this._stats.lookupHits + this._stats.lookupMisses > 0
      ? ((this._stats.lookupHits / (this._stats.lookupHits + this._stats.lookupMisses)) * 100).toFixed(2)
      : '0.00';

    return [
      `ProjectorRegistry Report`,
      `Max Projectors: ${this._config.maxProjectors}`,
      `Allow Duplicates: ${this._config.allowDuplicates}`,
      `Registered: ${this._stats.registeredCount}`,
      `Active: ${this._stats.activeCount}`,
      `Lookup Hits: ${this._stats.lookupHits}`,
      `Lookup Misses: ${this._stats.lookupMisses}`,
      `Hit Rate: ${hitRate}%`,
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: RegistryStats; config: RegistryConfig } {
    return {
      version: 'V138',
      stats: this.getStats(),
      config: this.config,
    };
  }
}