/**
 * LogStorage.ts - V87 Log Storage
 * Handles log storage with store/retrieve/clear/getLogs/getSize
 */

export interface StorageConfig {
  maxEntries: number;
  retentionDays: number;
  storageType: 'memory' | 'file' | 'indexeddb';
  compressionEnabled: boolean;
  autoCleanup: boolean;
}

export interface StoredLog {
  id: string;
  timestamp: number;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface StorageStats {
  totalStored: number;
  totalRetrieved: number;
  totalCleared: number;
  currentSize: number;
  maxSize: number;
  cleanupCount: number;
}

export class LogStorage {
  private logs: StoredLog[] = [];
  private stats: StorageStats;
  private startTime: number;

  constructor(public config: StorageConfig) {
    this.startTime = Date.now();
    this.stats = {
      totalStored: 0,
      totalRetrieved: 0,
      totalCleared: 0,
      currentSize: 0,
      maxSize: config.maxEntries,
      cleanupCount: 0
    };
  }

  public store(log: StoredLog): boolean {
    if (this.config.maxEntries > 0 && this.logs.length >= this.config.maxEntries) {
      if (this.config.autoCleanup) {
        this.cleanup();
      } else {
        return false;
      }
    }

    this.logs.push(log);
    this.stats.totalStored++;
    this.stats.currentSize = this.logs.length;
    return true;
  }

  public retrieve(id: string): StoredLog | null {
    this.stats.totalRetrieved++;
    const log = this.logs.find(l => l.id === id);
    return log || null;
  }

  public clear(): number {
    const count = this.logs.length;
    this.logs = [];
    this.stats.totalCleared += count;
    this.stats.currentSize = 0;
    return count;
  }

  public getLogs(filter?: { level?: string; startTime?: number; endTime?: number }): StoredLog[] {
    this.stats.totalRetrieved++;
    let filtered = [...this.logs];

    if (filter?.level) {
      filtered = filtered.filter(l => l.level === filter.level);
    }
    if (filter?.startTime) {
      filtered = filtered.filter(l => l.timestamp >= filter.startTime!);
    }
    if (filter?.endTime) {
      filtered = filtered.filter(l => l.timestamp <= filter.endTime!);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getSize(): number {
    return this.stats.currentSize;
  }

  private cleanup(): void {
    const cutoff = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);
    const before = this.logs.length;
    this.logs = this.logs.filter(l => l.timestamp >= cutoff);
    const removed = before - this.logs.length;
    this.stats.cleanupCount++;
    this.stats.currentSize = this.logs.length;
  }

  public getStats(): StorageStats {
    return { ...this.stats };
  }

  public getSnapshot(): { metrics: StorageStats } {
    return {
      metrics: this.getStats()
    };
  }

  public reset(): void {
    this.logs = [];
    this.stats = {
      totalStored: 0,
      totalRetrieved: 0,
      totalCleared: 0,
      currentSize: 0,
      maxSize: this.config.maxEntries,
      cleanupCount: 0
    };
  }

  public getReport(): string {
    const s = this.getStats();
    return `LogStorage Report:
  Total Stored: ${s.totalStored}
  Total Retrieved: ${s.totalRetrieved}
  Total Cleared: ${s.totalCleared}
  Current Size: ${s.currentSize}/${s.maxSize}
  Cleanup Count: ${s.cleanupCount}`;
  }

  public exportMetrics(): { version: string } {
    return {
      version: 'V87-1.0.0'
    };
  }

  public getByLevel(level: string): StoredLog[] {
    return this.logs.filter(l => l.level === level);
  }

  public getByTimerange(start: number, end: number): StoredLog[] {
    return this.logs.filter(l => l.timestamp >= start && l.timestamp <= end);
  }

  public search(query: string): StoredLog[] {
    const lower = query.toLowerCase();
    return this.logs.filter(l => 
      l.message.toLowerCase().includes(lower) ||
      l.level.toLowerCase().includes(lower)
    );
  }

  public pruneOldest(count: number): number {
    if (count >= this.logs.length) {
      const removed = this.logs.length;
      this.clear();
      return removed;
    }
    this.logs = this.logs.slice(count);
    this.stats.currentSize = this.logs.length;
    return count;
  }
}

export default LogStorage;
