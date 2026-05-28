/**
 * GistBackupStore - Incremental snapshot storage with compression
 * Stores document versions as incremental snapshots using GitHub Gist
 */

import type { DocumentSnapshot } from './DeltaEngine';

export interface BackupEntry {
  id: string;
  version: string;
  timestamp: number;
  compressedData: string;
  originalSize: number;
  compressedSize: number;
}

export interface GistBackupStoreConfig {
  gistId?: string;
  token?: string;
  maxBackups?: number;
  compressionEnabled?: boolean;
}

export interface IncrementalBackup {
  entry: BackupEntry;
  baseVersion: string | null;
  delta: string | null;
}

/**
 * Simple compression using base64 encoding for storage
 * In production, use a proper compression library like pako
 */
function compress(data: string): string {
  try {
    const encoded = btoa(unescape(encodeURIComponent(data)));
    return encoded;
  } catch {
    return data;
  }
}

function decompress(data: string): string {
  try {
    const decoded = decodeURIComponent(escape(atob(data)));
    return decoded;
  } catch {
    return data;
  }
}

/**
 * Calculate compressed size estimate
 */
export function calculateCompressedSize(data: string): number {
  return compress(data).length;
}

/**
 * Create incremental backup entry
 */
export function createIncrementalBackup(
  snapshot: DocumentSnapshot,
  previousSnapshot: DocumentSnapshot | null,
  config: GistBackupStoreConfig = {}
): IncrementalBackup {
  const compressionEnabled = config.compressionEnabled ?? true;
  
  let compressedData: string;
  let delta: string | null = null;
  let baseVersion: string | null = null;

  if (previousSnapshot) {
    baseVersion = previousSnapshot.version;
    delta = computeSimpleDelta(previousSnapshot.content, snapshot.content);
    compressedData = compressionEnabled ? compress(delta) : delta;
  } else {
    compressedData = compressionEnabled ? compress(snapshot.content) : snapshot.content;
  }

  const entry: BackupEntry = {
    id: generateBackupId(snapshot),
    version: snapshot.version,
    timestamp: snapshot.timestamp,
    compressedData,
    originalSize: delta ? delta.length : snapshot.content.length,
    compressedSize: compressedData.length
  };

  return { entry, baseVersion, delta };
}

function generateBackupId(snapshot: DocumentSnapshot): string {
  return `${snapshot.version}-${snapshot.timestamp.toString(36)}-${snapshot.hash.substring(0, 8)}`;
}

function computeSimpleDelta(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const delta: Array<{ type: 'add' | 'remove' | 'keep'; content: string }> = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      delta.push({ type: 'keep', content: oldLine ?? '' });
    } else if (oldLine === undefined) {
      delta.push({ type: 'add', content: newLine! });
    } else if (newLine === undefined) {
      delta.push({ type: 'remove', content: oldLine });
    } else {
      delta.push({ type: 'remove', content: oldLine });
      delta.push({ type: 'add', content: newLine });
    }
  }

  return JSON.stringify(delta);
}

function applySimpleDelta(baseContent: string, deltaJson: string): string {
  try {
    const delta = JSON.parse(deltaJson) as Array<{ type: 'add' | 'remove' | 'keep'; content: string }>;
    const lines: string[] = [];

    for (const op of delta) {
      if (op.type === 'keep' || op.type === 'add') {
        lines.push(op.content);
      }
    }

    return lines.join('\n');
  } catch {
    return baseContent;
  }
}

/**
 * Restore content from incremental backup
 */
export function restoreFromIncrementalBackup(
  entry: BackupEntry,
  allBackups: BackupEntry[],
  config: GistBackupStoreConfig = {}
): string | null {
  const compressionEnabled = config.compressionEnabled ?? true;
  
  try {
    const backupIndex = allBackups.findIndex(b => b.id === entry.id);
    if (backupIndex === -1) return null;

    const backupChain = allBackups.slice(backupIndex);
    
    let content = compressionEnabled ? decompress(entry.compressedData) : entry.compressedData;
    
    for (let i = backupChain.length - 1; i >= 0; i--) {
      const currentEntry = backupChain[i];
      if (i === 0) {
        content = compressionEnabled 
          ? decompress(currentEntry.compressedData) 
          : currentEntry.compressedData;
      } else {
        const delta = compressionEnabled 
          ? decompress(currentEntry.compressedData) 
          : currentEntry.compressedData;
        content = applySimpleDelta(
          compressionEnabled ? decompress(backupChain[i - 1].compressedData) : backupChain[i - 1].compressedData,
          delta
        );
      }
    }

    return content;
  } catch {
    return null;
  }
}

/**
 * Merge multiple incremental backups
 */
export function mergeBackups(backups: BackupEntry[]): BackupEntry[] {
  if (backups.length <= 1) return backups;
  const sorted = [...backups].sort((a, b) => a.timestamp - b.timestamp);
  return sorted;
}

/**
 * Prune old backups keeping only the most recent ones
 */
export function pruneBackups(backups: BackupEntry[], keepCount: number): BackupEntry[] {
  const sorted = [...backups].sort((a, b) => b.timestamp - a.timestamp);
  return sorted.slice(0, keepCount);
}

/**
 * Calculate storage savings from compression
 */
export function calculateStorageSavings(backups: BackupEntry[]): {
  totalOriginalSize: number;
  totalCompressedSize: number;
  savingsPercent: number;
} {
  let totalOriginalSize = 0;
  let totalCompressedSize = 0;

  for (const backup of backups) {
    totalOriginalSize += backup.originalSize;
    totalCompressedSize += backup.compressedSize;
  }

  const savingsPercent = totalOriginalSize > 0 
    ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 
    : 0;

  return { totalOriginalSize, totalCompressedSize, savingsPercent };
}

/**
 * Validate backup entry integrity
 */
export function validateBackupEntry(entry: BackupEntry): boolean {
  return (
    entry.id.length > 0 &&
    entry.version.length > 0 &&
    entry.timestamp > 0 &&
    entry.compressedData.length > 0 &&
    entry.originalSize > 0 &&
    entry.compressedSize > 0
  );
}

/**
 * Serialize backup entries for storage
 */
export function serializeBackups(backups: BackupEntry[]): string {
  return JSON.stringify(backups);
}

/**
 * Deserialize backup entries from storage
 */
export function deserializeBackups(json: string): BackupEntry[] {
  try {
    return JSON.parse(json) as BackupEntry[];
  } catch {
    return [];
  }
}

/**
 * Build metadata for backup set
 */
export function buildBackupMetadata(
  backups: BackupEntry[],
  documentKey: string
): Record<string, unknown> {
  const latestBackup = backups.reduce((latest, current) => 
    current.timestamp > latest.timestamp ? current : latest,
    backups[0]
  );

  return {
    documentKey,
    backupCount: backups.length,
    latestVersion: latestBackup?.version ?? 'none',
    latestTimestamp: latestBackup?.timestamp ?? 0,
    createdAt: Date.now()
  };
}
