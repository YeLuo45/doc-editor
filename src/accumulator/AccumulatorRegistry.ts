/**
 * V115 Accumulator Registry
 * Manages multiple accumulator instances
 */

import { Accumulator, AccumulatorConfig, AccumulatorItem, AccumulatorMetrics } from './Accumulator';

export interface RegistryConfig {
  readonly namespace: string;
  readonly autoCleanup?: boolean;
  readonly maxRegistries?: number;
}

export interface RegistryMetrics {
  readonly registeredCount: number;
  readonly activeCount: number;
  readonly totalItems: number;
  readonly timestamp: number;
}

export interface RegistrySnapshot {
  readonly metrics: RegistryMetrics;
  readonly config: RegistryConfig;
  readonly accumulatorIds: string[];
}

export class AccumulatorRegistry {
  private readonly _config: RegistryConfig;
  private readonly _accumulators: Map<string, Accumulator>;
  private readonly _creationTime: number;

  constructor(config: RegistryConfig) {
    this._config = Object.freeze({ ...config });
    this._accumulators = new Map();
    this._creationTime = Date.now();
  }

  get config(): RegistryConfig {
    return this._config;
  }

  getSnapshot(): RegistrySnapshot {
    return {
      metrics: this.getStats(),
      config: this._config,
      accumulatorIds: this.getAll(),
    };
  }

  reset(): void {
    for (const accumulator of this._accumulators.values()) {
      accumulator.reset();
    }
  }

  getReport(): string {
    const stats = this.getStats();
    const uptime = Date.now() - this._creationTime;
    return [
      `Accumulator Registry Report: ${this._config.namespace}`,
      `  Uptime: ${uptime}ms`,
      `  Registered: ${stats.registeredCount}`,
      `  Active: ${stats.activeCount}`,
      `  Total Items: ${stats.totalItems}`,
      `  Accumulators: [${this.getAll().join(', ')}]`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & RegistryMetrics {
    return {
      version: 'v115',
      ...this.getStats(),
    };
  }

  register(config: AccumulatorConfig): Accumulator {
    if (this._accumulators.has(config.id)) {
      throw new Error(`Accumulator with id '${config.id}' already registered`);
    }

    const accumulator = new Accumulator(config);
    this._accumulators.set(config.id, accumulator);
    return accumulator;
  }

  unregister(id: string): boolean {
    return this._accumulators.delete(id);
  }

  get(id: string): Accumulator | undefined {
    return this._accumulators.get(id);
  }

  getAll(): string[] {
    return Array.from(this._accumulators.keys());
  }

  has(id: string): boolean {
    return this._accumulators.has(id);
  }

  getStats(): RegistryMetrics {
    let totalItems = 0;
    for (const acc of this._accumulators.values()) {
      totalItems += acc.size();
    }

    return {
      registeredCount: this._accumulators.size,
      activeCount: this._accumulators.size,
      totalItems,
      timestamp: Date.now(),
    };
  }

  findByName(name: string): Accumulator | undefined {
    for (const acc of this._accumulators.values()) {
      if (acc.config.name === name) {
        return acc;
      }
    }
    return undefined;
  }

  findByPrefix(prefix: string): Accumulator[] {
    const results: Accumulator[] = [];
    for (const acc of this._accumulators.values()) {
      if (acc.config.name.startsWith(prefix)) {
        results.push(acc);
      }
    }
    return results;
  }

  clear(): void {
    this._accumulators.clear();
  }

  size(): number {
    return this._accumulators.size;
  }

  executeOnAll(fn: (acc: Accumulator) => void): void {
    for (const accumulator of this._accumulators.values()) {
      fn(accumulator);
    }
  }

  getMetricsForAll(): Map<string, AccumulatorMetrics> {
    const result = new Map<string, AccumulatorMetrics>();
    for (const [id, acc] of this._accumulators.entries()) {
      result.set(id, acc.getStats());
    }
    return result;
  }

  getAllSnapshots(): Map<string, ReturnType<Accumulator['getSnapshot']>> {
    const result = new Map();
    for (const [id, acc] of this._accumulators.entries()) {
      result.set(id, acc.getSnapshot());
    }
    return result;
  }
}

export default AccumulatorRegistry;