/**
 * V119 Serializer Module
 * Core serialization functionality for doc-editor
 */

export interface SerializerConfig {
  id: string;
  name: string;
  format?: 'json' | 'xml' | 'binary' | 'text';
  enableCompression?: boolean;
  maxSize?: number;
}

export interface SerializedData {
  id: string;
  timestamp: number;
  payload: unknown;
  metadata?: Record<string, unknown>;
  format?: string;
}

export interface SerializerStats {
  itemsSerialized: number;
  itemsDeserialized: number;
  bytesProcessed: number;
  errors: number;
  uptime: number;
}

export interface SerializationResult {
  success: boolean;
  data?: SerializedData;
  error?: string;
  duration: number;
}

export class Serializer {
  private config: SerializerConfig;
  private serializedCount: number = 0;
  private deserializedCount: number = 0;
  private bytesProcessed: number = 0;
  private errorCount: number = 0;
  private startTime: number = Date.now();
  private serializationBuffer: SerializedData[] = [];

  constructor(config: SerializerConfig) {
    this.config = {
      format: 'json',
      enableCompression: false,
      maxSize: 10485760,
      ...config,
    };
  }

  get config(): SerializerConfig {
    return this.config;
  }

  serialize(id: string, payload: unknown, metadata?: Record<string, unknown>): SerializedData {
    const serialized: SerializedData = {
      id,
      timestamp: Date.now(),
      payload,
      metadata,
      format: this.config.format,
    };

    this.serializedCount++;
    const size = JSON.stringify(serialized).length;
    this.bytesProcessed += size;

    this.serializationBuffer.push(serialized);
    if (this.serializationBuffer.length > 1000) {
      this.serializationBuffer.shift();
    }

    return serialized;
  }

  deserialize(data: SerializedData): unknown {
    try {
      this.deserializedCount++;
      const size = JSON.stringify(data).length;
      this.bytesProcessed += size;
      return data.payload;
    } catch (e) {
      this.errorCount++;
      throw e;
    }
  }

  getSerializer(): SerializedData[] {
    return [...this.serializationBuffer];
  }

  getStats(): SerializerStats {
    return {
      itemsSerialized: this.serializedCount,
      itemsDeserialized: this.deserializedCount,
      bytesProcessed: this.bytesProcessed,
      errors: this.errorCount,
      uptime: Date.now() - this.startTime,
    };
  }

  getSnapshot(): { metrics: SerializerStats; bufferLength: number } {
    return {
      metrics: this.getStats(),
      bufferLength: this.serializationBuffer.length,
    };
  }

  reset(): void {
    this.serializedCount = 0;
    this.deserializedCount = 0;
    this.bytesProcessed = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
    this.serializationBuffer = [];
  }

  getReport(): string {
    const stats = this.getStats();
    return `Serializer[${this.config.name}] Report:
  ID: ${this.config.id}
  Format: ${this.config.format}
  Serialized: ${stats.itemsSerialized}
  Deserialized: ${stats.itemsDeserialized}
  Bytes Processed: ${stats.bytesProcessed}
  Errors: ${stats.errors}
  Uptime: ${stats.uptime}ms
  Buffer: ${this.serializationBuffer.length} items`;
  }

  exportMetrics(): { version: string; stats: SerializerStats; config: SerializerConfig } {
    return {
      version: 'V119',
      stats: this.getStats(),
      config: this.config,
    };
  }
}