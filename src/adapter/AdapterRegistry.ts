/**
 * V111 Adapter Registry
 * Central registry for managing adapter instances
 */

import { Adapter, AdapterConfig, AdapterStats } from './Adapter';

export type RegistryConfig = {
  name: string;
  version: string;
  autoRegister: boolean;
  allowDuplicates: boolean;
  maxAdapters: number;
};

export type RegistryStats = {
  registeredCount: number;
  activeCount: number;
  totalAdaptCalls: number;
  totalConvertCalls: number;
};

export class AdapterRegistry {
  private _config: RegistryConfig;
  private _adapters: Map<string, Adapter>;
  private _stats: RegistryStats;

  constructor(config: Partial<RegistryConfig> = {}) {
    this._config = {
      name: config.name ?? 'AdapterRegistry',
      version: config.version ?? '1.0.0',
      autoRegister: config.autoRegister ?? true,
      allowDuplicates: config.allowDuplicates ?? false,
      maxAdapters: config.maxAdapters ?? 100,
    };
    this._adapters = new Map();
    this._stats = {
      registeredCount: 0,
      activeCount: 0,
      totalAdaptCalls: 0,
      totalConvertCalls: 0,
    };
  }

  get config(): RegistryConfig {
    return { ...this._config };
  }

  register(adapter: Adapter): boolean {
    const adapterId = adapter.config.id;

    if (!this._config.allowDuplicates && this._adapters.has(adapterId)) {
      return false;
    }

    if (this._adapters.size >= this._config.maxAdapters) {
      return false;
    }

    this._adapters.set(adapterId, adapter);
    this._stats.registeredCount++;
    this._stats.activeCount = this._adapters.size;
    return true;
  }

  unregister(adapterId: string): boolean {
    const removed = this._adapters.delete(adapterId);
    if (removed) {
      this._stats.activeCount = this._adapters.size;
    }
    return removed;
  }

  get(adapterId: string): Adapter | undefined {
    return this._adapters.get(adapterId);
  }

  getAll(): Adapter[] {
    return Array.from(this._adapters.values());
  }

  has(adapterId: string): boolean {
    return this._adapters.has(adapterId);
  }

  getByName(name: string): Adapter | undefined {
    for (const adapter of this._adapters.values()) {
      if (adapter.config.name === name) {
        return adapter;
      }
    }
    return undefined;
  }

  getByPriority(minPriority: number = 0): Adapter[] {
    return this.getAll()
      .filter(a => a.config.priority >= minPriority)
      .sort((a, b) => b.config.priority - a.config.priority);
  }

  getStats(): RegistryStats {
    return { ...this._stats };
  }

  recordAdaptCall(): void {
    this._stats.totalAdaptCalls++;
  }

  recordConvertCall(): void {
    this._stats.totalConvertCalls++;
  }

  getSnapshot(): { metrics: RegistryStats } {
    return { metrics: this.getStats() };
  }

  reset(): void {
    this._adapters.clear();
    this._stats = {
      registeredCount: 0,
      activeCount: 0,
      totalAdaptCalls: 0,
      totalConvertCalls: 0,
    };
  }

  getReport(): string {
    return [
      `Registry Report: ${this._config.name} v${this._config.version}`,
      `Adapters: ${this._adapters.size}/${this._config.maxAdapters}`,
      `Registered: ${this._stats.registeredCount} | Active: ${this._stats.activeCount}`,
      `Adapt Calls: ${this._stats.totalAdaptCalls}`,
      `Convert Calls: ${this._stats.totalConvertCalls}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; stats: RegistryStats; config: RegistryConfig } {
    return {
      version: '1.0.0',
      stats: this.getStats(),
      config: this.config,
    };
  }
}