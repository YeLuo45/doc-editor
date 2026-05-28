import { describe, it, expect, beforeEach } from 'vitest';
import { createOfflineSyncStore, initOnlineListeners, getSyncStatus } from '../stores/offlineSyncStore';

describe('OfflineSyncStore', () => {
  let store: ReturnType<typeof createOfflineSyncStore>;

  beforeEach(() => {
    store = createOfflineSyncStore();
  });

  describe('initial state', () => {
    it('should have empty queue on init', () => {
      expect(store.getState().queue).toHaveLength(0);
      expect(store.getState().pendingCount).toBe(0);
      expect(store.getState().failedCount).toBe(0);
    });

    it('should have isSyncing false on init', () => {
      expect(store.getState().isSyncing).toBe(false);
    });

    it('should have lastSyncTime null on init', () => {
      expect(store.getState().lastSyncTime).toBeNull();
    });
  });

  describe('enqueue', () => {
    it('should add operation to queue', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'payload content');
      
      expect(opId).toBeDefined();
      expect(typeof opId).toBe('string');
      expect(store.getState().queue).toHaveLength(1);
      expect(store.getState().pendingCount).toBe(1);
    });

    it('should set correct operation properties', () => {
      const opId = store.getState().enqueue('doc1', 'update', 'new content');
      const op = store.getState().queue.find(o => o.id === opId);
      
      expect(op).toBeDefined();
      expect(op?.documentKey).toBe('doc1');
      expect(op?.operation).toBe('update');
      expect(op?.payload).toBe('new content');
      expect(op?.status).toBe('pending');
      expect(op?.retryCount).toBe(0);
    });

    it('should increment pendingCount for each enqueue', () => {
      store.getState().enqueue('doc1', 'create', 'content1');
      store.getState().enqueue('doc2', 'update', 'content2');
      
      expect(store.getState().pendingCount).toBe(2);
    });

    it('should generate unique operation IDs', () => {
      const id1 = store.getState().enqueue('doc1', 'create', 'content');
      const id2 = store.getState().enqueue('doc1', 'create', 'content');
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('dequeue', () => {
    it('should remove operation from queue', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      store.getState().dequeue(opId);
      
      expect(store.getState().queue.find(o => o.id === opId)).toBeUndefined();
    });

    it('should not affect other operations', () => {
      const id1 = store.getState().enqueue('doc1', 'create', 'content1');
      store.getState().enqueue('doc2', 'create', 'content2');
      store.getState().dequeue(id1);
      
      expect(store.getState().queue).toHaveLength(1);
      expect(store.getState().queue[0].documentKey).toBe('doc2');
    });
  });

  describe('markInProgress', () => {
    it('should update operation status to in-progress', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      store.getState().markInProgress(opId);
      
      const op = store.getState().queue.find(o => o.id === opId);
      expect(op?.status).toBe('in-progress');
    });
  });

  describe('markCompleted', () => {
    it('should update operation status to completed', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      store.getState().markCompleted(opId);
      
      const op = store.getState().queue.find(o => o.id === opId);
      expect(op?.status).toBe('completed');
    });

    it('should decrement pendingCount', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      store.getState().markCompleted(opId);
      
      expect(store.getState().pendingCount).toBe(0);
    });
  });

  describe('markFailed', () => {
    it('should update operation status to failed', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      store.getState().markFailed(opId, 'Network error');
      
      const op = store.getState().queue.find(o => o.id === opId);
      expect(op?.status).toBe('failed');
      expect(op?.error).toBe('Network error');
      expect(op?.retryCount).toBe(1);
    });

    it('should increment failedCount', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      store.getState().markFailed(opId, 'Error');
      
      expect(store.getState().failedCount).toBe(1);
    });

    it('should decrement pendingCount', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      store.getState().markFailed(opId, 'Error');
      
      expect(store.getState().pendingCount).toBe(0);
    });
  });

  describe('retry', () => {
    it('should reset operation to pending status', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      store.getState().markFailed(opId, 'Error');
      store.getState().retry(opId);
      
      const op = store.getState().queue.find(o => o.id === opId);
      expect(op?.status).toBe('pending');
      expect(op?.error).toBeUndefined();
    });

    it('should decrement failedCount', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      store.getState().markFailed(opId, 'Error');
      store.getState().retry(opId);
      
      expect(store.getState().failedCount).toBe(0);
    });

    it('should increment pendingCount', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      store.getState().markFailed(opId, 'Error');
      store.getState().retry(opId);
      
      expect(store.getState().pendingCount).toBe(1);
    });
  });

  describe('clearQueue', () => {
    it('should remove all operations', () => {
      store.getState().enqueue('doc1', 'create', 'content1');
      store.getState().enqueue('doc2', 'update', 'content2');
      store.getState().clearQueue();
      
      expect(store.getState().queue).toHaveLength(0);
    });

    it('should reset counts', () => {
      store.getState().enqueue('doc1', 'create', 'content1');
      store.getState().enqueue('doc2', 'update', 'content2');
      store.getState().clearQueue();
      
      expect(store.getState().pendingCount).toBe(0);
      expect(store.getState().failedCount).toBe(0);
    });
  });

  describe('flushCompleted', () => {
    it('should remove completed operations', () => {
      const id1 = store.getState().enqueue('doc1', 'create', 'content1');
      const id2 = store.getState().enqueue('doc2', 'update', 'content2');
      
      store.getState().markCompleted(id1);
      store.getState().flushCompleted();
      
      expect(store.getState().queue).toHaveLength(1);
      expect(store.getState().queue[0].id).toBe(id2);
    });
  });

  describe('getPendingOperations', () => {
    it('should return only pending operations', () => {
      store.getState().enqueue('doc1', 'create', 'content1');
      store.getState().enqueue('doc2', 'update', 'content2');
      
      const pending = store.getState().getPendingOperations();
      
      expect(pending).toHaveLength(2);
      expect(pending.every(o => o.status === 'pending')).toBe(true);
    });
  });

  describe('getFailedOperations', () => {
    it('should return only failed operations', () => {
      const id1 = store.getState().enqueue('doc1', 'create', 'content1');
      store.getState().enqueue('doc2', 'update', 'content2');
      
      store.getState().markFailed(id1, 'Error');
      const failed = store.getState().getFailedOperations();
      
      expect(failed).toHaveLength(1);
      expect(failed[0].id).toBe(id1);
    });
  });

  describe('getOperationsForDocument', () => {
    it('should return operations for specific document', () => {
      store.getState().enqueue('doc1', 'create', 'content1');
      store.getState().enqueue('doc2', 'update', 'content2');
      store.getState().enqueue('doc1', 'update', 'content3');
      
      const ops = store.getState().getOperationsForDocument('doc1');
      
      expect(ops).toHaveLength(2);
      expect(ops.every(o => o.documentKey === 'doc1')).toBe(true);
    });
  });

  describe('setOnline', () => {
    it('should update isOnline status', () => {
      store.getState().setOnline(false);
      expect(store.getState().isOnline).toBe(false);
      
      store.getState().setOnline(true);
      expect(store.getState().isOnline).toBe(true);
    });
  });

  describe('setSyncing', () => {
    it('should update isSyncing status', () => {
      store.getState().setSyncing(true);
      expect(store.getState().isSyncing).toBe(true);
      
      store.getState().setSyncing(false);
      expect(store.getState().isSyncing).toBe(false);
    });
  });

  describe('setLastSyncTime', () => {
    it('should update lastSyncTime', () => {
      const time = Date.now();
      store.getState().setLastSyncTime(time);
      
      expect(store.getState().lastSyncTime).toBe(time);
    });
  });

  describe('optimisticUpdate', () => {
    it('should store optimistic update in localStorage', () => {
      const docKey = 'test-doc';
      const content = 'optimistic content';
      
      store.getState().optimisticUpdate(docKey, content);
      
      const stored = localStorage.getItem(`doc-editor-optimistic-${docKey}`);
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.content).toBe(content);
    });
  });

  describe('rollbackOptimisticUpdate', () => {
    it('should remove optimistic update from localStorage', () => {
      const docKey = 'test-doc';
      store.getState().optimisticUpdate(docKey, 'content');
      store.getState().rollbackOptimisticUpdate(docKey);
      
      const stored = localStorage.getItem(`doc-editor-optimistic-${docKey}`);
      expect(stored).toBeNull();
    });
  });

  describe('getSyncStatus', () => {
    it('should return status object with correct structure', () => {
      store.getState().setOnline(true);
      store.getState().setSyncing(false);
      
      const status = getSyncStatus();
      
      expect(status.pendingCount).toBeDefined();
      expect(status.isOnline).toBe(true);
      expect(status.isSyncing).toBe(false);
      expect(status.failedCount).toBeDefined();
      expect(status.lastSyncTime).toBeNull();
    });
  });

  describe('initOnlineListeners', () => {
    it('should return cleanup function', () => {
      const cleanup = initOnlineListeners();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });

  describe('queue processing flow', () => {
    it('should handle full lifecycle: enqueue -> process -> complete', async () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      
      expect(store.getState().pendingCount).toBe(1);
      
      store.getState().markInProgress(opId);
      expect(store.getState().queue[0].status).toBe('in-progress');
      
      store.getState().markCompleted(opId);
      expect(store.getState().queue[0].status).toBe('completed');
      
      store.getState().flushCompleted();
      expect(store.getState().queue).toHaveLength(0);
    });

    it('should handle failure and retry flow', () => {
      const opId = store.getState().enqueue('doc1', 'create', 'content');
      
      store.getState().markFailed(opId, 'Network error');
      expect(store.getState().failedCount).toBe(1);
      
      store.getState().retry(opId);
      expect(store.getState().queue[0].status).toBe('pending');
      expect(store.getState().failedCount).toBe(0);
    });
  });
});