/**
 * V25 Offline-first Sync Engine - Core Module
 * Handles synchronization state, pending changes, and status tracking
 */

export interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'offline';
  lastSyncTime: number | null;
  pendingChanges: number;
  version: number;
}

export interface SyncChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  conflicts: SyncConflict[];
}

export interface SyncConflict {
  id: string;
  localChange: SyncChange;
  remoteChange: SyncChange;
  resolution: 'local' | 'remote' | 'merged' | null;
}

export interface SyncEngineEvents {
  onSyncStart?: () => void;
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: Error) => void;
  onConflict?: (conflict: SyncConflict) => void;
}

export class SyncEngine {
  private state: SyncState;
  private changes: Map<string, SyncChange> = new Map();
  private conflicts: SyncConflict[] = [];
  private events: SyncEngineEvents;
  private metrics: SyncMetricsData;

  constructor(events: SyncEngineEvents = {}) {
    this.state = {
      status: 'idle',
      lastSyncTime: null,
      pendingChanges: 0,
      version: 25,
    };
    this.events = events;
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalConflicts: 0,
      averageSyncDuration: 0,
      lastSyncStart: null,
    };
  }

  /**
   * Synchronize pending changes with remote server
   */
  async sync(): Promise<SyncResult> {
    if (this.state.status === 'syncing') {
      return { success: false, syncedCount: 0, failedCount: 0, conflicts: [] };
    }

    this.state.status = 'syncing';
    this.metrics.lastSyncStart = Date.now();
    this.events.onSyncStart?.();

    const pendingChanges = this.getPendingChanges();
    let syncedCount = 0;
    let failedCount = 0;
    const resolvedConflicts: SyncConflict[] = [];

    for (const change of pendingChanges) {
      try {
        // Simulate sync operation - in real impl this would call remote API
        await this.processChange(change);
        syncedCount++;
      } catch (error) {
        failedCount++;
        // Check if it's a conflict
        if (this.detectConflict(change)) {
          const conflict = this.createConflict(change);
          resolvedConflicts.push(conflict);
          this.conflicts.push(conflict);
          this.events.onConflict?.(conflict);
        }
      }
    }

    this.state.lastSyncTime = Date.now();
    this.state.pendingChanges = this.changes.size;
    this.state.status = failedCount > 0 ? 'error' : 'idle';

    // Update metrics
    this.metrics.totalSyncs++;
    if (failedCount === 0) {
      this.metrics.successfulSyncs++;
    } else {
      this.metrics.failedSyncs++;
    }
    this.metrics.totalConflicts += resolvedConflicts.length;

    const result: SyncResult = {
      success: failedCount === 0,
      syncedCount,
      failedCount,
      conflicts: resolvedConflicts,
    };

    this.events.onSyncComplete?.(result);
    return result;
  }

  /**
   * Resolve a specific conflict
   */
  resolve(conflictId: string, resolution: 'local' | 'remote' | 'merged', mergedData?: unknown): boolean {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) return false;

    conflict.resolution = resolution;
    
    if (resolution === 'merged' && mergedData) {
      const change: SyncChange = {
        ...conflict.localChange,
        data: mergedData,
        timestamp: Date.now(),
      };
      this.changes.set(change.id, change);
    }

    // Remove conflict after resolution
    this.conflicts = this.conflicts.filter(c => c.id !== conflictId);
    return true;
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncState {
    return { ...this.state };
  }

  /**
   * Get all pending changes
   */
  getPendingChanges(): SyncChange[] {
    return Array.from(this.changes.values());
  }

  /**
   * Add a new change to the sync queue
   */
  addChange(change: Omit<SyncChange, 'id' | 'timestamp' | 'retryCount'>): string {
    const id = `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullChange: SyncChange = {
      ...change,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };
    this.changes.set(id, fullChange);
    this.state.pendingChanges = this.changes.size;
    return id;
  }

  /**
   * Remove a change from the queue
   */
  removeChange(changeId: string): boolean {
    const deleted = this.changes.delete(changeId);
    if (deleted) {
      this.state.pendingChanges = this.changes.size;
    }
    return deleted;
  }

  /**
   * Get current snapshot for debugging/inspection
   */
  getSnapshot(): object {
    return {
      state: { ...this.state },
      pendingChangesCount: this.changes.size,
      activeConflicts: this.conflicts.length,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Reset the sync engine to initial state
   */
  reset(): void {
    this.state = {
      status: 'idle',
      lastSyncTime: null,
      pendingChanges: 0,
      version: 25,
    };
    this.changes.clear();
    this.conflicts = [];
    this.metrics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalConflicts: 0,
      averageSyncDuration: 0,
      lastSyncStart: null,
    };
  }

  /**
   * Get a report of sync state
   */
  getReport(): object {
    return {
      version: this.state.version,
      status: this.state.status,
      lastSyncTime: this.state.lastSyncTime,
      pendingChanges: this.state.pendingChanges,
      activeConflicts: this.conflicts.length,
      metrics: this.metrics,
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): object {
    return {
      ...this.metrics,
      syncHistory: this.changes.size,
      conflictRate: this.metrics.totalSyncs > 0 
        ? this.metrics.totalConflicts / this.metrics.totalSyncs 
        : 0,
    };
  }

  // Private helper methods
  private async processChange(change: SyncChange): Promise<void> {
    // Simulate network delay and processing
    await new Promise(resolve => setTimeout(resolve, 10));
    this.changes.delete(change.id);
  }

  private detectConflict(change: SyncChange): boolean {
    // Simulate conflict detection - in real impl this would check remote state
    return Math.random() < 0.1; // 10% chance of conflict for simulation
  }

  private createConflict(change: SyncChange): SyncConflict {
    return {
      id: `conflict_${Date.now()}`,
      localChange: change,
      remoteChange: {
        ...change,
        id: `remote_${change.id}`,
        timestamp: change.timestamp - 1000,
      },
      resolution: null,
    };
  }
}

interface SyncMetricsData {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalConflicts: number;
  averageSyncDuration: number;
  lastSyncStart: number | null;
}

export default SyncEngine;