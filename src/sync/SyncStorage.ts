/**
 * V25 Offline-first Sync Engine - Storage Module
 * Local storage management for offline-first sync
 */

export interface StorageEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  version: number;
  checksum: string;
}

export interface StorageMetrics {
  totalSaves: number;
  totalLoads: number;
  totalClears: number;
  storageUsed: number;
  lastSave: number | null;
  lastLoad: number | null;
}

export class SyncStorage {
  private storage: Map<string, StorageEntry> = new Map();
  private namespace: string;
  private metrics: StorageMetrics;

  constructor(namespace: string = 'sync') {
    this.namespace = namespace;
    this.metrics = {
      totalSaves: 0,
      totalLoads: 0,
      totalClears: 0,
      storageUsed: 0,
      lastSave: null,
      lastLoad: null,
    };
  }

  /**
   * Save data to local storage with versioning
   */
  save<T>(key: string, value: T, version: number = 1): boolean {
    try {
      const entry: StorageEntry<T> = {
        key: this.makeKey(key),
        value,
        timestamp: Date.now(),
        version,
        checksum: this.generateChecksum(value),
      };
      this.storage.set(entry.key, entry);
      this.metrics.totalSaves++;
      this.metrics.lastSave = entry.timestamp;
      this.updateStorageUsed();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Load data from local storage
   */
  load<T>(key: string): T | null {
    const entry = this.storage.get(this.makeKey(key));
    if (!entry) return null;

    // Verify checksum
    const expectedChecksum = this.generateChecksum(entry.value);
    if (expectedChecksum !== entry.checksum) {
      return null; // Data integrity check failed
    }

    this.metrics.totalLoads++;
    this.metrics.lastLoad = Date.now();
    return entry.value as T;
  }

  /**
   * Load with version check - returns null if stored version is newer
   */
  loadWithVersionCheck<T>(key: string, expectedVersion: number): T | null {
    const entry = this.storage.get(this.makeKey(key));
    if (!entry) return null;
    if (entry.version > expectedVersion) return null;
    return entry.value as T;
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return this.storage.has(this.makeKey(key));
  }

  /**
   * Get all keys in namespace
   */
  keys(): string[] {
    const prefix = `${this.namespace}:`;
    return Array.from(this.storage.keys())
      .filter(k => k.startsWith(prefix))
      .map(k => k.substring(prefix.length));
  }

  /**
   * Get the size of stored data in bytes (approximate)
   */
  getSize(): number {
    return this.metrics.storageUsed;
  }

  /**
   * Clear all data in this namespace
   */
  clear(): number {
    const count = this.storage.size;
    this.storage.clear();
    this.metrics.totalClears++;
    this.metrics.storageUsed = 0;
    return count;
  }

  /**
   * Remove a specific entry
   */
  remove(key: string): boolean {
    const fullKey = this.makeKey(key);
    const existed = this.storage.delete(fullKey);
    if (existed) {
      this.updateStorageUsed();
    }
    return existed;
  }

  /**
   * Get entry metadata without returning value
   */
  getMetadata(key: string): { timestamp: number; version: number } | null {
    const entry = this.storage.get(this.makeKey(key));
    if (!entry) return null;
    return { timestamp: entry.timestamp, version: entry.version };
  }

  /**
   * Get current snapshot for debugging
   */
  getSnapshot(): object {
    return {
      namespace: this.namespace,
      entryCount: this.storage.size,
      storageUsed: this.metrics.storageUsed,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset storage to initial state
   */
  reset(): void {
    this.storage.clear();
    this.metrics = {
      totalSaves: 0,
      totalLoads: 0,
      totalClears: 0,
      storageUsed: 0,
      lastSave: null,
      lastLoad: null,
    };
  }

  /**
   * Get a report of storage state
   */
  getReport(): object {
    return {
      namespace: this.namespace,
      entries: this.storage.size,
      storageUsed: this.metrics.storageUsed,
      humanReadableSize: this.formatBytes(this.metrics.storageUsed),
      metrics: { ...this.metrics },
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): object {
    return {
      ...this.metrics,
      namespace: this.namespace,
      entries: this.storage.size,
      averageEntrySize: this.storage.size > 0 
        ? this.metrics.storageUsed / this.storage.size 
        : 0,
    };
  }

  private makeKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private generateChecksum(value: unknown): string {
    const str = JSON.stringify(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private updateStorageUsed(): void {
    let total = 0;
    for (const entry of this.storage.values()) {
      total += JSON.stringify(entry.value).length * 2; // UTF-16 encoding
      total += entry.key.length * 2;
    }
    this.metrics.storageUsed = total;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default SyncStorage;