/**
 * V119 SerializerRegistry Module
 * Registry for managing multiple serializers
 */

import { Serializer, SerializerConfig } from './Serializer';

export interface RegistryConfig {
  maxSerializers?: number;
  enableAutoCleanup?: boolean;
  defaultFormat?: 'json' | 'xml' | 'binary' | 'text';
}

export interface RegistryStats {
  totalSerializers: number;
  totalSerialized: number;
  totalDeserialized: number;
}

export class SerializerRegistry {
  private serializers: Map<string, Serializer> = new Map();
  private config: RegistryConfig;

  constructor(config: RegistryConfig = {}) {
    this.config = {
      maxSerializers: 100,
      enableAutoCleanup: false,
      defaultFormat: 'json',
      ...config,
    };
  }

  get config(): RegistryConfig {
    return this.config;
  }

  register(id: string, serializer: Serializer): boolean {
    if (this.serializers.has(id)) {
      return false;
    }
    if (this.serializers.size >= (this.config.maxSerializers || 100)) {
      throw new Error('Max serializers limit reached');
    }
    this.serializers.set(id, serializer);
    return true;
  }

  unregister(id: string): Serializer | undefined {
    const serializer = this.serializers.get(id);
    this.serializers.delete(id);
    return serializer;
  }

  get(id: string): Serializer | undefined {
    return this.serializers.get(id);
  }

  getAll(): Map<string, Serializer> {
    return new Map(this.serializers);
  }

  has(id: string): boolean {
    return this.serializers.has(id);
  }

  createSerializer(config: SerializerConfig): Serializer {
    const mergedConfig: SerializerConfig = {
      format: this.config.defaultFormat,
      ...config,
    };
    const serializer = new Serializer(mergedConfig);
    const registered = this.register(config.id, serializer);
    if (!registered) {
      throw new Error(`Failed to register serializer: ${config.id}`);
    }
    return serializer;
  }

  listIds(): string[] {
    return Array.from(this.serializers.keys());
  }

  clear(): void {
    this.serializers.clear();
  }

  getSnapshot(): { count: number; ids: string[] } {
    return {
      count: this.serializers.size,
      ids: this.listIds(),
    };
  }

  reset(): void {
    this.serializers.clear();
  }

  getReport(): string {
    const stats = this.getStats();
    return `SerializerRegistry Report:
  Total Serializers: ${stats.totalSerializers}
  Total Serialized: ${stats.totalSerialized}
  Total Deserialized: ${stats.totalDeserialized}
  Serializers: ${this.listIds().join(', ') || 'none'}`;
  }

  getStats(): RegistryStats {
    let totalSerialized = 0;
    let totalDeserialized = 0;
    this.serializers.forEach(s => {
      const snap = s.getSnapshot();
      totalSerialized += snap.metrics.itemsSerialized;
      totalDeserialized += snap.metrics.itemsDeserialized;
    });
    return {
      totalSerializers: this.serializers.size,
      totalSerialized,
      totalDeserialized,
    };
  }

  exportMetrics(): { version: string; stats: RegistryStats; config: RegistryConfig } {
    return {
      version: 'V119',
      stats: this.getStats(),
      config: this.config,
    };
  }
}