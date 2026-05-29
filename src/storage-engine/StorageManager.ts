/**
 * StorageManager.ts - V68 Storage Engine Core
 * Handles basic storage operations: store, retrieve, delete, clear, getKeys
 */

type StorageConfig = {
  maxSize: number;
  namespace: string;
  persistToDisk: boolean;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
};

interface StorageEntry {
  key: string;
  value: unknown;
  timestamp: number;
  size: number;
  metadata?: Record<string, unknown>;
}

export class StorageManager {
  private storage: Map<string, StorageEntry> = new Map();
  public readonly config: StorageConfig;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1024 * 1024 * 100, // 100MB default
      namespace: config.namespace ?? 'default',
      persistToDisk: config.persistToDisk ?? false,
      encryptionEnabled: config.encryptionEnabled ?? false,
      compressionEnabled: config.compressionEnabled ?? false,
    };
  }

  store(key: string, value: unknown, metadata?: Record<string, unknown>): boolean {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key: must be non-empty string');
    }

    const size = this.calculateSize(value);
    if (size > this.config.maxSize) {
      throw new Error(`Value exceeds max size: ${size} > ${this.config.maxSize}`);
    }

    const entry: StorageEntry = {
      key,
      value,
      timestamp: Date.now(),
      size,
      metadata,
    };

    this.storage.set(key, entry);
    return true;
  }

  retrieve<T = unknown>(key: string): T | null {
    const entry = this.storage.get(key);
    if (!entry) {
      return null;
    }
    return entry.value as T;
  }

  delete(key: string): boolean {
    const existed = this.storage.has(key);
    this.storage.delete(key);
    return existed;
  }

  clear(): void {
    this.storage.clear();
  }

  getKeys(): string[] {
    return Array.from(this.storage.keys());
  }

  getSnapshot(): { metrics: Record<string, unknown> } {
    const totalSize = Array.from(this.storage.values()).reduce((sum, e) => sum + e.size, 0);
    return {
      metrics: {
        entryCount: this.storage.size,
        totalSize,
        maxSize: this.config.maxSize,
        namespace: this.config.namespace,
        utilizationPercent: (totalSize / this.config.maxSize) * 100,
      },
    };
  }

  reset(): void {
    this.storage.clear();
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return [
      '=== StorageManager Report ===',
      `Namespace: ${this.config.namespace}`,
      `Entries: ${snapshot.metrics.entryCount}`,
      `Total Size: ${snapshot.metrics.totalSize} bytes`,
      `Max Size: ${snapshot.metrics.maxSize} bytes`,
      `Utilization: ${snapshot.metrics.utilizationPercent?.toFixed(2)}%`,
      `Encryption: ${this.config.encryptionEnabled ? 'ON' : 'OFF'}`,
      `Compression: ${this.config.compressionEnabled ? 'ON' : 'OFF'}`,
      '============================',
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'v68-storage-engine' };
  }

  private calculateSize(value: unknown): number {
    return JSON.stringify(value).length;
  }
}