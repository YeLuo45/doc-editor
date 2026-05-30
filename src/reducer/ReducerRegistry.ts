/**
 * ReducerRegistry.ts - V112 Reducer Registry
 * Manages registration and lookup of reducers
 */

import { Reducer, ReducerConfig } from './Reducer';

export interface RegistryConfig {
  maxReducers?: number;
  allowDuplicates?: boolean;
  autoCleanup?: boolean;
}

export interface RegistryEntry<T = unknown, U = unknown> {
  reducer: Reducer<T, U>;
  registeredAt: number;
  tags?: string[];
}

export class ReducerRegistry<T = unknown, U = unknown> {
  private entries: Map<string, RegistryEntry<T, U>> = new Map();
  private config: RegistryConfig;

  constructor(config: RegistryConfig = {}) {
    this.config = {
      maxReducers: 100,
      allowDuplicates: false,
      autoCleanup: false,
      ...config
    };
  }

  get config(): RegistryConfig {
    return { ...this.config };
  }

  register(id: string, reducer: Reducer<T, U>, tags?: string[]): boolean {
    if (this.entries.has(id)) {
      if (!this.config.allowDuplicates) {
        return false;
      }
    }

    if (this.config.maxReducers && this.entries.size >= this.config.maxReducers) {
      return false;
    }

    this.entries.set(id, {
      reducer,
      registeredAt: Date.now(),
      tags
    });

    return true;
  }

  unregister(id: string): boolean {
    return this.entries.delete(id);
  }

  get(id: string): Reducer<T, U> | undefined {
    const entry = this.entries.get(id);
    return entry?.reducer;
  }

  getAll(): Map<string, RegistryEntry<T, U>> {
    return new Map(this.entries);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  getSnapshot(): { metrics: { count: number; oldest: number; newest: number }; config: RegistryConfig } {
    const entries = Array.from(this.entries.values());
    const timestamps = entries.map(e => e.registeredAt);
    
    return {
      metrics: {
        count: this.entries.size,
        oldest: timestamps.length ? Math.min(...timestamps) : 0,
        newest: timestamps.length ? Math.max(...timestamps) : 0
      },
      config: this.config
    };
  }

  reset(): void {
    this.entries.clear();
  }

  getReport(): string {
    const entries = Array.from(this.entries.entries());
    return [
      `Reducer Registry Report`,
      `Total Reducers: ${this.entries.size}`,
      `Max Allowed: ${this.config.maxReducers}`,
      `Allow Duplicates: ${this.config.allowDuplicates}`,
      `Auto Cleanup: ${this.config.autoCleanup}`,
      '',
      'Registered Reducers:',
      ...entries.map(([id, entry]) => 
        `  - ${id} (registered: ${new Date(entry.registeredAt).toISOString()})`
      )
    ].join('\n');
  }

  exportMetrics(): { version: string; count: number; ids: string[]; config: RegistryConfig } {
    return {
      version: 'V112',
      count: this.entries.size,
      ids: Array.from(this.entries.keys()),
      config: this.config
    };
  }
}

export default ReducerRegistry;