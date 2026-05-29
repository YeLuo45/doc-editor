/**
 * SyncConflictResolver.ts - V90 Sync Conflict Resolution
 * Provides conflict detection, resolution, and history tracking
 */

export type ConflictStrategy = 'local' | 'remote' | 'merge' | 'manual';
export type ConflictStatus = 'detected' | 'resolving' | 'resolved' | 'pending';

export interface ConflictRecord {
  id: string;
  itemId: string;
  itemType: string;
  localVersion: number;
  remoteVersion: number;
  localData: unknown;
  remoteData: unknown;
  status: ConflictStatus;
  strategy?: ConflictStrategy;
  resolvedAt?: number;
  resolvedData?: unknown;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ConflictResolverConfig {
  autoResolve: boolean;
  defaultStrategy: ConflictStrategy;
  maxHistorySize: number;
  enableNotifications: boolean;
  conflictTimeout: number;
}

interface ConflictMetrics {
  detectedCount: number;
  resolvedCount: number;
  mergeCount: number;
  resetAt: number;
}

export class SyncConflictResolver {
  readonly config: ConflictResolverConfig;
  private readonly conflicts: Map<string, ConflictRecord> = new Map();
  private readonly history: ConflictRecord[] = [];
  private metrics: ConflictMetrics = {
    detectedCount: 0,
    resolvedCount: 0,
    mergeCount: 0,
    resetAt: 0,
  };

  constructor(config: Partial<ConflictResolverConfig> = {}) {
    this.config = {
      autoResolve: config.autoResolve ?? false,
      defaultStrategy: config.defaultStrategy ?? 'local',
      maxHistorySize: config.maxHistorySize ?? 100,
      enableNotifications: config.enableNotifications ?? true,
      conflictTimeout: config.conflictTimeout ?? 5000,
    };
  }

  async resolve(
    conflictId: string,
    strategy: ConflictStrategy,
    mergedData?: unknown
  ): Promise<{ success: boolean; resolvedData?: unknown }> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      return { success: false };
    }

    conflict.status = 'resolving';
    let resolvedData: unknown;

    switch (strategy) {
      case 'local':
        resolvedData = conflict.localData;
        break;
      case 'remote':
        resolvedData = conflict.remoteData;
        break;
      case 'merge':
        resolvedData = mergedData ?? { ...conflict.localData, ...conflict.remoteData };
        this.metrics.mergeCount++;
        break;
      case 'manual':
        if (!mergedData) {
          conflict.status = 'pending';
          return { success: false };
        }
        resolvedData = mergedData;
        break;
    }

    conflict.resolvedAt = Date.now();
    conflict.status = 'resolved';
    conflict.resolvedData = resolvedData;
    conflict.strategy = strategy;
    this.metrics.resolvedCount++;

    this.moveToHistory(conflict);
    return { success: true, resolvedData };
  }

  getConflicts(filter?: { status?: ConflictStatus; itemType?: string }): ConflictRecord[] {
    let result = Array.from(this.conflicts.values());

    if (filter?.status) {
      result = result.filter((c) => c.status === filter.status);
    }
    if (filter?.itemType) {
      result = result.filter((c) => c.itemType === filter.itemType);
    }

    return result;
  }

  getHistory(limit?: number): ConflictRecord[] {
    const sorted = [...this.history].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  detectConflict(
    itemId: string,
    itemType: string,
    localVersion: number,
    remoteVersion: number,
    localData: unknown,
    remoteData: unknown
  ): ConflictRecord {
    const id = `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const conflict: ConflictRecord = {
      id,
      itemId,
      itemType,
      localVersion,
      remoteVersion,
      localData,
      remoteData,
      status: 'detected',
      timestamp: Date.now(),
    };

    this.conflicts.set(id, conflict);
    this.metrics.detectedCount++;

    if (this.config.autoResolve) {
      setTimeout(() => {
        this.resolve(id, this.config.defaultStrategy).catch(() => {});
      }, this.config.conflictTimeout);
    }

    return conflict;
  }

  getSnapshot(): { metrics: ConflictMetrics; activeConflicts: number; historySize: number } {
    return {
      metrics: { ...this.metrics },
      activeConflicts: this.conflicts.size,
      historySize: this.history.length,
    };
  }

  reset(): void {
    this.conflicts.clear();
    this.history.length = 0;
    this.metrics = {
      detectedCount: 0,
      resolvedCount: 0,
      mergeCount: 0,
      resetAt: Date.now(),
    };
  }

  getReport(): string {
    return JSON.stringify({
      config: this.config,
      metrics: this.metrics,
      activeConflicts: this.conflicts.size,
      historySize: this.history.length,
      conflicts: Array.from(this.conflicts.values()),
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V90',
    };
  }

  private moveToHistory(conflict: ConflictRecord): void {
    this.history.push({ ...conflict });
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
    this.conflicts.delete(conflict.id);
  }
}