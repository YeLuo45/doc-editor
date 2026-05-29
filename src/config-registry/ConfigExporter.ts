/**
 * ConfigExporter.ts
 * V79 Config Exporter - Configuration import/export and snapshot management
 */

import { ConfigValue } from './ConfigRegistry';

export type SnapshotData = {
  version: string;
  timestamp: number;
  data: Record<string, ConfigValue>;
  checksum: string;
};

export type HistoryEntry = {
  timestamp: number;
  action: 'export' | 'import' | 'snapshot' | 'restore';
  data: SnapshotData | null;
};

export type ExporterMetrics = {
  snapshotCount: number;
  exportCount: number;
  importCount: number;
  timestamp: number;
};

export interface IConfigExporter {
  export(config: Record<string, ConfigValue>): string;
  import(data: string): Record<string, ConfigValue> | null;
  snapshot(config: Record<string, ConfigValue>): SnapshotData;
  restore(snapshot: SnapshotData): Record<string, ConfigValue> | null;
  getHistory(): HistoryEntry[];
}

export class ConfigExporter implements IConfigExporter {
  private _history: HistoryEntry[] = [];
  private _snapshotCount: number = 0;
  private _exportCount: number = 0;
  private _importCount: number = 0;
  private _creationTime: number = Date.now();

  get config(): HistoryEntry[] {
    return this._history;
  }

  private computeChecksum(data: Record<string, ConfigValue>): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  export(config: Record<string, ConfigValue>): string {
    this._exportCount++;
    const snapshot: SnapshotData = {
      version: 'V79-1.0',
      timestamp: Date.now(),
      data: config,
      checksum: this.computeChecksum(config),
    };
    this._history.push({ timestamp: Date.now(), action: 'export', data: snapshot });
    return JSON.stringify(snapshot);
  }

  import(data: string): Record<string, ConfigValue> | null {
    try {
      const snapshot: SnapshotData = JSON.parse(data);
      if (!snapshot.version || !snapshot.data || !snapshot.checksum) {
        return null;
      }
      const computedChecksum = this.computeChecksum(snapshot.data);
      if (computedChecksum !== snapshot.checksum) {
        return null;
      }
      this._importCount++;
      this._history.push({ timestamp: Date.now(), action: 'import', data: snapshot });
      return snapshot.data;
    } catch {
      return null;
    }
  }

  snapshot(config: Record<string, ConfigValue>): SnapshotData {
    this._snapshotCount++;
    const snapshot: SnapshotData = {
      version: 'V79-1.0',
      timestamp: Date.now(),
      data: config,
      checksum: this.computeChecksum(config),
    };
    this._history.push({ timestamp: Date.now(), action: 'snapshot', data: snapshot });
    return snapshot;
  }

  restore(snapshot: SnapshotData): Record<string, ConfigValue> | null {
    const computedChecksum = this.computeChecksum(snapshot.data);
    if (computedChecksum !== snapshot.checksum) {
      return null;
    }
    this._history.push({ timestamp: Date.now(), action: 'restore', data: snapshot });
    return snapshot.data;
  }

  getHistory(): HistoryEntry[] {
    return [...this._history];
  }

  clearHistory(): void {
    this._history = [];
  }

  getSnapshot(): { metrics: ExporterMetrics } {
    return {
      metrics: {
        snapshotCount: this._snapshotCount,
        exportCount: this._exportCount,
        importCount: this._importCount,
        timestamp: Date.now(),
      },
    };
  }

  reset(): void {
    this._history = [];
    this._snapshotCount = 0;
    this._exportCount = 0;
    this._importCount = 0;
    this._creationTime = Date.now();
  }

  getReport(): string {
    const uptime = Date.now() - this._creationTime;
    const lines = [
      '=== ConfigExporter Report ===',
      `Snapshot Count: ${this._snapshotCount}`,
      `Export Count: ${this._exportCount}`,
      `Import Count: ${this._importCount}`,
      `History Size: ${this._history.length}`,
      `Uptime: ${uptime}ms`,
      '=== End Report ===',
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string } {
    return {
      version: 'V79-ConfigExporter-1.0',
    };
  }
}

export const defaultExporter = new ConfigExporter();