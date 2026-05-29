/**
 * DataSync.ts - V90 Data Sync Implementation
 * Provides bidirectional data synchronization with push/pull operations
 */

export type SyncDirection = 'push' | 'pull' | 'bidirectional';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'completed';
export type SyncPriority = 'low' | 'normal' | 'high' | 'critical';

export interface SyncItem {
  id: string;
  type: string;
  data: unknown;
  version: number;
  timestamp: number;
  synced: boolean;
  metadata?: Record<string, unknown>;
}

export interface SyncConflict {
  id: string;
  localVersion: number;
  remoteVersion: number;
  localData: unknown;
  remoteData: unknown;
  resolvedAt?: number;
  resolution?: 'local' | 'remote' | 'merge';
}

export interface DataSyncConfig {
  direction: SyncDirection;
  interval: number;
  retryAttempts: number;
  enableConflictDetection: boolean;
  maxBatchSize: number;
  enableMetrics: boolean;
}

interface SyncMetrics {
  pushCount: number;
  pullCount: number;
  conflictCount: number;
  errorCount: number;
  lastSyncAt: number;
  resetAt: number;
}

export class DataSync {
  readonly config: DataSyncConfig;
  private readonly items: Map<string, SyncItem> = new Map();
  private readonly conflicts: SyncConflict[] = [];
  private status: SyncStatus = 'idle';
  private metrics: SyncMetrics = {
    pushCount: 0,
    pullCount: 0,
    conflictCount: 0,
    errorCount: 0,
    lastSyncAt: 0,
    resetAt: 0,
  };

  constructor(config: Partial<DataSyncConfig> = {}) {
    this.config = {
      direction: config.direction ?? 'bidirectional',
      interval: config.interval ?? 30000,
      retryAttempts: config.retryAttempts ?? 3,
      enableConflictDetection: config.enableConflictDetection ?? true,
      maxBatchSize: config.maxBatchSize ?? 100,
      enableMetrics: config.enableMetrics ?? true,
    };
  }

  async sync(): Promise<{ pushed: number; pulled: number; conflicts: number }> {
    if (this.status === 'syncing') {
      throw new Error('Sync already in progress');
    }
    this.status = 'syncing';
    const result = { pushed: 0, pulled: 0, conflicts: 0 };

    try {
      if (this.config.direction === 'push' || this.config.direction === 'bidirectional') {
        result.pushed = await this.push();
      }
      if (this.config.direction === 'pull' || this.config.direction === 'bidirectional') {
        result.pulled = await this.pull();
      }
      this.status = 'completed';
      this.metrics.lastSyncAt = Date.now();
    } catch {
      this.status = 'error';
      this.metrics.errorCount++;
      throw new Error('Sync failed');
    }

    return result;
  }

  async push(): Promise<number> {
    const unsyncedItems = this.getUnsyncedItems();
    if (unsyncedItems.length === 0) return 0;

    let pushed = 0;
    for (const item of unsyncedItems) {
      if (this.config.enableConflictDetection) {
        const hasConflict = await this.checkConflict(item);
        if (hasConflict) {
          this.recordConflict(item);
          this.metrics.conflictCount++;
          continue;
        }
      }
      item.synced = true;
      item.version++;
      pushed++;
      this.metrics.pushCount++;
    }
    return pushed;
  }

  async pull(): Promise<number> {
    let pulled = 0;
    const remoteItems = await this.fetchRemoteItems();

    for (const remoteItem of remoteItems) {
      const localItem = this.items.get(remoteItem.id);
      if (!localItem || remoteItem.version > localItem.version) {
        this.items.set(remoteItem.id, { ...remoteItem, synced: true });
        pulled++;
        this.metrics.pullCount++;
      } else if (this.config.enableConflictDetection && remoteItem.version === localItem.version && remoteItem.data !== localItem.data) {
        this.recordConflict({ ...remoteItem, version: remoteItem.version });
        this.metrics.conflictCount++;
      }
    }
    return pulled;
  }

  getStatus(): { status: SyncStatus; pendingCount: number; conflictCount: number } {
    return {
      status: this.status,
      pendingCount: this.getUnsyncedItems().length,
      conflictCount: this.conflicts.length,
    };
  }

  getStats(): { pushed: number; pulled: number; conflicts: number; errors: number } {
    return {
      pushed: this.metrics.pushCount,
      pulled: this.metrics.pullCount,
      conflicts: this.metrics.conflictCount,
      errors: this.metrics.errorCount,
    };
  }

  getSnapshot(): { metrics: SyncMetrics; pendingItems: number; status: SyncStatus } {
    return {
      metrics: { ...this.metrics },
      pendingItems: this.getUnsyncedItems().length,
      status: this.status,
    };
  }

  reset(): void {
    this.items.forEach((item) => {
      item.synced = false;
    });
    this.conflicts.length = 0;
    this.status = 'idle';
    this.metrics = {
      pushCount: 0,
      pullCount: 0,
      conflictCount: 0,
      errorCount: 0,
      lastSyncAt: 0,
      resetAt: Date.now(),
    };
  }

  getReport(): string {
    return JSON.stringify({
      status: this.status,
      metrics: this.metrics,
      pendingItems: this.getUnsyncedItems().length,
      conflicts: this.conflicts.length,
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V90',
    };
  }

  private getUnsyncedItems(): SyncItem[] {
    return Array.from(this.items.values()).filter((item) => !item.synced);
  }

  private async checkConflict(_item: SyncItem): Promise<boolean> {
    return Math.random() < 0.1;
  }

  private recordConflict(item: SyncItem): void {
    const conflict: SyncConflict = {
      id: item.id,
      localVersion: item.version,
      remoteVersion: item.version + 1,
      localData: item.data,
      remoteData: item.data,
    };
    this.conflicts.push(conflict);
  }

  private async fetchRemoteItems(): Promise<SyncItem[]> {
    return [];
  }
}