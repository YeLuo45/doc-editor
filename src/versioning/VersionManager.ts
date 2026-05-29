/**
 * V58 Versioning System - VersionManager
 * Core versioning functionality with create/snapshot/revert/getHistory
 */

export interface VersionConfig {
  maxHistory: number;
  autoSnapshot: boolean;
  snapshotInterval: number;
  compressSnapshots: boolean;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  content: string;
  metadata: Record<string, unknown>;
}

export interface Version {
  id: string;
  name: string;
  createdAt: number;
  snapshotId: string;
  parentId: string | null;
}

export type HistoryEntry = {
  id: string;
  action: string;
  timestamp: number;
  versionId?: string;
  details?: string;
};

export class VersionManager {
  private _config: VersionConfig;
  private _versions: Map<string, Version> = new Map();
  private _snapshots: Map<string, Snapshot> = new Map();
  private _history: HistoryEntry[] = [];
  private _currentVersionId: string | null = null;

  constructor(config: Partial<VersionConfig> = {}) {
    this._config = {
      maxHistory: config.maxHistory ?? 100,
      autoSnapshot: config.autoSnapshot ?? true,
      snapshotInterval: config.snapshotInterval ?? 30000,
      compressSnapshots: config.compressSnapshots ?? false,
    };
  }

  get config(): VersionConfig {
    return { ...this._config };
  }

  create(content: string, name: string, metadata: Record<string, unknown> = {}): Version {
    const snapshotId = this.createSnapshot(content, metadata);
    const version: Version = {
      id: `v${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      createdAt: Date.now(),
      snapshotId,
      parentId: this._currentVersionId,
    };
    this._versions.set(version.id, version);
    this._currentVersionId = version.id;
    this.addHistoryEntry('create', version.id, `Created version: ${name}`);
    this.pruneHistory();
    return version;
  }

  snapshot(content: string, metadata: Record<string, unknown> = {}): Snapshot {
    const id = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const snapshot: Snapshot = {
      id,
      timestamp: Date.now(),
      content,
      metadata,
    };
    this._snapshots.set(id, snapshot);
    return snapshot;
  }

  private createSnapshot(content: string, metadata: Record<string, unknown>): string {
    const id = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const snapshot: Snapshot = {
      id,
      timestamp: Date.now(),
      content,
      metadata,
    };
    this._snapshots.set(id, snapshot);
    return id;
  }

  revert(versionId: string): boolean {
    const version = this._versions.get(versionId);
    if (!version) {
      this.addHistoryEntry('revert', undefined, `Version not found: ${versionId}`);
      return false;
    }
    this._currentVersionId = versionId;
    this.addHistoryEntry('revert', versionId, `Reverted to version: ${version.name}`);
    return true;
  }

  getHistory(limit?: number): HistoryEntry[] {
    if (limit) {
      return this._history.slice(-limit);
    }
    return [...this._history];
  }

  getVersion(versionId: string): Version | undefined {
    return this._versions.get(versionId);
  }

  getSnapshot(snapshotId: string): Snapshot | undefined {
    return this._snapshots.get(snapshotId);
  }

  retrieveSnapshot(snapshotId: string): Snapshot | undefined {
    return this._snapshots.get(snapshotId);
  }

  getCurrentVersion(): Version | undefined {
    if (!this._currentVersionId) return undefined;
    return this._versions.get(this._currentVersionId);
  }

  private addHistoryEntry(action: string, versionId?: string, details?: string): void {
    this._history.push({
      id: `h${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action,
      timestamp: Date.now(),
      versionId,
      details,
    });
  }

  private pruneHistory(): void {
    if (this._history.length > this._config.maxHistory) {
      this._history = this._history.slice(-this._config.maxHistory);
    }
  }

  getSnapshot(): { totalVersions: number; totalSnapshots: number; historySize: number } {
    return {
      totalVersions: this._versions.size,
      totalSnapshots: this._snapshots.size,
      historySize: this._history.length,
    };
  }

  reset(): void {
    this._versions.clear();
    this._snapshots.clear();
    this._history = [];
    this._currentVersionId = null;
  }

  getReport(): string {
    return [
      '=== VersionManager Report ===',
      `Versions: ${this._versions.size}`,
      `Snapshots: ${this._snapshots.size}`,
      `History entries: ${this._history.length}`,
      `Current version: ${this._currentVersionId ?? 'none'}`,
      `Max history: ${this._config.maxHistory}`,
      `Auto snapshot: ${this._config.autoSnapshot}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: Record<string, number> } {
    return {
      version: 'V58-VersionManager',
      metrics: {
        versions: this._versions.size,
        snapshots: this._snapshots.size,
        history: this._history.length,
        maxHistory: this._config.maxHistory,
      },
    };
  }
}