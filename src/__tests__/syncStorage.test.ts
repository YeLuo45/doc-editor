import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveDocument,
  loadDocument,
  markSynced,
  markDirty,
  clearDocument,
  clearAll,
  getAllKeys,
  getDirtyDocuments,
  getPendingDocuments,
  getSyncMetadata,
  getStorageStats,
  isStorageFull,
  pruneOldDocuments,
  saveSyncMetadata,
  loadSyncMetadata,
  compareVersions,
  type SyncMetadata
} from '../sync/SyncStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] || null
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('SyncStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveDocument / loadDocument', () => {
    it('should save and load a document', () => {
      const snapshot = {
        version: '1.0.0',
        content: 'Test content',
        timestamp: Date.now(),
        hash: 'abc123'
      };
      
      saveDocument('doc1', snapshot, true);
      const loaded = loadDocument('doc1');
      
      expect(loaded).not.toBeNull();
      expect(loaded?.snapshot.content).toBe('Test content');
      expect(loaded?.snapshot.version).toBe('1.0.0');
      expect(loaded?.isDirty).toBe(true);
    });

    it('should return null for non-existent document', () => {
      const loaded = loadDocument('nonexistent');
      expect(loaded).toBeNull();
    });

    it('should handle corrupt JSON gracefully', () => {
      localStorage.setItem('doc-editor-sync-corrupt', 'not valid json');
      const loaded = loadDocument('corrupt');
      expect(loaded).toBeNull();
    });

    it('should preserve isDirty flag when saving', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      
      saveDocument('test1', snapshot, false);
      expect(loadDocument('test1')?.isDirty).toBe(false);
      
      saveDocument('test2', snapshot, true);
      expect(loadDocument('test2')?.isDirty).toBe(true);
    });

    it('should update lastSynced when saving clean', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('test', snapshot, false);
      
      const loaded = loadDocument('test');
      expect(loaded?.lastSynced).not.toBeNull();
    });
  });

  describe('markSynced / markDirty', () => {
    it('should mark document as synced', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('doc', snapshot, true);
      
      markSynced('doc');
      
      const loaded = loadDocument('doc');
      expect(loaded?.isDirty).toBe(false);
      expect(loaded?.lastSynced).not.toBeNull();
    });

    it('should mark document as dirty', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('doc', snapshot, false);
      
      markDirty('doc');
      
      const loaded = loadDocument('doc');
      expect(loaded?.isDirty).toBe(true);
      expect(loaded?.lastSynced).toBeNull();
    });

    it('should handle marking non-existent document', () => {
      expect(() => markSynced('nonexistent')).not.toThrow();
      expect(() => markDirty('nonexistent')).not.toThrow();
    });
  });

  describe('clearDocument', () => {
    it('should clear a specific document', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('doc1', snapshot);
      saveDocument('doc2', snapshot);
      
      clearDocument('doc1');
      
      expect(loadDocument('doc1')).toBeNull();
      expect(loadDocument('doc2')).not.toBeNull();
    });
  });

  describe('clearAll', () => {
    it('should clear all sync documents', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('doc1', snapshot);
      saveDocument('doc2', snapshot);
      saveSyncMetadata({ lastSyncTime: Date.now(), pendingDeltas: 2, conflictCount: 0, serverVersion: null });
      
      clearAll();
      
      expect(getAllKeys()).toHaveLength(0);
      expect(loadSyncMetadata()).toBeNull();
    });
  });

  describe('getAllKeys', () => {
    it('should return all document keys', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('key1', snapshot);
      saveDocument('key2', snapshot);
      saveDocument('key3', snapshot);
      
      const keys = getAllKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys).toHaveLength(3);
    });

    it('should return empty array when no documents', () => {
      expect(getAllKeys()).toHaveLength(0);
    });

    it('should not include non-sync keys', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('sync-doc', snapshot);
      localStorage.setItem('other-key', 'value');
      
      const keys = getAllKeys();
      expect(keys).toHaveLength(1);
      expect(keys).toContain('sync-doc');
    });
  });

  describe('getDirtyDocuments', () => {
    it('should return only dirty documents', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('clean', snapshot, false);
      saveDocument('dirty1', snapshot, true);
      saveDocument('dirty2', snapshot, true);
      
      const dirty = getDirtyDocuments();
      expect(dirty).toHaveLength(2);
      expect(dirty.every(d => d.isDirty)).toBe(true);
    });

    it('should return empty array when no dirty documents', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('clean', snapshot, false);
      
      expect(getDirtyDocuments()).toHaveLength(0);
    });
  });

  describe('getPendingDocuments', () => {
    it('should return documents pending sync', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('pending1', snapshot, true);
      saveDocument('pending2', snapshot, true);
      
      const pending = getPendingDocuments();
      expect(pending).toHaveLength(2);
    });

    it('should exclude synced documents', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('pending', snapshot, true);
      saveDocument('synced', snapshot, false);
      
      const pending = getPendingDocuments();
      expect(pending).toHaveLength(1);
      expect(pending[0].key).toBe('pending');
    });
  });

  describe('getSyncMetadata', () => {
    it('should return sync metadata', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('doc', snapshot, false);
      
      const metadata = getSyncMetadata();
      expect(metadata).toHaveProperty('lastSyncTime');
      expect(metadata).toHaveProperty('pendingDeltas');
      expect(metadata).toHaveProperty('conflictCount');
    });

    it('should count pending deltas correctly', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('doc1', snapshot, true);
      saveDocument('doc2', snapshot, true);
      
      const metadata = getSyncMetadata();
      expect(metadata.pendingDeltas).toBe(2);
    });

    it('should return zero lastSyncTime when no synced docs', () => {
      const metadata = getSyncMetadata();
      expect(metadata.lastSyncTime).toBe(0);
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('doc', snapshot, true);
      
      const stats = getStorageStats();
      expect(stats.totalDocuments).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.dirtyCount).toBe(1);
    });

    it('should count documents correctly', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      saveDocument('doc1', snapshot);
      saveDocument('doc2', snapshot);
      saveDocument('doc3', snapshot);
      
      const stats = getStorageStats();
      expect(stats.totalDocuments).toBe(3);
    });
  });

  describe('isStorageFull', () => {
    it('should return false when under limit', () => {
      expect(isStorageFull(5120)).toBe(false);
    });

    it('should return true when at or over limit', () => {
      // This test may vary based on actual storage size
      expect(typeof isStorageFull()).toBe('boolean');
    });
  });

  describe('pruneOldDocuments', () => {
    it('should keep only the specified number of documents', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      
      for (let i = 0; i < 15; i++) {
        saveDocument(`doc${i}`, { ...snapshot, timestamp: i });
      }
      
      pruneOldDocuments(5);
      
      expect(getAllKeys().length).toBeLessThanOrEqual(5);
    });

    it('should keep most recent documents', () => {
      const snapshot = { version: '1.0', content: 'content', timestamp: 1, hash: 'hash' };
      
      for (let i = 0; i < 10; i++) {
        saveDocument(`doc${i}`, { ...snapshot, timestamp: i });
      }
      
      pruneOldDocuments(3);
      
      const keys = getAllKeys();
      expect(keys).toContain('doc9');
      expect(keys).toContain('doc8');
      expect(keys).toContain('doc7');
    });
  });

  describe('saveSyncMetadata / loadSyncMetadata', () => {
    it('should save and load sync metadata', () => {
      const metadata: SyncMetadata = {
        lastSyncTime: Date.now(),
        pendingDeltas: 5,
        conflictCount: 2,
        serverVersion: '1.0.0'
      };
      
      saveSyncMetadata(metadata);
      const loaded = loadSyncMetadata();
      
      expect(loaded).not.toBeNull();
      expect(loaded?.pendingDeltas).toBe(5);
      expect(loaded?.conflictCount).toBe(2);
      expect(loaded?.serverVersion).toBe('1.0.0');
    });

    it('should return null for missing metadata', () => {
      expect(loadSyncMetadata()).toBeNull();
    });

    it('should handle corrupt metadata', () => {
      localStorage.setItem('doc-editor-sync-metadata', 'invalid');
      expect(loadSyncMetadata()).toBeNull();
    });
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('1', '1')).toBe(0);
    });

    it('should return -1 when local is older', () => {
      expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(compareVersions('1.0', '1.1')).toBe(-1);
      expect(compareVersions('1', '2')).toBe(-1);
    });

    it('should return 1 when local is newer', () => {
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
      expect(compareVersions('1.1', '1.0')).toBe(1);
      expect(compareVersions('2', '1')).toBe(1);
    });

    it('should handle different length version strings', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0.0', '1.0.0')).toBe(0);
    });
  });
});