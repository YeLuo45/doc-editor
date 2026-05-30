/**
 * V123 Decoder Registry - Manages decoder registration and lookup
 */

import { Decoder, DecoderConfig, DecodingStats } from './Decoder';

export type RegistryConfig = {
  autoRegister?: boolean;
  defaultTimeout?: number;
  maxDecoders?: number;
};

export interface RegistrySnapshot {
  config: RegistryConfig;
  registeredDecoders: string[];
  totalDecoders: number;
}

export class DecoderRegistry {
  private _decoders: Map<string, Decoder>;
  private _config: RegistryConfig;
  private _creationOrder: string[];

  constructor(config: RegistryConfig = {}) {
    this._decoders = new Map();
    this._creationOrder = [];
    this._config = { autoRegister: false, defaultTimeout: 5000, maxDecoders: 100, ...config };
  }

  get config(): RegistryConfig { return { ...this._config }; }
  get size(): number { return this._decoders.size; }

  register(name: string, config?: DecoderConfig): Decoder {
    if (this._decoders.size >= (this._config.maxDecoders ?? 100)) {
      throw new Error(`Registry full: max ${this._config.maxDecoders} decoders`);
    }
    if (this._decoders.has(name)) {
      throw new Error(`Decoder '${name}' already registered`);
    }
    const decoderConfig: DecoderConfig = { ...config, timeout: config?.timeout ?? this._config.defaultTimeout };
    const decoder = new Decoder(name, decoderConfig);
    this._decoders.set(name, decoder);
    this._creationOrder.push(name);
    return decoder;
  }

  unregister(name: string): boolean {
    if (!this._decoders.has(name)) { return false; }
    this._decoders.delete(name);
    this._creationOrder = this._creationOrder.filter(n => n !== name);
    return true;
  }

  get(name: string): Decoder | undefined { return this._decoders.get(name); }
  getAll(): Decoder[] { return Array.from(this._decoders.values()); }
  has(name: string): boolean { return this._decoders.has(name); }

  getByIndex(index: number): Decoder | undefined {
    const names = this.getNames();
    if (index < 0 || index >= names.length) { return undefined; }
    return this._decoders.get(names[index]);
  }

  getNames(): string[] { return [...this._creationOrder]; }
  clear(): void { this._decoders.clear(); this._creationOrder = []; }

  getSnapshot(): { metrics: RegistrySnapshot } {
    return { metrics: { config: this.config, registeredDecoders: this.getNames(), totalDecoders: this._decoders.size } };
  }

  reset(): void { this._decoders.clear(); this._creationOrder = []; }

  getReport(): string {
    const decoders = this.getNames();
    const totalStats = this._getTotalStats();
    return [
      '=== Decoder Registry Report ===',
      `Registered: ${decoders.length} | Max: ${this._config.maxDecoders}`,
      `Decoders: ${decoders.join(', ')}`,
      `Stats: total=${totalStats.totalDecodes} success=${totalStats.successfulDecodes} failed=${totalStats.failedDecodes} avg=${totalStats.averageDecodeTime.toFixed(2)}ms`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: '1.2.3', registry: { totalDecoders: this._decoders.size, decoderNames: this.getNames(), aggregatedStats: this._getTotalStats() } };
  }

  private _getTotalStats(): DecodingStats {
    let totalDecodes = 0, successfulDecodes = 0, failedDecodes = 0, averageDecodeTime = 0;
    for (const decoder of this._decoders.values()) {
      const stats = decoder.getStats();
      totalDecodes += stats.totalDecodes;
      successfulDecodes += stats.successfulDecodes;
      failedDecodes += stats.failedDecodes;
      averageDecodeTime += stats.averageDecodeTime;
    }
    return { totalDecodes, successfulDecodes, failedDecodes, averageDecodeTime: this._decoders.size > 0 ? averageDecodeTime / this._decoders.size : 0, lastDecodeTime: 0 };
  }

  updateConfig(config: Partial<RegistryConfig>): void { this._config = { ...this._config, ...config }; }

  getDecoder(name: string): Decoder {
    const decoder = this.get(name);
    if (!decoder) { throw new Error(`Decoder '${name}' not found`); }
    return decoder;
  }
}