/**
 * AuditArchiver.ts - Audit log archiving for doc-editor V63
 * Provides archiving, compaction, and archive management
 */

import { AuditEntry } from './AuditLogger';

export interface ArchiveConfig {
  archivePath?: string;
  maxArchiveSize?: number;
  maxArchives?: number;
  compressionEnabled?: boolean;
  autoArchiveDays?: number;
}

export interface Archive {
  id: string;
  name: string;
  createdAt: Date;
  entryCount: number;
  sizeBytes: number;
  startDate: Date;
  endDate: Date;
  compressed: boolean;
}

interface ArchiveSnapshot {
  metrics: {
    totalArchives: number;
    totalArchivedEntries: number;
    totalArchiveSize: number;
    archivesByMonth: Record<string, number>;
    lastArchiveDate?: string;
    compactionCount: number;
  };
}

const DEFAULT_CONFIG: ArchiveConfig = {
  archivePath: './archives',
  maxArchiveSize: 100 * 1024 * 1024, // 100MB
  maxArchives: 12,
  compressionEnabled: true,
  autoArchiveDays: 30,
};

export class AuditArchiver {
  private archives: Archive[] = [];
  private archivedEntries: Map<string, AuditEntry[]> = new Map();
  private _config: ArchiveConfig;
  private metrics: ArchiveSnapshot['metrics'] = {
    totalArchives: 0,
    totalArchivedEntries: 0,
    totalArchiveSize: 0,
    archivesByMonth: {},
    lastArchiveDate: undefined,
    compactionCount: 0,
  };

  constructor(config: ArchiveConfig = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get config(): ArchiveConfig {
    return { ...this._config };
  }

  private generateId(): string {
    return `archive-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  archive(entries: AuditEntry[], metadata?: { startDate?: Date; endDate?: Date }): string {
    if (entries.length === 0) {
      throw new Error('Cannot archive empty entries');
    }

    const archiveId = this.generateId();
    const now = new Date();
    const startDate = metadata?.startDate || entries[0].timestamp;
    const endDate = metadata?.endDate || entries[entries.length - 1].timestamp;

    // Check max archives limit
    if (this.archives.length >= (this._config.maxArchives || 12)) {
      this.archives.shift();
      const removedId = this.archives[0]?.id;
      if (removedId) {
        this.archivedEntries.delete(removedId);
      }
    }

    const archive: Archive = {
      id: archiveId,
      name: `audit-archive-${now.toISOString().split('T')[0]}`,
      createdAt: now,
      entryCount: entries.length,
      sizeBytes: this._config.compressionEnabled
        ? Math.floor(entries.length * 0.6 * 200) // Estimate compressed size
        : entries.length * 200,
      startDate,
      endDate,
      compressed: this._config.compressionEnabled || false,
    };

    this.archives.push(archive);
    this.archivedEntries.set(archiveId, [...entries]);

    // Update metrics
    this.metrics.totalArchives = this.archives.length;
    this.metrics.totalArchivedEntries += entries.length;
    this.metrics.totalArchiveSize += archive.sizeBytes;
    this.metrics.lastArchiveDate = now.toISOString();

    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.metrics.archivesByMonth[monthKey] = (this.metrics.archivesByMonth[monthKey] || 0) + 1;

    return archiveId;
  }

  compact(archiveId: string): boolean {
    const entries = this.archivedEntries.get(archiveId);
    if (!entries) return false;

    // Remove duplicate entries based on id
    const uniqueEntries = new Map<string, AuditEntry>();
    for (const entry of entries) {
      uniqueEntries.set(entry.id, entry);
    }
    const compacted = Array.from(uniqueEntries.values());

    this.archivedEntries.set(archiveId, compacted);

    // Update archive metadata
    const archive = this.archives.find((a) => a.id === archiveId);
    if (archive) {
      archive.entryCount = compacted.length;
      archive.sizeBytes = this._config.compressionEnabled
        ? Math.floor(compacted.length * 0.6 * 200)
        : compacted.length * 200;
    }

    this.metrics.compactionCount++;
    this.metrics.totalArchivedEntries = compacted.length;

    return true;
  }

  getArchiveSize(archiveId: string): number {
    const archive = this.archives.find((a) => a.id === archiveId);
    return archive?.sizeBytes || 0;
  }

  getArchives(): Archive[] {
    return [...this.archives];
  }

  getArchivedEntries(archiveId: string): AuditEntry[] {
    return this.archivedEntries.get(archiveId) || [];
  }

  getSnapshot(): ArchiveSnapshot {
    return {
      metrics: { ...this.metrics },
    };
  }

  reset(): void {
    this.archives = [];
    this.archivedEntries.clear();
    this.metrics = {
      totalArchives: 0,
      totalArchivedEntries: 0,
      totalArchiveSize: 0,
      archivesByMonth: {},
      lastArchiveDate: undefined,
      compactionCount: 0,
    };
  }

  getReport(): string {
    const lines = [
      '=== Audit Archiver Report ===',
      `Total Archives: ${this.metrics.totalArchives}`,
      `Total Archived Entries: ${this.metrics.totalArchivedEntries}`,
      `Total Archive Size: ${(this.metrics.totalArchiveSize / 1024).toFixed(2)} KB`,
      `Compression Enabled: ${this._config.compressionEnabled}`,
      `Max Archive Size: ${((this._config.maxArchiveSize || 0) / 1024 / 1024).toFixed(2)} MB`,
      `Max Archives: ${this._config.maxArchives}`,
      '',
      'Archives by Month:',
      ...Object.entries(this.metrics.archivesByMonth).map(
        ([month, count]) => `  ${month}: ${count}`
      ),
      '',
      `Last Archive Date: ${this.metrics.lastArchiveDate || 'N/A'}`,
      `Compaction Count: ${this.metrics.compactionCount}`,
    ];
    return lines.join('\n');
  }

  exportMetrics(): { version: string; metrics: ArchiveSnapshot['metrics'] } {
    return {
      version: 'V63',
      metrics: { ...this.metrics },
    };
  }
}

export default AuditArchiver;