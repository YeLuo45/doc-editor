import { describe, it, expect } from 'vitest';
import {
  createIncrementalBackup,
  restoreFromIncrementalBackup,
  pruneBackups,
  calculateStorageSavings,
  validateBackupEntry,
  serializeBackups,
  deserializeBackups,
  buildBackupMetadata,
  calculateCompressedSize,
  type BackupEntry
} from '../sync/GistBackupStore';
import type { DocumentSnapshot } from '../sync/DeltaEngine';

describe('GistBackupStore', () => {
  const createMockSnapshot = (version: string, content: string, timestamp = Date.now()): DocumentSnapshot => ({
    version,
    content,
    timestamp,
    hash: `hash-${version}`
  });

  describe('createIncrementalBackup', () => {
    it('should create full backup when no previous snapshot', () => {
      const snapshot = createMockSnapshot('1.0.0', 'Document content');
      const result = createIncrementalBackup(snapshot, null);
      
      expect(result.entry.version).toBe('1.0.0');
      expect(result.entry.originalSize).toBe(snapshot.content.length);
      expect(result.baseVersion).toBeNull();
      expect(result.delta).toBeNull();
    });

    it('should create delta backup when previous snapshot exists', () => {
      const prevSnapshot = createMockSnapshot('1.0.0', 'Old content');
      const newSnapshot = createMockSnapshot('1.1.0', 'New content');
      
      const result = createIncrementalBackup(newSnapshot, prevSnapshot);
      
      expect(result.entry.version).toBe('1.1.0');
      expect(result.baseVersion).toBe('1.0.0');
      expect(result.delta).not.toBeNull();
    });

    it('should generate unique backup IDs', () => {
      const snapshot1 = createMockSnapshot('1.0.0', 'Content 1', 1000);
      const snapshot2 = createMockSnapshot('1.0.0', 'Content 2', 2000);
      
      const result1 = createIncrementalBackup(snapshot1, null);
      const result2 = createIncrementalBackup(snapshot2, null);
      
      expect(result1.entry.id).not.toBe(result2.entry.id);
    });

    it('should calculate compressed size', () => {
      const snapshot = createMockSnapshot('1.0.0', 'Test content');
      const result = createIncrementalBackup(snapshot, null);
      
      expect(result.entry.compressedSize).toBeGreaterThan(0);
    });

    it('should respect compressionEnabled config', () => {
      const snapshot = createMockSnapshot('1.0.0', 'Test content');
      
      const withCompression = createIncrementalBackup(snapshot, null, { compressionEnabled: true });
      const withoutCompression = createIncrementalBackup(snapshot, null, { compressionEnabled: false });
      
      expect(withCompression.entry.compressedData).toBeDefined();
      expect(withoutCompression.entry.compressedData).toBeDefined();
    });
  });

  describe('restoreFromIncrementalBackup', () => {
    it('should return null for empty backups array', () => {
      const entry: BackupEntry = {
        id: 'test-id',
        version: '1.0.0',
        timestamp: Date.now(),
        compressedData: 'compressed',
        originalSize: 12,
        compressedSize: 10
      };
      
      const result = restoreFromIncrementalBackup(entry, []);
      expect(result).toBeNull();
    });

    it('should return null if entry not found in backups', () => {
      const entry: BackupEntry = {
        id: 'missing-id',
        version: '1.0.0',
        timestamp: Date.now(),
        compressedData: 'compressed',
        originalSize: 12,
        compressedSize: 10
      };
      
      const otherEntry: BackupEntry = {
        id: 'other-id',
        version: '1.0.0',
        timestamp: Date.now() + 1000,
        compressedData: 'other',
        originalSize: 5,
        compressedSize: 5
      };
      
      const result = restoreFromIncrementalBackup(entry, [otherEntry]);
      expect(result).toBeNull();
    });
  });

  describe('pruneBackups', () => {
    it('should return all backups if keepCount >= total', () => {
      const backups: BackupEntry[] = [
        { id: '1', version: '1.0.0', timestamp: 1000, compressedData: 'a', originalSize: 1, compressedSize: 1 },
        { id: '2', version: '2.0.0', timestamp: 2000, compressedData: 'b', originalSize: 1, compressedSize: 1 },
        { id: '3', version: '3.0.0', timestamp: 3000, compressedData: 'c', originalSize: 1, compressedSize: 1 }
      ];
      
      const result = pruneBackups(backups, 5);
      expect(result).toHaveLength(3);
    });

    it('should keep only the most recent backups', () => {
      const backups: BackupEntry[] = [
        { id: '1', version: '1.0.0', timestamp: 1000, compressedData: 'a', originalSize: 1, compressedSize: 1 },
        { id: '2', version: '2.0.0', timestamp: 2000, compressedData: 'b', originalSize: 1, compressedSize: 1 },
        { id: '3', version: '3.0.0', timestamp: 3000, compressedData: 'c', originalSize: 1, compressedSize: 1 }
      ];
      
      const result = pruneBackups(backups, 2);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('3');
      expect(result[1].id).toBe('2');
    });

    it('should return empty array for keepCount 0', () => {
      const backups: BackupEntry[] = [
        { id: '1', version: '1.0.0', timestamp: 1000, compressedData: 'a', originalSize: 1, compressedSize: 1 }
      ];
      
      const result = pruneBackups(backups, 0);
      expect(result).toHaveLength(0);
    });
  });

  describe('calculateStorageSavings', () => {
    it('should calculate correct savings', () => {
      const backups: BackupEntry[] = [
        { id: '1', version: '1.0.0', timestamp: 1000, compressedData: 'abc', originalSize: 10, compressedSize: 3 },
        { id: '2', version: '2.0.0', timestamp: 2000, compressedData: 'xyz', originalSize: 10, compressedSize: 3 }
      ];
      
      const result = calculateStorageSavings(backups);
      
      expect(result.totalOriginalSize).toBe(20);
      expect(result.totalCompressedSize).toBe(6);
      expect(result.savingsPercent).toBe(70);
    });

    it('should handle empty array', () => {
      const result = calculateStorageSavings([]);
      
      expect(result.totalOriginalSize).toBe(0);
      expect(result.totalCompressedSize).toBe(0);
      expect(result.savingsPercent).toBe(0);
    });
  });

  describe('validateBackupEntry', () => {
    it('should return true for valid entry', () => {
      const entry: BackupEntry = {
        id: 'valid-id',
        version: '1.0.0',
        timestamp: Date.now(),
        compressedData: 'data',
        originalSize: 10,
        compressedSize: 5
      };
      
      expect(validateBackupEntry(entry)).toBe(true);
    });

    it('should return false for empty id', () => {
      const entry: BackupEntry = {
        id: '',
        version: '1.0.0',
        timestamp: Date.now(),
        compressedData: 'data',
        originalSize: 10,
        compressedSize: 5
      };
      
      expect(validateBackupEntry(entry)).toBe(false);
    });

    it('should return false for empty version', () => {
      const entry: BackupEntry = {
        id: 'id',
        version: '',
        timestamp: Date.now(),
        compressedData: 'data',
        originalSize: 10,
        compressedSize: 5
      };
      
      expect(validateBackupEntry(entry)).toBe(false);
    });

    it('should return false for zero timestamp', () => {
      const entry: BackupEntry = {
        id: 'id',
        version: '1.0.0',
        timestamp: 0,
        compressedData: 'data',
        originalSize: 10,
        compressedSize: 5
      };
      
      expect(validateBackupEntry(entry)).toBe(false);
    });
  });

  describe('serializeBackups / deserializeBackups', () => {
    it('should serialize and deserialize backups', () => {
      const backups: BackupEntry[] = [
        { id: '1', version: '1.0.0', timestamp: 1000, compressedData: 'data', originalSize: 4, compressedSize: 4 }
      ];
      
      const json = serializeBackups(backups);
      const restored = deserializeBackups(json);
      
      expect(restored).toHaveLength(1);
      expect(restored[0].id).toBe('1');
      expect(restored[0].version).toBe('1.0.0');
    });

    it('should return empty array for invalid JSON', () => {
      const result = deserializeBackups('not valid json');
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const json = serializeBackups([]);
      const restored = deserializeBackups(json);
      expect(restored).toEqual([]);
    });
  });

  describe('buildBackupMetadata', () => {
    it('should build correct metadata', () => {
      const backups: BackupEntry[] = [
        { id: '1', version: '1.0.0', timestamp: 1000, compressedData: 'a', originalSize: 1, compressedSize: 1 },
        { id: '2', version: '2.0.0', timestamp: 2000, compressedData: 'b', originalSize: 1, compressedSize: 1 }
      ];
      
      const metadata = buildBackupMetadata(backups, 'test-doc');
      
      expect(metadata.documentKey).toBe('test-doc');
      expect(metadata.backupCount).toBe(2);
      expect(metadata.latestVersion).toBe('2.0.0');
      expect(metadata.latestTimestamp).toBe(2000);
      expect(metadata.createdAt).toBeDefined();
    });

    it('should handle empty backups array', () => {
      const metadata = buildBackupMetadata([], 'test-doc');
      
      expect(metadata.backupCount).toBe(0);
      expect(metadata.latestVersion).toBe('none');
      expect(metadata.latestTimestamp).toBe(0);
    });
  });

  describe('calculateCompressedSize', () => {
    it('should return positive size for any input', () => {
      const result = calculateCompressedSize('test content');
      expect(result).toBeGreaterThan(0);
    });

    it('should return same size for same content', () => {
      const result1 = calculateCompressedSize('abc');
      const result2 = calculateCompressedSize('abc');
      expect(result1).toBe(result2);
    });
  });
});